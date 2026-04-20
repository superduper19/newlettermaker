import { createClient } from '@supabase/supabase-js';
import { Router } from 'express';

const router = Router();

let supabase = null;
let supabaseInitError = null;

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
            supabaseInitError = null;
            return supabase;
        }
        supabaseInitError =
            'Missing SUPABASE_URL or key ' +
            '(set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY in Vercel)';
    } catch (e) {
        supabaseInitError = e.message || 'Supabase init failed';
        console.warn('Supabase not configured:', supabaseInitError);
    }
    return null;
}

// State (workspace + sessions) lives in newsletter_state. Use SUPABASE_STATE_TABLE to override.
const TABLE = process.env.SUPABASE_STATE_TABLE || 'newsletter_state';

// GET /api/state/diagnostic — safe status for debugging (no secrets)
router.get('/diagnostic', async (req, res) => {
    const url = process.env.SUPABASE_URL;
    const hasKey = !!(
        process.env.SUPABASE_SECRET_KEY ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.SUPABASE_PUBLISHABLE_KEY
    );
    const client = getSupabase();
    let dbError = null;
    let sessionsCount = null;
    if (client) {
        try {
            const { data, error } =
                await client.from(TABLE).select('key').eq('key', 'sessions').maybeSingle();
            if (error) dbError = error.message;
            else if (data) sessionsCount = 'sessions row exists';
        } catch (e) {
            dbError = e.message || 'query failed';
        }
    }
    res.json({
        hasUrl: !!url,
        hasKey,
        configured: !!client,
        table: TABLE,
        initError: supabaseInitError || null,
        dbError: dbError || null,
        sessionsCount,
    });
});

// GET /api/state?key=workspace | ?key=sessions
router.get('/', async (req, res) => {
    const key = req.query.key;
    if (!key) {
        return res.status(400).json({ error: 'Missing key (workspace or sessions)' });
    }

    const client = getSupabase();
    if (!client) {
        return res.status(503).json({
            error: 'Database not configured',
            configured: false,
            hint: supabaseInitError,
        });
    }

    try {
        const { data, error } = await client
            .from(TABLE)
            .select('value')
            .eq('key', key)
            .maybeSingle();

        if (error) {
            console.error('Supabase get error:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json({ value: data ? data.value : null });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/state  body: { key: 'workspace'|'sessions', value: object }
router.post('/', async (req, res) => {
    const { key, value } = req.body;
    if (!key || value === undefined) {
        return res.status(400).json({ error: 'Missing key or value' });
    }
    if (key !== 'workspace' && key !== 'sessions') {
        return res.status(400).json({ error: 'key must be workspace or sessions' });
    }

    const client = getSupabase();
    if (!client) {
        return res.status(503).json({
            error: 'Database not configured',
            configured: false,
            hint: supabaseInitError,
        });
    }

    try {
        const { error } = await client
            .from(TABLE)
            .upsert(
                { key, value, updated_at: new Date().toISOString() },
                { onConflict: 'key' },
            );

        if (error) {
            console.error('Supabase upsert error:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json({ ok: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Optional: health check for DB
router.get('/config', (req, res) => {
    res.json({ configured: !!getSupabase() });
});

export default router;
