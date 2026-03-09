/**
 * List session names and article counts currently in the Supabase database.
 * Run: node scripts/list-sessions-in-db.js
 *
 * This shows only what is in the DB. The app dropdown can show more names
 * because it merges server sessions + localStorage (local-only sessions).
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const TABLE = process.env.SUPABASE_STATE_TABLE || 'newsletter_state';

async function main() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
        console.error('Missing SUPABASE_URL and key in .env');
        process.exit(1);
    }

    const supabase = createClient(url, key);

    const { data: sessionsRow, error } = await supabase
        .from(TABLE)
        .select('value')
        .eq('key', 'sessions')
        .maybeSingle();

    if (error) {
        console.error('Failed to read sessions:', error.message);
        process.exit(1);
    }

    const sessions = sessionsRow && sessionsRow.value && typeof sessionsRow.value === 'object'
        ? sessionsRow.value
        : {};

    const names = Object.keys(sessions).sort();
    console.log('Sessions in database (' + names.length + '):');
    if (names.length === 0) {
        console.log('  (none)');
        return;
    }
    names.forEach(name => {
        const s = sessions[name];
        const count = (s && s.articles) ? s.articles.length : 0;
        const date = (s && s.savedAt) ? s.savedAt : '';
        console.log('  -', name, '(' + count + ' articles)', date ? date.slice(0, 10) : '');
    });
}

main();
