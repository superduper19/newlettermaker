import { createClient } from '@supabase/supabase-js';
import { Router } from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const router = Router();

let supabase = null;

function getSupabase() {
    if (supabase) return supabase;
    try {
        const url = process.env.SUPABASE_URL;
        const key =
            process.env.SUPABASE_SECRET_KEY ||
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.SUPABASE_ANON_KEY ||
            process.env.SUPABASE_PUBLISHABLE_KEY;
        if (url && key) {
            supabase = createClient(url, key);
            return supabase;
        }
    } catch (e) {
        console.warn('Supabase not configured:', e.message);
    }
    return null;
}

const TABLE = process.env.SUPABASE_STATE_TABLE || 'newsletter_state';
const TEMPLATE_FILES = {
    MED: 'med.html',
    THC: 'thc.html',
    CBD: 'cbd.html',
    INV: 'inv.html',
};

// POST /api/newsletters — save generated newsletter to DB
router.post('/', async (req, res) => {
    const { name, generated } = req.body;
    if (!name || !generated) {
        return res.status(400).json({ error: 'Missing name or generated payload' });
    }

    const client = getSupabase();
    if (!client) {
        return res.status(503).json({ error: 'Database not configured', configured: false });
    }

    const key = `newsletter_${String(name).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const value = {
        ...generated,
        savedAt: new Date().toISOString(),
    };

    try {
        const { error } = await client
            .from(TABLE)
            .upsert(
                { key, value, updated_at: new Date().toISOString() },
                { onConflict: 'key' },
            );

        if (error) {
            console.error('Newsletter save error:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json({ ok: true, key });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/newsletters/template/:category — load default category template from templates
router.get('/template/:category', (req, res) => {
    const category = String(req.params.category || '').toUpperCase();
    const filename = TEMPLATE_FILES[category];

    if (!filename) {
        return res.status(400).json({ error: 'Unknown category' });
    }

    const filePath = join(import.meta.dirname, '../templates', filename);
    if (!existsSync(filePath)) {
        return res.status(404).json({ error: 'Template not found', category, filename });
    }

    try {
        const html = readFileSync(filePath, 'utf8');
        res.type('html').send(html);
    } catch (e) {
        console.error('Template load error:', e);
        res.status(500).json({ error: 'Failed to read template' });
    }
});

export default router;
