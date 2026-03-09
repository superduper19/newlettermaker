/**
 * Restore a session from a backup JSON file to Supabase (as a new session name).
 * Use this if you have a backup that contains the articles/numbers you want (e.g. Week 3c).
 *
 * Run:
 *   node scripts/restore-session-from-backup.js backups/state-backup-2025-02-28-1430.json "Week 3c" "Week 3d"
 *     → Reads backup file, takes session "Week 3c" from it, saves it as "Week 3d" in Supabase.
 *
 * Or to restore the workspace from the backup (overwrite current workspace on server):
 *   node scripts/restore-session-from-backup.js backups/state-backup-2025-02-28-1430.json --workspace
 *     → Pushes backup.workspace to Supabase (current workspace = backup snapshot).
 *
 * Or to restore a session from backup and also set it as the current workspace:
 *   node scripts/restore-session-from-backup.js backups/state-backup-2025-02-28-1430.json "Week 3c" "Week 3d" --as-workspace
 *     → Saves session as "Week 3d" and sets workspace = that session so the app shows it on next refresh.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const TABLE = process.env.SUPABASE_STATE_TABLE || 'newsletter_state';

async function main() {
    const args = process.argv.slice(2);
    const restoreWorkspace = args.includes('--workspace');
    const asWorkspace = args.includes('--as-workspace');
    const rest = args.filter(a => !a.startsWith('--'));
    const filepath = rest[0];
    const fromSession = rest[1]; // session name in backup (e.g. "Week 3c")
    const toSession = rest[2];  // session name to save as (e.g. "Week 3d")

    if (!filepath || !fs.existsSync(filepath)) {
        console.error('Usage: node scripts/restore-session-from-backup.js <backup-file> [fromSession] [toSession] [--as-workspace]');
        console.error('   or: node scripts/restore-session-from-backup.js <backup-file> --workspace');
        console.error('Backup file not found:', filepath);
        process.exit(1);
    }

    const raw = fs.readFileSync(filepath, 'utf8');
    let backup;
    try {
        backup = JSON.parse(raw);
    } catch (e) {
        console.error('Invalid JSON in backup file:', e.message);
        process.exit(1);
    }

    const sessions = backup.sessions || {};
    const workspace = backup.workspace || {};

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
        console.error('Missing SUPABASE_URL and key in .env');
        process.exit(1);
    }

    const supabase = createClient(url, key);

    if (restoreWorkspace) {
        const { error } = await supabase
            .from(TABLE)
            .upsert(
                { key: 'workspace', value: workspace, updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );
        if (error) {
            console.error('Failed to restore workspace:', error.message);
            process.exit(1);
        }
        console.log('Restored workspace from backup (' + (workspace.articles || []).length + ' articles). Refresh the app.');
        return;
    }

    if (!fromSession || !toSession) {
        console.error('Specify fromSession and toSession, e.g. "Week 3c" "Week 3d"');
        console.error('Sessions in backup:', Object.keys(sessions).join(', ') || '(none)');
        process.exit(1);
    }

    const source = sessions[fromSession];
    if (!source || !source.articles) {
        console.error('Session "' + fromSession + '" not found in backup or has no articles.');
        console.error('Sessions in backup:', Object.keys(sessions).join(', '));
        process.exit(1);
    }

    const { data: sessionsRow, error: es } = await supabase
        .from(TABLE)
        .select('value')
        .eq('key', 'sessions')
        .maybeSingle();
    if (es) {
        console.error('Failed to read sessions:', es.message);
        process.exit(1);
    }
    const currentSessions = sessionsRow && sessionsRow.value && typeof sessionsRow.value === 'object'
        ? { ...sessionsRow.value }
        : {};

    currentSessions[toSession] = {
        ...source,
        articles: JSON.parse(JSON.stringify(source.articles)),
        savedAt: new Date().toISOString()
    };

    const { error: eu } = await supabase
        .from(TABLE)
        .upsert(
            { key: 'sessions', value: currentSessions, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
        );
    if (eu) {
        console.error('Failed to save session:', eu.message);
        process.exit(1);
    }
    console.log('Restored session "' + fromSession + '" from backup as "' + toSession + '" (' + source.articles.length + ' articles).');

    if (asWorkspace) {
        const { error: ew } = await supabase
            .from(TABLE)
            .upsert(
                { key: 'workspace', value: { articles: source.articles, archivedArticles: source.archivedArticles || [], inspirationalImages: source.inspirationalImages || [], newsletterContent: source.newsletterContent || {} }, updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );
        if (ew) {
            console.error('Failed to set workspace:', ew.message);
            process.exit(1);
        }
        console.log('Set workspace to "' + toSession + '". Refresh the app to see it.');
    } else {
        console.log('In the app, click "Refresh from server" and select "' + toSession + '" from the dropdown to load it.');
    }
}

main();
