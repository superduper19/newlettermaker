const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Freepik API Configuration
const FREEPIK_ICONS_URL = 'https://api.freepik.com/v1/icons';
const API_KEY = process.env.FREEPIK_API_KEY;

// Multer disk storage for local image uploads
const uploadDir = path.join(__dirname, '../public/uploads');
const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Sanitize filename to be safe but preserve original name
        const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, originalName);
    }
});
const uploadMiddleware = multer({ storage: diskStorage, limits: { fileSize: 10 * 1024 * 1024 } });
const STATE_TABLE = process.env.SUPABASE_STATE_TABLE || 'newsletter_state';
const INSPIRATIONAL_LIBRARY_KEY = 'inspirational_library';
let supabase = null;

// FTP remote path from env (no leading slash). Public URL base with no trailing slash.
function getRemotePath() {
    const ftpPath = (process.env.GODADDY_FTP_PATH || 'News-roundup/images').replace(/^\/+/, '');
    const publicBase = (process.env.GODADDY_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
    return { remoteDir: ftpPath, publicUrlBase: publicBase };
}

function getFtpConfig() {
    return {
        host: process.env.GODADDY_FTP_HOST,
        user: process.env.GODADDY_FTP_USER,
        password: process.env.GODADDY_FTP_PASS,
        port: parseInt(process.env.GODADDY_FTP_PORT || '21')
    };
}

function getSupabase() {
    if (supabase) return supabase;
    try {
        const { createClient } = require('@supabase/supabase-js');
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
        if (url && key) {
            supabase = createClient(url, key);
            return supabase;
        }
    } catch (e) {
        console.warn('Supabase not configured for images:', e.message);
    }
    return null;
}

function isImageFile(name) {
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(name || '');
}

function extractFilenameFromUrl(url) {
    try {
        const pathname = new URL(url).pathname;
        return path.basename(decodeURIComponent(pathname));
    } catch (e) {
        return path.basename(String(url || ''));
    }
}

async function listInspirationalLibrary() {
    const ftp = getFtpConfig();
    const { remoteDir, publicUrlBase } = getRemotePath();

    if (ftp.host && ftp.user && ftp.password && publicUrlBase) {
        const { Client } = require('basic-ftp');
        const client = new Client();
        client.ftp.verbose = false;
        try {
            await client.access({
                host: ftp.host,
                port: ftp.port,
                user: ftp.user,
                password: ftp.password,
                secure: true,
                secureOptions: { rejectUnauthorized: false }
            });

            const entries = await client.list(remoteDir);
            return entries
                .filter(entry => entry.isFile && isImageFile(entry.name))
                .map(entry => ({
                    name: entry.name,
                    url: `${publicUrlBase}/${entry.name}`,
                    source: 'ftp'
                }))
                .sort((a, b) => a.name.localeCompare(b.name));
        } finally {
            client.close();
        }
    }

    if (!fs.existsSync(uploadDir)) {
        return [];
    }

    return fs.readdirSync(uploadDir)
        .filter(name => isImageFile(name))
        .map(name => ({
            name,
            url: `/uploads/${name}`,
            source: 'local'
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeLibraryImages(images) {
    const seen = new Set();
    return (Array.isArray(images) ? images : [])
        .filter(item => item && item.url)
        .map(item => ({
            name: item.name || extractFilenameFromUrl(item.url),
            url: String(item.url).trim(),
            source: item.source || 'db'
        }))
        .filter(item => {
            if (!item.url || seen.has(item.url)) return false;
            seen.add(item.url);
            return true;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}

async function getInspirationalLibraryFromDb() {
    const client = getSupabase();
    if (!client) return null;

    const { data, error } = await client
        .from(STATE_TABLE)
        .select('value')
        .eq('key', INSPIRATIONAL_LIBRARY_KEY)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }
    return data ? normalizeLibraryImages(data.value) : null;
}

async function saveInspirationalLibraryToDb(images) {
    const client = getSupabase();
    if (!client) return false;

    const normalized = normalizeLibraryImages(images);
    const { error } = await client
        .from(STATE_TABLE)
        .upsert(
            { key: INSPIRATIONAL_LIBRARY_KEY, value: normalized, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
        );

    if (error) {
        throw new Error(error.message);
    }
    return true;
}

// GET /api/images/inspirational-library - list previously uploaded inspirational images
router.get('/inspirational-library', async (req, res) => {
    try {
        let images = await getInspirationalLibraryFromDb();
        if (images === null) {
            images = await listInspirationalLibrary();
            try {
                await saveInspirationalLibraryToDb(images);
            } catch (dbErr) {
                console.warn('Could not seed inspirational library in DB:', dbErr.message);
            }
        }
        res.json({ success: true, images });
    } catch (error) {
        console.error('Inspirational library list error:', error);
        res.status(500).json({ error: 'Failed to load inspirational image library' });
    }
});

// DELETE /api/images/inspirational-library - remove a previously uploaded inspirational image
router.delete('/inspirational-library', async (req, res) => {
    try {
        const { url } = req.body || {};
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'Missing url' });
        }

        const filename = extractFilenameFromUrl(url.trim());
        if (!filename) {
            return res.status(400).json({ error: 'Could not determine filename' });
        }

        const ftp = getFtpConfig();
        const { remoteDir, publicUrlBase } = getRemotePath();

        if (ftp.host && ftp.user && ftp.password && publicUrlBase && url.startsWith(`${publicUrlBase}/`)) {
            const expectedPrefix = `${publicUrlBase}/`;

            const { Client } = require('basic-ftp');
            const client = new Client();
            client.ftp.verbose = false;
            try {
                await client.access({
                    host: ftp.host,
                    port: ftp.port,
                    user: ftp.user,
                    password: ftp.password,
                    secure: true,
                    secureOptions: { rejectUnauthorized: false }
                });
                await client.remove(`${remoteDir}/${filename}`);
            } finally {
                client.close();
            }
        }

        const localPath = path.join(uploadDir, filename);
        if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
        }

        try {
            const existing = await getInspirationalLibraryFromDb();
            if (existing !== null) {
                const next = existing.filter(item => item.url !== url);
                await saveInspirationalLibraryToDb(next);
            }
        } catch (dbErr) {
            console.warn('Failed to update inspirational library DB after delete:', dbErr.message);
        }

        res.json({ success: true, filename });
    } catch (error) {
        console.error('Inspirational library delete error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete inspirational image' });
    }
});

router.post('/search', async (req, res) => {
    try {
        const { query, page = 1 } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        console.log(`Searching Flaticon (Freepik API) for: "${query}" (Page ${page})`);

        // Dynamic import for fetch (ESM)
        const fetch = (await import('node-fetch')).default;

        // Searching for ICONS specifically (Flaticon)
        const url = `${FREEPIK_ICONS_URL}?locale=en-US&page=${page}&limit=9&term=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
            headers: {
                'X-Freepik-API-Key': API_KEY,
                'Accept-Language': 'en-US'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Freepik/Flaticon API Error:', response.status, errorText);
            return res.status(response.status).json({ error: 'Image search failed', details: errorText });
        }

        const data = await response.json();
        
        // Transform data (Icons structure)
        const images = data.data.map(item => ({
            id: item.id,
            title: item.name || 'Icon',
            // Icons have 'thumbnails' array. Usually index 0 is best for preview.
            preview: item.thumbnails && item.thumbnails[0] ? item.thumbnails[0].url : '', 
            download: item.thumbnails && item.thumbnails[0] ? item.thumbnails[0].url : ''
        }));

        res.json({
            success: true,
            page,
            images
        });

    } catch (error) {
        console.error('Image Search Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/images/upload - Upload a local image file (local only, no FTP)
router.post('/upload', uploadMiddleware.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const url = `/uploads/${req.file.filename}`;
        console.log(`Image uploaded: ${req.file.filename}`);
        res.json({ success: true, url });
    } catch (error) {
        console.error('Image Upload Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/images/upload-article - Upload article image, publish to GoDaddy FTP (purablis.com)
router.post('/upload-article', uploadMiddleware.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const localPath = req.file.path;
        const filename = req.file.filename;
        const localUrl = `/uploads/${filename}`;

        const ftpHost = process.env.GODADDY_FTP_HOST;
        const ftpUser = process.env.GODADDY_FTP_USER;
        const ftpPass = process.env.GODADDY_FTP_PASS;
        const ftpPort = parseInt(process.env.GODADDY_FTP_PORT || '21');

        if (!ftpHost || !ftpUser || !ftpPass) {
            console.warn('GoDaddy FTP not configured — returning local URL only');
            return res.json({ success: true, url: localUrl, published: false });
        }

        const { Client } = require('basic-ftp');
        const client = new Client();
        client.ftp.verbose = false;

        const { remoteDir, publicUrlBase } = getRemotePath();
        try {
            await client.access({
                host: ftpHost,
                port: ftpPort,
                user: ftpUser,
                password: ftpPass,
                secure: true,
                secureOptions: { rejectUnauthorized: false }
            });

            await client.ensureDir(remoteDir);
            await client.uploadFrom(localPath, `${remoteDir}/${filename}`);
            console.log(`FTP upload OK (article): ${remoteDir}/${filename}`);

            const publicUrl = publicUrlBase ? `${publicUrlBase}/${filename}` : localUrl;

            res.json({ success: true, url: publicUrl, published: true });
        } catch (ftpErr) {
            console.error('FTP upload failed:', ftpErr.message);
            res.json({ success: true, url: localUrl, published: false, ftpError: ftpErr.message });
        } finally {
            client.close();
        }
    } catch (error) {
        console.error('Article Image Upload Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/images/publish-to-purablis - Publish an image URL to GoDaddy FTP (for /uploads/ or external URLs)
router.post('/publish-to-purablis', async (req, res) => {
    try {
        let { url } = req.body;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'Missing url' });
        }
        url = url.trim();

        const ftpHost = process.env.GODADDY_FTP_HOST;
        const ftpUser = process.env.GODADDY_FTP_USER;
        const ftpPass = process.env.GODADDY_FTP_PASS;
        const ftpPort = parseInt(process.env.GODADDY_FTP_PORT || '21');

        if (!ftpHost || !ftpUser || !ftpPass) {
            return res.status(503).json({ error: 'GoDaddy FTP not configured', configured: false });
        }

        let localPath = null;
        let filename = null;

        // Normalize: if full URL contains /uploads/, treat as local file
        const uploadsMatch = url.match(/\/uploads\/([^?#]+)/);
        if (url.startsWith('/uploads/') || uploadsMatch) {
            filename = uploadsMatch ? uploadsMatch[1] : url.replace('/uploads/', '');
            localPath = path.join(__dirname, '../public/uploads', filename);
            if (!fs.existsSync(localPath)) {
                return res.status(404).json({ error: 'Local file not found', path: localPath });
            }
        } else if (url.startsWith('http://') || url.startsWith('https://')) {
            const fetch = (await import('node-fetch')).default;
            const resp = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsletterMaker/1.0)' }
            });
            if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
            const buf = await resp.buffer();
            const urlObj = new URL(url);
            let pathname = urlObj.pathname;
            try {
                pathname = decodeURIComponent(pathname);
            } catch (e) {
                // ignore malformed URI
            }
            const ext = path.extname(pathname) || '.png';
            // Extract basename and sanitize
            const base = path.basename(pathname, ext).replace(/[^a-zA-Z0-9.-]/g, '_');
            // If base is empty or generic, use timestamp
            filename = (base && base.length > 2) ? `${base}${ext}` : `publish-${Date.now()}${ext}`;

            localPath = path.join(uploadDir, filename);
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            fs.writeFileSync(localPath, buf);
        } else {
            return res.status(400).json({ error: 'Unsupported URL: must be /uploads/... or http(s)://' });
        }

        const { Client } = require('basic-ftp');
        const client = new Client();
        client.ftp.verbose = false;

        try {
            await client.access({
                host: ftpHost,
                port: ftpPort,
                user: ftpUser,
                password: ftpPass,
                secure: true,
                secureOptions: { rejectUnauthorized: false }
            });

            const { remoteDir, publicUrlBase } = getRemotePath();
            await client.ensureDir(remoteDir);
            await client.uploadFrom(localPath, `${remoteDir}/${filename}`);
            console.log(`FTP upload OK (publish): ${remoteDir}/${filename}`);

            const publicUrl = publicUrlBase ? `${publicUrlBase}/${filename}` : `/uploads/${filename}`;

            res.json({ success: true, url: publicUrl, published: true });
        } catch (ftpErr) {
            console.error('FTP publish failed:', ftpErr.message);
            res.json({ success: false, error: ftpErr.message });
        } finally {
            client.close();
        }
    } catch (error) {
        console.error('Publish to purablis error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/images/upload-inspirational - Upload image, publish to GoDaddy FTP, return public URL
router.post('/upload-inspirational', uploadMiddleware.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const localPath = req.file.path;
        const filename = req.file.filename;
        const localUrl = `/uploads/${filename}`;

        const ftpHost = process.env.GODADDY_FTP_HOST;
        const ftpUser = process.env.GODADDY_FTP_USER;
        const ftpPass = process.env.GODADDY_FTP_PASS;
        const ftpPort = parseInt(process.env.GODADDY_FTP_PORT || '21');

        if (!ftpHost || !ftpUser || !ftpPass) {
            console.warn('GoDaddy FTP not configured — returning local URL only');
            return res.json({ success: true, url: localUrl, published: false });
        }

        const { remoteDir, publicUrlBase } = getRemotePath();
        const { Client } = require('basic-ftp');
        const client = new Client();
        client.ftp.verbose = false;

        try {
            await client.access({
                host: ftpHost,
                port: ftpPort,
                user: ftpUser,
                password: ftpPass,
                secure: true,
                secureOptions: { rejectUnauthorized: false }
            });

            await client.ensureDir(remoteDir);
            await client.uploadFrom(localPath, `${remoteDir}/${filename}`);
            console.log(`FTP upload OK: ${remoteDir}/${filename}`);

            const publicUrl = publicUrlBase ? `${publicUrlBase}/${filename}` : localUrl;
            try {
                const existing = await getInspirationalLibraryFromDb();
                const next = normalizeLibraryImages([...(existing || []), { name: filename, url: publicUrl, source: 'ftp' }]);
                await saveInspirationalLibraryToDb(next);
            } catch (dbErr) {
                console.warn('Failed to save inspirational upload in DB:', dbErr.message);
            }

            res.json({ success: true, url: publicUrl, published: true });
        } catch (ftpErr) {
            console.error('FTP upload failed:', ftpErr.message);
            try {
                const existing = await getInspirationalLibraryFromDb();
                const next = normalizeLibraryImages([...(existing || []), { name: filename, url: localUrl, source: 'local' }]);
                await saveInspirationalLibraryToDb(next);
            } catch (dbErr) {
                console.warn('Failed to save local inspirational upload in DB:', dbErr.message);
            }
            res.json({ success: true, url: localUrl, published: false, ftpError: ftpErr.message });
        } finally {
            client.close();
        }

    } catch (error) {
        console.error('Inspirational Upload Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
