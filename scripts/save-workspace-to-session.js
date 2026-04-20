/**
 * Save the current Supabase workspace (articles, etc.) as a named session
 * without overwriting other sessions. Use when the app's workspace has the
 * articles you want but the session dropdown doesn't show them.
 *
 * Run: node scripts/save-workspace-to-session.js "Week 3 B"
 * Default name if omitted: "Week 3 B"
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const TABLE = process.env.SUPABASE_STATE_TABLE || 'newsletter_state';

async function main() {
    const sessionName =
        process.argv[2] && process.argv[2].trim()
            ? process.argv[2].trim()
            : 'Week 3 B';

    const url = process.env.SUPABASE_URL;
    const key =
        process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.SUPABASE_PUBLISHABLE_KEY;
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
    if (!workspaceRow || !workspaceRow.value) {
        console.error(
            'No workspace in database. ' +
            'Load articles in the app first (or upload a sheet), then run this script.',
        );
        process.exit(1);
    }

    const workspace = workspaceRow.value;
    const articles = workspace.articles || [];
    if (articles.length === 0) {
        console.error('Workspace has no articles.');
        process.exit(1);
    }

    const { data: sessionsRow, error: es } =
        await supabase
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
        console.error('Failed to write sessions:', eu.message);
        process.exit(1);
    }

    console.log(`Saved workspace as session "${sessionName}" (${articles.length} articles).`);
    console.log(
        'In the app, click "Refresh from server" or reload the page to see it in the dropdown.',
    );
}

main();
