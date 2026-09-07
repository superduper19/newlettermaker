// Priority sources: sites we sweep in full (every article in a date window) instead
// of relying on the AI to stumble across them in a general web search.
//
// The hard part is access. Several cannabis trade sites sit behind bot protection
// that returns 403 to a plain fetch, but each one is usually reachable by SOME route:
// a JSON-challenge site may serve a non-browser User-Agent happily, a Cloudflare site
// may still serve its RSS feed, and a fully walled site may only be visible through
// Google News. So every strategy here is tried in order and we report which one won,
// rather than declaring a site dead on the first 403.

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const BOT_UA = 'NewsletterMaker/1.0 (+https://purablis.com)';

// Order matters: most sites want a browser UA, but a few (norml.org) serve a
// "Checking your browser... Javascript required" challenge to browser UAs and
// plain HTML to anything that admits to being a bot.
const UA_PROFILES = [
    { name: 'browser', ua: BROWSER_UA },
    { name: 'bot', ua: BOT_UA },
];

// Seed list. Verified reachable (or explicitly flagged) as of the initial build —
// the UI lets the user edit, add and remove entries, so this is only the default.
const DEFAULT_SOURCES = [
    { url: 'https://norml.org/', label: 'NORML', restrictions: 'Policy, arrests, legalization. Skip fundraising and internship posts.', enabled: true },
    { url: 'https://mjbizdaily.com/', label: 'MJBizDaily', restrictions: 'Business and regulatory news. Skip conference promos.', enabled: true },
    { url: 'https://ganjapreneur.com/', label: 'Ganjapreneur', restrictions: 'Industry news. Skip podcast and sponsored posts.', enabled: true },
    { url: 'https://stratcann.com/', label: 'StratCann', restrictions: 'Canadian market news.', enabled: true },
    { url: 'https://hemptoday.net/', label: 'HempToday', restrictions: 'Hemp/CBD supply chain and international hemp policy.', enabled: true },
    { url: 'https://prohibitionpartners.com/international-cannabis-weekly/', label: 'Prohibition Partners ICW', restrictions: 'International cannabis weekly round-ups.', enabled: true },
];

// Signals that we got a bot wall / challenge page rather than the article.
const CHALLENGE_SIGNALS = [
    'checking your browser',
    'javascript required',
    'enable javascript and cookies',
    'just a moment',
    'attention required',
    'sorry, you have been blocked',
    'please enable cookies',
    'captcha',
    'robot check',
    'access denied',
    'pardon our interruption',
    'please wait while your request is being verified',
];

const PAYWALL_SIGNALS = [
    'subscribe to read',
    'subscription required',
    'sign in to continue',
    'sign in to read',
    'log in to continue',
    'unlock this article',
    'continue reading with',
    'already a subscriber',
    'digital subscription',
];

function stripHtml(html) {
    return String(html || '')
        .replace(/<script[^>]*>[\S\s]*?<\/script>/gim, '')
        .replace(/<style[^>]*>[\S\s]*?<\/style>/gim, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&#8217;|&rsquo;/gi, "'")
        .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/gi, '"')
        .replace(/&#8211;|&ndash;/gi, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

// Classify a response body. Returns null when the page looks like real content.
function detectBlock(status, body) {
    if (status === 404 || status === 410) return { kind: 'missing', reason: `HTTP ${status}` };
    const text = stripHtml(body).toLowerCase();
    const challenge = CHALLENGE_SIGNALS.find((s) => text.includes(s));
    if (challenge) return { kind: 'bot-block', reason: `bot wall ("${challenge}")` };
    if (status >= 400) return { kind: 'http-error', reason: `HTTP ${status}` };
    const paywall = PAYWALL_SIGNALS.find((s) => text.includes(s));
    if (paywall) return { kind: 'paywall', reason: `paywall ("${paywall}")` };
    return null;
}

/**
 * Fetch a URL, retrying with a different User-Agent when the first attempt hits a
 * bot wall. Returns which UA profile actually worked so the caller can report it.
 */
async function fetchSmart(url, options = {}) {
    const { accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', timeout = 20000 } = options;
    let last = null;

    for (const profile of UA_PROFILES) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': profile.ua,
                    Accept: accept,
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                redirect: 'follow',
                signal: controller.signal,
            });
            const body = await response.text();
            const block = detectBlock(response.status, body);
            const result = {
                ok: !block,
                status: response.status,
                finalUrl: response.url || url,
                body,
                contentType: (response.headers.get('content-type') || '').toLowerCase(),
                uaProfile: profile.name,
                block,
            };
            if (!block) return result;
            last = result;
            // A missing page won't be fixed by another User-Agent.
            if (block.kind === 'missing') return result;
        } catch (error) {
            last = { ok: false, status: 0, finalUrl: url, body: '', uaProfile: profile.name, block: { kind: 'network', reason: error.name === 'AbortError' ? 'timed out' : error.message } };
        } finally {
            clearTimeout(timer);
        }
    }
    return last;
}

// ── Feed / API parsing ────────────────────────────────────────────────────────

function unwrapCdata(value) {
    return String(value || '').replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '').trim();
}

function tagValue(block, tag) {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return m ? unwrapCdata(m[1]) : '';
}

/** Tolerant RSS 2.0 + Atom item parser. No XML dependency, matching the rest of the app. */
function parseFeedItems(xml) {
    const source = String(xml || '');
    const blocks = [
        ...source.matchAll(/<item[\s>][\s\S]*?<\/item>/gi),
        ...source.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi),
    ].map((m) => m[0]);

    return blocks.map((block) => {
        let link = tagValue(block, 'link');
        if (!link) {
            const href = block.match(/<link[^>]+href=["']([^"']+)["']/i);
            link = href ? href[1] : '';
        }
        const date = tagValue(block, 'pubDate') || tagValue(block, 'published') || tagValue(block, 'updated') || tagValue(block, 'dc:date');
        const contentEncoded = tagValue(block, 'content:encoded') || tagValue(block, 'content');
        const description = tagValue(block, 'description') || tagValue(block, 'summary');
        const sourceHost = (block.match(/<source[^>]+url=["']([^"']+)["']/i) || [])[1] || '';
        return {
            title: stripHtml(tagValue(block, 'title')),
            url: link.trim(),
            date,
            description: stripHtml(contentEncoded || description).slice(0, 1200),
            publisherHint: sourceHost,
        };
    }).filter((i) => i.title && i.url);
}

function looksLikeFeed(body) {
    return /<(rss|feed)[\s>]/i.test(String(body || '').slice(0, 4000));
}

function toDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function withinWindow(dateValue, sinceISO, untilISO) {
    const d = toDate(dateValue);
    // Undated items are kept — the evaluation stage sees the date field and the user
    // can still judge them. Dropping them silently loses real articles.
    if (!d) return true;
    if (sinceISO) {
        const since = toDate(sinceISO);
        if (since && d < since) return false;
    }
    if (untilISO) {
        const until = toDate(untilISO);
        if (until && d > new Date(until.getTime() + 24 * 60 * 60 * 1000)) return false;
    }
    return true;
}

/**
 * Render a timestamp in whatever timezone the publisher stamped it with, so the date
 * we store is the date their page displays. Formatting in the server's own timezone
 * instead shifts evening publications a day backwards (a UTC-midnight stamp reads as
 * "yesterday" anywhere west of Greenwich), which is a day off on every such article.
 */
function formatDateMMDDYY(value) {
    const raw = String(value || '').trim();
    const d = toDate(raw);
    if (!d) return '';

    // A trailing ±HH:MM means the publisher's local clock; shift onto it, then read
    // the calendar date in UTC. A "Z" or no offset needs no shift.
    let ms = d.getTime();
    const offset = raw.match(/([+-])(\d{2}):?(\d{2})\s*$/);
    if (offset) {
        const sign = offset[1] === '-' ? -1 : 1;
        ms += sign * ((Number(offset[2]) * 60) + Number(offset[3])) * 60000;
    }

    const shifted = new Date(ms);
    const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(shifted.getUTCDate()).padStart(2, '0');
    const yy = String(shifted.getUTCFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
}

// ── Access strategies ─────────────────────────────────────────────────────────

function originOf(url) {
    try {
        return new URL(url).origin + '/';
    } catch {
        return null;
    }
}

function hostOf(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

/**
 * The user often pastes a deep link (a single weekly issue, say). The listing page
 * that holds *all* of them is usually the parent path, so walk numeric/slug leaves up.
 */
function indexPageFor(url) {
    try {
        const u = new URL(url);
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) {
            parts.pop();
            return `${u.origin}/${parts.join('/')}/`;
        }
        return u.pathname === '/' ? null : `${u.origin}${u.pathname.replace(/\/?$/, '/')}`;
    } catch {
        return null;
    }
}

/** WordPress REST API — the best route when available: real dates, server-side filtering. */
async function viaWpJson(source, { sinceISO, untilISO, limit }) {
    const origin = originOf(source.url);
    if (!origin) return null;

    const params = new URLSearchParams({
        per_page: String(Math.min(limit || 50, 100)),
        _fields: 'id,date,link,title,excerpt',
        orderby: 'date',
        order: 'desc',
    });
    if (sinceISO) params.set('after', new Date(sinceISO).toISOString());
    if (untilISO) params.set('before', new Date(new Date(untilISO).getTime() + 24 * 60 * 60 * 1000).toISOString());

    const res = await fetchSmart(`${origin}wp-json/wp/v2/posts?${params}`, { accept: 'application/json' });
    if (!res || !res.ok) return null;

    let posts;
    try {
        posts = JSON.parse(res.body);
    } catch {
        return null;
    }
    if (!Array.isArray(posts) || posts.length === 0) return null;

    return {
        method: 'wp-json',
        uaProfile: res.uaProfile,
        items: posts.map((p) => ({
            title: stripHtml(p.title && p.title.rendered),
            url: p.link,
            date: p.date_gmt || p.date,
            description: stripHtml(p.excerpt && p.excerpt.rendered).slice(0, 1200),
        })).filter((i) => i.title && i.url),
    };
}

/** RSS/Atom. Often survives bot protection that blocks the HTML pages (MJBizDaily). */
async function viaFeed(source, { sinceISO, untilISO }) {
    const origin = originOf(source.url);
    if (!origin) return null;

    const candidates = [];
    // Prefer a feed the site declares on the page the user actually pointed at.
    const home = await fetchSmart(source.url);
    if (home && home.ok) {
        for (const tag of home.body.match(/<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/gi) || []) {
            const href = tag.match(/href=["']([^"']+)["']/i);
            if (href) {
                try { candidates.push(new URL(href[1], source.url).href); } catch { /* ignore */ }
            }
        }
    }
    for (const path of ['feed/', 'rss', 'feed', 'index.xml', '?feed=rss2']) {
        try { candidates.push(new URL(path, origin).href); } catch { /* ignore */ }
    }

    for (const candidate of [...new Set(candidates)]) {
        const res = await fetchSmart(candidate, { accept: 'application/rss+xml, application/xml, text/xml, */*' });
        if (!res || !res.ok || !looksLikeFeed(res.body)) continue;
        const items = parseFeedItems(res.body).filter((i) => withinWindow(i.date, sinceISO, untilISO));
        if (items.length === 0 && parseFeedItems(res.body).length === 0) continue;
        return { method: 'rss', feedUrl: candidate, uaProfile: res.uaProfile, items };
    }
    return null;
}

/**
 * Scrape article links off a listing page. Used for sections that have no feed of
 * their own (e.g. a "weekly issue" archive), and as a general fallback.
 */
async function viaListingPage(source, { limit }) {
    const index = indexPageFor(source.url) || source.url;
    const res = await fetchSmart(index);
    if (!res || !res.ok) return null;

    const origin = originOf(source.url);
    const base = new URL(index);
    const seen = new Map();

    for (const m of res.body.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{0,300}?)<\/a>/gi)) {
        let u;
        try { u = new URL(m[1], base); } catch { continue; }
        if (u.origin !== base.origin) continue;
        const p = u.pathname;
        if (p === '/' || p.length < 10) continue;
        if (/\.(jpg|jpeg|png|gif|svg|css|js|pdf|webp|zip)$/i.test(p)) continue;
        if (/\/(category|tag|author|page|wp-|feed|about|contact|privacy|terms|shop|cart|login)\b/i.test(p)) continue;
        const text = stripHtml(m[2]);
        const href = u.href.split('#')[0];
        if (!seen.has(href) || (text.length > (seen.get(href) || '').length)) seen.set(href, text);
    }

    // When the user pointed at a section (e.g. a weekly-issue archive), that section's
    // own entries are the answer — sitewide links off the same page are noise.
    const sectionPrefix = base.pathname;
    seen.delete(index);
    seen.delete(index.replace(/\/$/, ''));
    const all = [...seen.entries()];
    const inSection = sectionPrefix !== '/' ? all.filter(([href]) => new URL(href).pathname.startsWith(sectionPrefix)) : [];
    const ranked = (inSection.length ? inSection : all).slice(0, Math.min(limit || 25, 40));

    if (ranked.length === 0) return null;
    return {
        method: 'listing-page',
        indexUrl: index,
        uaProfile: res.uaProfile,
        needsPageFetch: true,
        items: ranked.map(([url, text]) => ({ title: text || url, url, date: '', description: '' })),
        origin,
    };
}

// you.com's older api.ydc-index.io host now returns a blanket 403 (a deliberately
// invalid key gets the identical response, so it is the gateway refusing, not auth).
// This is the endpoint that actually answers, and it takes the same ydc_ key.
const YOU_SEARCH_ENDPOINT = 'https://api.you.com/v1/search';

/**
 * you.com search index. For a site whose edge blocks us (StratCann), this is the best
 * fallback available: unlike Google News it hands back the real publisher URL plus a
 * snippet and a publication date, so the article is linkable and there is text to
 * evaluate against.
 *
 * Silently skipped when no key is set, so the ladder just falls through to Google
 * News. Results are filtered to the source's own host, which means a `site:` operator
 * the API happens not to honour degrades to "no results" rather than to articles from
 * the wrong publisher.
 */
async function viaYouCom(source, { sinceISO, untilISO }) {
    const apiKey = process.env.YDC_API_KEY || process.env.YOU_API_KEY;
    if (!apiKey) return null;

    const host = hostOf(source.url);
    if (!host) return null;

    const call = async (params) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        try {
            const response = await fetch(`${YOU_SEARCH_ENDPOINT}?${params}`, {
                headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
                signal: controller.signal,
            });
            if (!response.ok) {
                console.warn(`you.com search returned ${response.status} for ${host}`);
                return null;
            }
            return await response.json();
        } catch (error) {
            console.warn(`you.com search failed for ${host}: ${error.message}`);
            return null;
        } finally {
            clearTimeout(timer);
        }
    };

    // Results come back relevance-ranked rather than newest-first, so a date window
    // needs a wide pull that we then filter. Pages are requested until the window is
    // covered or the index stops returning anything new.
    const query = `site:${host}`;
    const byUrl = new Map();

    for (let offset = 0; offset < 3; offset++) {
        const params = new URLSearchParams({ query, count: '50' });
        if (offset) params.set('offset', String(offset));

        const payload = await call(params);
        const web = payload && payload.results && Array.isArray(payload.results.web) ? payload.results.web : [];
        if (web.length === 0) break;

        let added = 0;
        for (const r of web) {
            const url = String(r.url || '');
            if (!url || byUrl.has(url)) continue;
            // The index also returns section pages ("/news/"), which carry no date and
            // are not articles. Requiring a publication date drops them cleanly.
            if (!r.page_age) continue;
            if (hostOf(url) !== host) continue;

            const snippet = Array.isArray(r.snippets) ? r.snippets.join(' ') : '';
            byUrl.set(url, {
                // Index titles carry the site's own " | Publisher" tail.
                title: stripHtml(r.title || '').replace(/\s*[|·]\s*[^|·]{2,40}$/, '').trim(),
                url,
                date: r.page_age,
                description: stripHtml(snippet || r.description || '').slice(0, 1200),
            });
            added++;
        }
        if (added === 0) break;
    }

    const items = [...byUrl.values()]
        .filter((i) => i.title && withinWindow(i.date, sinceISO, untilISO))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (items.length === 0) return null;
    return { method: 'you.com', uaProfile: 'api', items };
}

/**
 * Last resort for sites whose edge blocks us outright (StratCann). Google News still
 * indexes them, so we can at least see what was published and when. The links are
 * Google redirect URLs, so items are flagged for the caller.
 */
async function viaGoogleNews(source, { sinceISO }) {
    const host = hostOf(source.url);
    if (!host) return null;

    let when = '30d';
    const since = toDate(sinceISO);
    if (since) {
        const days = Math.ceil((Date.now() - since.getTime()) / (24 * 60 * 60 * 1000));
        when = `${Math.min(Math.max(days, 1), 365)}d`;
    }
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`site:${host} when:${when}`)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetchSmart(url, { accept: 'application/rss+xml, application/xml, text/xml, */*' });
    if (!res || !res.ok || !looksLikeFeed(res.body)) return null;

    const items = parseFeedItems(res.body).map((i) => ({
        // Google News appends " - Publisher" to every headline.
        title: i.title.replace(/\s+-\s+[^-]{2,40}$/, '').trim(),
        url: i.url,
        date: i.date,
        description: '',
        isRedirectLink: true,
    }));
    if (items.length === 0) return null;
    return { method: 'google-news', uaProfile: res.uaProfile, items, degraded: true };
}

/**
 * For a site we cannot fetch at all, neither index alone is enough: you.com returns
 * real URLs, dates and snippets but indexes only part of the site, while Google News
 * covers far more of it behind unusable redirect links and bare headlines. Running
 * both and merging gives the breadth of one with the quality of the other — you.com's
 * entry always wins for a story both found.
 */
async function viaBlockedSiteIndexes(source, options) {
    const [you, googleNews] = await Promise.all([
        viaYouCom(source, options).catch(() => null),
        viaGoogleNews(source, options).catch(() => null),
    ]);

    if (!you) return googleNews;
    if (!googleNews) return you;

    // Titles are the only shared key: one side has real URLs, the other redirects.
    const titleKey = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const seen = new Set(you.items.map((i) => titleKey(i.title)));
    const extra = googleNews.items.filter((i) => {
        const key = titleKey(i.title);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return {
        method: extra.length ? 'you.com + google-news' : 'you.com',
        uaProfile: 'api',
        // Flagged degraded only if we still lean on redirect-link items.
        degraded: extra.length > 0,
        items: [...you.items, ...extra],
    };
}

/**
 * A bare domain is best swept from its main post feed or REST API. A section URL
 * ("…/international-cannabis-weekly/") means the user wants that section specifically,
 * and the sitewide feed would return the wrong posts — so scrape the section first.
 */
function strategiesFor(source) {
    let hasSection = false;
    try {
        hasSection = new URL(source.url).pathname.replace(/\/+$/, '') !== '';
    } catch { /* fall through to the default order */ }

    // you.com sits ahead of Google News: both are for sites we cannot fetch directly,
    // but you.com returns the real article URL and a snippet where Google News gives
    // only a redirect link and a headline.
    return hasSection
        ? [viaListingPage, viaFeed, viaWpJson, viaBlockedSiteIndexes]
        : [viaWpJson, viaFeed, viaListingPage, viaBlockedSiteIndexes];
}

// ── Page enrichment ───────────────────────────────────────────────────────────

function extractPublishedDate(html) {
    const patterns = [
        /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+name=["'](?:date|pubdate|publish-date|DC.date.issued)["'][^>]+content=["']([^"']+)["']/i,
        /"datePublished"\s*:\s*"([^"]+)"/i,
        /<time[^>]+datetime=["']([^"']+)["']/i,
    ];
    for (const re of patterns) {
        const m = String(html || '').match(re);
        if (m && toDate(m[1])) return m[1];
    }
    return '';
}

/** The "last updated" stamp, used to spot evergreen pages masquerading as fresh news. */
function extractModifiedDate(html) {
    const patterns = [
        /<meta[^>]+property=["']article:modified_time["'][^>]+content=["']([^"']+)["']/i,
        /"dateModified"\s*:\s*"([^"]+)"/i,
    ];
    for (const re of patterns) {
        const m = String(html || '').match(re);
        if (m && toDate(m[1])) return m[1];
    }
    return '';
}

function urlKey(url) {
    return String(url || '').replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
}

/**
 * Establish when an article was ACTUALLY published, rather than trusting the date a
 * search result reported. Search engines routinely surface an evergreen page's
 * "updated" stamp, and a news page often shows several other articles' dates in its
 * furniture, so an AI reading the page can pick the wrong one by many months.
 *
 * Order: the page's own structured metadata, then the publisher's feed (which still
 * works for sites whose article pages are bot-walled, e.g. MJBizDaily).
 */
async function resolveArticleDate(url, cache) {
    if (!url) return { date: '', via: null };
    const store = cache || {};
    store.feeds = store.feeds || new Map();

    const page = await fetchSmart(url, { timeout: 15000 });
    if (page && page.ok) {
        const published = extractPublishedDate(page.body);
        if (published) {
            return {
                date: published,
                modified: extractModifiedDate(page.body),
                via: 'page metadata',
            };
        }
    }

    // Feed fallback. Cached per origin so a list of 20 articles from one site pulls
    // that site's feed once rather than twenty times.
    const origin = originOf(url);
    if (origin) {
        if (!store.feeds.has(origin)) {
            const map = new Map();
            try {
                const feed = await viaFeed({ url: origin }, {});
                if (feed) feed.items.forEach((i) => map.set(urlKey(i.url), i.date));
            } catch { /* a site with no readable feed simply yields no date */ }
            store.feeds.set(origin, map);
        }
        const fromFeed = store.feeds.get(origin).get(urlKey(url));
        if (fromFeed) return { date: fromFeed, via: 'publisher feed' };
    }

    return { date: '', via: null, blocked: page && page.block ? page.block.reason : null };
}

function extractTitle(html) {
    const og = String(html || '').match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (og) return stripHtml(og[1]);
    const t = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return t ? stripHtml(t[1]) : '';
}

/** Pull date/title/excerpt off the article page itself, for items that arrived thin. */
async function enrichItem(item) {
    const res = await fetchSmart(item.url, { timeout: 15000 });
    if (!res || !res.ok) {
        return { ...item, fetchBlocked: res && res.block ? res.block.reason : 'unreachable' };
    }
    const text = stripHtml(res.body);
    return {
        ...item,
        title: item.title && item.title.length > 12 ? item.title : (extractTitle(res.body) || item.title),
        date: item.date || extractPublishedDate(res.body),
        description: item.description || text.slice(0, 1200),
        contentChars: text.length,
        url: res.finalUrl || item.url,
    };
}

async function mapLimited(items, limit, fn) {
    const out = new Array(items.length);
    let next = 0;
    async function worker() {
        while (next < items.length) {
            const i = next++;
            out[i] = await fn(items[i], i);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return out;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Probe a source: can we reach it at all, by which route, and do real article pages
 * come back readable? This is the "is the site going to block us" pre-flight the
 * whole feature depends on.
 */
async function checkSourceAccess(source, options = {}) {
    const { sampleSize = 2 } = options;
    const started = Date.now();
    const notes = [];
    const result = {
        url: source.url,
        label: source.label || hostOf(source.url),
        ok: false,
        method: null,
        uaProfile: null,
        itemCount: 0,
        articlesReadable: 0,
        articlesChecked: 0,
        degraded: false,
        blockReason: null,
        notes,
        samples: [],
    };

    const direct = await fetchSmart(source.url);
    if (direct && direct.ok) {
        notes.push(`Landing page loads (${direct.uaProfile} User-Agent).`);
    } else if (direct) {
        notes.push(`Landing page refused: ${direct.block ? direct.block.reason : 'unknown'}. Trying feeds and APIs.`);
    }

    let harvest = null;
    for (const strategy of strategiesFor(source)) {
        try {
            harvest = await strategy(source, { sinceISO: null, untilISO: null, limit: 10 });
        } catch (error) {
            notes.push(`${strategy.name} failed: ${error.message}`);
            harvest = null;
        }
        if (harvest && harvest.items && harvest.items.length) break;
    }

    if (!harvest || !harvest.items || harvest.items.length === 0) {
        result.blockReason = direct && direct.block ? direct.block.reason : 'no feed, API or listing page could be read';
        notes.push('No route into this site worked from the server. It will be skipped on sweeps.');
        result.elapsedMs = Date.now() - started;
        return result;
    }

    result.method = harvest.method;
    result.uaProfile = harvest.uaProfile;
    result.itemCount = harvest.items.length;
    result.degraded = !!harvest.degraded;
    if (harvest.feedUrl) notes.push(`Feed: ${harvest.feedUrl}`);
    if (harvest.indexUrl) notes.push(`Listing page: ${harvest.indexUrl}`);

    // The real test: do the article pages themselves load, or only the index?
    const sample = harvest.items.filter((i) => !i.isRedirectLink).slice(0, sampleSize);
    const checked = await mapLimited(sample, 2, async (item) => {
        const res = await fetchSmart(item.url, { timeout: 15000 });
        const chars = res && res.ok ? stripHtml(res.body).length : 0;
        return {
            url: item.url,
            title: item.title,
            ok: !!(res && res.ok && chars >= 600),
            chars,
            blockReason: res && res.block ? res.block.reason : (chars && chars < 600 ? 'page too short to evaluate' : null),
        };
    });

    result.samples = checked;
    result.articlesChecked = checked.length;
    result.articlesReadable = checked.filter((c) => c.ok).length;

    if (harvest.degraded) {
        const viaYou = String(harvest.method || '').includes('you.com');
        const redirects = harvest.items.filter((i) => i.isRedirectLink).length;
        notes.push(viaYou
            ? `This site blocks direct fetches, so it is read through search indexes instead. ${harvest.items.length - redirects} item(s) came from you.com with real article links and summary text; ${redirects} more came from Google News as headline-and-date only, behind Google redirect links.`
            : 'Only reachable through Google News: headlines and dates come through, but article pages are blocked, so evaluation runs on headline plus date only and links are Google redirects.');
        if (!viaYou && !(process.env.YDC_API_KEY || process.env.YOU_API_KEY)) {
            notes.push('Setting YDC_API_KEY would let this site be read through you.com, which returns real article links and text instead of redirects.');
        }
        result.ok = true;
    } else if (checked.length === 0) {
        notes.push(`Found ${harvest.items.length} items via ${harvest.method}, but no article page could be sampled.`);
        result.ok = true;
    } else if (result.articlesReadable === 0) {
        notes.push(`Article listings load via ${harvest.method}, but the article pages are blocked (${checked[0].blockReason}). Sweeps will still collect titles, dates and feed summaries.`);
        result.degraded = true;
        result.ok = true;
        result.blockReason = checked[0].blockReason;
    } else {
        notes.push(`${result.articlesReadable} of ${checked.length} sampled article pages read cleanly.`);
        result.ok = true;
    }

    result.elapsedMs = Date.now() - started;
    return result;
}

/**
 * Collect every article this source published in the window, using whichever access
 * route works. Returns normalized items ready for AI evaluation.
 */
async function harvestSource(source, options = {}) {
    const { sinceISO = null, untilISO = null, limit = 40, enrich = true } = options;
    const notes = [];
    let harvest = null;

    for (const strategy of strategiesFor(source)) {
        try {
            harvest = await strategy(source, { sinceISO, untilISO, limit });
        } catch (error) {
            notes.push(`${strategy.name}: ${error.message}`);
            harvest = null;
        }
        if (harvest && harvest.items && harvest.items.length) break;
    }

    if (!harvest || !harvest.items || harvest.items.length === 0) {
        return { source: source.url, label: source.label || hostOf(source.url), method: null, blocked: true, items: [], notes: [...notes, 'No reachable route (bot-blocked or nothing published).'] };
    }

    let items = harvest.items
        .filter((i) => withinWindow(i.date, sinceISO, untilISO))
        .slice(0, limit);

    // Listing-page results have no dates or text yet, so we have to open them. Feed
    // results usually don't need this, but thin ones benefit.
    const needsFetch = items.filter((i) => !i.isRedirectLink && (harvest.needsPageFetch || !i.date || !i.description));
    if (enrich && needsFetch.length) {
        const enriched = await mapLimited(needsFetch, 4, enrichItem);
        const byUrl = new Map(enriched.map((e) => [e.url, e]));
        items = items.map((i) => byUrl.get(i.url) || i);
        // Dates only became known after the fetch, so re-apply the window.
        items = items.filter((i) => withinWindow(i.date, sinceISO, untilISO));
    }

    return {
        source: source.url,
        label: source.label || hostOf(source.url),
        method: harvest.method,
        uaProfile: harvest.uaProfile,
        degraded: !!harvest.degraded,
        blocked: false,
        notes,
        items: items.map((i) => ({
            title: i.title,
            url: i.url,
            date: formatDateMMDDYY(i.date) || '',
            rawDate: i.date || '',
            description: i.description || '',
            sourceLabel: source.label || hostOf(source.url),
            sourceUrl: source.url,
            restrictions: source.restrictions || '',
            isRedirectLink: !!i.isRedirectLink,
            fetchBlocked: i.fetchBlocked || null,
        })),
    };
}

module.exports = {
    DEFAULT_SOURCES,
    UA_PROFILES,
    fetchSmart,
    detectBlock,
    stripHtml,
    parseFeedItems,
    checkSourceAccess,
    harvestSource,
    formatDateMMDDYY,
    hostOf,
    indexPageFor,
    mapLimited,
    extractPublishedDate,
    extractModifiedDate,
    resolveArticleDate,
    withinWindow,
};
