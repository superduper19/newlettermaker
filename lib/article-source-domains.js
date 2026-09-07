/**
 * Domain allow/block lists for article search (You.com) and verify.
 * Override via .env — see .env.example.
 *
 * boost_domains = prefer these sources (does not block others).
 * exclude_domains = hard block — only Wikipedia by default; add others in .env if you want.
 */

const DEFAULT_BOOST_DOMAINS = [
    'norml.org',
    'mjbizdaily.com',
    'ganjapreneur.com',
    'marijuanamoment.net',
    'leafly.com',
    'hempindustrydaily.com',
    'politico.com',
    'statnews.com',
    'reuters.com',
    'apnews.com',
];

// Hard block — minimal defaults. Add Yahoo/Fox/PBS/etc. in YOUCOM_EXCLUDE_DOMAINS if you want.
const DEFAULT_EXCLUDE_DOMAINS = [
    'wikipedia.org',
    'wikimedia.org',
];

function normalizeDomainToken(raw) {
    return String(raw || '')
        .trim()
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/\/.*$/, '')
        .toLowerCase();
}

function parseDomainListEnv(envKey, fallbacks) {
    const raw = String(process.env[envKey] || '').trim();
    if (!raw) return [...fallbacks];
    const seen = new Set();
    const out = [];
    raw.split(/[,;\n]+/).forEach((part) => {
        const domain = normalizeDomainToken(part);
        if (!domain || seen.has(domain)) return;
        seen.add(domain);
        out.push(domain);
    });
    return out;
}

function parseBoostDomains() {
    return parseDomainListEnv('YOUCOM_BOOST_DOMAINS', DEFAULT_BOOST_DOMAINS);
}

function parseExcludeDomains() {
    return parseDomainListEnv('YOUCOM_EXCLUDE_DOMAINS', DEFAULT_EXCLUDE_DOMAINS);
}

function parseIncludeDomains() {
    return parseDomainListEnv('YOUCOM_INCLUDE_DOMAINS', []);
}

function shouldRejectArticleUrl(url) {
    const u = String(url || '').toLowerCase();
    if (!u) return false;
    return parseExcludeDomains().some((domain) => u.includes(domain));
}

module.exports = {
    DEFAULT_BOOST_DOMAINS,
    DEFAULT_EXCLUDE_DOMAINS,
    parseBoostDomains,
    parseExcludeDomains,
    parseIncludeDomains,
    shouldRejectArticleUrl,
};
