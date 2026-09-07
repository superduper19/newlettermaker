const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const prioritySources = require('../lib/priority-sources');
const { searchYouCom, getYouComApiKey } = require('../lib/youcom-search');
const { shouldRejectArticleUrl } = require('../lib/article-source-domains');
const { filterDuplicateArticles, dedupeArticleList } = require('../lib/article-dedup');

// Configure Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Anthropic Client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || 'missing_key',
});

// Initialize OpenRouter (OpenAI SDK)
const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY || 'missing_key',
    defaultHeaders: {
        'HTTP-Referer': process.env.GODADDY_PUBLIC_BASE_URL || 'https://purablis.com',
        'X-Title': 'Newsletter Maker',
    }
});

// Initialize Google Generative AI Client
// Helper to clean API keys (removes quotes and whitespace)
const cleanKey = (key) => (key || '').replace(/^["']|["']$/g, '').trim();

const geminiKey = cleanKey(process.env.GEMINI_API_KEY) || cleanKey(process.env.GOOGLE_API_KEY) || 'missing_key';
const genAI = new GoogleGenerativeAI(geminiKey);

// Normalize Excel row: accept many column name variants
const getCell = (row, ...keys) => {
    for (const k of keys) {
        const v = row[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
};

// Helper to clean article data from Excel (flexible column names)
const cleanArticleData = (row, index) => {
    const title = getCell(row, 'Title', 'title', 'Article', 'article') || 'Untitled';
    const url = getCell(row, 'URL', 'url', 'Link', 'link');
    const description = getCell(row, 'Description', 'description', 'Summary', 'summary');
    const date = getCell(row, 'Date', 'date');
    const notes = getCell(row, 'Notes', 'notes');
    const paywallVal = row.Paywall ?? row.paywall ?? '';
    const paywall = paywallVal === true || String(paywallVal).toLowerCase() === 'yes' || String(paywallVal).toLowerCase() === 'y';
    const status = getCell(row, 'Status', 'status') || 'Y';
    const imageUrl = getCell(row, 'Image URL', 'Image URL', 'image', 'Image');

    const ranks = {};
    ['MED', 'THC', 'CBD', 'INV'].forEach(cat => {
        const v = row[cat];
        if (v !== undefined && v !== null && String(v).trim() !== '') ranks[cat] = String(v).trim();
    });
    const categories = Object.keys(ranks).length ? Object.keys(ranks) : (row.Category || row.category ? [row.Category || row.category] : []);

    return {
        id: index + 1,
        title,
        url,
        description,
        date,
        categories,
        ranks,
        notes,
        paywall,
        status,
        image: imageUrl || null,
        imageSearchQuery: '',
        isValid: true,
        selected: true,
    };
};

// Turn a parsed Date into the MM/DD/YY format the rest of the app expects.
const formatDateMMDDYY = (d) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
};

// A candidate date string is only trustworthy if it parses and falls in a sane
// range — this rejects garbage matches (e.g. a copyright year) without us having
// to hand-parse every site's date format.
const parseCandidateDate = (raw) => {
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    if (year < 2000 || d > twoDaysFromNow) return null;
    return d;
};

// Look for a real publish date in the page's own metadata (meta tags, JSON-LD,
// <time> elements) or, failing that, in the URL path itself (many news sites embed
// /2026/08/07/ in the slug). Returns '' — never a guess — if nothing checks out.
const extractPublishDate = (html, url) => {
    const metaPatterns = [
        /<meta[^>]+(?:property|name)=["'](?:article:published_time|og:article:published_time|publish-date|publishdate|date|sailthru\.date|parsely-pub-date|dc\.date|dc\.date\.issued)["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:article:published_time|og:article:published_time)["']/i,
        /"datePublished"\s*:\s*"([^"]+)"/i,
        /<time[^>]+datetime=["']([^"']+)["']/i,
        /itemprop=["']datePublished["'][^>]+(?:content|datetime)=["']([^"']+)["']/i,
    ];

    if (html) {
        for (const pattern of metaPatterns) {
            const match = html.match(pattern);
            if (match) {
                // parseCandidateDate vets the match (rejects copyright years and other
                // garbage), but formatting the Date it returns would render in the
                // server's timezone — a UTC-midnight stamp then reads as the previous
                // day. Format the raw string instead, honouring the offset the
                // publisher stamped, so we store the date their page shows.
                const parsed = parseCandidateDate(match[1]);
                if (parsed) return prioritySources.formatDateMMDDYY(match[1]) || formatDateMMDDYY(parsed);
            }
        }
    }

    if (url) {
        const urlMatch = url.match(/\/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:[\/-]|$)/);
        if (urlMatch) {
            const parsed = parseCandidateDate(`${urlMatch[1]}-${urlMatch[2]}-${urlMatch[3]}`);
            if (parsed) return formatDateMMDDYY(parsed);
        }
    }

    return '';
};

function decodeHtmlEntities(str) {
    return String(str || '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .trim();
}

function normalizeExtractedTitle(raw, { stripSiteSuffix = false } = {}) {
    let title = decodeHtmlEntities(raw).replace(/\s+/g, ' ').trim();
    if (!title) return '';
    if (stripSiteSuffix) {
        title = title.replace(/\s*[-|–—]\s*(POLITICO|Reuters|AP News|Associated Press|CNN|BBC News|NPR|Forbes|Bloomberg|The New York Times|Washington Post|Wall Street Journal|Axios)\s*$/i, '').trim();
    }
    if (title.length < 12 || title.length > 300) return '';
    return title;
}

// Pull the canonical headline from page metadata — same idea as extractPublishDate.
const extractPublishTitle = (html) => {
    if (!html) return '';

    const metaPatterns = [
        { pattern: /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i, stripSiteSuffix: false },
        { pattern: /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i, stripSiteSuffix: false },
        { pattern: /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i, stripSiteSuffix: false },
        { pattern: /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:title["']/i, stripSiteSuffix: false },
        { pattern: /"headline"\s*:\s*"((?:\\.|[^"\\])*)"/i, stripSiteSuffix: false },
        { pattern: /<title[^>]*>([^<]+)<\/title>/i, stripSiteSuffix: true },
    ];

    for (const { pattern, stripSiteSuffix } of metaPatterns) {
        const match = html.match(pattern);
        if (!match || !match[1]) continue;
        const raw = match[1].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim();
        const title = normalizeExtractedTitle(raw, { stripSiteSuffix });
        if (title) return title;
    }

    return '';
};

const ARTICLE_MAX_AGE_DAYS = parseInt(process.env.ARTICLE_MAX_AGE_DAYS || '7', 10);

function parseArticleDateMMDDYY(dateStr) {
    const m = String(dateStr || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!m) return null;
    const month = parseInt(m[1], 10);
    const day = parseInt(m[2], 10);
    let year = parseInt(m[3], 10);
    if (m[3].length === 2) year = year <= 50 ? 2000 + year : 1900 + year;
    const d = new Date(year, month - 1, day);
    if (Number.isNaN(d.getTime())) return null;
    return d;
}

function isArticleTooOld(dateStr, maxAgeDays = ARTICLE_MAX_AGE_DAYS) {
    const d = parseArticleDateMMDDYY(dateStr);
    if (!d) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxAgeDays);
    cutoff.setHours(0, 0, 0, 0);
    return d < cutoff;
}

function shouldAutoRejectUrl(url) {
    return shouldRejectArticleUrl(url);
}

// Helper to verify URL and fetch content
const attemptFetchAndAnalyze = async (url, skipScraping = false, title = '', userAgent = null) => {
    if (!url) return { isValid: false, content: '', extractedDate: '', extractedTitle: '' };

    // If we want to skip scraping, and the URL is already a final publisher URL (not a google search redirect),
    // we don't need to perform any network request at all! This saves massive amount of time.
    const isGoogleRedirect = url.includes('vertexaisearch.cloud.google.com');
    if (skipScraping && !isGoogleRedirect) {
        return { isValid: true, isReadable: false, content: '', finalUrl: url, extractedDate: extractPublishDate('', url), extractedTitle: '' };
    }

    try {
        const controller = new AbortController();
        // Google redirect resolution can sometimes take slightly longer on slower networks, so use 8000ms.
        const timeout = setTimeout(() => controller.abort(), skipScraping ? 8000 : 15000);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: controller.signal,
        });
        clearTimeout(timeout);

        // 404/410 are definitely dead.
        if (response.status === 404 || response.status === 410) {
            console.log(`URL ${url} returned ${response.status}. Invalid.`);
            return { isValid: false, content: '', finalUrl: response.url, extractedDate: '', extractedTitle: '' };
        }

        // If we are skipping scraping, we are only here to resolve the google search redirect to the final URL.
        // We do not need to download the HTML body or scrape the page. We can still try to
        // pull a date out of the resolved URL itself, since that costs nothing extra.
        if (skipScraping) {
            return { isValid: true, isReadable: false, content: '', finalUrl: response.url, extractedDate: extractPublishDate('', response.url), extractedTitle: '' };
        }

        // 403/401/429/5xx might be valid URLs blocking bots.
        // We'll mark them valid but content-less so we don't discard real news.
        if (!response.ok) {
            console.log(`URL ${url} returned ${response.status}. Treating as valid but unreadable.`);
            return { isValid: true, isReadable: false, content: '', finalUrl: response.url, extractedDate: extractPublishDate('', response.url), extractedTitle: '' };
        }

        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        const isBinaryType = contentType.includes('application/pdf') ||
                             contentType.includes('image/') ||
                             contentType.includes('audio/') ||
                             contentType.includes('video/') ||
                             contentType.includes('application/zip') ||
                             contentType.includes('application/octet-stream') ||
                             url.toLowerCase().endsWith('.pdf') ||
                             url.toLowerCase().includes('.pdf?');
        if (isBinaryType) {
            console.log(`URL ${url} is a PDF or binary media file (Content-Type: ${contentType}). Treating as unreadable.`);
            return { isValid: true, isReadable: false, content: '', finalUrl: response.url, extractedDate: extractPublishDate('', response.url), extractedTitle: '' };
        }

        const text = await response.text();
        if (text.startsWith('%PDF-') || text.includes('PDF-1.') || text.substring(0, 100).includes('%PDF')) {
            console.log(`URL ${url} returned binary PDF content. Treating as unreadable.`);
            return { isValid: true, isReadable: false, content: '', finalUrl: response.url, extractedDate: extractPublishDate('', response.url), extractedTitle: '' };
        }

        // Pull the publish date from the raw HTML (meta tags / JSON-LD / <time>) before
        // the tag-stripping below destroys that markup. Falls back to the URL if the page
        // itself has nothing usable.
        const extractedDate = extractPublishDate(text, response.url);
        const extractedTitle = extractPublishTitle(text);
        const titleForCheck = extractedTitle || title;
        // Simple extraction of body text (stripping tags)
        const content = text.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '')
                            .replace(/<style[^>]*>([\S\s]*?)<\/style>/gmi, '')
                            .replace(/<[^>]+>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim()
                            .substring(0, 15000); // Limit to 15k chars for LLM

        const cleanedContent = content.trim();
        const lowerContent = cleanedContent.toLowerCase();

        // Check for bot blocking / CAPTCHA / generic JS require content or paywalls
        const isBotBlocked = lowerContent.includes('cloudflare') ||
                             lowerContent.includes('captcha') ||
                             lowerContent.includes('robot check') ||
                             lowerContent.includes('enable javascript') ||
                             lowerContent.includes('access denied') ||
                             lowerContent.includes('forbidden') ||
                             lowerContent.includes('just a moment') ||
                             lowerContent.includes('subscribe to read') ||
                             lowerContent.includes('paywall') ||
                             lowerContent.includes('subscription required') ||
                             lowerContent.includes('archive.is') ||
                             lowerContent.includes('please wait while your request is being verified') ||
                             lowerContent.includes('pardon our interruption') ||
                             // Metered-paywall stubs (e.g. Scientific American) served on a later
                             // fetch of the same URL instead of the full article the first fetch got.
                             lowerContent.includes('free article') ||
                             lowerContent.includes('already a subscriber') ||
                             lowerContent.includes('sign in to continue') ||
                             lowerContent.includes('sign in to read') ||
                             lowerContent.includes('log in to continue') ||
                             lowerContent.includes('create a free account') ||
                             lowerContent.includes('unlock this article') ||
                             lowerContent.includes('continue reading with') ||
                             lowerContent.includes('digital subscription');

        // Check if there is enough content to be considered a readable article. Real
        // scraped articles run well into the thousands of characters; short-content
        // paywall/metering stubs and nav-only pages can still clear a low bar (e.g. 200
        // chars) while containing no real article body, so require a lot more headroom.
        const isTooShort = cleanedContent.length < 600;

        let isTitleMissing = false;
        if (titleForCheck && titleForCheck.length > 0) {
            // Find words with length > 4
            const titleWords = titleForCheck.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, '')).filter(w => w.length > 4);
            if (titleWords.length > 0) {
                // We want to ensure at least one significant word from the title appears in the content
                const hasMatch = titleWords.some(w => lowerContent.includes(w));
                if (!hasMatch) {
                    isTitleMissing = true;
                    console.log(`Article content doesn't match title for ${url}. Treating as unreadable.`);
                }
            }
        }

        const isReadable = !isBotBlocked && !isTooShort && !isTitleMissing;

        return { isValid: true, isReadable, content: cleanedContent, finalUrl: response.url, extractedDate, extractedTitle };
    } catch (error) {
        console.error(`Verification failed for ${url}:`, error.message);
        // Be lenient: if a redirect fails to resolve due to network issues, preserve the article rather than dropping it.
        return { isValid: true, isReadable: false, content: '', finalUrl: url, extractedDate: extractPublishDate('', url), extractedTitle: '' };
    }
};

// Sites intermittently block/rate-limit the first request (especially when several
// categories fetch the same URL back-to-back) but succeed on a second try shortly
// after, so retry once before giving up and asking the user for manual content.
//
// The retry also swaps in a non-browser User-Agent: some sites (norml.org) serve a
// "Checking your browser... Javascript required" wall to browser UAs and plain HTML
// to anything that identifies itself as a bot, so the same UA twice never gets in.
const RETRY_UA = 'NewsletterMaker/1.0 (+https://purablis.com)';

const verifyAndAnalyzeUrl = async (url, skipScraping = false, title = '') => {
    const first = await attemptFetchAndAnalyze(url, skipScraping, title);
    if (skipScraping || !first.isValid || first.isReadable) return first;

    await new Promise((resolve) => setTimeout(resolve, 1200));
    const retry = await attemptFetchAndAnalyze(url, skipScraping, title, RETRY_UA);
    return retry.isReadable ? retry : first;
};

// Helper to categorize article based on content (implements newsletter_categorization_brief.md)
const categorizeArticle = (article, content) => {
    const text = (content || article.description || '').toLowerCase();
    if (!text && !article.title) return article;

    const title = (article.title || '').toLowerCase();
    const fullText = title + ' ' + text;

    // Initialize categories and ranks
    const categories = new Set(article.categories || []);
    const ranks = article.ranks || {};

    // --- REJECTION RULES (DISABLED FOR RAW RESULTS) ---
    // 1. Paywalled
    /*
    if (fullText.includes('subscribe to read') || fullText.includes('paywall') || fullText.includes('access denied') || title.includes('subscription')) {
        console.log(`Rejecting ${article.url}: Paywalled`);
        return null;
    }

    // 2. Anti-cannabis propaganda (heuristic)
    if (fullText.includes('cannabis is dangerous') || fullText.includes('should remain illegal') || fullText.includes('marijuana psychosis epidemic')) {
        console.log(`Rejecting ${article.url}: Anti-cannabis propaganda`);
        return null;
    }

    // 3. Press Releases (unless significant)
    // "Pure press releases from companies" -> check for PR Newswire, Business Wire, "press release" in title
    if (title.includes('press release') || text.substring(0, 300).includes('press release') || text.includes('pr newswire') || text.includes('business wire')) {
         // Unless it's M&A or major earnings or major study
         if (!fullText.includes('acquisition') && !fullText.includes('merger') && !fullText.match(/\$\d+/) && !fullText.includes('clinical trial results')) {
             console.log(`Rejecting ${article.url}: Press Release`);
             return null;
         }
    }

    // 5. Too short / no substance
    if (content.length < 300) {
        console.log(`Rejecting ${article.url}: Too short (${content.length} chars)`);
        return null;
    }
    */

    // --- CATEGORIZATION RULES ---

    // Helper to add category
    const addCat = (cat, rank) => {
        categories.add(cat);
        // If already has Y, keep Y. If YM, upgrade to Y if new is Y.
        if (!ranks[cat] || ranks[cat] === 'YM') {
            ranks[cat] = rank;
        }
    };

    // 1. THC Newsletter (Column I)
    // Covers: Rec/Med legalization, policy, industry, culture, science, consumer trends.
    // Exclude: Local ordinances, small busts, intl busts, anti-cannabis.
    const thcKeywords = ['marijuana', 'cannabis', 'legalization', 'legalize', 'dispensary', 'adult-use', 'recreational', 'potency', 'strain', 'rescheduling', 'descheduling', 'safer banking'];
    const thcMatch = thcKeywords.filter(k => fullText.includes(k)).length;

    const psychKeywords = ['psychedelic', 'psilocybin', 'magic mushroom', 'mdma', 'ketamine'];
    const psychMatch = psychKeywords.filter(k => fullText.includes(k)).length;

    if (thcMatch >= 2 || psychMatch >= 1) {
        // Exclusion: "Local city ordinances"
        if (!fullText.includes('city council') && !fullText.includes('zoning board') && !fullText.includes('planning commission')) {
            addCat('THC', thcMatch >= 3 ? 'Y' : 'YM');
        }
    }

    // 2. CBD Newsletter (Column J)
    // Covers: Hemp farming, CBD products, Delta-8/10, THCA, CBG, CBN, hemp supply chain.
    // Exclude: Ads, generic "CBD helps X", pure PR.
    const cbdKeywords = ['hemp', 'cbd', 'cannabidiol', 'delta-8', 'delta-10', 'thca', 'cbg', 'cbn', 'farm bill', 'usda hemp'];
    const cbdMatch = cbdKeywords.filter(k => fullText.includes(k)).length;

    if (cbdMatch >= 1) {
        // Edge Case: CBD from marijuana = THC or Med, NOT CBD.
        // If "marijuana" is dominant, it might not be CBD newsletter.
        // But if it mentions "hemp-derived", it IS CBD newsletter.
        if (fullText.includes('hemp-derived') || fullText.includes('farm bill')) {
            addCat('CBD', 'Y');
        } else if (fullText.includes('marijuana') && !fullText.includes('hemp')) {
             // Likely THC/Med
             addCat('THC', 'YM');
        } else {
            addCat('CBD', cbdMatch >= 2 ? 'Y' : 'YM');
        }
    }

    // 3. INV Newsletter (Column K)
    // Covers: M&A, stocks, fundraising, major operator news, international news.
    // Exclude: Small PR, local revenue.
    const invKeywords = ['merger', 'acquisition', 'stock', 'invest', 'revenue', 'profit', 'earnings', 'capital', 'funding', 'raise', 'ipo', 'nasdaq', 'nyse', 'tsx', 'cse', 'mso', 'multi-state operator'];
    const invMatch = invKeywords.filter(k => fullText.includes(k)).length;

    // International news goes here
    const intlKeywords = ['germany', 'canada', 'europe', 'australia', 'colombia', 'thailand', 'international'];
    const intlMatch = intlKeywords.filter(k => fullText.includes(k)).length;

    if (invMatch >= 1 || (intlMatch >= 1 && fullText.includes('cannabis'))) {
        if (fullText.includes('acquisition') || fullText.includes('merger') || fullText.includes('raise') || fullText.includes('funding')) {
             addCat('INV', 'Y');
        } else {
            addCat('INV', invMatch >= 2 ? 'Y' : 'YM');
        }
    }

    // 4. MED Newsletter (Column E)
    // Covers: Opioid crisis, clinical trials, research, patient access, FDA.
    // Exclude: Future studies, anti-cannabis scares.
    const medKeywords = ['clinical trial', 'study', 'research', 'patient', 'treatment', 'disease', 'cancer', 'epilepsy', 'pain', 'autism', 'ptsd', 'opioid', 'fentanyl', 'overdose', 'fda', 'nih'];
    const medMatch = medKeywords.filter(k => fullText.includes(k)).length;

    if (medMatch >= 2) {
        if (fullText.includes('results') || fullText.includes('findings') || fullText.includes('published in') || fullText.includes('journal')) {
            addCat('MED', 'Y');
        } else {
             addCat('MED', 'YM');
        }
    }

    article.categories = Array.from(categories);
    article.ranks = ranks;
    return article;
};

const CATEGORIZATION_BRIEF_PATH = path.join(__dirname, '../logs/newsletter_categorization_brief.md');
let cachedCategorizationBrief = null;
const getCategorizationBrief = () => {
    if (cachedCategorizationBrief !== null) return cachedCategorizationBrief;
    try {
        cachedCategorizationBrief = fs.existsSync(CATEGORIZATION_BRIEF_PATH)
            ? fs.readFileSync(CATEGORIZATION_BRIEF_PATH, 'utf8')
            : '';
    } catch (_) {
        cachedCategorizationBrief = '';
    }
    return cachedCategorizationBrief;
};

// Reads the ACTUAL fetched article text (not the AI's search-result blurb) against
// our editorial guidelines, and asks for a short summary of what the page actually
// says. This is the only point in the pipeline that checks nuanced rules like
// "ad/PR for one brand" or "bill hasn't passed yet" — the keyword categorizer above
// can't judge those. Cheap/fast model since this runs once per verified article.
const analyzeArticleContent = async (article, content) => {
    if (!content || content.length < 300) return { summary: '', flagged: false, flagReason: '' };

    const brief = getCategorizationBrief();
    const systemPrompt = `You are an editorial reviewer for a cannabis/psychedelics newsletter. You will be given the ACTUAL fetched text of a news article, along with our editorial guidelines below.

${brief}

Your job:
1. Write a factual 2-3 sentence summary of what this article actually says (based only on the fetched text, not the title).
2. Decide whether this article should be REJECTED under the "Universal Rejection Rules" section above (ads/PR for one brand, press releases, paywalled content, a bill/law that hasn't passed yet and isn't extremely significant, purely local ordinances, international drug busts, anti-cannabis propaganda, opinion/editorial masquerading as news, too short/no real substance, old/archival content more than ${ARTICLE_MAX_AGE_DAYS} days old, TV/video clips instead of written news, Wikipedia or encyclopedia pages). Flagged items are dropped automatically — be strict.

Return ONLY valid JSON, no markdown, no commentary:
{"summary": "...", "flagged": true or false, "flagReason": "short reason if flagged, empty string otherwise"}`;

    try {
        const message = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 500,
            system: systemPrompt,
            messages: [
                { role: 'user', content: `Title: ${article.title || ''}\n\nFetched article text:\n${content.substring(0, 8000)}` },
            ],
        }, { timeout: 60000 });

        const text = getAnthropicTextContent(message).replace(/```json\s*/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(text);
        return {
            summary: String(parsed.summary || '').trim(),
            flagged: parsed.flagged === true,
            flagReason: String(parsed.flagReason || '').trim(),
        };
    } catch (err) {
        console.error(`analyzeArticleContent failed for "${article.title}":`, err.message);
        return { summary: '', flagged: false, flagReason: '' };
    }
};

// POST /api/articles/upload - Handle Excel Upload
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const newsletterName = req.body.newsletterName || 'Week 1';

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) return res.status(400).json({ error: 'Excel file has no sheets' });
        const sheet = workbook.Sheets[sheetName];
        const rawData = xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false });

        const isRowEmpty = (row) => {
            const t = getCell(row, 'Title', 'title', 'Article', 'article');
            const u = getCell(row, 'URL', 'url', 'Link', 'link');
            return !t && !u;
        };
        const nonEmpty = rawData.filter(row => !isRowEmpty(row));
        const articles = nonEmpty.map((row, index) => cleanArticleData(row, index));

        if (articles.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No articles found. Ensure the sheet has a header row and columns like Title, URL (or Article, Link). Download the template for the expected format.',
            });
        }

        console.log(`Processed ${articles.length} articles from Excel for "${newsletterName}"`);
        res.json({
            success: true,
            newsletterName,
            source: 'excel',
            count: articles.length,
            articles,
        });
    } catch (error) {
        console.error('Error processing Excel:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to process Excel file' });
    }
});

// Helper to extract JSON from AI response
const extractJSON = (text) => {
    // Strip common wrappers from provider errors before parsing
    text = String(text || '').replace(/^Error:\s*/i, '').trim();

    // Remove markdown code blocks if present
    text = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

    // Extract and parse complete JSON objects from text, ignoring truncated tails.
    const extractObjectsFromText = (source) => {
        const objects = [];
        let start = -1;
        let depth = 0;
        let inString = false;
        let escaped = false;

        for (let i = 0; i < source.length; i++) {
            const ch = source[i];

            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (ch === '\\') {
                    escaped = true;
                } else if (ch === '"') {
                    inString = false;
                }
                continue;
            }

            if (ch === '"') {
                inString = true;
                continue;
            }

            if (ch === '{') {
                if (depth === 0) start = i;
                depth++;
                continue;
            }

            if (ch === '}') {
                if (depth > 0) depth--;
                if (depth === 0 && start >= 0) {
                    const candidate = source.slice(start, i + 1);
                    try {
                        objects.push(JSON.parse(candidate));
                    } catch (e) { /* skip invalid object */ }
                    start = -1;
                }
            }
        }

        return objects;
    };

    // 1. Direct parse
    try {
        return JSON.parse(text);
    } catch (e) { /* continue */ }

    // 2. Find JSON array within text
    const match = text.match(/\[([\s\S]*)\]/);
    if (match) {
        try { return JSON.parse(match[0]); } catch (e2) { /* continue */ }
        try { return JSON.parse(match[0] + ']'); } catch (e3) { /* continue */ }
        try { return JSON.parse(match[0] + '}]'); } catch (e4) { /* continue */ }

        // 3. Extract individual JSON objects from within the array
        const objects = extractObjectsFromText(match[0]);
        if (objects.length > 0) return objects;
    }

    // 3b. Handle truncated arrays with no closing bracket.
    const firstArrayBracket = text.indexOf('[');
    if (firstArrayBracket !== -1) {
        const arrayTail = text.slice(firstArrayBracket);
        const objects = extractObjectsFromText(arrayTail);
        if (objects.length > 0) return objects;
    }

    // 4. Last resort: parse markdown-formatted article list
    const articles = [];
    const titleRegex = /###?\s*\d+\.\s*(.+)/g;
    const urlRegex = /\[Read more\]\((https?:\/\/[^\s)]+)\)/gi;
    const dateRegex = /\*\*Date:\*\*\s*(\d{2}\/\d{2}\/\d{2})/g;

    const titles = [...text.matchAll(titleRegex)].map(m => m[1].trim());
    const urls = [...text.matchAll(urlRegex)].map(m => m[1].trim());
    const dates = [...text.matchAll(dateRegex)].map(m => m[1].trim());

    if (titles.length > 0 && urls.length > 0) {
        console.log(`extractJSON: Falling back to markdown parser — found ${titles.length} titles, ${urls.length} urls`);
        for (let i = 0; i < Math.min(titles.length, urls.length); i++) {
            articles.push({
                title: titles[i],
                url: urls[i],
                description: '',
                date: dates[i] || '',
            });
        }
        return articles;
    }

    throw new Error('Could not extract JSON or structured data from AI response');
};

// Shared Model Mapping
const MODEL_MAPPING = {
    'claude-opus-5': 'claude-opus-5',
    'claude-opus-5-extended': 'claude-opus-5',
    'claude-opus-4-8': 'claude-opus-4-8',
    'claude-opus-4-7': 'claude-opus-4-7',
    'claude-opus-4-7-extended': 'claude-opus-4-7',
    'claude-opus-4-6': 'claude-opus-4-6',
    'claude-opus-4-6-extended': 'claude-opus-4-6',
    'claude-sonnet-4-6': 'claude-sonnet-4-6',
    'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
    'gemini-flash-3-0': 'gemini-3-flash-preview',
    'gemini-3-1-pro': 'gemini-3.1-pro-preview',
    'gemini-flash-3-5': 'gemini-3.5-flash',
};

// Helper to get API Model ID
const getApiModelId = (userModel) => MODEL_MAPPING[userModel] || userModel || 'claude-opus-4-7';

function isExtendedModel(userModel) {
    return String(userModel || '').includes('-extended');
}

/** Anthropic article-search limits (override via .env). */
function getAnthropicSearchConfig(userModel) {
    const apiModel = getApiModelId(userModel);
    const extended = isExtendedModel(userModel);
    const maxWebUses = parseInt(
        process.env[extended ? 'ARTICLE_SEARCH_MAX_WEB_USES_EXTENDED' : 'ARTICLE_SEARCH_MAX_WEB_USES']
            || (extended ? '40' : '25'),
        10,
    );
    const maxTokens = parseInt(
        process.env[extended ? 'ARTICLE_SEARCH_MAX_TOKENS_EXTENDED' : 'ARTICLE_SEARCH_MAX_TOKENS']
            || (extended ? '32000' : '16000'),
        10,
    );
    const useDynamicWebSearch = /opus-4-[678]|opus-5|sonnet-4-6/.test(apiModel);
    const request = {
        model: apiModel,
        max_tokens: maxTokens,
        tools: [{
            type: useDynamicWebSearch ? 'web_search_20260209' : 'web_search_20250305',
            name: 'web_search',
            max_uses: maxWebUses,
        }],
    };
    if (extended && /opus-4-[678]|opus-5|sonnet-4-6/.test(apiModel)) {
        request.thinking = { type: 'adaptive' };
        request.output_config = {
            effort: /opus-4-[78]|opus-5/.test(apiModel) ? 'xhigh' : 'high',
        };
    }
    return request;
}

function getAnthropicTextContent(message) {
    if (!message || !Array.isArray(message.content)) return '';
    return message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');
}

function sanitizeArticlesForModify(articles) {
    return (articles || []).map((a) => ({
        title: a.title || '',
        description: a.description || '',
        url: a.url || '',
        date: a.date || '',
    }));
}

function normalizeSearchEngine(value) {
    const v = String(value || 'auto').trim().toLowerCase();
    if (v === 'youcom' || v === 'you.com' || v === 'you') return 'youcom';
    if (v === 'claude' || v === 'anthropic') return 'claude';
    if (v === 'gemini' || v === 'google') return 'gemini';
    return 'auto';
}

function resolvePhase1SearchMode(searchEngine, provider) {
    const mode = normalizeSearchEngine(searchEngine);
    if (mode === 'youcom') return 'youcom';
    if (mode === 'claude') return 'claude';
    if (mode === 'gemini') return 'gemini';
    if (provider.isGemini || provider.isOpenRouter) return 'gemini';
    return 'claude';
}

function resolveAiProvider(model, searchEngine = 'auto') {
    let apiModel = getApiModelId(model);
    let isOpenRouter = false;

    if (apiModel.startsWith('openrouter-')) {
        isOpenRouter = true;
        apiModel = apiModel.replace('openrouter-', '');
    }

    const isGemini = apiModel.toLowerCase().includes('gemini');
    const phase1Mode = resolvePhase1SearchMode(searchEngine, { isGemini, isOpenRouter });

    if (phase1Mode === 'youcom' && !getYouComApiKey()) {
        return {
            error: 'YDC_API_KEY is not configured on the server. Add your You.com API key to .env (or Vercel env vars) and restart, or choose Auto / Claude / Gemini search.',
        };
    }

    // Gemini key only required when Gemini Google Search runs Phase 1.
    if (phase1Mode === 'gemini' && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
        return {
            error: 'GEMINI_API_KEY is not configured on the server. It is required for Gemini web search. Add it in Vercel, choose You.com search, or switch to a Claude model with Auto/Claude search.',
        };
    }

    if (phase1Mode === 'claude' && !process.env.ANTHROPIC_API_KEY) {
        return {
            error: 'ANTHROPIC_API_KEY is not configured on the server. Required for Claude web search. Add it in Vercel or choose You.com search.',
        };
    }

    if (isOpenRouter && !process.env.OPENROUTER_API_KEY) {
        return {
            error: 'OPENROUTER_API_KEY is not configured on the server. Add it in Vercel → Settings → Environment Variables.',
        };
    }

    if (isGemini && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
        return {
            error: 'GEMINI_API_KEY is not configured on the server. Required for the selected Gemini model. Add it in Vercel → Settings → Environment Variables.',
        };
    }

    if (!isGemini && !isOpenRouter && !process.env.ANTHROPIC_API_KEY) {
        return {
            error: 'ANTHROPIC_API_KEY is not configured on the server. Add it in Vercel → Settings → Environment Variables.',
        };
    }
    return { apiModel, isGemini, isOpenRouter, phase1Mode };
}

async function mapWithConcurrency(items, limit, fn) {
    const results = new Array(items.length);
    let nextIndex = 0;
    async function worker() {
        while (nextIndex < items.length) {
            const i = nextIndex++;
            results[i] = await fn(items[i], i);
        }
    }
    const workers = Math.min(limit, items.length);
    await Promise.all(Array.from({ length: workers }, worker));
    return results;
}

const ERROR_LOG_DIR = process.env.VERCEL ? '/tmp' : __dirname;

// Helper to extract clean error message from AI providers
function parseAIError(error) {
    let message = error.message || 'Unknown error occurred';

    // Check if message looks like an HTTP error with JSON body (common with Anthropic SDK)
    // e.g. "400 {"type":"error","error":{"type":"invalid_request_error","message":"..."}}"
    if (/^\d{3}\s+\{/.test(message)) {
         try {
             const jsonPart = message.substring(message.indexOf('{'));
             const parsed = JSON.parse(jsonPart);
             if (parsed.error && parsed.error.message) {
                 return parsed.error.message;
             }
         } catch (e) {
             // Parsing failed, return original
         }
    }

    // Check for nested error object
    if (error.error && error.error.message) {
        return error.error.message;
    }

    return message;
}

function buildAiErrorResponse(error, model) {
    const message = parseAIError(error);
    const modelLabel = model ? ` [model: ${model}]` : '';
    const body = { error: message, details: error.message, model: model || null };
    if (/credit balance is too low/i.test(message)) {
        body.errorCode = 'anthropic_credits_low';
        body.error = `Anthropic (Claude) API credits are too low${modelLabel}.`;
    } else if (/quota exceeded/i.test(message)) {
        body.errorCode = 'quota_exceeded';
        body.error = `API quota exceeded${modelLabel}.`;
    } else if (error.status === 429) {
        body.error = `Rate limit or quota exceeded${modelLabel}.`;
    }
    return body;
}

// POST /api/articles/search - AI Search & Filtering
router.post('/search', async (req, res) => {
    try {
        const { prompt, newsletterName, model, existingUrls, searchEngine } = req.body || {};
        if (!prompt || !String(prompt).trim()) {
            return res.status(400).json({ error: 'Please enter a search prompt.' });
        }

        const provider = resolveAiProvider(model, searchEngine);
        if (provider.error) {
            return res.status(503).json({ error: provider.error, configured: false });
        }

        const phase1Mode = provider.phase1Mode;
        console.log(`Received search request: "${prompt}" for ${newsletterName} using model ${model}, searchEngine=${phase1Mode}`);

        // Use mock data if requested (for testing without burning credits)
        if (String(prompt).toLowerCase().includes('mock data')) {
             console.log("Mock data requested.");
             return res.json({
                 success: true,
                 articles: [
                     { title: "Mock Article 1", description: "This is a test article.", url: "https://example.com/1", category: "MED" },
                     { title: "Mock Article 2", description: "Another test article.", url: "https://example.com/2", category: "THC" },
                 ]
             });
        }

        console.log(`Searching articles with model ${model} for "${newsletterName}"`);

        const { apiModel, isGemini } = provider;

        console.log(`Using model mapping: ${model} -> ${apiModel}`);

        let content = '';

        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        
        // --- PHASE 1: WEB SEARCH ---
        // youcom — You.com Web Search API (structured URLs/snippets)
        // claude — Anthropic native web_search
        // gemini — Gemini Google Search grounding
        const useClaudeSearch = phase1Mode === 'claude';
        const useYouComSearch = phase1Mode === 'youcom';
        const phase1Label = useYouComSearch
            ? 'You.com Web Search API'
            : (useClaudeSearch ? 'Claude native web_search' : 'Gemini Search Engine');
        console.log(`Phase 1: Fetching raw search results using ${phase1Label}`);
        let rawSearchResults = "";

        let existingUrlText = '';
        if (existingUrls && existingUrls.length > 0) {
            existingUrlText = `\nCRITICAL ANTI-DUPLICATION RULE: The user already has the following articles in their newsletter. You MUST NOT include these articles, and you MUST NOT include any articles from different publishers that cover the exact same story/topic. Find NEW stories only:\n${existingUrls.join('\n')}\n`;
        }

        if (useYouComSearch) {
            try {
                const youResult = await searchYouCom(prompt);
                rawSearchResults = `${youResult.rawText}\n\n${existingUrlText}`.trim();
                console.log(`Phase 1 Complete. You.com returned ${youResult.totalCount} results (${youResult.newsCount} news, ${youResult.webCount} web).`);
            } catch (searchErr) {
                console.error('Phase 1 Search Error (You.com):', searchErr);
                return res.status(searchErr.status === 401 || searchErr.status === 402 ? 503 : 500).json({
                    error: searchErr.message || 'You.com search failed',
                    errorCode: searchErr.code || 'youcom_search_failed',
                    details: searchErr.message,
                });
            }
        } else if (useClaudeSearch) {
            try {
                const searchConfig = getAnthropicSearchConfig(model);
                const searchPrompt = `You are a research assistant. Today's date is ${today}.
Search the web for news articles matching the following user request: "${prompt}"
${existingUrlText}
CRITICAL DATE RULE: Unless the user prompt explicitly asks for older content, only include articles published within the last ${ARTICLE_MAX_AGE_DAYS} days. If the user specifies a different date range or cutoff (e.g. "after June 1st, 2026"), enforce that instead. Do NOT include articles outside the allowed window. Verify the publication date before including each article.

CRITICAL URL RULE: You MUST provide the full, raw URL string starting with http:// or https://, taken directly from your search results. DO NOT use citation footnotes like [1] or [2]. DO NOT guess, hallucinate, or reverse-engineer URLs.

SOURCE & DIVERSITY RULE: Prioritize checking well-known industry sources such as mjbizdaily.com, norml.org, and ganjapreneur.com. However, ensure source diversity. Do not include more than 2-3 articles from any single source unless the information is highly unique and cannot be found elsewhere.

Please return a comprehensive list of the articles you found, including their titles, exact URLs from the search results, a short description of each, and their publication dates.`;

                const searchMessage = await anthropic.messages.create({
                    ...searchConfig,
                    system: searchPrompt,
                    messages: [
                        { role: 'user', content: 'Find the articles now.' },
                    ],
                }, { timeout: 300000 });

                rawSearchResults = getAnthropicTextContent(searchMessage);
                console.log("Phase 1 Complete. Raw search results fetched via Claude.");
            } catch (searchErr) {
                console.error('Phase 1 Search Error (Claude):', searchErr);
                return res.status(500).json(buildAiErrorResponse(searchErr, apiModel));
            }
        } else {
            try {
                // We use the 'gemini-3.1-pro-preview' equivalent for this step since it supports tools.
                const searchModel = genAI.getGenerativeModel({
                    model: 'gemini-3.1-pro-preview',
                    tools: [{ googleSearch: {} }],
                });

                const searchPrompt = `You are a research assistant. Today's date is ${today}.
Search the web for news articles matching the following user request: "${prompt}"
${existingUrlText}
CRITICAL DATE RULE: Unless the user prompt explicitly asks for older content, only include articles published within the last ${ARTICLE_MAX_AGE_DAYS} days. If the user specifies a different date range or cutoff (e.g. "after June 1st, 2026"), enforce that instead. Do NOT include articles outside the allowed window. Verify the publication date before including each article.

CRITICAL URL RULE: You MUST provide the full, raw URL string starting with http:// or https://. DO NOT use citation footnotes like [1] or [2]. If the Google Search tool provides a "vertexaisearch.cloud.google.com" redirect link, YOU MUST USE THAT EXACT LINK. DO NOT try to guess, hallucinate, or reverse-engineer the original publisher URL, as that leads to broken links. Output the vertexaisearch link exactly as you received it.

SOURCE & DIVERSITY RULE: Prioritize checking well-known industry sources such as mjbizdaily.com, norml.org, and ganjapreneur.com. However, ensure source diversity. Do not include more than 2-3 articles from any single source unless the information is highly unique and cannot be found elsewhere.

Please return a comprehensive list of the articles you found, including their titles, exact URLs from the search results, a short description of each, and their publication dates.`;

                const searchResult = await searchModel.generateContent(searchPrompt);
                console.log("Gemini search response object:", JSON.stringify(searchResult.response, null, 2));
                rawSearchResults = await searchResult.response.text();
                console.log("Phase 1 Complete. Raw search results fetched via Gemini.");
            } catch (searchErr) {
                console.error('Phase 1 Search Error (Gemini):', searchErr);
                return res.status(500).json(buildAiErrorResponse(searchErr));
            }
        }

        // --- PHASE 2: JSON EXTRACTION (SELECTED MODEL) ---
        console.log(`Phase 2: Extracting JSON using model ${model}`);
        const extractPrompt = `You are a data extraction assistant. I have performed a web search for articles based on this user request: "${prompt}"
        
Here are the raw search results:
---
${rawSearchResults}
---

Your task is to parse these results and return a single valid JSON array containing the articles. 
No markdown, no headers, no commentary, no explanation before or after.

CRITICAL DATE RULE: Unless the user prompt explicitly asks for older content, only include articles published within the last ${ARTICLE_MAX_AGE_DAYS} days. Skip Wikipedia, video pages, ads, roundups, and newsletters. Do not include two entries for the same story — if titles match (syndicated on multiple sites), keep only one URL.

Each object in the array must have exactly these keys:
- "title": exact article headline copied verbatim from the search results (do not paraphrase or rewrite)
- "url": full article URL (use the exact URL provided in the search results)
- "description": 1-2 sentence summary
- "date": publication date in MM/DD/YY format (leave empty string if unknown)

Example format:
[{"title":"...","url":"https://...","description":"...","date":"06/05/26"}]`;

        if (isGemini) {
            try {
                const geminiModel = genAI.getGenerativeModel({ model: apiModel });
                const result = await geminiModel.generateContent(extractPrompt);
                content = await result.response.text();
            } catch (geminiError) {
                console.error('Gemini API Error:', geminiError);
                return res.status(500).json(buildAiErrorResponse(geminiError));
            }
        } else if (provider.isOpenRouter) {
            try {
                const response = await openrouter.chat.completions.create({
                    model: apiModel,
                    messages: [
                        { role: 'system', content: "You are a data extraction assistant that only outputs valid JSON arrays. No markdown, no conversational text." },
                        { role: 'user', content: extractPrompt }
                    ],
                }, { timeout: 300000 });
                content = response.choices[0]?.message?.content || '';
            } catch (openrouterError) {
                console.error('OpenRouter API Error:', openrouterError);
                return res.status(500).json(buildAiErrorResponse(openrouterError));
            }
        } else {
            try {
                const message = await anthropic.messages.create({
                    model: apiModel,
                    max_tokens: 8000,
                    system: "You are a data extraction assistant that only outputs valid JSON arrays. No markdown, no conversational text.",
                    messages: [
                        { role: 'user', content: extractPrompt },
                    ],
                }, { timeout: 300000 });

                content = message.content
                    .filter(block => block.type === 'text')
                    .map(block => block.text)
                    .join('\n');
            } catch (anthropicError) {
                console.error('Anthropic API Error:', anthropicError);
                return res.status(500).json(buildAiErrorResponse(anthropicError));
            }
        }

        let rawArticles = [];
        try {
            rawArticles = extractJSON(content);
        } catch (e) {
            const logId = Date.now();
            console.error(`[${logId}] Failed to parse AI JSON response:`, content.substring(0, 500) + "...");
            // Write full content to file for debugging
            try {
                const logPath = path.join(ERROR_LOG_DIR, `error_json_${logId}.log`);
                fs.writeFileSync(logPath, content);
                console.error(`Full error content written to ${logPath}`);
            } catch (fsErr) {
                console.error('Failed to write error log file', fsErr);
            }

            return res.status(500).json({
                error: "AI needs more detail before it can continue.",
                details: String(content || '').trim(),
                logId
            });
        }

        console.log(`AI found ${rawArticles.length} articles. Returning raw results before Stage 2 (Verification & Categorization) so nothing is lost if that step is slow.`);

        // Return the AI-found articles immediately, lightly cleaned but NOT yet
        // URL-verified or categorized. Stage 2 (verification/categorization) is a
        // separate, non-AI, network-heavy step done via POST /api/articles/verify —
        // splitting it out means the (paid, Claude-metered) search work is never lost
        // even if verification is slow or times out.
        const rawCleaned = rawArticles.map((article, i) => ({
            ...cleanArticleData(article, 0),
            id: i + 1,
            needsVerification: true,
        }));
        const { articles: dedupedRaw, skipped: duplicateCount } = dedupeArticleList(rawCleaned);
        if (duplicateCount > 0) {
            console.log(`Search deduped ${duplicateCount} article(s) with matching URL or title.`);
        }

        res.json({
            success: true,
            newsletterName,
            source: 'ai',
            stage: 'raw',
            searchEngine: phase1Mode,
            count: dedupedRaw.length,
            duplicateCount,
            articles: dedupedRaw.map((a, i) => ({ ...a, id: i + 1 })),
        });

    } catch (error) {
        console.error('Error with AI Search:', error);
        res.status(500).json(buildAiErrorResponse(error, model));
    }
});

// POST /api/articles/verify - Stage 2: URL verification & categorization for
// articles already found by /search. Kept separate so a slow/timed-out
// verification pass never throws away the (Claude-metered) search results.
router.post('/verify', async (req, res) => {
    try {
        const { articles: rawArticles, existingArticles, since, until } = req.body || {};
        if (!Array.isArray(rawArticles) || rawArticles.length === 0) {
            return res.status(400).json({ error: 'No articles provided to verify.' });
        }

        const rejected = [];

        const dropArticle = (url, title, reason) => {
            const entry = { url: url || '', title: title || '', reason: reason || 'rejected' };
            rejected.push(entry);
            console.log(`Dropping "${title || url}": ${reason}`);
            return null;
        };

        // Shared across articles so one site's feed is fetched once, not per article.
        const dateCache = {};
        const corrected = [];

        const processArticle = async (article) => {
            let cleaned = cleanArticleData(article, 0);

            // Verify URL and actually fetch the page (skipScraping = false) — we need the
            // real HTML to confirm the publish date and to let the AI read the real text
            // instead of trusting whatever date/summary the search step guessed.
            if (!cleaned.url || cleaned.url.includes('example.com') || cleaned.url === '#') {
                return dropArticle(cleaned.url, cleaned.title, 'invalid URL');
            }

            if (shouldAutoRejectUrl(cleaned.url)) {
                return dropArticle(cleaned.url, cleaned.title, 'non-news URL (video, Wikipedia, etc.)');
            }

            const { isValid, isReadable, content, finalUrl, extractedDate, extractedTitle } = await verifyAndAnalyzeUrl(cleaned.url, false, cleaned.title);

            if (!isValid) {
                return dropArticle(cleaned.url, cleaned.title, 'URL failed verification');
            }

            if (finalUrl) {
                cleaned.url = finalUrl;
            }

            if (extractedTitle) {
                cleaned.title = extractedTitle;
            }

            if (shouldAutoRejectUrl(cleaned.url)) {
                return dropArticle(cleaned.url, cleaned.title, 'non-news URL (video, Wikipedia, etc.)');
            }

            // Never keep the AI's self-reported date — replace it with whatever we could
            // actually confirm from the page or URL. If the page loaded fine but has no
            // confirmable date anywhere, we can't vouch for it, so drop the article rather
            // than show a date we can't back up. If the page itself couldn't be read (bot
            // blocked, paywalled, etc.), keep the article — same lenient handling as
            // before — but still don't claim a date we couldn't verify.
            const aiReportedDate = cleaned.date;
            cleaned.date = extractedDate || '';

            // A bot-walled page yields no date from the fetch above, but the publisher's
            // own feed usually still carries it (MJBizDaily serves its RSS to us while
            // blocking every article page). Google News redirect links can't be opened at
            // all, so whatever date came with them stands.
            if (!cleaned.date && !cleaned.url.includes('news.google.com')) {
                const resolved = await prioritySources.resolveArticleDate(cleaned.url, dateCache);
                if (resolved.date) {
                    cleaned.date = prioritySources.formatDateMMDDYY(resolved.date);
                    cleaned.dateVerifiedVia = resolved.via;
                    // A months-old post whose "updated" stamp is recent is an evergreen
                    // explainer rather than news; the window check below drops it.
                    if (resolved.modified) cleaned.dateModified = prioritySources.formatDateMMDDYY(resolved.modified);
                }
            }

            if (cleaned.date && cleaned.date !== aiReportedDate) {
                corrected.push({ title: cleaned.title, was: aiReportedDate || '(none)', now: cleaned.date, via: cleaned.dateVerifiedVia || 'page' });
            }

            if (isReadable && !cleaned.date) {
                return dropArticle(cleaned.url, cleaned.title, 'no confirmable publish date');
            }

            if (cleaned.date && isArticleTooOld(cleaned.date)) {
                return dropArticle(cleaned.url, cleaned.title, `older than ${ARTICLE_MAX_AGE_DAYS} days (${cleaned.date})`);
            }

            // Explicit newsletter window, when the caller sent one. Narrower and more
            // precise than the blanket max-age rule above.
            if ((since || until) && cleaned.date && !prioritySources.withinWindow(cleaned.date, since, until)) {
                return dropArticle(cleaned.url, cleaned.title, `published ${cleaned.date}, outside ${since || 'any'}..${until || 'today'}`);
            }

            // Categorize (and apply rejection rules from brief, using description fallback if unreadable/skipped)
            cleaned = categorizeArticle(cleaned, content);

            if (!cleaned) {
                return dropArticle(article.url, article.title, 'rule violation');
            }

            // Only the real fetched text lets us summarize accurately and check nuanced
            // guideline violations (ads, unpassed bills, etc.) — skip this when the page
            // wasn't readable, since we'd just be judging the AI's own blurb again.
            if (isReadable && content) {
                const analysis = await analyzeArticleContent(cleaned, content);
                cleaned.summary = analysis.summary;
                if (analysis.flagged) {
                    return dropArticle(cleaned.url, cleaned.title, analysis.flagReason || 'editorial rejection');
                }
            } else {
                cleaned.summary = '';
            }

            return cleaned;
        };

        const results = await mapWithConcurrency(rawArticles, 4, processArticle);

        // Filter out nulls (rejected articles)
        const validArticles = results.filter(a => a !== null);

        const indexed = validArticles.map((a, i) => ({ ...a, id: i + 1 }));
        const { articles: finalArticles, skipped: duplicateCount } = filterDuplicateArticles(
            indexed,
            Array.isArray(existingArticles) ? existingArticles : [],
        );
        if (duplicateCount > 0) {
            console.log(`Verify deduped ${duplicateCount} article(s) with matching URL or title.`);
        }

        console.log(
            `Verification complete: ${finalArticles.length}/${rawArticles.length} articles kept `
            + `(${rejected.length} dropped, ${duplicateCount} duplicates, ${corrected.length} date(s) corrected).`,
        );

        res.json({
            success: true,
            count: finalArticles.length,
            articles: finalArticles,
            rejectedCount: rejected.length,
            duplicateCount,
            rejected,
            datesCorrected: corrected,
        });
    } catch (error) {
        console.error('Error with article verification:', error);
        res.status(500).json(buildAiErrorResponse(error));
    }
});

const MODIFY_MAX_PER_REQUEST = 12;

function isTitleFocusedModifyPrompt(prompt) {
    const p = String(prompt || '').toLowerCase();
    return p.includes('title') && !p.includes('description') && !p.includes('summary');
}

// POST /api/articles/modify - Handle AI Article Modification
router.post('/modify', async (req, res) => {
    try {
        const { prompt, articles, model, titleOnly } = req.body || {};

        if (!prompt || !String(prompt).trim()) {
            return res.status(400).json({ error: 'Please enter a modification instruction.' });
        }
        if (!Array.isArray(articles) || articles.length === 0) {
            return res.status(400).json({ error: 'Select at least one article (Select column) to modify.' });
        }
        if (articles.length > MODIFY_MAX_PER_REQUEST) {
            return res.status(400).json({
                error: `Too many articles in one request (${articles.length}). The app sends 8 at a time automatically.`,
            });
        }

        const provider = resolveAiProvider(model);
        if (provider.error) {
            return res.status(503).json({ error: provider.error, configured: false });
        }

        const titleFocused = titleOnly === true
            || (titleOnly !== false && isTitleFocusedModifyPrompt(prompt));

        const inputArticles = titleFocused
            ? articles.map((a, i) => ({
                _batchIndex: i,
                title: a.title || '',
            }))
            : sanitizeArticlesForModify(articles);

        const { apiModel, isGemini } = provider;
        const maxTokens = Math.min(16000, 800 + inputArticles.length * (titleFocused ? 120 : 400));

        console.log(
            `Modifying ${inputArticles.length} articles (${titleFocused ? 'titles only' : 'full'}) `
            + `tokens~${maxTokens} model: ${model} -> ${apiModel}`,
        );

        const systemPrompt = titleFocused
            ? `You are a professional newsletter editor. Modify ONLY article titles per the user's instructions.

Return ONLY a valid JSON array with the same number of items in the same order.
Each object: {"title":"..."} only. Keep URLs and descriptions unchanged (do not include them).
No markdown, no code fences, no commentary.`
            : `You are a professional editor for a newsletter. Modify the provided articles based on the user's instructions.

Return ONLY a valid JSON array with the same number of items in the same order as the input.
Each object must have exactly these keys: "title", "description", "url", "date".
Do not add or remove articles. No markdown, no code fences, no commentary.`;

        const userMessage = `Instruction: ${String(prompt).trim()}\n\nArticles:\n${JSON.stringify(inputArticles, null, 2)}`;

        let content = '';

        if (provider.isOpenRouter) {
            try {
                const response = await openrouter.chat.completions.create({
                    model: apiModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage }
                    ],
                }, { timeout: 300000 });
                content = response.choices[0]?.message?.content || '';
            } catch (openrouterError) {
                console.error('OpenRouter API Error:', openrouterError);
                return res.status(500).json(buildAiErrorResponse(openrouterError, apiModel));
            }
        } else if (isGemini) {
            try {
                const geminiModel = genAI.getGenerativeModel({ model: apiModel });
                const result = await geminiModel.generateContent(`${systemPrompt}\n\n${userMessage}`);
                const response = await result.response;
                content = response.text();
            } catch (geminiError) {
                console.error('Gemini API Error:', geminiError);
                return res.status(500).json(buildAiErrorResponse(geminiError, apiModel));
            }
        } else {
            try {
                const message = await anthropic.messages.create({
                    model: apiModel,
                    max_tokens: maxTokens,
                    system: systemPrompt,
                    messages: [
                        { role: 'user', content: userMessage },
                    ],
                }, { timeout: 300000 });
                content = getAnthropicTextContent(message);
                if (!content.trim()) {
                    return res.status(500).json({
                        error: 'AI returned an empty response. Try again or use Claude Sonnet.',
                    });
                }
            } catch (anthropicError) {
                console.error('Anthropic API Error:', anthropicError);
                return res.status(500).json(buildAiErrorResponse(anthropicError, apiModel));
            }
        }

        let modifiedArticles = [];
        try {
            modifiedArticles = extractJSON(content);
            if (!Array.isArray(modifiedArticles)) {
                modifiedArticles = modifiedArticles ? [modifiedArticles] : [];
            }
        } catch (e) {
            console.error('Failed to parse AI JSON response:', content);
            const logId = Date.now();
            try {
                const logPath = path.join(ERROR_LOG_DIR, `error_log_${logId}.txt`);
                fs.writeFileSync(logPath, String(content || ''));
            } catch (fsErr) {
                console.error('Failed to write error log file', fsErr);
            }
            return res.status(500).json({
                error: 'AI could not return valid JSON. Try a shorter instruction or fewer articles.',
                details: String(content || '').trim().slice(0, 2000),
                logId,
            });
        }

        if (modifiedArticles.length !== inputArticles.length) {
            console.warn(
                `Modify count mismatch: sent ${inputArticles.length}, got ${modifiedArticles.length}. Aligning by index.`,
            );
            if (modifiedArticles.length > inputArticles.length) {
                modifiedArticles = modifiedArticles.slice(0, inputArticles.length);
            } else {
                while (modifiedArticles.length < inputArticles.length) {
                    const i = modifiedArticles.length;
                    modifiedArticles.push(titleFocused ? { title: inputArticles[i].title } : { ...inputArticles[i] });
                }
            }
        }

        modifiedArticles = modifiedArticles.map(a => {
            const normalized = { ...a };
            if (!normalized.title) {
                const altTitleKey = Object.keys(normalized).find(k => k.toLowerCase().includes('title') || k.toLowerCase().includes('headline'));
                if (altTitleKey) normalized.title = normalized[altTitleKey];
            }
            if (!normalized.description && !titleFocused) {
                const altDescKey = Object.keys(normalized).find(k => k.toLowerCase().includes('description') || k.toLowerCase().includes('summary'));
                if (altDescKey) normalized.description = normalized[altDescKey];
            }
            return normalized;
        });


        const sourceArticles = sanitizeArticlesForModify(articles);

        console.log(`Successfully modified ${modifiedArticles.length} articles.`);

        res.json({
            success: true,
            articles: modifiedArticles.map((a, i) => ({
                title: a.title != null ? String(a.title) : (titleFocused ? sourceArticles[i].title : inputArticles[i].title),
                description: titleFocused
                    ? sourceArticles[i].description
                    : (a.description != null ? String(a.description) : sourceArticles[i].description),
                url: titleFocused
                    ? sourceArticles[i].url
                    : (a.url != null ? String(a.url) : sourceArticles[i].url),
                date: titleFocused
                    ? sourceArticles[i].date
                    : (a.date != null ? String(a.date) : sourceArticles[i].date),
            })),
        });

    } catch (error) {
        console.error('Error modifying articles:', error);
        res.status(500).json(buildAiErrorResponse(error, model));
    }
});

function getManualContentForArticle(article, index, manualContent) {
    if (!manualContent || typeof manualContent !== 'object') return '';
    const url = String((article && article.url) || '').trim();
    if (url && typeof manualContent[url] === 'string' && manualContent[url].trim()) {
        return manualContent[url].trim();
    }
    if (url && manualContent.byUrl && typeof manualContent.byUrl[url] === 'string') {
        return String(manualContent.byUrl[url] || '').trim();
    }
    const byIndex = manualContent[index] || manualContent[String(index)];
    return String(byIndex || '').trim();
}

function contentMatchesArticleTitle(title, content) {
    const titleWords = String(title || '')
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.replace(/[^a-z0-9]/g, ''))
        .filter((w) => w.length > 4);
    if (titleWords.length === 0) return true;
    const lower = String(content || '').toLowerCase();
    const hits = titleWords.filter((w) => lower.includes(w)).length;
    return hits >= Math.min(2, titleWords.length);
}

// The Text page articles box is what the user sees as 1, 2, 3. Older clients
// still send leftover URLs in that box while only putting pick-order rows in
// `articles`, so the model tried PsyPost without a fetched body. Always take
// the first 3 URLs from the box / prompt, then fill from the articles array.
function parseSummarizeBoxArticles(prompt) {
    const text = String(prompt || '').replace(/\r\n/g, '\n');
    const chunks = text.split(/\n\n+/);
    const result = [];
    const used = new Set();
    chunks.forEach((chunk) => {
        if (result.length >= 3) return;
        const urlMatch = String(chunk).match(/https?:\/\/[^\s]+/);
        if (!urlMatch) return;
        const url = urlMatch[0].replace(/[),.;]+$/, '');
        if (!url || used.has(url)) return;
        used.add(url);
        const title = String(chunk)
            .replace(urlMatch[0], '')
            .replace(/^\s*\d+\.\s*\[[^\]]*\]\s*/, '')
            .replace(/\s+/g, ' ')
            .trim();
        result.push({ title, url, date: '', description: '' });
    });
    return result;
}

function sanitizeSummaryRules(rules) {
    const extra = '\nNever write that a link could not be accessed, would not load, or that you need the text. Summarize every fetched article.';
    const cleaned = String(rules || '')
        .split('\n')
        .filter((line) => {
            const l = line.toLowerCase();
            if (l.includes('could not be accessed')) return false;
            if (l.includes('couldn\'t be accessed')) return false;
            if (l.includes('explicitly state that the link')) return false;
            if (l.includes('paywall prevents access')) return false;
            if (l.includes('article is paywalled')) return false;
            return true;
        })
        .join('\n')
        .trim();
    return cleaned ? `${cleaned}${extra}` : extra.trim();
}

function summaryLooksIncomplete(text) {
    const t = String(text || '').toLowerCase();
    return /could not be accessed|couldn't be accessed|could not access|wouldn't load|would not load|did not load|could not summarize|couldn't summarize|send me the text|run (this|it) again|link did not load/.test(t);
}

function resolveSummarizeArticleInputs(prompt, articles) {
    const fromClient = (Array.isArray(articles) ? articles : []).map((a) => ({
        title: a.title || '',
        url: String(a.url || '').trim(),
        date: a.date || '',
        description: a.description || '',
    })).filter((a) => a.url);
    const fromBox = parseSummarizeBoxArticles(prompt);
    const byUrl = new Map(fromClient.map((a) => [a.url, a]));
    const merged = [];
    const used = new Set();
    const add = (item) => {
        if (!item || !item.url || used.has(item.url) || merged.length >= 3) return;
        used.add(item.url);
        const extra = byUrl.get(item.url);
        merged.push({
            title: (extra && extra.title) || item.title || '',
            url: item.url,
            date: (extra && extra.date) || item.date || '',
            description: (extra && extra.description) || item.description || '',
        });
    };
    fromBox.forEach(add);
    fromClient.forEach(add);
    return merged;
}

// POST /api/articles/summarize - Generate Summaries (supports Anthropic or Gemini)
router.post('/summarize', async (req, res) => {
    try {
        const { prompt, useRules, summaryRules, category, model, articles, checkOnly } = req.body;

        if (!checkOnly && !prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        const articleInputs = resolveSummarizeArticleInputs(prompt, articles);
        if (articleInputs.length === 0) {
            return res.status(400).json({ error: 'Articles are required for category summary generation' });
        }

        let apiModel = '';
        let isGemini = false;
        let isOpenRouter = false;
        if (!checkOnly) {
            const provider = resolveAiProvider(model);
            if (provider.error) {
                return res.status(503).json({ error: provider.error });
            }
            apiModel = provider.apiModel;
            isGemini = provider.isGemini;
            isOpenRouter = provider.isOpenRouter;
            console.log(`Generating summaries for ${category} with rules: ${useRules} (${isGemini ? 'Gemini' : (isOpenRouter ? 'OpenRouter' : 'Claude')})`);
        } else {
            console.log(`Checking article content for ${category} before summarize`);
        }

        // Load base prompt from config file (editable via UI) with hardcoded fallback
        let systemPrompt = '';
        if (!checkOnly) {
        try {
            const promptFile = path.join(__dirname, '../config/summary_base_prompt.txt');
            systemPrompt = fs.existsSync(promptFile) ? fs.readFileSync(promptFile, 'utf8').trim() : '';
        } catch (_) { systemPrompt = ''; }
        if (!systemPrompt) {
            systemPrompt = `You are a professional newsletter editor. Create a newsletter-ready summary for the provided category articles only.\n\nWrite exactly 6 to 7 short lines total.\nEach line should be concise, natural, and publication-ready.\nOnly use the fetched article content and article metadata provided by the user.\nDo not use outside knowledge.\nDo not mention URLs in the output.\nFocus on the most important developments across the provided articles for the selected category.\nNever say a link could not be accessed. Summarize every fetched article.`;
        }

        if (useRules && summaryRules && summaryRules.trim()) {
            systemPrompt += `\n\nHere are the specific rules you MUST follow:\n${sanitizeSummaryRules(summaryRules)}`;
        } else if (useRules) {
            try {
                const fs = require('fs');
                const path = require('path');
                const rulesPath = path.join(__dirname, '../newsletter_summary_rules.md');
                if (fs.existsSync(rulesPath)) {
                    const rules = fs.readFileSync(rulesPath, 'utf8');
                    systemPrompt += `\n\nHere are the specific rules you MUST follow:\n${sanitizeSummaryRules(rules)}`;
                }
            } catch (err) {
                console.error('Failed to read rules file:', err);
            }
        }
        
        // Always enforce no conversational filler, even if the user overwrote the base prompt
        systemPrompt += `\n\nCRITICAL INSTRUCTION: Output ONLY the newsletter content itself. Do NOT include any conversational filler, greetings, or introductory phrases such as "Here is your summary paragraph:" or "Here's the summary:".`;
        }

        const fetchedArticles = await Promise.all(articleInputs.map(async (article) => {
            const inspected = await verifyAndAnalyzeUrl(article.url, false, article.title);
            return {
                ...article,
                accessible: !!inspected.isValid,
                readable: !!inspected.isReadable,
                content: inspected.content || '',
            };
        }));

        const { manualContent, confirmed } = req.body;

        const articlePayload = fetchedArticles.map((article, index) => {
            const manualEntry = getManualContentForArticle(article, index, manualContent);
            const scraped = article.content ? article.content.substring(0, 6000) : '';
            const hasUsableManual = !!(manualEntry && contentMatchesArticleTitle(article.title, manualEntry));
            const hasUsableScrape = !!(article.readable && scraped && contentMatchesArticleTitle(article.title, scraped));
            const content = hasUsableManual ? manualEntry : (hasUsableScrape ? scraped : '');
            const readable = hasUsableManual || hasUsableScrape;
            return {
                index: index + 1,
                title: article.title,
                url: article.url,
                date: article.date,
                description: article.description,
                accessible: article.accessible,
                readable,
                content,
            };
        });

        const stillMissing = articlePayload.filter((article) => !article.content || !article.readable);
        if (stillMissing.length > 0) {
            console.log(`Summarize needs paste for ${category}:`, stillMissing.map((a) => a.url));
            return res.status(400).json({
                success: false,
                error: `${stillMissing.length} selected article(s) could not be fetched`,
                unreadableArticles: stillMissing.map((a) => ({
                    index: a.index,
                    title: a.title,
                    url: a.url,
                    date: a.date,
                })),
                needsManualContent: true,
            });
        }

        if (checkOnly) {
            return res.json({ success: true, ready: true, articleCount: articlePayload.length });
        }

        systemPrompt += `\n\nSummarize every article in the fetched-articles JSON. Do not mention URLs. Do not say a link could not be accessed when that article has content. Ignore any extra links that are not in the fetched-articles JSON.`;

        const userMessage = [
            `Category: ${category}`,
            'Fetched articles (summarize these only, in this order):',
            JSON.stringify(articlePayload, null, 2),
        ].join('\n');

        let content = '';
        if (isGemini) {
            const geminiModel = genAI.getGenerativeModel({ model: apiModel });
            const fullPrompt = `${systemPrompt}\n\nUser content to summarize:\n\n${userMessage}`;
            const result = await geminiModel.generateContent(fullPrompt);
            content = result.response.text();
        } else if (isOpenRouter) {
            const response = await openrouter.chat.completions.create({
                model: apiModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
            });
            content = response.choices[0]?.message?.content || '';
        } else {
            // effort is unsupported on Haiku (and errors outright there) — only Opus/Sonnet take it.
            const supportsEffort = !apiModel.includes('haiku');
            const message = await anthropic.messages.create({
                model: apiModel,
                max_tokens: 8000,
                system: systemPrompt,
                ...(supportsEffort ? { output_config: { effort: 'low' } } : {}),
                messages: [
                    { role: "user", content: userMessage },
                ],
            });
            content = getAnthropicTextContent(message);
        }

        if (!content || !content.trim()) {
            return res.status(500).json({
                success: false,
                error: 'Model returned no summary text (empty response).',
            });
        }

        if (summaryLooksIncomplete(content)) {
            console.log(`Summarize incomplete draft for ${category}, asking for paste`);
            return res.status(400).json({
                success: false,
                error: 'Summary said an article could not be loaded',
                unreadableArticles: articlePayload.map((a) => ({
                    index: a.index,
                    title: a.title,
                    url: a.url,
                    date: a.date,
                })),
                needsManualContent: true,
            });
        }

        res.json({
            success: true,
            resultText: content
        });

    } catch (error) {
        console.error('Error generating summaries:', error);
        res.status(500).json({ error: 'Failed to generate summaries', details: error.message });
    }
});

function parseLabeledNewsletters(raw) {
    const result = { MED: '', THC: '', CBD: '', INV: '' };
    const matched = new Set();
    const text = String(raw || '').replace(/\r\n/g, '\n').trim();
    if (!text) return { result, matched };
    const re = /(?:^|\n)[-—–]{1,3}\s*(MED|THC|CBD|INV)\s*[-—–]{1,3}\s*\n([\s\S]*?)(?=\n[-—–]{1,3}\s*(?:MED|THC|CBD|INV)\s*[-—–]{1,3}\s*\n|$)/gi;
    let match;
    while ((match = re.exec(text)) !== null) {
        const cat = match[1].toUpperCase();
        result[cat] = match[2].trim();
        matched.add(cat);
    }
    return { result, matched };
}

function formatLabeledNewsletters(map) {
    return ['MED', 'THC', 'CBD', 'INV'].map((cat) => `--- ${cat} ---\n${map[cat] || ''}`).join('\n\n');
}

// POST /api/articles/rewrite-newsletters - Apply an editor change request to all four drafts
router.post('/rewrite-newsletters', async (req, res) => {
    try {
        const { content, changeRequest, model } = req.body || {};
        if (!String(content || '').trim()) {
            return res.status(400).json({ error: 'Original newsletter copy is required.' });
        }
        if (!String(changeRequest || '').trim()) {
            return res.status(400).json({ error: 'A change request is required.' });
        }

        const provider = resolveAiProvider(model);
        if (provider.error) {
            return res.status(503).json({ error: provider.error });
        }
        const { apiModel, isGemini, isOpenRouter } = provider;

        const originalParsed = parseLabeledNewsletters(content);
        if (originalParsed.matched.size === 0) {
            return res.status(400).json({ error: 'Original copy must include --- MED ---, --- THC ---, --- CBD ---, and --- INV --- sections.' });
        }

        const systemPrompt = `You are a professional newsletter editor. The user will give you four newsletter drafts labeled --- MED ---, --- THC ---, --- CBD ---, and --- INV ---, plus a change request.

Rules:
- Apply the change request to the drafts.
- Keep the same four section headers exactly, in this order: --- MED ---, --- THC ---, --- CBD ---, --- INV ---
- Do not add conversational filler, markdown fences, titles, or commentary before or after the drafts.
- Do not invent news, facts, URLs, or articles that are not already in the drafts unless the change request explicitly asks for new wording.
- Preserve the voice and structure of sections the request does not mention.
- Output ONLY the four labeled newsletters.`;

        const userMessage = [
            'Change request:',
            String(changeRequest).trim(),
            '',
            'Current drafts:',
            String(content).trim(),
        ].join('\n');

        let rewritten = '';
        if (isGemini) {
            const geminiModel = genAI.getGenerativeModel({ model: apiModel });
            const fullPrompt = `${systemPrompt}\n\n${userMessage}`;
            const result = await geminiModel.generateContent(fullPrompt);
            rewritten = result.response.text();
        } else if (isOpenRouter) {
            const response = await openrouter.chat.completions.create({
                model: apiModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage },
                ],
            });
            rewritten = response.choices[0]?.message?.content || '';
        } else {
            const supportsEffort = !apiModel.includes('haiku');
            const message = await anthropic.messages.create({
                model: apiModel,
                max_tokens: 8000,
                system: systemPrompt,
                ...(supportsEffort ? { output_config: { effort: 'low' } } : {}),
                messages: [
                    { role: 'user', content: userMessage },
                ],
            });
            rewritten = getAnthropicTextContent(message);
        }

        rewritten = String(rewritten || '')
            .replace(/^```[a-z]*\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

        if (!rewritten) {
            return res.status(500).json({
                success: false,
                error: 'Model returned no rewritten text (empty response).',
            });
        }

        const rewrittenParsed = parseLabeledNewsletters(rewritten);
        if (rewrittenParsed.matched.size === 0) {
            return res.status(500).json({
                success: false,
                error: 'Model did not return labeled MED/THC/CBD/INV sections.',
                details: rewritten.slice(0, 500),
            });
        }

        const merged = { ...originalParsed.result };
        rewrittenParsed.matched.forEach((cat) => {
            merged[cat] = rewrittenParsed.result[cat];
        });

        res.json({
            success: true,
            resultText: formatLabeledNewsletters(merged),
        });
    } catch (error) {
        console.error('Error rewriting newsletters:', error);
        res.status(500).json(buildAiErrorResponse(error, req.body && req.body.model));
    }
});

router.post('/generate-subjects', async (req, res) => {
    try {
        const { prompt, categories, model } = req.body || {};
        if (!prompt || !String(prompt).trim()) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        if (!categories || typeof categories !== 'object') {
            return res.status(400).json({ error: 'Categories payload is required' });
        }

        const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
        if (!hasGemini) {
            return res.status(503).json({ error: 'GEMINI_API_KEY not configured for subject generation.' });
        }

        const normalized = {};
        ['MED', 'THC', 'CBD', 'INV'].forEach((category) => {
            const items = Array.isArray(categories[category]) ? categories[category] : [];
            normalized[category] = items.slice(0, 4).map((article, index) => ({
                index: index + 1,
                title: article.title || '',
                url: article.url || '',
                date: article.date || '',
                description: article.description || '',
            }));
        });

        const systemPrompt = `You are an expert email copywriter for newsletter subject lines.

Generate one short, highly clickable email subject for each category: MED, THC, CBD, INV.
Use only the provided articles.
Use suitable emojis as separators between the main hooks.
Keep each subject on a single line.
Make each subject concise and compelling.
Format the text of the subjects in Title Case.
If the same article or same core story appears in multiple categories, use the same wording and emoji treatment for that repeated idea.
Return only valid JSON with keys MED, THC, CBD, INV.`;

        const userMessage = [
            'User instructions:',
            String(prompt).trim(),
            '',
            'Category articles:',
            JSON.stringify(normalized, null, 2),
        ].join('\n');

        const requestedModel = String(model || '').toLowerCase();
        const geminiModelId = requestedModel.includes('gemini')
            ? getApiModelId(model || 'gemini-flash-3-0')
            : getApiModelId('gemini-flash-3-0');
        const geminiModel = genAI.getGenerativeModel({ model: geminiModelId });
        const fullPrompt = `${systemPrompt}\n\n${userMessage}`;
        const result = await geminiModel.generateContent(fullPrompt);
        const content = result.response.text().trim();
        const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

        let subjects;
        try {
            subjects = JSON.parse(cleaned);
        } catch (err) {
            return res.status(500).json({ error: 'Subject generator returned invalid JSON', details: cleaned });
        }

        res.json({
            success: true,
            subjects: {
                MED: String(subjects.MED || '').trim(),
                THC: String(subjects.THC || '').trim(),
                CBD: String(subjects.CBD || '').trim(),
                INV: String(subjects.INV || '').trim(),
            },
        });
    } catch (error) {
        console.error('Error generating subjects:', error);
        res.status(500).json({ error: 'Failed to generate subjects', details: error.message });
    }
});

router.get('/error-log/:logId', async (req, res) => {
    try {
        const logId = String(req.params.logId || '').trim();
        if (!/^\d+$/.test(logId)) {
            return res.status(400).json({ error: 'Invalid log ID' });
        }

        const filename = `error_json_${logId}.log`;
        const filepath = path.join(process.cwd(), filename);
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'Log not found' });
        }

        const content = fs.readFileSync(filepath, 'utf8');
        return res.json({ success: true, logId, content });
    } catch (error) {
        console.error('Error reading AI parse log:', error);
        return res.status(500).json({ error: 'Failed to read log file' });
    }
});

// Route to resolve existing vertexaisearch URLs
router.post('/resolve-urls', express.json(), async (req, res) => {
    try {
        const { urls } = req.body;
        if (!Array.isArray(urls)) {
            return res.status(400).json({ error: 'urls must be an array' });
        }

        const resolved = {};
        await Promise.all(urls.map(async (url) => {
            if (url.includes('vertexaisearch.cloud.google.com')) {
                try {
                    const response = await fetch(url, { method: 'HEAD' });
                    resolved[url] = response.url;
                } catch (e) {
                    resolved[url] = url;
                }
            } else {
                resolved[url] = url;
            }
        }));

        res.json({ success: true, resolved });
    } catch (error) {
        console.error('Error resolving urls:', error);
        res.status(500).json({ error: 'Failed to resolve URLs' });
    }
});

// ── Summary base prompt config ────────────────────────────────────────────────
const BASE_PROMPT_PATH = path.join(__dirname, '../config/summary_base_prompt.txt');
const SUMMARY_RULES_PATH = path.join(__dirname, '../logs/newsletter_summary_rules.md');

router.get('/summary-base-prompt', (req, res) => {
    try {
        const text = fs.existsSync(BASE_PROMPT_PATH) ? fs.readFileSync(BASE_PROMPT_PATH, 'utf8') : '';
        res.json({ prompt: text });
    } catch (err) {
        res.status(500).json({ error: 'Failed to read base prompt' });
    }
});

router.post('/summary-base-prompt', express.json(), (req, res) => {
    try {
        const { prompt } = req.body;
        if (typeof prompt !== 'string') return res.status(400).json({ error: 'prompt must be a string' });
        fs.writeFileSync(BASE_PROMPT_PATH, prompt, 'utf8');
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save base prompt' });
    }
});

router.get('/summary-rules', (req, res) => {
    try {
        const text = fs.existsSync(SUMMARY_RULES_PATH) ? fs.readFileSync(SUMMARY_RULES_PATH, 'utf8') : '';
        res.json({ rules: text });
    } catch (err) {
        res.status(500).json({ error: 'Failed to read summary rules' });
    }
});

router.post('/summary-rules', express.json(), (req, res) => {
    try {
        const { rules } = req.body;
        if (typeof rules !== 'string') return res.status(400).json({ error: 'rules must be a string' });
        fs.writeFileSync(SUMMARY_RULES_PATH, rules, 'utf8');
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save summary rules' });
    }
});

// ── Duplicate story grouping ──────────────────────────────────────────────────
// A sweep across six trade sites routinely returns eight or ten write-ups of the
// same event from different publishers. Those are not URL duplicates — every one is
// a distinct article — so nothing upstream catches them.
//
// This has to see the WHOLE list in one request: two write-ups of the same story sit
// at arbitrary positions, so the batched /modify path structurally cannot spot them.
// It only ever proposes groups; removal is the user's call in the UI.
router.post('/find-duplicates', express.json(), async (req, res) => {
    try {
        const { articles: inputArticles, model } = req.body || {};
        if (!Array.isArray(inputArticles) || inputArticles.length < 2) {
            return res.status(400).json({ error: 'Need at least 2 articles to compare.' });
        }
        if (inputArticles.length > 200) {
            return res.status(400).json({ error: `Too many articles to compare at once (${inputArticles.length}). Archive some first.` });
        }

        const provider = resolveAiProvider(model);
        if (provider.error) return res.status(503).json({ error: provider.error, configured: false });

        // Descriptions are trimmed hard: identifying the underlying event needs the
        // gist, not the full text, and the whole list has to fit in one prompt.
        const listing = inputArticles.map((a, i) => [
            `[${i}] ${a.title || '(untitled)'}`,
            `    SOURCE: ${a.sourceLabel || hostLabelFor(a.url)}   DATE: ${a.date || '(unknown)'}`,
            `    ${String(a.description || '').slice(0, 220)}`,
        ].join('\n')).join('\n\n');

        const systemPrompt = 'You are a newsletter editor identifying redundant coverage. You only output valid JSON. No markdown, no commentary.';
        const userMessage = `Below is a newsletter's full article list. Many articles are DIFFERENT publishers covering the SAME news storyline. The newsletter can only run one item per storyline, so they must be grouped.

GROUP AT THE LEVEL OF THE STORYLINE, NOT THE INDIVIDUAL EVENT. This is the most important rule. A single storyline includes every stage and angle of one news development:
- the vote, the signing, and the deadline it sets are ONE storyline, not three
- reaction and fallout pieces ("industry lobbies feud after the delay") belong to that same storyline
- explainers and "where things stand" pieces about that development belong to it too
- a differently-worded headline about the same development still belongs to it

Worked example: "House delays hemp-THC ban until Dec 11", "Congress votes to hit pause on federal hemp ban", "Trump signs bill delaying hemp THC ban", "Trump just delayed the hemp ban", "Hemp lobbies feud after Congress delays ban", and "Federal Hemp Ban 2026: Where Things Stand" are ALL ONE GROUP. They are the same storyline: the federal hemp ban being delayed.

Genuinely separate storylines stay separate: a different state's law, a different company's earnings, a lawsuit about a different jurisdiction, or an unrelated bill are each their own story even when they share a subject like "hemp" or "legalization".

BE EXHAUSTIVE. Before you answer, re-read the whole list once per group and confirm you have caught EVERY article belonging to it. Missing one defeats the purpose. It is better to group two articles that turn out to be separable than to leave a duplicate ungrouped.

For each group, choose which single article to KEEP, preferring in this order:
1. The most substantial and complete write-up of the storyline
2. A source whose article text we can actually read (avoid keeping one whose SOURCE is via Google News if a real alternative exists)
3. The most recent date, so the kept article reflects the latest state of the story

ARTICLES:
${listing}

Return a JSON array of groups. Include ONLY groups with 2 or more articles. If nothing is redundant, return [].

Each group object must have exactly:
- "topic": short description of the shared storyline, under 10 words
- "keep": the [number] of the article to keep
- "drop": array of the [numbers] of every other article on that storyline
- "reason": under 15 words, why that one was chosen

Example: [{"topic":"Federal hemp ban delayed to December","keep":4,"drop":[0,1,2,3,6,7],"reason":"fullest account, readable source"}]`;

        let content = '';
        const { apiModel, isGemini, isOpenRouter } = provider;

        try {
            if (isGemini) {
                const geminiModel = genAI.getGenerativeModel({ model: apiModel });
                const result = await geminiModel.generateContent(`${systemPrompt}\n\n${userMessage}`);
                content = await result.response.text();
            } else if (isOpenRouter) {
                const response = await openrouter.chat.completions.create({
                    model: apiModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage },
                    ],
                }, { timeout: 300000 });
                content = response.choices[0]?.message?.content || '';
            } else {
                const message = await anthropic.messages.create({
                    model: apiModel,
                    max_tokens: 8000,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: userMessage }],
                }, { timeout: 300000 });
                content = getAnthropicTextContent(message);
            }
        } catch (aiError) {
            console.error('Duplicate grouping failed:', aiError);
            return res.status(500).json(buildAiErrorResponse(aiError, apiModel));
        }

        let groups = [];
        try {
            groups = extractJSON(content);
        } catch (e) {
            return res.status(500).json({ error: 'Could not read the AI response.', details: String(content).slice(0, 400) });
        }

        // Sanitize hard: indexes must be real, distinct, and never both kept and dropped.
        const used = new Set();
        const clean = (Array.isArray(groups) ? groups : []).map((g) => {
            const keep = Number(g.keep);
            if (!Number.isInteger(keep) || !inputArticles[keep] || used.has(keep)) return null;

            const drop = [...new Set((Array.isArray(g.drop) ? g.drop : []).map(Number))]
                .filter((i) => Number.isInteger(i) && inputArticles[i] && i !== keep && !used.has(i));
            if (drop.length === 0) return null;

            used.add(keep);
            drop.forEach((i) => used.add(i));
            return {
                topic: String(g.topic || 'Same story').slice(0, 120),
                reason: String(g.reason || '').slice(0, 160),
                keep,
                drop,
            };
        }).filter(Boolean);

        // Second pass. The first pass reliably finds the storylines but tends to miss
        // individual members of them, so every still-ungrouped article is re-checked
        // against the groups it produced. Skipped when there is nothing to check.
        let sweptUp = 0;
        const ungrouped = inputArticles.map((_, i) => i).filter((i) => !used.has(i));

        if (clean.length && ungrouped.length) {
            try {
                const groupList = clean.map((g, gi) => `(${gi}) ${g.topic} — e.g. "${inputArticles[g.keep].title}"`).join('\n');
                const candidates = ungrouped.map((i) => `[${i}] ${inputArticles[i].title || '(untitled)'}\n     ${String(inputArticles[i].description || '').slice(0, 180)}`).join('\n\n');

                const sweepMessage = `These storylines were already identified in a newsletter's article list:
${groupList}

The articles below were NOT assigned to any of them. MOST OF THEM ARE GENUINELY THEIR OWN STORIES and must be left alone. Your job is only to catch the occasional article that is unmistakably another write-up of a storyline above.

An article belongs to a storyline ONLY if it covers the very same law, bill, company action or event. Sharing a theme is not enough. Reject anything where:
- the jurisdiction differs — a Florida marketing rule is NOT the California marketing law; an Ohio court ruling is NOT a federal bill
- the actor differs — a different company, agency, legislature or court
- it is a research study, survey or opinion piece about the subject area rather than coverage of that specific event

Only add an article you would defend to an editor who is about to delete it. When in doubt, leave it out.

UNASSIGNED ARTICLES:
${candidates}

Return a JSON array. Each object must have exactly:
- "article": the [number] of the unassigned article
- "group": the (number) of the storyline it belongs to
- "why": under 12 words naming the shared law/event, proving it is the same one

Return [] if none of them belong, which is a normal and expected answer. No markdown, no commentary.`;

                let sweepContent = '';
                if (isGemini) {
                    const gm = genAI.getGenerativeModel({ model: apiModel });
                    sweepContent = await (await gm.generateContent(`${systemPrompt}\n\n${sweepMessage}`)).response.text();
                } else if (isOpenRouter) {
                    const resp = await openrouter.chat.completions.create({
                        model: apiModel,
                        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: sweepMessage }],
                    }, { timeout: 300000 });
                    sweepContent = resp.choices[0]?.message?.content || '';
                } else {
                    const msg = await anthropic.messages.create({
                        model: apiModel,
                        max_tokens: 4000,
                        system: systemPrompt,
                        messages: [{ role: 'user', content: sweepMessage }],
                    }, { timeout: 300000 });
                    sweepContent = getAnthropicTextContent(msg);
                }

                for (const entry of extractJSON(sweepContent) || []) {
                    const articleIndex = Number(entry.article);
                    const group = clean[Number(entry.group)];
                    if (!group || !Number.isInteger(articleIndex)) continue;
                    if (!inputArticles[articleIndex] || used.has(articleIndex)) continue;
                    group.drop.push(articleIndex);
                    used.add(articleIndex);
                    sweptUp++;
                }
            } catch (sweepError) {
                // A failed second pass just means fewer catches, never a failed request.
                console.warn('Duplicate grouping second pass failed:', sweepError.message);
            }
        }

        console.log(`Duplicate grouping: ${inputArticles.length} articles -> ${clean.length} group(s), ${clean.reduce((n, g) => n + g.drop.length, 0)} redundant (${sweptUp} added on second pass).`);

        res.json({
            success: true,
            compared: inputArticles.length,
            groups: clean,
            sweptUp,
            redundantCount: clean.reduce((n, g) => n + g.drop.length, 0),
        });
    } catch (error) {
        console.error('find-duplicates failed:', error);
        res.status(500).json(buildAiErrorResponse(error, req.body && req.body.model));
    }
});

function hostLabelFor(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return 'unknown';
    }
}

// ── Priority sources ──────────────────────────────────────────────────────────
// Sites we sweep in full rather than hoping a general web search turns them up.
// Every article published in the window is collected, then judged against the same
// newsletter criteria the categorizer uses.

// The category briefs, stated for the model. These mirror the rules encoded in
// categorizeArticle() above so a swept article is judged the same way a searched one is.
const CATEGORY_BRIEF = `MED — medical & science: clinical trials, published research, patient access, FDA/NIH action, the opioid/fentanyl crisis. Exclude studies that are merely announced or planned, and anti-cannabis scare pieces.
THC — marijuana policy & industry: legalization, rescheduling, regulation, dispensaries, adult-use markets, cannabis culture and consumer trends. Exclude local city ordinances, zoning and planning items, small individual busts, and anti-cannabis advocacy.
CBD — hemp & cannabinoids: hemp farming and supply chain, CBD products, delta-8/delta-10, THCA, CBG, CBN, the Farm Bill. Exclude advertising, generic "CBD helps X" wellness filler and pure product PR.
INV — business & investment: M&A, earnings, stock moves, fundraising, major multi-state-operator news, and international market news. Exclude small company press releases and routine local revenue reports.`;

const REJECT_BRIEF = `Reject an article when it is: a pure company press release (unless it is M&A, major earnings, or major clinical-trial results); an advertisement, sponsored post, or the site's own promotion (conferences, webinars, memberships, internships, fundraising appeals, podcast episodes); a duplicate of another article in this batch; or off-topic for all four newsletters.`;

function buildSourceEvaluationPrompt(items, options) {
    const { since, until, extraInstructions } = options;
    const window = since || until
        ? `Only keep articles published between ${since || 'any date'} and ${until || 'today'}. The date of each candidate is given; if a date is missing, keep the article and leave its date empty.`
        : 'No date restriction.';

    const candidates = items.map((item, i) => [
        `[${i}] TITLE: ${item.title}`,
        `    SOURCE: ${item.sourceLabel}`,
        `    DATE: ${item.date || '(unknown)'}`,
        item.restrictions ? `    SOURCE RULES: ${item.restrictions}` : null,
        item.isRedirectLink ? '    NOTE: article body unavailable (site blocks automated access) — judge on the headline and date alone.' : null,
        `    TEXT: ${(item.description || '(no excerpt available)').slice(0, 900)}`,
    ].filter(Boolean).join('\n')).join('\n\n');

    return `You are the editor of four cannabis-industry newsletters. Below is every article published by a set of trusted sources in a date window. Judge each one against the newsletter criteria and decide whether it belongs.

CATEGORY CRITERIA:
${CATEGORY_BRIEF}

REJECTION RULES:
${REJECT_BRIEF}

DATE RULE: ${window}

SOURCE RULES: Each candidate may carry its own "SOURCE RULES". Those restrictions are mandatory for articles from that source.
${extraInstructions ? `\nADDITIONAL INSTRUCTIONS FROM THE EDITOR (these override the general rules where they conflict):\n${extraInstructions}\n` : ''}
CANDIDATES:
${candidates}

Return a single valid JSON array, one object per candidate you decide to KEEP. Omit rejected candidates entirely. No markdown, no commentary.

Each object must have exactly these keys:
- "index": the [number] of the candidate
- "title": a cleaned-up headline (fix truncation and title case; do not invent facts)
- "description": a 1-2 sentence factual summary drawn only from the text provided
- "ranks": an object with a key for each newsletter it belongs in, valued "Y" for a strong fit or "YM" for a maybe. Example: {"THC":"Y","INV":"YM"}. Include only the categories that genuinely apply.
- "reason": under 12 words, why it was kept

Example: [{"index":3,"title":"...","description":"...","ranks":{"THC":"Y"},"reason":"state legalization vote"}]`;
}

/** Run one batch of harvested items through the selected model. */
async function evaluateSourceBatch(items, provider, options) {
    const prompt = buildSourceEvaluationPrompt(items, options);
    const { apiModel, isGemini, isOpenRouter } = provider;
    const system = 'You are a newsletter editor that only outputs valid JSON arrays. No markdown, no conversational text.';

    if (isGemini) {
        const geminiModel = genAI.getGenerativeModel({ model: apiModel });
        const result = await geminiModel.generateContent(`${system}\n\n${prompt}`);
        return await result.response.text();
    }
    if (isOpenRouter) {
        const response = await openrouter.chat.completions.create({
            model: apiModel,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: prompt },
            ],
        }, { timeout: 300000 });
        return response.choices[0]?.message?.content || '';
    }
    const message = await anthropic.messages.create({
        model: apiModel,
        max_tokens: 8000,
        system,
        messages: [{ role: 'user', content: prompt }],
    }, { timeout: 300000 });
    return getAnthropicTextContent(message);
}

function normalizeSourceList(list) {
    const input = Array.isArray(list) && list.length ? list : prioritySources.DEFAULT_SOURCES;
    return input
        .filter((s) => s && s.url && String(s.url).trim())
        .map((s) => {
            let url = String(s.url).trim();
            if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
            return {
                url,
                label: String(s.label || '').trim() || prioritySources.hostOf(url),
                restrictions: String(s.restrictions || '').trim(),
                enabled: s.enabled !== false,
            };
        });
}

// GET /api/articles/priority-sources — the seed list the UI starts from.
router.get('/priority-sources', (req, res) => {
    res.json({ sources: prioritySources.DEFAULT_SOURCES });
});

// POST /api/articles/priority-sources/check — pre-flight. Can we actually read each
// site, by which route, and do its article pages come back unblocked?
router.post('/priority-sources/check', express.json(), async (req, res) => {
    try {
        const sources = normalizeSourceList(req.body && req.body.sources);
        if (sources.length === 0) return res.status(400).json({ error: 'No sources to check.' });

        const results = await prioritySources.mapLimited(sources, 3, async (source) => {
            try {
                return await prioritySources.checkSourceAccess(source, { sampleSize: 2 });
            } catch (error) {
                return {
                    url: source.url,
                    label: source.label,
                    ok: false,
                    blockReason: error.message,
                    notes: ['Access check threw an error.'],
                    samples: [],
                };
            }
        });

        res.json({ success: true, results });
    } catch (error) {
        console.error('Priority source check failed:', error);
        res.status(500).json({ error: 'Access check failed', details: error.message });
    }
});

// POST /api/articles/priority-sources/sweep — harvest every article in the window
// from the enabled sources, then evaluate them against the newsletter criteria.
router.post('/priority-sources/sweep', express.json(), async (req, res) => {
    try {
        const {
            sources: rawSources,
            since,
            until,
            model,
            existingUrls = [],
            perSourceLimit = 40,
            extraInstructions = '',
        } = req.body || {};

        const sources = normalizeSourceList(rawSources).filter((s) => s.enabled);
        if (sources.length === 0) return res.status(400).json({ error: 'No enabled sources to sweep.' });

        const provider = resolveAiProvider(model);
        if (provider.error) return res.status(503).json({ error: provider.error, configured: false });

        console.log(`Priority sweep: ${sources.length} sources, since=${since || 'any'}, until=${until || 'today'}`);

        // Stage 1 — harvest (network only, no AI spend).
        const harvests = await prioritySources.mapLimited(sources, 3, async (source) => {
            try {
                return await prioritySources.harvestSource(source, {
                    sinceISO: since || null,
                    untilISO: until || null,
                    limit: Math.min(Number(perSourceLimit) || 40, 60),
                });
            } catch (error) {
                return { source: source.url, label: source.label, method: null, blocked: true, items: [], notes: [error.message] };
            }
        });

        const seen = new Set((existingUrls || []).map((u) => String(u).replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase()));
        const candidates = [];
        for (const harvest of harvests) {
            for (const item of harvest.items) {
                const key = String(item.url).replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                candidates.push(item);
            }
        }

        const sourceReport = harvests.map((h) => ({
            label: h.label,
            url: h.source,
            method: h.method,
            degraded: !!h.degraded,
            blocked: !!h.blocked,
            harvested: h.items.length,
            notes: h.notes || [],
        }));

        if (candidates.length === 0) {
            return res.json({
                success: true,
                stage: 'raw',
                articles: [],
                harvested: 0,
                kept: 0,
                sources: sourceReport,
                message: 'No new articles found in that window (everything found was already in the workspace).',
            });
        }

        // Stage 2 — evaluate in batches so one oversized prompt can't blow the context.
        const BATCH = 20;
        const batches = [];
        for (let i = 0; i < candidates.length; i += BATCH) batches.push(candidates.slice(i, i + BATCH));

        // Batches run a few at a time: a full sweep can be 100+ articles, and doing
        // them one after another risks hitting the serverless request timeout.
        const evalErrors = [];
        const batchResults = await mapWithConcurrency(batches, 3, async (batch) => {
            try {
                const content = await evaluateSourceBatch(batch, provider, { since, until, extraInstructions });
                const decisions = extractJSON(content);
                const out = [];
                for (const decision of Array.isArray(decisions) ? decisions : []) {
                    const item = batch[Number(decision.index)];
                    if (!item) continue;
                    const ranks = decision.ranks && typeof decision.ranks === 'object' ? decision.ranks : {};
                    const categories = Object.keys(ranks).filter((c) => ['MED', 'THC', 'CBD', 'INV'].includes(c));
                    if (categories.length === 0) continue;
                    out.push({
                        title: decision.title || item.title,
                        url: item.url,
                        description: decision.description || item.description || '',
                        date: item.date || '',
                        categories,
                        ranks: categories.reduce((acc, c) => ({ ...acc, [c]: ranks[c] === 'Y' ? 'Y' : 'YM' }), {}),
                        // Notes stays empty — that column is the user's own scratch space.
                        // The source is kept on sourceLabel, which the UI and the
                        // duplicate grouper read directly.
                        notes: '',
                        status: 'Y',
                        paywall: false,
                        sourceLabel: item.sourceLabel,
                        isRedirectLink: !!item.isRedirectLink,
                    });
                }
                return out;
            } catch (error) {
                console.error('Priority sweep evaluation batch failed:', error);
                evalErrors.push(parseAIError(error));
                return [];
            }
        });
        const kept = batchResults.flat();

        if (kept.length === 0 && evalErrors.length) {
            return res.status(500).json({ error: `Evaluation failed: ${evalErrors[0]}`, sources: sourceReport, harvested: candidates.length });
        }

        const articles = kept.map((a, i) => ({
            ...cleanArticleData(a, 0),
            id: i + 1,
            categories: a.categories,
            ranks: a.ranks,
            notes: a.notes,
            sourceLabel: a.sourceLabel,
            isRedirectLink: a.isRedirectLink,
            needsVerification: true,
        }));

        res.json({
            success: true,
            stage: 'raw',
            source: 'priority-sweep',
            harvested: candidates.length,
            kept: articles.length,
            sources: sourceReport,
            evalErrors,
            articles,
        });
    } catch (error) {
        console.error('Priority sweep failed:', error);
        res.status(500).json(buildAiErrorResponse(error, req.body && req.body.model));
    }
});

module.exports = router;
