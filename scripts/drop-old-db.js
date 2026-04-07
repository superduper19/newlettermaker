/**
 * Drops the old app's table (newsletter_articles) and its trigger/policies.
 * Run: node scripts/drop-old-db.js
 *
 * Requires in .env:
 *   SUPABASE_DB_URL  — Direct Postgres connection string from Supabase:
 *                      Dashboard → Project Settings → Database → Connection string (URI)
 *                      e.g. postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
 */

require('dotenv').config();
const { Client } = require('pg');

const SQL = [
    'drop trigger if exists trg_newsletter_articles_updated_at on public.newsletter_articles',
    'drop policy if exists "newsletter_articles_select" on public.newsletter_articles',
    'drop policy if exists "newsletter_articles_insert" on public.newsletter_articles',
    'drop policy if exists "newsletter_articles_update" on public.newsletter_articles',
    'drop policy if exists "newsletter_articles_delete" on public.newsletter_articles',
    'drop table if exists public.newsletter_articles',
    'drop function if exists public.set_updated_at()',
];

async function main() {
    const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    if (!url) {
        console.error('Missing SUPABASE_DB_URL (or DATABASE_URL) in .env');
        console.error('');
        console.error('Get it from: Supabase Dashboard → Project Settings → Database → Connection string');
        console.error('Use the "URI" format (Session mode or Direct).');
        process.exit(1);
    }

    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        for (const q of SQL) {
            await client.query(q);
            console.log('OK:', q.split(' on ')[0].split(' if exists ')[1] || q.slice(0, 50) + '...');
        }
        console.log('');
        console.log('Old app database objects have been deleted.');
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
