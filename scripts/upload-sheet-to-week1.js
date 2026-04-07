/**
 * Read an Excel file from the project folder and push its contents to Supabase as Week 1.
 * Run: node scripts/upload-sheet-to-week1.js [path-to-file.xlsx]
 * Example: node scripts/upload-sheet-to-week1.js "Week 1-articles (1).xlsx"
 * If no path given, looks for Week 1-articles.xlsx or Week 1-articles (1).xlsx in project root.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const TABLE = 'newsletter_state';

const getCell = (row, ...keys) => {
    for (const k of keys) {
        const v = row[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
};

function cleanArticle(row, index) {
    const title = getCell(row, 'Title', 'title', 'Article', 'article') || 'Untitled';
    const url = getCell(row, 'URL', 'url', 'Link', 'link');
    const description = getCell(row, 'Description', 'description', 'Summary', 'summary');
    const date = getCell(row, 'Date', 'date');
    const notes = getCell(row, 'Notes', 'notes');
    const paywallVal = row.Paywall ?? row.paywall ?? '';
    const paywall = paywallVal === true || String(paywallVal).toLowerCase() === 'yes' || String(paywallVal).toLowerCase() === 'y';
    const status = getCell(row, 'Status', 'status') || 'Y';
    const imageUrl = getCell(row, 'Image URL', 'Image URL', 'image', 'Image');

    const ranks = {};
    ['MED', 'THC', 'CBD', 'INV'].forEach(cat => {
        const v = row[cat];
        if (v !== undefined && v !== null && String(v).trim() !== '') ranks[cat] = String(v).trim();
    });
    const categories = Object.keys(ranks).length ? Object.keys(ranks) : [];

    return {
        id: index + 1,
        title,
        url,
        description,
        date,
        categories,
        ranks,
        notes,
        paywall,
        status,
        image: imageUrl || null,
        imageSearchQuery: '',
        isValid: true,
        selected: true,
    };
}

async function main() {
    const fileArg = process.argv[2];
    const root = path.join(__dirname, '..');
    const candidates = fileArg
        ? [path.isAbsolute(fileArg) ? fileArg : path.join(root, fileArg)]
        : [
            path.join(root, 'Week 1-articles (1).xlsx'),
            path.join(root, 'Week 1-articles.xlsx'),
            path.join(root, 'week1-articles.xlsx'),
        ];

    let filePath = null;
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            filePath = p;
            break;
        }
    }
    if (!filePath) {
        console.error('No Excel file found. Put "Week 1-articles (1).xlsx" in the project root, or run:');
        console.error('  node scripts/upload-sheet-to-week1.js "path/to/your-file.xlsx"');
        process.exit(1);
    }

    console.log('Reading:', filePath);
    const buf = fs.readFileSync(filePath);
    const workbook = xlsx.read(buf, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        console.error('No sheets in file.');
        process.exit(1);
    }
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false });

    const isRowEmpty = (row) => !getCell(row, 'Title', 'title', 'Article', 'article') && !getCell(row, 'URL', 'url', 'Link', 'link');
    const nonEmpty = rawData.filter(row => !isRowEmpty(row));
    const articles = nonEmpty.map((row, i) => cleanArticle(row, i));

    if (articles.length === 0) {
        console.error('No articles found in sheet. Ensure columns like Title, URL (or Article, Link) exist.');
        process.exit(1);
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
        console.error('Missing SUPABASE_URL and SUPABASE_SECRET_KEY (or other key) in .env');
        process.exit(1);
    }

    const supabase = createClient(url, key);
    const defaultContent = {
        MED: { intro: '', outro: '' },
        THC: { intro: '', outro: '' },
        CBD: { intro: '', outro: '' },
        INV: { intro: '', outro: '' },
    };
    const workspace = {
        articles,
        archivedArticles: [],
        inspirationalImages: [],
        newsletterContent: defaultContent,
    };
    const sessions = {
        'Week 1': {
            articles: [...articles],
            archivedArticles: [],
            inspirationalImages: [],
            newsletterContent: defaultContent,
            savedAt: new Date().toISOString(),
        },
    };
    const now = new Date().toISOString();

    const { error: e1 } = await supabase.from(TABLE).upsert(
        [{ key: 'workspace', value: workspace, updated_at: now }],
        { onConflict: 'key' },
    );
    if (e1) {
        console.error('Workspace upsert failed:', e1.message);
        process.exit(1);
    }
    const { error: e2 } = await supabase.from(TABLE).upsert(
        [{ key: 'sessions', value: sessions, updated_at: now }],
        { onConflict: 'key' },
    );
    if (e2) {
        console.error('Sessions upsert failed:', e2.message);
        process.exit(1);
    }

    console.log(`Done. ${articles.length} articles written to Supabase as Week 1.`);
}

main();
