/**
 * Set up Supabase for Newsletter Maker: create newsletter_state table and seed Week 1.
 * Run: node scripts/setup-supabase-week1.js
 *
 * If the table doesn't exist yet, this script will print SQL for you to run in
 * Supabase → SQL Editor, then you run this script again to seed.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const TABLE = 'newsletter_state';
const SCHEMA_PATH = path.join(__dirname, '../supabase/schema.sql');

async function tableExists(supabase) {
    const { error } = await supabase.from(TABLE).select('key').limit(1).maybeSingle();
    if (error && (error.message.includes('Could not find') || error.message.includes('could not find') || error.message.includes('does not exist')))
        return false;
    if (error) throw error;
    return true;
}

async function main() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
        console.error('Missing SUPABASE_URL and one of SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY in .env');
        process.exit(1);
    }

    const supabase = createClient(url, key);

    const exists = await tableExists(supabase);
    if (!exists) {
        const sql = fs.readFileSync(SCHEMA_PATH, 'utf8').replace(/^--.*\n/gm, '').trim();
        console.log('Create the table in Supabase first:\n');
        console.log('1. Open https://supabase.com/dashboard → your project → SQL Editor → New query');
        console.log('2. Paste and run this SQL:\n');
        console.log(sql);
        console.log('\n3. Then run this script again: node scripts/setup-supabase-week1.js');
        process.exit(1);
    }

    // Table exists — run the seed
    const { seedWeek1 } = require('./seed-week1-to-supabase.js');
    await seedWeek1();
    console.log('Week 1 content is now in Supabase. Load "Week 1" in the app to see it.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
