/**
 * You.com Web Search API — Phase 1 article discovery for Newsletter Maker.
 * @see https://you.com/docs/api-reference/search/v1-search
 */

const YOU_COM_SEARCH_URL = 'https://api.you.com/v1/search';
const {
    parseBoostDomains,
    parseExcludeDomains,
    parseIncludeDomains,
} = require('./article-source-domains');

function cleanKey(key) {
    return String(key || '').replace(/^["']|["']$/g, '').trim();
}

function getYouComApiKey() {
    return cleanKey(process.env.YDC_API_KEY) || cleanKey(process.env['You.com_API']);
}

function formatPageAge(pageAge) {
    if (!pageAge) return '';
    const d = new Date(pageAge);
    if (Number.isNaN(d.getTime())) return String(pageAge);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
}

function formatResultBlock(result, sectionLabel) {
    const snippets = Array.isArray(result.snippets) ? result.snippets.join(' ') : '';
    const highlights = result.contents?.highlights
        ? (Array.isArray(result.contents.highlights)
            ? result.contents.highlights.join(' ')
            : String(result.contents.highlights))
        : '';
    const extra = highlights || snippets;
    const lines = [
        `Section: ${sectionLabel}`,
        `Title: ${result.title || 'Untitled'}`,
        `URL: ${result.url || ''}`,
        `Date: ${formatPageAge(result.page_age)}`,
    ];
    if (result.description) lines.push(`Description: ${result.description}`);
    if (extra) lines.push(`Excerpt: ${extra}`);
    return lines.join('\n');
}

function formatYouComResultsAsText(data) {
    const web = data?.results?.web || [];
    const news = data?.results?.news || [];
    const blocks = [];
    news.forEach((r) => blocks.push(formatResultBlock(r, 'news')));
    web.forEach((r) => blocks.push(formatResultBlock(r, 'web')));
    if (!blocks.length) {
        return 'No web or news results were returned for this query.';
    }
    return blocks.join('\n\n---\n\n');
}

/**
 * @param {string} query - User search prompt
 * @param {object} [options]
 * @param {string} [options.freshness] - day|week|month|year
 * @param {number} [options.count] - per section (web + news)
 */
async function searchYouCom(query, options = {}) {
    const apiKey = getYouComApiKey();
    if (!apiKey) {
        const err = new Error(
            'YDC_API_KEY is not configured on the server. Add your You.com API key to .env (or Vercel env vars) and restart.',
        );
        err.code = 'youcom_not_configured';
        throw err;
    }

    const count = parseInt(
        options.count || process.env.YOUCOM_SEARCH_COUNT || '25',
        10,
    );
    const freshness = options.freshness || process.env.YOUCOM_FRESHNESS || 'week';
    const includeDomains = parseIncludeDomains();

    const body = {
        query: String(query || '').trim(),
        count: Math.min(Math.max(count, 1), 100),
        freshness,
        country: process.env.YOUCOM_COUNTRY || 'US',
        language: process.env.YOUCOM_LANGUAGE || 'EN',
        extraction: {
            extraction_mode: 'highlights',
        },
    };

    // include_domains = strict allowlist (news-only from your list).
    // boost_domains + exclude_domains = prefer your sites but still allow other publishers.
    if (includeDomains.length) {
        body.include_domains = includeDomains;
    } else {
        body.boost_domains = parseBoostDomains();
        const excludeDomains = parseExcludeDomains();
        if (excludeDomains.length) {
            body.exclude_domains = excludeDomains;
        }
    }

    const fetch = (await import('node-fetch')).default;
    const res = await fetch(YOU_COM_SEARCH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
        },
        body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data?.message || data?.error || res.statusText || `HTTP ${res.status}`;
        const err = new Error(`You.com search failed: ${msg}`);
        err.status = res.status;
        throw err;
    }

    const webCount = (data?.results?.web || []).length;
    const newsCount = (data?.results?.news || []).length;
    const mode = includeDomains.length ? `include:${includeDomains.length}` : `boost:${body.boost_domains.length},exclude:${(body.exclude_domains || []).length}`;

    return {
        rawText: formatYouComResultsAsText(data),
        webCount,
        newsCount,
        totalCount: webCount + newsCount,
        metadata: { ...(data?.metadata || {}), domainFilterMode: mode },
    };
}

module.exports = {
    getYouComApiKey,
    searchYouCom,
    formatYouComResultsAsText,
};
