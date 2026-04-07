/**
 * Backup workspace + all sessions from Supabase to a local JSON file.
 * Optionally save the current workspace as a named session (e.g. Week 3d).
 *
 * Run:
 *   node scripts/backup-state.js
 *     → writes backups/state-backup-YYYY-MM-DD-HHmm.json (no session name added)
 *   node scripts/backup-state.js "Week 3d"
 *     → same backup file + saves current workspace as session "Week 3d" in Supabase
 *
 * You can open the JSON to inspect sessions (e.g. "Week 3c") and restore one in the app
 * by loading it and then "Save current" with a new name.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const TABLE = process.env.SUPABASE_STATE_TABLE || 'newsletter_state';

function timestamp() {
    const d = new Date();
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'),
        day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0'), min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}-${h}${min}`;
}

async function main() {
    const sessionName = process.argv[2] && process.argv[2].trim() ? process.argv[2].trim() : null;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
        console.error('Missing SUPABASE_URL and SUPABASE_SECRET_KEY (or other key) in .env');
        process.exit(1);
    }

    const supabase = createClient(url, key);

    const { data: workspaceRow, error: ew } = await supabase
        .from(TABLE)
        .select('value')
        .eq('key', 'workspace')
        .maybeSingle();

    if (ew) {
        console.error('Failed to read workspace:', ew.message);
        process.exit(1);
    }
    const workspace = (workspaceRow && workspaceRow.value) ? workspaceRow.value : {
        articles: [],
        archivedArticles: [],
        inspirationalImages: [],
        newsletterContent: {},
    };

    const { data: sessionsRow, error: es } = await supabase
        .from(TABLE)
        .select('value')
        .eq('key', 'sessions')
        .maybeSingle();

    if (es) {
        console.error('Failed to read sessions:', es.message);
        process.exit(1);
    }
    const sessions = sessionsRow && sessionsRow.value && typeof sessionsRow.value === 'object'
        ? { ...sessionsRow.value }
        : {};

    const backup = {
        backedUpAt: new Date().toISOString(),
        workspace,
        sessions,
    };

    const dir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filename = `state-backup-${timestamp()}.json`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf8');
    console.log('Backup written:', filepath);
    console.log('  workspace:', (workspace.articles || []).length, 'articles');
    console.log('  sessions:', Object.keys(sessions).join(', ') || '(none)');

    if (sessionName) {
        const articles = workspace.articles || [];
        const defaultContent = {
            MED: { intro: '', outro: '' },
            THC: { intro: '', outro: '' },
            CBD: { intro: '', outro: '' },
            INV: { intro: '', outro: '' },
        };
        const nc = workspace.newsletterContent || defaultContent;
        sessions[sessionName] = {
            articles: JSON.parse(JSON.stringify(articles)),
            archivedArticles: workspace.archivedArticles || [],
            inspirationalImages: workspace.inspirationalImages || [],
            newsletterContent: {
                ...nc,
                templates: (nc.templates || { MED: '', THC: '', CBD: '', INV: '' }),
            },
            savedAt: new Date().toISOString(),
        };
        const { error: eu } = await supabase
            .from(TABLE)
            .upsert(
                { key: 'sessions', value: sessions, updated_at: new Date().toISOString() },
                { onConflict: 'key' },
            );
        if (eu) {
            console.error('Failed to save session "' + sessionName + '" to server:', eu.message);
            process.exit(1);
        }
        console.log('Saved current workspace as session "' + sessionName + '" on server. Refresh from server in the app to see it.');
    }
}

main();
