const GREETING_OPTIONS =
    Array.from(new Set([
        'Thanks and have a great week',
        'Thanks',
        'Enjoy your week!',
        'Have a stupendous week!',
        'Thanks and have a marvelous week!',
        'I hope you have a special week!',
        'Have a tremendous week!',
        'I hope you have a remarkable week',
        'Have a wondrous week!',
        'I hope you have a sensational week!',
        'Have a Super New Year!',
        'Thanks and have a dynamite week!',
        'I hope your week is something else!',
        'Have a brilliant week!',
        'Have an enjoyable week!',
        'Thanks and have a fabulous week!',
        'Thanks and have an excellent week!',
        'Thanks and have a magnificent week!',
        'Thanks and have a phenomenal week!',
        'Thanks and have a superb week!',
        'Thanks and have a pleasant week!',
        'Stay safe and cozy! :)',
        'Stay safe and cozy!',
        'Have a Terrific Week',
        'Thanks and have a stupendous week!',
        'Have an exceptional week!',
        'Have a fantastic week and stay safe,',
        'Thanks and have a great week!',
        'Have a warm summer week!',
        'Thanks and have a sunny week!',
        'Thanks and have a spectacular week!',
        'Thanks and have an astounding week!',
        'Thanks and have an impressive week!',
        'Thanks and have a productive week!',
        'Thanks and have a wonderful week!',
        'Thanks and have an extraordinary week!',
        'Thanks and have a super week!',
        'Thanks and have an incredible week!',
        'Thanks and have an unbelievable week!',
        'Thanks and have a sublime week!',
        'Thanks and have a rad week! :)',
        'Thanks and have an outstanding week!',
        'Thanks and have a splendid week!',
        'Thanks and have a very good week!',
        'Thanks and I hope you go vote!',
        'Thanks and I hope you have a relaxing week,',
        'Thanks and I hope you have a stellar week!',
        'Happy Thanksgiving!',
        'Have an awesome week!',
        'Thanks and have a tremendous week!',
        'Thanks and have an amazing week!',
        'Happy Holidays!',
        'Have a super-duper week!',
        'I hope you have a marvelous week!',
        'I hope your week is rad!',
        'Have a sensational week!',
        'Have a fantastic week!',
        'I hope you have a productive week!',
        'Have a magnificent week!',
        'Have a relaxing week,',
        'Have a fabulous week!',
        'Have an incredible week!',
        'Happy 420,',
        'Have an excellent week!',
        'Have an outstanding week!',
        'Have a splendid week,',
        'Have a wonderful week!',
        'Have a stellar week!',
        'Have an unbelievable week!',
        'Have a dynamite week!',
        'Best Wishes,',
        'Have a sunny week,',
        'Have a terrific week!',
        'Have a spectacular week!',
        'Have an extraordinary week!',
        'Have an amazing week!',
        'Have an impressive week!',
        'Have a great week!',
        'Enjoy your week',
        'Happy Hallowen!',
        'Get ready for 2022! :)',
        'Make 2022 awesome!',
        'Have a peaceful week!',
        'Enjoy Your Week!',
        'Have a radical week',
        'Have a rad week!',
        'Please spread the love this thanksgiving! :)',
        'Thanks and I hope you have a wondrous week,',
        'Happy 4th of July!',
        'Thanks and I hope you have a terrific week!',
        'Merry Christmas!',
        'Happy MLK Day!',
        'Happy Labor Day!',
    ]));
GREETING_OPTIONS.sort();

const DEFAULT_GREETING = 'Have a fantastic week and stay safe,';
const DEFAULT_SUMMARY_RULES = [
    '1.  Only use the URLs provided in the user input.',
    '2.  Do not use prior knowledge.',
    '3.  Do not supplement with outside research.',
    '4.  Do not infer facts not explicitly stated in the article.',
    '5.  Never write that a link could not be accessed. Only summarize fetched article bodies.',
    '6.  Never write that an article is paywalled in the newsletter copy.',
    '7.  If partial access is available, only summarize the visible content.',
    '8.  Dont use em dashes',
    '9.  Final product should be a paragraph',
    '10. Each article should be summarized by one sentence.',
    '12. Do not use past participles',
    '13. make it casual',
    '14. Here is the lancet article to summarize into a sentence.',
    '15. Dont include the names of the periodicals or the studies',
    '16. Keep sentences succinct but give important data if applicable.',
].join('\n');

function normalizeSummaryRules(value) {
    const text = String(value || '').trim();
    if (!text) return DEFAULT_SUMMARY_RULES;
    return value;
}

const LEGACY_DEFAULT_SUBJECT_PROMPT = "From the top 3 articles for each 4 category, Create a small Clicky subject by suitable Emojis. Keep Emojis first then subjects with space and don't use \"|\" in between. Same articles should have same Subjects.";
const DEFAULT_SUBJECT_PROMPT = "From the top 3 articles for each 4 category, Create a small Clicky subject by suitable Emojis. Keep Emojis first then subjects with space and don't use \"|\" in between. Same articles should have same Subjects.";

let DEFAULT_PUBLIC_IMAGE_BASE = 'https://purablis.com/purablis.com/newsletter';
let DEFAULT_INSPIRATIONAL_PUBLIC_BASE = 'https://purablis.com/purablis.com/newsletter/inspiration1';
let DEFAULT_STATE_ICONS_PUBLIC_BASE = 'https://purablis.com/purablis.com/newsletter/states';
let DEFAULT_ARTICLE_PUBLIC_SUBFOLDER = '';
const LEGACY_NEWSLETTER_IMAGES_BASE = 'https://purablis.com/News-roundup/images';

// Global State
let articles = [];
let archivedArticles = [];
let laterCoolArticles = [];
let inspirationalImages = [];
let inspirationalLibraryImages = [];
let newsletterContent = {
    MED: { intro: '', outro: '' },
    THC: { intro: '', outro: '' },
    CBD: { intro: '', outro: '' },
    INV: { intro: '', outro: '' },
    selectedResults: {
        MED: "A new study found cannabis products gave solid pain relief and better sleep, mental health, and quality of life for folks with fibromyalgia, rheumatoid arthritis, and osteoarthritis across all three formulations tested. UC Davis scientists cooked up a new class of psychedelic compounds that flip on the same serotonin receptor as classic psychedelics but skip the hallucinations in mice. That might lead to future reports saying the US still spends way more on healthcare than any peer nation, while around 27M Americans go uninsured, with lower life expectancy and higher avoidable deaths to show for it. So though Mexico, with all its issues, recently found a way to make free healthcare for everyone, the US politicians still can't (or won't) figure it out.",
        THC: "California's licensed cannabis retailers pulled in $956.7M in Q1 2026, down a bit from $976.5M in the same period last year, marking another dip in the nation's largest cannabis market. Now that cannabis is federally considered medicine, a group of Democratic lawmakers and unions is pushing Trump to commute the sentences of federal prisoners locked up for nonviolent marijuana offenses. A new trial with chronic pain patients found that cannabis capsules containing various cannabinoid combos delivered significant improvements in pain, sleep, mental health, and quality of life across fibromyalgia, rheumatoid arthritis, and osteoarthritis sufferers, with effects ranging from small to large. Now, let's get those federal medicine sellers and users out of jail. :)",
        CBD: "Scientists are cooking up a new class of psychedelic-like compounds that hit the same serotonin receptors as classic psychedelics but skip the hallucinations. They hope it will result in safer treatments for depression, PTSD, and addiction without the high. Matthew Perry's assistant got more than 3 years in prison for his central role in the actor's ketamine death and was admonished by the judge for getting the ketamine, administering it, and lying to police. Though honestly, would he have had the job if he wasn't going to follow Perry's requests? Minnesota's new cannabis law merges medical and recreational supply chains, creates a new \"macrobusiness\" license, and lets hemp producers jump into the adult-use market without shutting down their existing operations ahead of the federal hemp ban taking effect on November 12. As the administration creates definitions, states are shifting their classifications to protect local hemp businesses. There is a lot that can be done with full-spectrum CBD to work around the federal framework, just like cannabis states have been doing for decades. :)",
        INV: "This week, we gave more info about Bryan Hubbard, a self-described psychedelics whisperer for Republicans, who helped catalyze Trump's recent executive order directing federal agencies to speed up research on psychedelics like ibogaine. On the cannabis front, while California sales dipped slightly again, New York's industry is still hot, hitting its 5-year anniversary with $3.3B in sales and 600 dispensaries. :)\nOver 200 people have now been killed in the U.S. military's boat strike campaign off South America, with coastal communities in Colombia and Ecuador abandoning fishing out of fear, while Guatemala pushed back on a report claiming it had agreed to let the U.S. carry out similar strikes on its territory, saying it wants security cooperation but never approved foreign military operations. During the Iran war, he also claimed that the two sides are close to a peace deal, while Iran denies it. I'm seeing a trend. Given that I heard lots of the artists, Trump said, who were committed to the 250th US celebration, claimed they were never invited and opted out, it does make me wonder something. When Donald Trump was in High School, did he ever announce to his classmates that the most beautiful girl in the class was his serious girlfriend while she denied it and said she had no idea what he was talking about? Also, did it work with her, finally succumbing to this PR pressure? If you know, email me. ;)"
    },
    templates: { MED: '', THC: '', CBD: '', INV: '' },
    summaryRules: DEFAULT_SUMMARY_RULES,
    selectedGreeting: DEFAULT_GREETING,
    customGreetings: [],
    subjectPrompt: DEFAULT_SUBJECT_PROMPT,
    generatedSubjects: { MED: '', THC: '', CBD: '', INV: '' },
    categoryPickOrder: { MED: '', THC: '', CBD: '', INV: '' },
    publicImageBase: DEFAULT_PUBLIC_IMAGE_BASE,
    publicImageSubfolder: DEFAULT_ARTICLE_PUBLIC_SUBFOLDER,
    stateIconsPublicBase: DEFAULT_STATE_ICONS_PUBLIC_BASE,
    inspirationalPublicBase: DEFAULT_INSPIRATIONAL_PUBLIC_BASE,
    articleSearchEngine: 'youcom',
    bulkOriginalText: '',
    bulkChangeRequest: '',
    bulkUpdatedText: '',
    bulkWorkflowTab: 'original',
};
let currentEditorTab = 'MED';
let currentConfirmationTab = 'MED';
let lastGeneratedNewsletter = null;
const confirmationTemplateCache = {};
const confirmationRenderedHtml = { MED: '', THC: '', CBD: '', INV: '' };
let confirmationInspirationalImage = '';
let articleTitleSortOrder = '';
let imageViewSortOrder = '';
let batchFilter = ''; // '' = all, or addedAt ISO string to show only that batch
const INSPIRATIONAL_LIBRARY_CACHE_KEY = 'newsletter_inspirational_library';
const LAST_SESSION_NAME_KEY = 'newsletter_last_session_name';
let cachedBasePrompt = null;
let currentSessionName = '';

// Load State: first from LocalStorage (instant), then from Supabase if configured (overwrites)
try {
    const saved = localStorage.getItem('newsletter_articles');
    if (saved) {
        const data = JSON.parse(saved);
        if (Array.isArray(data)) {
            articles = data.filter((a) => a.status !== 'FLAG');
            articles.forEach(repairArticleImagePreview);
        } else {
            applyWorkspaceState(data, { mergeLibrary: true });
        }
    }
    const savedLibrary = localStorage.getItem(INSPIRATIONAL_LIBRARY_CACHE_KEY);
    if (savedLibrary) {
        inspirationalLibraryImages = filterInspirationalLibraryImages(JSON.parse(savedLibrary));
    }
    restoreLastSessionSelection();
    repairMisplacedPurablisImageUrls();
    inferPublicImageSettingsFromArticles();
    syncPublicImageSettingsUi();
    syncArticleSearchEngineUi();
    syncArticleImageFieldsFromPublished();
} catch (e) {
    console.error('Failed to load state', e);
}

function buildWorkspaceState() {
    const nameEl = document.getElementById('newsletter-name');
    const sessionName = currentSessionName || (nameEl ? nameEl.value.trim() : '');
    return {
        articles,
        archivedArticles,
        laterCoolArticles,
        inspirationalImages,
        confirmationInspirationalImage,
        inspirationalLibraryImages,
        newsletterContent,
        lastGeneratedNewsletter,
        aiQuery: getAiQuery(),
        currentSessionName: sessionName,
        publicImageBase: newsletterContent.publicImageBase || DEFAULT_PUBLIC_IMAGE_BASE,
        publicImageSubfolder: newsletterContent.publicImageSubfolder || '',
        articleSearchEngine: getArticleSearchEngine(),
    };
}

function slugifyNewsletterFolder(name) {
    return String(name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function editionDatePrefixFromToday() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}-${dd}-${yy}`;
}

function applyEditionDateToFilename(filename) {
    const base = String(filename || '').trim().split('/').pop();
    if (!base) return '';
    if (/^\d{2}-\d{2}-\d{2}-/.test(base)) return base;
    return `${getEditionDatePrefixForNewsletter()}-${base}`;
}

function getEditionDatePrefixForNewsletter() {
    const saved = newsletterContent.editionDatePrefix;
    if (saved && /^\d{2}-\d{2}-\d{2}$/.test(String(saved).trim())) {
        return String(saved).trim();
    }
    for (const a of articles) {
        for (const field of ['purablisFilename', 'publishedImageUrl', 'image']) {
            const m = String(a[field] || '').match(/(\d{2}-\d{2}-\d{2})-/);
            if (m) return m[1];
        }
    }
    return editionDatePrefixFromToday();
}

function slugifyTitleForFilename(title, maxLen = 36) {
    return String(title || 'article')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, maxLen) || 'article';
}

function isShortPurablisImageUrl(url) {
    const u = String(url || '').trim();
    if (!/purablis\.com\/News-roundup\/images\//i.test(u)) return false;
    const fn = u.split('/').pop().split('?')[0];
    if (/^\d{2}-\d{2}-\d{2}-/.test(fn)) return false;
    return /^(?:freepik|upload)-/i.test(fn);
}

function getArticleCategoriesForFilename(article) {
    const out = [];
    const cats = ['MED', 'THC', 'CBD', 'INV'];
    cats.forEach((cat) => {
        const rank = String(getRankForSort(article, cat) ?? '').trim();
        if (rank && /^(Y|YM|\d+|COOL FINDS)/i.test(rank)) {
            out.push({ cat, rank });
        }
    });
    if (!out.length && Array.isArray(article.categories)) {
        article.categories.forEach((c) => {
            if (c && typeof c === 'object' && c.cat) {
                out.push({ cat: c.cat, rank: String(c.rank || 'Y') });
            }
        });
    }
    if (!out.length && article.status) {
        out.push({ cat: 'ART', rank: article.status });
    }
    return out;
}

/** Matches export-session-images.js naming — files on News-roundup/images/ */
function buildArticlePurablisFilename(article) {
    if (article.purablisFilename) {
        const fn = String(article.purablisFilename).trim().split('/').pop();
        return /^\d{2}-\d{2}-\d{2}-/.test(fn) ? fn : applyEditionDateToFilename(fn);
    }
    let base = '';
    for (const field of ['publishedImageUrl', 'image', 'originalImageUrl', 'uploadedImageUrl']) {
        base = inferPurablisFilenameFromSource(article[field]);
        if (base) break;
    }
    if (!base) base = `${slugifyTitleForFilename(article.title)}.png`;
    const cats = getArticleCategoriesForFilename(article);
    const primary = cats[0] || { cat: 'ART', rank: '0' };
    const slug = slugifyTitleForFilename(article.title, 36);
    const ext = (base.match(/\.[a-z]+$/i) || ['.png'])[0];
    const core = base.replace(/\.[a-z]+$/i, '');
    const labeled = `${primary.cat}-${primary.rank}-${slug}-${core}${ext}`.replace(/--+/g, '-');
    return applyEditionDateToFilename(labeled);
}

function extractDateSubfolderFromUrl(url) {
    const match = String(url || '').match(/\/(\d{2}-\d{2}-\d{2})\//);
    if (match) return match[1];
    const fnMatch = String(url || '').match(/(?:^|\/)(\d{2}-\d{2}-\d{2})-/);
    return fnMatch ? fnMatch[1] : '';
}

function buildPurablisPublicUrlFromFilename(filename, originalUrl = '') {
    const fn = String(filename || '').trim().split('/').pop();
    if (!fn) return '';
    const base = (newsletterContent.publicImageBase || DEFAULT_PUBLIC_IMAGE_BASE).replace(/\/+$/, '');
    // Prefer a date subfolder already present in the URL path (e.g. .../06-01-26/filename.png)
    let dateFolder = extractDateSubfolderFromUrl(originalUrl);
    // Fallback: extract the date prefix from the filename itself (e.g. 06-01-26-freepik-123.png)
    if (!dateFolder) {
        const fnMatch = fn.match(/^(\d{2}-\d{2}-\d{2})-/);
        if (fnMatch) dateFolder = fnMatch[1];
    }
    const pathSegment = dateFolder ? `${dateFolder}/` : '';
    return `${base}/${pathSegment}${encodeURIComponent(fn)}`;
}

function getPublicImageSettings() {
    const subfolderInput = document.getElementById('public-image-subfolder');
    const baseInput = document.getElementById('public-image-base');
    const savedBase = newsletterContent.publicImageBase != null
        ? String(newsletterContent.publicImageBase).trim()
        : '';
    const savedSub = newsletterContent.publicImageSubfolder != null
        ? String(newsletterContent.publicImageSubfolder).trim()
        : null;
    const base = (savedBase || (baseInput && baseInput.value.trim()) || DEFAULT_PUBLIC_IMAGE_BASE)
        .replace(/\/+$/, '');
    const subfolder = savedSub !== null
        ? savedSub
        : ((subfolderInput && subfolderInput.value.trim()) || DEFAULT_ARTICLE_PUBLIC_SUBFOLDER);
    return { base, subfolder };
}

function extractImageFilenameFromUrl(url) {
    const match = String(url || '').match(/\/([^/?#]+\.(?:png|jpe?g|gif|webp|svg))(?:\?|#|$)/i);
    return match ? match[1] : '';
}

function isExternalCdnImageUrl(url) {
    const u = String(url || '').toLowerCase();
    return /freepik\.com|flaticon\.com|cdn-icons/i.test(u);
}

/** Filename as stored on purablis FTP (freepik-123.png, upload-*, state-*, insp-*) */
function inferPurablisFilenameFromSource(url) {
    const u = String(url || '').trim();
    if (!u) return '';
    const fromPath = extractImageFilenameFromUrl(u);
    if (fromPath && /^(freepik-|upload-|state-|insp-)/i.test(fromPath)) return fromPath;
    if (/freepik|cdn-icons/i.test(u)) {
        const m = u.match(/(\d{4,})\.(png|jpe?g|webp|gif)/i);
        if (m) return `freepik-${m[1]}.${m[2].toLowerCase()}`;
    }
    if (/\/uploads\//i.test(u) && fromPath) {
        return /^upload-/i.test(fromPath) ? fromPath : `upload-${fromPath}`;
    }
    return fromPath;
}

function extractArticleImageFilename(articleOrUrl) {
    let fn = '';
    let source = '';
    if (typeof articleOrUrl === 'object' && articleOrUrl) {
        for (const field of ['publishedImageUrl', 'image', 'originalImageUrl', 'uploadedImageUrl', 'previewImageUrl']) {
            source = articleOrUrl[field];
            fn = inferPurablisFilenameFromSource(source);
            if (fn) break;
        }
    } else {
        source = articleOrUrl;
        fn = inferPurablisFilenameFromSource(articleOrUrl);
    }
    if (!fn) return '';
    if (/^insp-/i.test(fn) || isAppStateIconUrl(source || '')) return fn;
    return applyEditionDateToFilename(fn);
}

function buildPublicImageUrlCandidates(filename) {
    if (!filename) return [];
    const { base, subfolder } = getPublicImageSettings();
    const encFile = encodeURIComponent(filename);
    
    let activeSubfolder = subfolder;
    if (!activeSubfolder) {
        const fnMatch = filename.match(/^(\d{2}-\d{2}-\d{2})-/);
        if (fnMatch) activeSubfolder = fnMatch[1];
    }
    
    const encFolder = activeSubfolder ? activeSubfolder.split('/').map(encodeURIComponent).join('/') : '';
    const roots = [...new Set([
        base,
        DEFAULT_PUBLIC_IMAGE_BASE,
        LEGACY_NEWSLETTER_IMAGES_BASE,
    ].filter(Boolean))];
    const out = [];
    roots.forEach((root) => {
        if (activeSubfolder) out.push(`${root}/${encFolder}/${encFile}`);
        out.push(`${root}/${encFile}`);
        if (!activeSubfolder) {
            out.push(`${root}/all/${encFile}`);
            out.push(`${LEGACY_NEWSLETTER_IMAGES_BASE}/all/${encFile}`);
        }
    });
    return [...new Set(out)];
}

function buildPublicArticleImageUrl(articleOrUrl) {
    const filename = extractArticleImageFilename(articleOrUrl);
    if (!filename) return '';
    return buildPublicImageUrlCandidates(filename)[0] || '';
}

/** True when URL points at this app (localhost proxy, /uploads, etc.) — never use in newsletter HTML */
function isLocalOrAppImageUrl(url) {
    const v = String(url || '').trim();
    if (!v) return true;
    if (/^data:|^blob:/i.test(v)) return true;
    if (/localhost|127\.0\.0\.1/i.test(v)) return true;
    if (/\/api\/images\/asset\//i.test(v)) return true;
    if (/^\/uploads\//i.test(v) || /^\/state_icons_dark\//i.test(v)) return true;
    if (typeof window !== 'undefined' && v.startsWith('/') && !v.startsWith('//')) return true;
    return false;
}

function fullyDecodeURIComponent(str) {
    let decoded = str;
    let prev = '';
    let iterations = 0;
    while (decoded !== prev && iterations < 100) {
        prev = decoded;
        try {
            decoded = decodeURIComponent(decoded);
        } catch (e) {
            break;
        }
        iterations++;
    }
    return decoded;
}

function buildPublicStateIconUrl(urlOrFilename) {
    const value = String(urlOrFilename || '').trim();
    let filename = extractImageFilenameFromUrl(value)
        || (value.match(/\/(?:all\/states|state_icons_dark)\/([^/?#]+)/i) || [])[1]
        || (/\.(png|jpe?g|gif|webp|svg)$/i.test(value) ? value.split('/').pop() : '');
    if (!filename) return '';
    
    filename = fullyDecodeURIComponent(filename);
    
    if (/^state-/i.test(filename)) {
        const slug = filename.replace(/^state-/i, '').replace(/\.[a-z]+$/i, '');
        filename = `${slug.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')}.png`;
    }
    const base = (newsletterContent.stateIconsPublicBase || DEFAULT_STATE_ICONS_PUBLIC_BASE).replace(/\/+$/, '');
    return `${base}/${encodeURIComponent(filename)}`;
}

function buildPublicInspirationalImageUrl(itemOrUrl) {
    if (typeof itemOrUrl === 'object' && itemOrUrl && isPurablisUrl(itemOrUrl.url) && !isLocalOrAppImageUrl(itemOrUrl.url)) {
        return getDownloadSafeAssetUrl(itemOrUrl.url);
    }
    const filename = typeof itemOrUrl === 'object'
        ? inspirationalItemFilename(itemOrUrl)
        : (extractImageFilenameFromUrl(itemOrUrl) || (String(itemOrUrl || '').trim().split('/').pop() || ''));
    if (!filename) return '';
    const base = (newsletterContent.inspirationalPublicBase || DEFAULT_INSPIRATIONAL_PUBLIC_BASE).replace(/\/+$/, '');
    return `${base}/${encodeURIComponent(filename)}`;
}

/** Newsletter HTML: purablis.com only — never localhost, Freepik CDN, or other hosts */
function resolvePurablisImageUrl(articleOrUrl) {
    if (!articleOrUrl) return '';
    const urlFields = typeof articleOrUrl === 'object'
        ? [
            articleOrUrl.publishedImageUrl,
            articleOrUrl.image,
            articleOrUrl.originalImageUrl,
            articleOrUrl.uploadedImageUrl,
            articleOrUrl.previewImageUrl,
        ]
        : [articleOrUrl];

    const isStateArticle = typeof articleOrUrl === 'object' && articleOrUrl 
        ? (isAppStateIconUrl(articleOrUrl.originalImageUrl || articleOrUrl.image || '') || /^state-/i.test(articleOrUrl.purablisFilename || '')) 
        : false;

    for (const raw of urlFields) {
        let safe = String(raw || '').trim();
        if (safe && isPurablisUrl(safe) && !isLocalOrAppImageUrl(safe) && !isShortPurablisImageUrl(safe)) {
            // CRITICAL BYPASS: If the URL is already fully-qualified, correct, and under the active live GoDaddy base, return it directly!
            const activeBase = (newsletterContent.publicImageBase || DEFAULT_PUBLIC_IMAGE_BASE).replace(/\/+$/, '');
            if ((safe.startsWith(activeBase) || safe.includes('/purablis.com/newsletter/')) && !isStateArticle) {
                return getDownloadSafeAssetUrl(safe);
            }
            if (safe.includes('/purablis.com/') || safe.includes('Newsletter images') || safe.includes('Newsletter%20images') || safe.includes('/News-roundup/images/')) {
                if (safe.includes(' ')) {
                    safe = safe.replace(/ /g, '%20');
                }
                const lowerUrl = safe.toLowerCase();
                if (lowerUrl.includes('newsletter images') || lowerUrl.includes('newsletter%20images') || lowerUrl.includes('news-roundup/images')) {
                    const extractedFilename = safe.split('/').pop();
                    if (extractedFilename) {
                        if (lowerUrl.includes('inspiration1') || lowerUrl.includes('inspirational')) {
                            safe = buildPublicInspirationalImageUrl(extractedFilename);
                        } else if (isStateArticle || lowerUrl.includes('states') || lowerUrl.includes('state_icons')) {
                            safe = buildPublicStateIconUrl(extractedFilename);
                        } else {
                            safe = buildPurablisPublicUrlFromFilename(extractedFilename, safe);
                        }
                    }
                } else if (safe.includes('purablis.com')) {
                    const extractedFilename = safe.split('/').pop();
                    if (extractedFilename) {
                        if (safe.includes('inspiration1')) {
                            safe = buildPublicInspirationalImageUrl(extractedFilename);
                        } else if (isStateArticle || safe.includes('states') || safe.includes('state_icons')) {
                            safe = buildPublicStateIconUrl(extractedFilename);
                        } else {
                            safe = buildPurablisPublicUrlFromFilename(extractedFilename, safe);
                        }
                    }
                }
            }
            return getDownloadSafeAssetUrl(safe);
        }
    }

    if (typeof articleOrUrl === 'object' && articleOrUrl) {
        const legacyTarget = articleOrUrl.publishedImageUrl || articleOrUrl.image || articleOrUrl.originalImageUrl || articleOrUrl.uploadedImageUrl || '';
        // If the article has no image at all, do not return a fake Purablis URL
        if (!legacyTarget) {
            return '';
        }
        const exportName = buildArticlePurablisFilename(articleOrUrl);
        if (exportName) {
            let built = '';
            if (legacyTarget.includes('inspiration1')) {
                built = buildPublicInspirationalImageUrl(exportName);
            } else if (isStateArticle || legacyTarget.includes('states') || legacyTarget.includes('state_icons')) {
                built = buildPublicStateIconUrl(legacyTarget);
            } else {
                built = buildPurablisPublicUrlFromFilename(exportName, legacyTarget);
            }
            return built;
        }
    }

    const filename = extractArticleImageFilename(articleOrUrl);
    if (!filename) return '';

    // If passed a raw string URL that is an external CDN (e.g. freepik search result),
    // do not fake a purablis.com URL. Only do this if it's an article object or an already-published URL.
    if (typeof articleOrUrl === 'string' && isExternalCdnImageUrl(articleOrUrl)) {
        return '';
    }

    if (isInspirationalLibraryFilename(filename)) {
        const insp = buildPublicInspirationalImageUrl(
            typeof articleOrUrl === 'object' ? articleOrUrl : filename,
        );
        if (insp && isPurablisUrl(insp)) return insp;
    }
    if (isAppStateIconUrl(typeof articleOrUrl === 'object' ? (articleOrUrl.originalImageUrl || articleOrUrl.image || '') : '')
        || /\/all\/states\//i.test(String(filename))
        || /^state-/i.test(filename)) {
        const state = buildPublicStateIconUrl(filename);
        if (state) return state;
    }

    const built = buildPublicImageUrlCandidates(filename).find((u) => isPurablisUrl(u));
    return built || '';
}

window.updatePublicImageSettings = () => {
    const { base, subfolder } = getPublicImageSettings();
    newsletterContent.publicImageBase = base;
    newsletterContent.publicImageSubfolder = subfolder;
    saveState();
};

function inferPublicImageSettingsFromArticles() {
    const sample = articles.find((a) => /News-roundup\/images/i.test(a.publishedImageUrl || a.image || ''));
    if (!sample) return;
    newsletterContent.publicImageBase = DEFAULT_PUBLIC_IMAGE_BASE;
    newsletterContent.publicImageSubfolder = '';
    newsletterContent.stateIconsPublicBase = DEFAULT_STATE_ICONS_PUBLIC_BASE;
    newsletterContent.inspirationalPublicBase = DEFAULT_INSPIRATIONAL_PUBLIC_BASE;
}

/** Undo verify step that pointed images at Newsletter images/all/ while files live on News-roundup */
function repairMisplacedPurablisImageUrls() {
    articles.forEach((a, idx) => {
        ['publishedImageUrl', 'image', 'previewImageUrl', 'originalImageUrl'].forEach((field) => {
            const u = String(a[field] || '');
            if (!u || !/purablis\.com/i.test(u)) return;
            if (/News-roundup\/images/i.test(u)) return;
            // Already on the correct base — preserve it as-is (including any date subfolder).
            // Only rewrite legacy "Newsletter images" or other misplaced paths.
            if (u.startsWith(DEFAULT_PUBLIC_IMAGE_BASE)) return;
            const stateMatch = u.match(/\/all\/states\/([^/?#]+)/i);
            if (stateMatch) {
                articles[idx][field] = `${DEFAULT_STATE_ICONS_PUBLIC_BASE}/${encodeURIComponent(stateMatch[1])}`;
                return;
            }
            const fn = extractImageFilenameFromUrl(u);
            if (!fn) return;
            // Use buildPurablisPublicUrlFromFilename so the date subfolder is preserved/inferred
            articles[idx][field] = buildPurablisPublicUrlFromFilename(fn, u);
        });
    });
}

function syncArticleSearchEngineUi() {
    const el = document.getElementById('article-search-engine');
    if (el && newsletterContent.articleSearchEngine) {
        el.value = newsletterContent.articleSearchEngine;
    }
}

function getArticleSearchEngine() {
    const el = document.getElementById('article-search-engine');
    return (el && el.value) || newsletterContent.articleSearchEngine || 'auto';
}

window.updateArticleSearchEngine = () => {
    const el = document.getElementById('article-search-engine');
    if (!el) return;
    newsletterContent.articleSearchEngine = el.value;
    saveState();
};

function syncPublicImageSettingsUi() {
    const subfolderEl = document.getElementById('public-image-subfolder');
    const baseEl = document.getElementById('public-image-base');
    const base = (newsletterContent.publicImageBase || DEFAULT_PUBLIC_IMAGE_BASE).replace(/\/+$/, '');
    const subfolder = newsletterContent.publicImageSubfolder != null
        ? String(newsletterContent.publicImageSubfolder)
        : DEFAULT_ARTICLE_PUBLIC_SUBFOLDER;
    if (baseEl) baseEl.value = base;
    if (subfolderEl) subfolderEl.value = subfolder;
}

function syncArticleImageFieldsFromPublished() {
    articles.forEach((a, idx) => {
        let pub = resolvePurablisImageUrl(a);
        if (!pub) return;
        articles[idx].publishedImageUrl = pub;
        articles[idx].purablisFilename = articles[idx].purablisFilename || buildArticlePurablisFilename(a);
        articles[idx].image = pub;
        articles[idx].previewImageUrl = pub;
    });
}

/** HEAD-check and set live purablis.com URLs before Confirmation / export */
async function ensureConfirmationPurablisUrls() {
    const relevant = articles.filter((a) => {
        if (a.publishImage === false) return false;
        if (a.image || a.publishedImageUrl || a.originalImageUrl) return true;
        return ['Y', 'YM', 'COOL FINDS'].includes(a.status)
            || ['MED', 'THC', 'CBD', 'INV'].some((cat) => isCategoryRankIncluded(a, cat));
    });
    if (!relevant.length) return { reachable: 0, checked: 0 };

    const { base } = getPublicImageSettings();
    const res = await fetch('/api/images/resolve-article-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            articles: relevant.map((a) => ({
                id: a.id,
                title: a.title,
                status: a.status,
                ranks: a.ranks,
                categories: a.categories,
                purablisFilename: a.purablisFilename,
                publishedImageUrl: a.publishedImageUrl,
                image: a.image,
                originalImageUrl: a.originalImageUrl,
            })),
            datePrefix: getEditionDatePrefixForNewsletter(),
            baseUrl: base,
        }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not resolve purablis image URLs');

    const byTitle = new Map((data.results || []).map((r) => [String(r.title || '').toLowerCase().trim(), r]));
    const byId = new Map((data.results || []).filter((r) => r.id != null).map((r) => [r.id, r]));

    relevant.forEach((article) => {
        const idx = articles.indexOf(article);
        if (idx < 0) return;
        const row = byTitle.get(String(article.title || '').toLowerCase().trim()) || byId.get(article.id);
        if (!row || !row.url) return;
        articles[idx].purablisFilename = row.purablisFilename || articles[idx].purablisFilename;
        articles[idx].publishedImageUrl = row.url;
        articles[idx].publicReachable = !!row.publicReachable;
        articles[idx].image = row.url;
        articles[idx].previewImageUrl = row.url;
    });
    saveState();
    return { reachable: data.reachable, checked: data.checked };
}

window.verifyPublicArticleImages = async (showAlert = false) => {
    const statusEl = document.getElementById('public-image-status');
    const { base, subfolder } = getPublicImageSettings();
    const withImages = articles.filter((a) => a.image || a.publishedImageUrl || a.originalImageUrl);
    const filenames = [...new Set(withImages.map((a) => extractArticleImageFilename(a)).filter(Boolean))];
    if (!filenames.length) {
        if (statusEl) statusEl.textContent = 'No article images to check.';
        if (showAlert) alert('No article images selected yet.');
        return;
    }
    if (statusEl) statusEl.textContent = 'Checking…';
    try {
        const res = await fetch('/api/images/verify-public', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filenames, publicSubfolder: subfolder, baseUrl: base }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Check failed');
        const byName = new Map((data.results || []).map((r) => [r.filename, r]));
        withImages.forEach((article) => {
            const fn = extractArticleImageFilename(article);
            const row = byName.get(fn);
            if (!row) return;
            const existing = resolvePurablisImageUrl(article);
            if (!row.publicReachable) {
                article.publicReachable = false;
                if (existing && isPurablisUrl(existing)) return;
            }
            article.publishedImageUrl = row.url;
            article.publicReachable = row.publicReachable;
            if (row.publicReachable) {
                article.image = row.url;
                article.previewImageUrl = row.url;
            }
        });
        saveState();
        const msg = `${data.reachable}/${data.checked} images reachable at ${data.publicBase}/${data.publicSubfolder || '(root)'}/`;
        if (statusEl) {
            statusEl.textContent = msg;
            statusEl.classList.toggle('text-red-600', data.unreachable > 0);
        }
        if (showAlert) {
            alert(
                data.unreachable > 0
                    ? `${msg}\n\n${data.unreachable} still return 404. Copy files into that folder on purablis.com (or set Public folder to match where they already live), then run Publish Selected to purablis again.`
                    : `${msg}\n\nAll checked images load from purablis.com.`,
            );
        }
        const activeStep = document.querySelector('.step.active');
        if (activeStep && activeStep.getAttribute('data-step') === '6') {
            Object.keys(confirmationRenderedHtml).forEach((k) => { confirmationRenderedHtml[k] = ''; });
            renderConfirmationPreviews();
        }
    } catch (e) {
        if (statusEl) statusEl.textContent = 'Check failed';
        if (showAlert) alert('Could not verify public URLs: ' + (e.message || 'network error'));
    }
};

function setCurrentSessionName(name) {
    currentSessionName = String(name || '').trim();
    if (currentSessionName) {
        localStorage.setItem(LAST_SESSION_NAME_KEY, currentSessionName);
    }
    const nameEl = document.getElementById('newsletter-name');
    if (nameEl && currentSessionName) nameEl.value = currentSessionName;
    syncSessionDropdownSelection(currentSessionName);
}

function syncSessionDropdownSelection(name) {
    ['saved-sessions-dropdown-step1', 'saved-sessions-dropdown', 'saved-sessions-dropdown-step3'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (name && [...el.options].some((opt) => opt.value === name)) {
            el.value = name;
        }
    });
}

function restoreLastSessionSelection() {
    const last = localStorage.getItem(LAST_SESSION_NAME_KEY) || '';
    if (!last) return;
    currentSessionName = last;
    const nameEl = document.getElementById('newsletter-name');
    if (nameEl) nameEl.value = last;
}

function getAiQuery() {
    const step2 = document.getElementById('step2-query');
    const step1 = document.getElementById('ai-prompt');
    const v2 = step2 && step2.value.trim();
    const v1 = step1 && step1.value.trim();
    return v2 || v1 || '';
}

function setAiQuery(value) {
    const v = String(value || '');
    const step2 = document.getElementById('step2-query');
    const step1 = document.getElementById('ai-prompt');
    if (step2) step2.value = v;
    if (step1) step1.value = v;
}

function buildSessionPayload() {
    return {
        articles: JSON.parse(JSON.stringify(articles)),
        archivedArticles: JSON.parse(JSON.stringify(archivedArticles)),
        laterCoolArticles: JSON.parse(JSON.stringify(laterCoolArticles)),
        inspirationalImages: [...inspirationalImages],
        newsletterContent: JSON.parse(JSON.stringify(newsletterContent)),
        aiQuery: getAiQuery(),
        savedAt: new Date().toISOString(),
    };
}

function persistWorkspaceLocal(state) {
    const nextState = state || buildWorkspaceState();
    localStorage.setItem('newsletter_articles', JSON.stringify(nextState));
    localStorage.setItem(INSPIRATIONAL_LIBRARY_CACHE_KEY, JSON.stringify(nextState.inspirationalLibraryImages || []));
}

function normalizeSubjectPrompt(prompt) {
    const value = String(prompt || '').trim();
    if (!value || value === LEGACY_DEFAULT_SUBJECT_PROMPT) {
        return DEFAULT_SUBJECT_PROMPT;
    }
    return value;
}

function hasCategorySelection(article) {
    if (!article || !article.ranks) return false;
    return ['MED', 'THC', 'CBD', 'INV'].some((cat) => {
        const value = article.ranks[cat];
        return value !== undefined && value !== null && String(value).trim() !== '';
    });
}

function isSelectedArticle(article) {
    const status = String(article?.status || '').trim().toUpperCase();
    return ['Y', 'YM', 'COOL FINDS'].includes(status) || hasCategorySelection(article);
}

function applyWorkspaceState(state, { mergeLibrary = false } = {}) {
    const value = state || {};
    articles = Array.isArray(value.articles) ? value.articles.filter((a) => a.status !== 'FLAG') : [];
    articles.forEach(repairArticleImagePreview);
    archivedArticles = Array.isArray(value.archivedArticles) ? value.archivedArticles : [];
    laterCoolArticles = Array.isArray(value.laterCoolArticles) ? value.laterCoolArticles : [];
    inspirationalImages = Array.isArray(value.inspirationalImages) ? value.inspirationalImages : [];
    confirmationInspirationalImage = typeof value.confirmationInspirationalImage === 'string' ? value.confirmationInspirationalImage : '';
    if (Array.isArray(value.inspirationalLibraryImages)) {
        inspirationalLibraryImages = filterInspirationalLibraryImages(value.inspirationalLibraryImages);
    } else if (!mergeLibrary) {
        inspirationalLibraryImages = [];
    }
    const nc = value.newsletterContent || {
        MED: { intro: '', outro: '' },
        THC: { intro: '', outro: '' },
        CBD: { intro: '', outro: '' },
        INV: { intro: '', outro: '' },
    };
    newsletterContent = {
        ...nc,
        templates: nc.templates || { MED: '', THC: '', CBD: '', INV: '' },
        summaryRules: normalizeSummaryRules(nc.summaryRules),
        selectedGreeting: nc.selectedGreeting || DEFAULT_GREETING,
        customGreetings: Array.isArray(nc.customGreetings) ? nc.customGreetings.filter(Boolean) : [],
        subjectPrompt: normalizeSubjectPrompt(nc.subjectPrompt),
        generatedSubjects: nc.generatedSubjects || { MED: '', THC: '', CBD: '', INV: '' },
        categoryPickOrder: nc.categoryPickOrder || { MED: '', THC: '', CBD: '', INV: '' },
        publicImageBase: nc.publicImageBase || value.publicImageBase || DEFAULT_PUBLIC_IMAGE_BASE,
        publicImageSubfolder: nc.publicImageSubfolder != null
            ? nc.publicImageSubfolder
            : (value.publicImageSubfolder != null ? value.publicImageSubfolder : DEFAULT_ARTICLE_PUBLIC_SUBFOLDER),
        stateIconsPublicBase: nc.stateIconsPublicBase || DEFAULT_STATE_ICONS_PUBLIC_BASE,
        inspirationalPublicBase: nc.inspirationalPublicBase || DEFAULT_INSPIRATIONAL_PUBLIC_BASE,
        editionDatePrefix: nc.editionDatePrefix || '',
        articleSearchEngine: nc.articleSearchEngine || value.articleSearchEngine || 'youcom',
    };
    
    syncArticleSearchEngineUi();
    const baseLower = String(newsletterContent.publicImageBase || '').toLowerCase().trim();
    if (!newsletterContent.publicImageBase || 
        baseLower.includes('newsletter images') || 
        baseLower.includes('newsletter%20images') || 
        baseLower.includes('news-roundup/images')) {
        newsletterContent.publicImageBase = DEFAULT_PUBLIC_IMAGE_BASE;
    }

    const inspLower = String(newsletterContent.inspirationalPublicBase || '').toLowerCase().trim();
    if (!newsletterContent.inspirationalPublicBase || 
        inspLower.includes('newsletter images') || 
        inspLower.includes('newsletter%20images') || 
        inspLower.includes('news-roundup/inspirational') ||
        inspLower.includes('news-roundup/images')) {
        newsletterContent.inspirationalPublicBase = DEFAULT_INSPIRATIONAL_PUBLIC_BASE;
    }

    const stateLower = String(newsletterContent.stateIconsPublicBase || '').toLowerCase().trim();
    if (!newsletterContent.stateIconsPublicBase || 
        stateLower.includes('newsletter images') || 
        stateLower.includes('newsletter%20images') || 
        stateLower.includes('news-roundup/images/states') ||
        stateLower.includes('news-roundup/images')) {
        newsletterContent.stateIconsPublicBase = DEFAULT_STATE_ICONS_PUBLIC_BASE;
    }

    repairMisplacedPurablisImageUrls();
    inferPublicImageSettingsFromArticles();
    syncPublicImageSettingsUi();
    syncArticleImageFieldsFromPublished();
    lastGeneratedNewsletter = value.lastGeneratedNewsletter || null;
    if (typeof value.aiQuery === 'string') {
        setAiQuery(value.aiQuery);
    }
    if (value.currentSessionName) {
        setCurrentSessionName(value.currentSessionName);
    }
    persistWorkspaceLocal(buildWorkspaceState());
    restoreBulkWorkflowUi();
}

/**
 * Merge server + browser saved sessions. Same name: keep whichever has newer savedAt.
 * Returns counts for user-facing sync messages.
 */
function mergeSessionStores(serverSessions, localSessions) {
    const server = serverSessions && typeof serverSessions === 'object' ? serverSessions : {};
    const local = localSessions && typeof localSessions === 'object' ? localSessions : {};
    const merged = { ...server };
    let addedFromLocal = 0;
    let updatedFromLocal = 0;
    let serverOnly = 0;

    Object.keys(server).forEach((k) => {
        if (!(k in local)) serverOnly += 1;
    });

    Object.keys(local).forEach((k) => {
        if (!(k in merged)) {
            merged[k] = local[k];
            addedFromLocal += 1;
            return;
        }
        const localTime = new Date(local[k].savedAt || 0).getTime();
        const serverTime = new Date(merged[k].savedAt || 0).getTime();
        if (localTime >= serverTime) {
            merged[k] = local[k];
            if (localTime > serverTime) updatedFromLocal += 1;
        }
    });

    return {
        merged,
        addedFromLocal,
        updatedFromLocal,
        serverOnly,
        total: Object.keys(merged).length,
        localCount: Object.keys(local).length,
        serverCount: Object.keys(server).length,
    };
}

function buildSessionsState(includeCurrentWorkspace = false) {
    const sessions = getSavedSessions();
    if (includeCurrentWorkspace) {
        const nameEl = document.getElementById('newsletter-name');
        const name = currentSessionName || (nameEl ? nameEl.value.trim() : '');
        if (name) {
            sessions[name] = buildSessionPayload();
        }
    }
    return sessions;
}

async function convertLocalUploadUrlsForSharing() {
    const urls = new Set();
    const addUrl = (value) => {
        const str = String(value || '').trim();
        if (!str) {
            return;
        }
        if (str.startsWith('/uploads/') || /\/uploads\/[^?#]+/i.test(str)) {
            urls.add(str);
        }
    };

    articles.forEach((article) => {
        addUrl(article.image);
        addUrl(article.originalImageUrl);
        addUrl(article.publishedImageUrl);
        addUrl(article.uploadedImageUrl);
    });
    inspirationalImages.forEach(addUrl);
    inspirationalLibraryImages.forEach((item) => addUrl(item && item.url));

    if (urls.size === 0) {
        return;
    }

    const res = await fetch('/api/images/inline-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: Array.from(urls) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to convert local uploads for sharing');
    }

    const mapUrl = (value) => {
        const str = String(value || '').trim();
        return data.results && data.results[str] ? data.results[str] : value;
    };

    articles = articles.map((article) => ({
        ...article,
        image: mapUrl(article.image),
        originalImageUrl: mapUrl(article.originalImageUrl),
        publishedImageUrl: mapUrl(article.publishedImageUrl),
        uploadedImageUrl: mapUrl(article.uploadedImageUrl),
    }));
    inspirationalImages = inspirationalImages.map(mapUrl);
    inspirationalLibraryImages = inspirationalLibraryImages.map((item) => item && item.url ? {
        ...item,
        url: mapUrl(item.url),
    } : item);
}

async function parseJsonResponse(res, fallbackMessage) {
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/json')) {
        return res.json();
    }
    const text = await res.text();
    const looksLikeHtml = /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text);
    if (looksLikeHtml) {
        throw new Error(fallbackMessage || 'Server returned HTML instead of JSON. Restart the app server and try again.');
    }
    throw new Error(fallbackMessage || 'Server did not return JSON.');
}

const ANTHROPIC_CREDITS_LOW_CODE = 'anthropic_credits_low';
const ANTHROPIC_CREDITS_USER_MESSAGE =
    'Anthropic (Claude) API credits are too low.\n\n'
    + '• Add credits: https://console.anthropic.com/settings/billing\n'
    + '• Or switch the AI Model dropdown to Gemini (e.g. Gemini 3.5 Flash)';

function isAnthropicCreditError(message) {
    return /credit balance is too low/i.test(String(message || ''));
}

function isAnthropicCreditsApiResponse(data) {
    return data?.errorCode === ANTHROPIC_CREDITS_LOW_CODE
        || isAnthropicCreditError(data?.error)
        || isAnthropicCreditError(data?.details);
}

function setAiCreditWarningVisible(visible) {
    const el = document.getElementById('ai-credit-warning');
    if (!el) return;
    if (visible) {
        showWithClass(el, 'block');
    } else {
        hideWithClass(el);
    }
}

function showAiFailureAlert(context, dataOrMessage) {
    const data = typeof dataOrMessage === 'string' ? { error: dataOrMessage } : (dataOrMessage || {});
    if (isAnthropicCreditsApiResponse(data)) {
        setAiCreditWarningVisible(true);
    }
    const msg = isAnthropicCreditsApiResponse(data)
        ? ANTHROPIC_CREDITS_USER_MESSAGE
        : (extractApiErrorMessage(data) || 'Unknown error');
    const modelLine = data.model ? `Model: ${data.model}\n` : '';
    alert(`${context}\n\n${modelLine}${msg}`);
}

function extractApiErrorMessage(data) {
    if (isAnthropicCreditsApiResponse(data)) {
        return ANTHROPIC_CREDITS_USER_MESSAGE;
    }
    let primaryRaw = data?.error;
    if (typeof primaryRaw === 'object' && primaryRaw !== null) {
        primaryRaw = primaryRaw.message || JSON.stringify(primaryRaw);
    }
    const primary = String(primaryRaw || '').trim();
    if (primary && !/^failed to /i.test(primary) && primary !== '[object Object]') {
        return primary;
    }
    const detailsRaw = data?.details;
    let detailsStr = detailsRaw;
    if (typeof detailsRaw === 'object' && detailsRaw !== null) {
        detailsStr = detailsRaw.message || JSON.stringify(detailsRaw);
    }
    const details = String(detailsStr || '').trim();
    if (!details || details === '[object Object]') return primary;
    if (isAnthropicCreditError(details)) {
        return ANTHROPIC_CREDITS_USER_MESSAGE;
    }
    const jsonStart = details.indexOf('{');
    if (jsonStart >= 0) {
        try {
            const parsed = JSON.parse(details.slice(jsonStart));
            const nested = parsed?.error?.message;
            if (nested) {
                if (isAnthropicCreditError(nested)) return ANTHROPIC_CREDITS_USER_MESSAGE;
                return nested;
            }
        } catch (_) { /* ignore */ }
    }
    return primary || details;
}

async function getAiClarificationFromError(data) {
    const parsed = extractApiErrorMessage(data);
    if (parsed) return parsed;

    const errorText = String(data?.error || '').trim();
    const logMatch = errorText.match(/Log ID:\s*(\d+)/i);
    if (!logMatch) {
        return '';
    }

    try {
        const res = await fetch(`/api/articles/error-log/${logMatch[1]}`);
        const logData = await res.json().catch(() => ({}));
        if (res.ok && logData && logData.success && logData.content) {
            return String(logData.content).trim();
        }
    } catch (err) {
        console.error('Failed to fetch AI clarification log:', err);
    }

    return '';
}

const MANAGED_DISPLAY_DATA_KEY = 'managedDisplayClass';

function showWithClass(el, displayClass = 'block') {
    if (!el) return;

    const previousDisplayClass = el.dataset[MANAGED_DISPLAY_DATA_KEY];
    if (previousDisplayClass && previousDisplayClass !== displayClass) {
        el.classList.remove(previousDisplayClass);
    }

    el.classList.remove('hidden');

    if (displayClass) {
        el.classList.add(displayClass);
        el.dataset[MANAGED_DISPLAY_DATA_KEY] = displayClass;
    }
}

function hideWithClass(el) {
    if (!el) return;

    const previousDisplayClass = el.dataset[MANAGED_DISPLAY_DATA_KEY];
    if (previousDisplayClass) {
        el.classList.remove(previousDisplayClass);
    }

    el.classList.add('hidden');
}

// Load from Supabase (DB) — overwrites if server has data
window.updateStateHintFromDiagnostic = async function () {
    const hintEl = document.getElementById('state-load-hint');
    const textEl = document.getElementById('state-load-hint-text');
    if (!hintEl || !textEl) return;
    try {
        const res = await fetch('/api/state/diagnostic');
        const d = await res.json().catch(() => ({}));
        if (d.configured && d.sessionsCount && !d.dbError) {
            hideWithClass(hintEl);
            return;
        }
        showWithClass(hintEl, 'block');
        if (!res.ok) {
            textEl.textContent = 'Cannot reach server. Check deployment and try Refresh from server.';
            return;
        }
        if (!d.hasUrl) {
            textEl.textContent = 'Server: SUPABASE_URL is not set in Vercel → Settings → Environment Variables. Add it and redeploy.';
            return;
        }
        if (!d.hasKey) {
            textEl.textContent = 'Server: No Supabase key set. Add SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in Vercel → Environment Variables, then redeploy.';
            return;
        }
        if (d.initError) {
            textEl.textContent = 'Server: ' + d.initError + ' Check Vercel env vars and redeploy.';
            return;
        }
        if (d.dbError) {
            textEl.textContent = 'DB error: ' + d.dbError + ' (table: ' + (d.table || 'newsletter_state') + '). Check Supabase table exists and RLS allows read.';
            return;
        }
        textEl.textContent = 'No sessions in database yet. Click Refresh from server after saving Week 1 from the app or running the upload script.';
    } catch (e) {
        showWithClass(hintEl, 'block');
        textEl.textContent = 'Cannot reach /api/state. Is the server running? On Vercel, ensure the app is deployed with the Express server (see docs).';
    }
};

(async function loadFromDb() {
    try {
        // Dynamically configure GoDaddy Public URLs from Backend settings
        try {
            const diagRes = await fetch('/api/state/diagnostic');
            if (diagRes.ok) {
                const diag = await diagRes.json().catch(() => ({}));
                if (diag.godaddyPublicBaseUrl) {
                    const root = diag.godaddyPublicBaseUrl.replace(/\/+$/, '');
                    DEFAULT_PUBLIC_IMAGE_BASE = root;
                    DEFAULT_STATE_ICONS_PUBLIC_BASE = `${root}/states`;
                    DEFAULT_INSPIRATIONAL_PUBLIC_BASE = `${root}/inspirational`;
                    console.log('Dynamic GoDaddy Base URLs Loaded:', {
                        articleBase: DEFAULT_PUBLIC_IMAGE_BASE,
                        stateBase: DEFAULT_STATE_ICONS_PUBLIC_BASE,
                        inspirationalBase: DEFAULT_INSPIRATIONAL_PUBLIC_BASE
                    });
                }
            }
        } catch (diagErr) {
            console.warn('Failed to resolve dynamic public base URLs:', diagErr);
        }

        const [wrRes, sessRes] = await Promise.all([
            fetch('/api/state?key=workspace'),
            fetch('/api/state?key=sessions'),
        ]);
        const hintEl = document.getElementById('state-load-hint');
        if (sessRes.status === 503 || wrRes.status === 503) {
            if (hintEl) showWithClass(hintEl, 'block');
            await window.updateStateHintFromDiagnostic();
        }
        if (wrRes.ok) {
            const { value } = await wrRes.json();
            if (value && value.articles) {
                applyWorkspaceState(value, { mergeLibrary: true });
                if (typeof renderArticles === 'function') renderArticles();
            }
        }
        if (sessRes.ok) {
            const { value } = await sessRes.json();
            if (value && typeof value === 'object') {
                const local = getSavedSessions();
                const { merged } = mergeSessionStores(value, local);
                localStorage.setItem('newsletter_saved_sessions', JSON.stringify(merged));
                if (typeof populateSavedDropdown === 'function') populateSavedDropdown();
                if (hintEl) hideWithClass(hintEl);
                if (!currentSessionName) {
                    restoreLastSessionSelection();
                }
                syncSessionDropdownSelection(currentSessionName);
            }
        } else if (hintEl && !hintEl.classList.contains('hidden')) {
            await window.updateStateHintFromDiagnostic();
        }
    } catch (e) {
        const hintEl = document.getElementById('state-load-hint');
        if (hintEl) showWithClass(hintEl, 'block');
        await window.updateStateHintFromDiagnostic();
    }
})();

let workspaceSyncTimeout = null;

function saveState() {
    const state = buildWorkspaceState();
    persistWorkspaceLocal(state);
    // Debounced sync to Supabase
    if (workspaceSyncTimeout) clearTimeout(workspaceSyncTimeout);
    workspaceSyncTimeout = setTimeout(() => {
        fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'workspace', value: state }),
        }).catch(() => {
        });
    }, 800);
}

// Clear workspace articles only (saved sessions are kept)
window.startNewWeek = async () => {
    const msg =
        'Clear the current workspace?\n\n'
        + 'This removes all articles from the working list (including archived in workspace).\n'
        + 'It also clears image selections and generated preview.\n\n'
        + 'Saved sessions in Load Saved are NOT deleted.\n'
        + 'Templates, summary rules, and prompts are kept.\n\n'
        + 'Tip: In Article View you can also check rows and use Remove checked.';
    if (!confirm(msg)) return;

    const nameInput = document.getElementById('newsletter-name');
    if (nameInput) nameInput.value = '';
    currentSessionName = '';
    syncSessionDropdownSelection(localStorage.getItem(LAST_SESSION_NAME_KEY) || '');

    articles = [];
    archivedArticles = [];
    // laterCoolArticles intentionally preserved — they carry forward to the next week
    inspirationalImages = [];
    confirmationInspirationalImage = '';
    lastGeneratedNewsletter = null;
    Object.keys(confirmationRenderedHtml).forEach((cat) => {
        confirmationRenderedHtml[cat] = '';
    });

    // Per-category summary text/result reference this week's specific articles,
    // so they're cleared here rather than kept — otherwise the next week's
    // "Articles for summary" box silently shows last week's picks until manually
    // recalibrated, and can get sent to the AI as-is.
    const kept = newsletterContent || {};
    const resetCategoryContent = (prev) => ({ ...(prev || {}), intro: '', outro: '', result: '', summaryArticlesText: '' });
    newsletterContent = {
        MED: resetCategoryContent(kept.MED),
        THC: resetCategoryContent(kept.THC),
        CBD: resetCategoryContent(kept.CBD),
        INV: resetCategoryContent(kept.INV),
        templates: kept.templates || { MED: '', THC: '', CBD: '', INV: '' },
        summaryRules: normalizeSummaryRules(kept.summaryRules),
        selectedGreeting: kept.selectedGreeting || DEFAULT_GREETING,
        customGreetings: Array.isArray(kept.customGreetings) ? kept.customGreetings : [],
        subjectPrompt: normalizeSubjectPrompt(kept.subjectPrompt),
        generatedSubjects: kept.generatedSubjects || { MED: '', THC: '', CBD: '', INV: '' },
        generatedHeadings: kept.generatedHeadings || { MED: '', THC: '', CBD: '', INV: '' },
        categoryPickOrder: kept.categoryPickOrder || { MED: '', THC: '', CBD: '', INV: '' },
        bulkOriginalText: '',
        bulkChangeRequest: '',
        bulkUpdatedText: '',
        bulkWorkflowTab: 'original',
    };

    saveState();
    try {
        await fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'workspace', value: buildWorkspaceState() }),
        });
    } catch (e) {
        console.warn('Could not sync empty workspace to server', e);
    }

    populateSavedDropdown();
    renderArticles();
    renderImagesView();
    renderInspirationalView();

    const searchStatus = document.getElementById('search-status');
    const nextStep2Btn = document.getElementById('btn-next-step-2');
    if (searchStatus) hideWithClass(searchStatus);
    if (nextStep2Btn) hideWithClass(nextStep2Btn);

    switchStep(1);
    if (nameInput) nameInput.focus();
};

window.clearWorkspace = window.startNewWeek;

// Navigation Logic
const steps = document.querySelectorAll('.nav-steps .step');
const views = document.querySelectorAll('.view');

function switchStep(stepNumber) {
    const step = Number(stepNumber);

    // Update Navigation UI
    steps.forEach(s => s.classList.remove('active'));
    const activeStep = document.querySelector(`.step[data-step="${step}"]`);
    if (activeStep) activeStep.classList.add('active');

    // Show Corresponding View
    views.forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(`step-${step}`);
    if (targetView) targetView.classList.add('active');

    syncStatsVisibility();

    // Logic for specific steps
    if (step === 2) {
        populateSavedDropdown();
        renderArticles();
    } else if (step === 3) {
        populateSavedDropdown();
        renderImagesView();
    } else if (step === 4) {
        renderInspirationalView();
        loadInspirationalLibrary();
    } else if (step === 5) {
        renderEditorView();
        loadBasePromptFromServer();
    } else if (step === 6) {
        Object.keys(confirmationRenderedHtml).forEach((k) => {
            confirmationRenderedHtml[k] = '';
        });
        renderConfirmationView();
    }

    // Save state on switch
    saveState();

    // Scroll to top
    window.scrollTo(0, 0);
}

// Toggle All Articles (Select Column)
window.toggleAllArticles = (select) => {
    articles.forEach(article => {
        article.selected = select;
    });
    saveState();
    renderArticles();
};

window.toggleAllImagePublish = (select) => {
    const relevant = articles.filter(a => (['MED', 'THC', 'CBD', 'INV'].some(cat => isCategoryRankIncluded(a, cat))) || a.status === 'COOL FINDS');
    relevant.forEach(a => {
        a.publishImage = select;
    });
    saveState();
    renderImagesView();
};

window.renderImagesView = () => {
    const list = document.getElementById('images-list');
    list.innerHTML = '';

    const sortSelect = document.getElementById('image-sort-order');
    if (sortSelect) {
        sortSelect.value = imageViewSortOrder;
    }

    const relevantArticles = articles
        .filter(a => a.selected !== false && ((['MED', 'THC', 'CBD', 'INV'].some(cat => isCategoryRankIncluded(a, cat))) || a.status === 'COOL FINDS'))
        .slice();

    if (imageViewSortOrder === 'az' || imageViewSortOrder === 'za') {
        const direction = imageViewSortOrder === 'za' ? -1 : 1;
        relevantArticles.sort((a, b) => {
            const titleA = String(a.title || '').trim().toLowerCase();
            const titleB = String(b.title || '').trim().toLowerCase();
            return titleA.localeCompare(titleB) * direction;
        });
    } else if (imageViewSortOrder === 'oldnew' || imageViewSortOrder === 'newold') {
        const direction = imageViewSortOrder === 'newold' ? -1 : 1;
        relevantArticles.sort((a, b) => {
            const timeA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
            const timeB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
            if (timeA !== timeB) return (timeA - timeB) * direction;
            return String(a.title || '').localeCompare(String(b.title || ''));
        });
    }

    if (relevantArticles.length === 0) {
        list.innerHTML = '<div class="p-7.5 text-center text-[#777]">No selected articles are ready for Image View yet. Check the articles you want in Article View and assign categories first.</div>';
        return;
    }

    // Table header
    list.innerHTML =
        `<div class="img-table-header">
            <div class="img-col-select img-header-select">
                <div class="header-label">Publish</div>
                <div class="header-inline-actions">
                    <button type="button" class="header-link-btn" onclick="toggleAllImagePublish(true)">All</button>
                    <span>/</span>
                    <button type="button" class="header-link-btn" onclick="toggleAllImagePublish(false)">None</button>
                </div>
            </div>
            <div class="img-col-article"><div class="header-label">Article</div></div>
            <div class="img-col-cat"><div class="header-label">MED</div></div>
            <div class="img-col-cat"><div class="header-label">THC</div></div>
            <div class="img-col-cat"><div class="header-label">CBD</div></div>
            <div class="img-col-cat"><div class="header-label">INV</div></div>
            <div class="img-col-search"><div class="header-label">Image Search</div></div>
            <div class="img-col-selected"><div class="header-label">Selected</div></div>
            <div class="img-col-results"><div class="header-label">Results</div></div>
            <div class="img-col-actions"><div class="header-label">Actions</div></div>
        </div>`;

    const usedSearchEssences = new Set();
    relevantArticles.forEach((article) => {
        const originalIndex = articles.indexOf(article);
        repairArticleImagePreview(article);

        article.imageSearchQuery = buildDefaultImageSearchQuery(article.title, usedSearchEssences);
        const searchEssence = parseImageSearchEssence(article.imageSearchQuery).essence;

        const selectedImageHtml = buildSelectedImageHtml(originalIndex, article);

        const gridId = `grid-${originalIndex}`;

        const catInputs = ['MED', 'THC', 'CBD', 'INV'].map(cat => {
            const rank = getRankForSort(article, cat);
            return `<div class="img-col-cat">
                <input
                    type="text"
                    value="${rank}"
                    oninput="updateCategoryRank(${originalIndex}, '${cat}', this.value)"
                    class="w-full text-center h-8 py-1 px-px border border-[#ddd] rounded text-[0.8rem] font-semibold box-border cat-rank-input"
                    placeholder="#"
                    title="Rank for ${cat}">
            </div>`;
        }).join('');

        if (article.publishImage === undefined) {
            article.publishImage = !!article.image;
        }

        const rowHtml =
            `<div class="img-table-row">
                <div class="img-col-select flex items-center justify-center pt-2">
                    <input
                        type="checkbox"
                        ${article.publishImage ? 'checked' : ''}
                        onchange="updateArticleField(${originalIndex}, 'publishImage', this.checked)">
                </div>
                <div class="img-col-article">
                    <textarea
                        rows="2"
                        onchange="updateArticleField(${originalIndex}, 'title', this.value)"
                        class="title-edit font-[inherit] text-[0.9rem]">${article.title}</textarea>
                    <a
                        href="${article.url}"
                        target="_blank"
                        class="article-link-sm">
                        ${article.url}
                    </a>
                </div>
                ${catInputs}
                <div class="img-col-search">
                    <div class="flex gap-1.25 mb-2 items-center">
                        <div class="flex flex-1 items-center gap-1 min-w-0">
                            <input
                                type="text"
                                id="img-search-input-${originalIndex}"
                                value="${escapeHtml(searchEssence)}"
                                placeholder="Keyword or state name"
                                title="Topic keyword for flat Freepik icons, or a US state name (e.g. Virginia, TX) for state icons on purablis.com."
                                oninput="updateImageSearchEssence(${originalIndex}, this.value)"
                                class="form-control h-8 py-1 px-2 text-[0.85rem] min-w-0">
                            <span class="text-[0.82rem] text-[#666] font-semibold whitespace-nowrap shrink-0">flat</span>
                        </div>
                        <button
                            class="btn btn-sm btn-primary whitespace-nowrap"
                            onclick="searchArticleImages(${originalIndex})">
                            Search
                        </button>
                    </div>
                    <div class="border-t border-[#eee] pt-1.5 flex flex-wrap gap-2 items-center">
                        <input
                            type="file"
                            accept="image/*"
                            id="img-upload-input-${originalIndex}"
                            class="hidden"
                            onchange="uploadArticleImage(${originalIndex}, this)">
                        <label
                            for="img-upload-input-${originalIndex}"
                            class="btn btn-sm btn-secondary cursor-pointer m-0 text-[0.78rem] py-1 px-2.5 whitespace-nowrap">
                            Upload File
                        </label>
                        <button
                            class="btn btn-sm btn-outline cursor-pointer m-0 text-[0.78rem] py-1 px-2.5 border-[#2f6e63] text-[#2f6e63] whitespace-nowrap"
                            onclick="openPastIconsModal(${originalIndex})">
                            Browse Past Icons
                        </button>
                    </div>
                </div>
                <div class="img-col-selected" id="selected-img-${originalIndex}">
                    ${selectedImageHtml}
                </div>
                <div class="img-col-results">
                    <div id="${gridId}" class="mini-grid">
                        <span class="text-muted text-[0.8rem]">Click Search</span>
                    </div>
                </div>
                <div class="img-col-actions">
                    <button
                        class="btn btn-sm btn-outline text-[#f57c00] border-[#f57c00] mb-2 w-full"
                        onclick="archiveArticle(${originalIndex})">
                        Archive
                    </button>
                    <button
                        class="btn btn-sm btn-outline text-[#d32f2f] border-[#d32f2f] w-full"
                        onclick="removeArticle(${originalIndex})">
                        Remove
                    </button>
                </div>
            </div>`;
        list.innerHTML += rowHtml;
    });

    updateImageViewStats();
};

function updateImageViewStats() {
    const statsEl = document.getElementById('image-view-stats');
    if (!statsEl) return;
    const relevantArticles = articles.filter(a => a.selected !== false && ((['MED', 'THC', 'CBD', 'INV'].some(cat => isCategoryRankIncluded(a, cat))) || a.status === 'COOL FINDS'));
    const counts = getSelectedRankCounts();
    let selectedCount = 0;
    relevantArticles.forEach(a => {
        if (a.publishImage !== false) selectedCount++;
    });
    const sessionLabel = currentSessionName
        ? `<span class="stat-item bg-[#e8eaf6] text-[#283593] font-semibold">${currentSessionName}</span>`
        : '';

    const count = relevantArticles.length;
    const countClass = count === 25
        ? 'bg-[#e8f5e9] text-[#1b5e20] font-bold border-2 border-[#4caf50]'
        : 'bg-[#ffebee] text-[#c62828] font-bold border-2 border-[#e57373]';

    statsEl.innerHTML =
        `${sessionLabel}
        <span class="stat-item ${countClass}" title="Target is 25 articles">Total: ${count} / 25</span>
        <span class="stat-item bg-[#e0f7fa] text-[#006064]" title="Articles currently selected for Image View">Selected: ${selectedCount}</span>
        <span class="stat-item bg-[#e3f2fd] text-[#0d47a1]">MED: ${counts.MED}</span>
        <span class="stat-item bg-[#e8f5e9] text-[#1b5e20]">THC: ${counts.THC}</span>
        <span class="stat-item bg-[#fff3e0] text-[#e65100]">CBD: ${counts.CBD}</span>
        <span class="stat-item bg-[#f3e5f5] text-[#4a148c]">INV: ${counts.INV}</span>`;
}

const IMAGE_SEARCH_STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'can', 'after', 'before', 'about', 'into', 'over',
    'under', 'again', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
    'very', 'just', 'now', 'also', 'its', 'it', 'they', 'them', 'their', 'we', 'our', 'you', 'your', 'he',
    'she', 'his', 'her', 'him', 'who', 'which', 'what', 'this', 'that', 'these', 'those', 'am', 'i', 'me',
    'my', 'new', 'old', 'says', 'said', 'say', 'get', 'got', 'week', 'year', '2026', '2025', 'news', 'report',
    'reports', 'article', 'articles', 'according', 'amid', 'among', 'between', 'via', 'per', 'vs', 'v', 'u',
    's', 'us', 'uk', 'eu',
]);

const IMAGE_SEARCH_GENERIC_WORDS = new Set([
    'marijuana', 'cannabis', 'hemp', 'cbd', 'thc', 'weed', 'drug', 'drugs', 'pot', 'dispensary', 'dispensaries',
    'legalization', 'legalize', 'legalized', 'legalizing', 'recreational', 'medical', 'medicinal', 'industry',
    'market', 'markets', 'business', 'companies', 'company', 'law', 'laws', 'bill', 'bills', 'legislation',
    'legislature', 'congress', 'senate', 'house', 'state', 'states', 'federal', 'government', 'gov', 'governor',
]);

const IMAGE_SEARCH_VERB_NOUN = {
    vetoes: 'veto',
    vetoed: 'veto',
    vetoing: 'veto',
    passes: 'pass',
    passed: 'pass',
    passing: 'pass',
    signs: 'signing',
    signed: 'signing',
    legalizes: 'legalize',
    legalized: 'legalize',
    approves: 'approval',
    approved: 'approval',
    bans: 'ban',
    banned: 'ban',
    ruling: 'ruling',
    rules: 'rules',
};

function parseImageSearchEssence(query) {
    const raw = String(query || '').trim();
    const flatMatch = raw.match(/^(.+?)\s+flat$/i);
    if (flatMatch) {
        return { essence: flatMatch[1].trim(), full: `${flatMatch[1].trim()} flat` };
    }
    const single = raw.split(/\s+/).filter(Boolean)[0] || '';
    return { essence: single, full: single ? `${single} flat` : '' };
}

function formatImageSearchQuery(essence) {
    const word = String(essence || '').trim().replace(/\s+/g, ' ');
    return word ? `${word} flat` : '';
}

function normalizeEssenceToken(word, originalTitle) {
    let w = String(word || '').toLowerCase().replace(/[^a-z0-9'-]/g, '');
    if (!w || w.length < 3) return '';
    if (IMAGE_SEARCH_VERB_NOUN[w]) w = IMAGE_SEARCH_VERB_NOUN[w];
    if (w.endsWith('ies') && w.length > 4) w = `${w.slice(0, -3)}y`;
    else if (w.endsWith('s') && w.length > 4 && !w.endsWith('ss')) w = w.slice(0, -1);

    const titleWords = String(originalTitle || '').split(/\s+/);
    const idx = titleWords.findIndex((tw) => tw.toLowerCase().replace(/[^a-z0-9]/g, '') === w);
    if (idx > 0 && /^[A-Z]/.test(titleWords[idx])) {
        return w;
    }
    return w;
}

function extractTitleEssenceCandidates(title) {
    const raw = String(title || '').trim();
    const tokens = raw.split(/\s+/).map((w, i) => ({
        raw: w,
        norm: normalizeEssenceToken(w, raw),
        index: i,
        capitalized: /^[A-Z][a-z]/.test(w),
    })).filter((t) => t.norm && t.norm.length >= 3 && !IMAGE_SEARCH_STOPWORDS.has(t.norm));

    const scored = [];
    tokens.forEach((t) => {
        let score = 0;
        const len = t.norm.length;
        if (len >= 4 && len <= 14) score += 3;
        if (t.capitalized) score += 2;
        if (IMAGE_SEARCH_GENERIC_WORDS.has(t.norm)) score -= 6;
        if (t.index <= 2) score += 1;
        if (/^\d/.test(t.norm)) score -= 5;
        scored.push({ word: t.norm, score });
    });

    scored.sort((a, b) => b.score - a.score);
    const seen = new Set();
    const unique = [];
    scored.forEach(({ word, score }) => {
        if (seen.has(word)) return;
        seen.add(word);
        unique.push({ word, score });
    });
    return unique;
}

function buildDefaultImageSearchQuery(title, usedEssences = null) {
    const candidates = extractTitleEssenceCandidates(title);
    const used = usedEssences instanceof Set ? usedEssences : new Set();

    for (const { word } of candidates) {
        if (used.has(word)) continue;
        used.add(word);
        return formatImageSearchQuery(word);
    }

    const fallback = candidates[0]?.word || 'news';
    let suffix = 1;
    let word = fallback;
    while (used.has(word)) {
        word = `${fallback}${suffix}`;
        suffix += 1;
    }
    used.add(word);
    return formatImageSearchQuery(word);
}

window.updateImageSearchEssence = function (index, value) {
    const essence = String(value || '').trim().replace(/\s+/g, ' ');
    articles[index].imageSearchQuery = formatImageSearchQuery(essence);
    saveState();
};

// --- Past Icons Modal ---
let pastIconsData = [];
let currentPastIconArticleIndex = null;

window.openPastIconsModal = async function(articleIndex) {
    currentPastIconArticleIndex = articleIndex;
    const modal = document.getElementById('past-icons-modal');
    const content = document.getElementById('past-icons-modal-content');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
    
    if (pastIconsData.length === 0) {
        await fetchPastIcons();
    } else {
        renderPastIcons();
    }
};

window.closePastIconsModal = function() {
    const modal = document.getElementById('past-icons-modal');
    const content = document.getElementById('past-icons-modal-content');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 300);
    currentPastIconArticleIndex = null;
};

window.fetchPastIcons = async function() {
    const gallery = document.getElementById('past-icons-gallery');
    try {
        const res = await fetch('/api/images/past-icons');
        const data = await res.json();
        if (data.success && data.images) {
            // Sort by name for now, as FTP might not reliably provide dates
            pastIconsData = data.images.sort((a, b) => b.name.localeCompare(a.name));
            renderPastIcons();
        } else {
            gallery.innerHTML = '<div class="text-[#c62828] text-sm font-medium">Failed to load past icons.</div>';
        }
    } catch (e) {
        console.error('Past icons fetch error:', e);
        gallery.innerHTML = '<div class="text-[#c62828] text-sm font-medium">Error loading past icons.</div>';
    }
};

window.filterPastIcons = function() {
    const query = document.getElementById('past-icons-search-input').value.toLowerCase().trim();
    renderPastIcons(query);
};

function getCleanDisplayName(img) {
    let name = String(img.name || '').trim();
    // Remove file extension
    name = name.replace(/\.[a-zA-Z0-9]+$/, '');
    // Remove leading date prefix (e.g. 07-06-26-)
    name = name.replace(/^\d{2}-\d{2}-\d{2}-/, '');
    // Remove upload- prefix
    name = name.replace(/^upload-/, '');
    // Remove freepik- prefix
    name = name.replace(/^freepik-/, '');
    // Remove numeric timestamps (e.g. 1783369689169-)
    name = name.replace(/^\d{10,}-/, '');
    // Remove trailing numeric freepik IDs (e.g. -12345678)
    name = name.replace(/-\d{6,}$/, '');
    
    // Replace hyphens and underscores with spaces
    name = name.replace(/[-_]/g, ' ');
    
    // Strip trailing parenthesized keywords/context (e.g. "Costa Rica Flag (country, nation...)")
    name = name.replace(/\s*\(.*\)$/i, '');
    
    // Capitalize first letters of each word
    name = name.replace(/\b\w/g, l => l.toUpperCase());
    
    name = name.trim();
    return name || 'Icon';
}

window.renderPastIcons = function(query = '') {
    const gallery = document.getElementById('past-icons-gallery');
    
    let filtered = pastIconsData;
    if (query) {
        filtered = pastIconsData.filter(img => {
            const name = String(img.name || '').toLowerCase();
            return name.includes(query);
        });
    }
    
    if (filtered.length === 0) {
        gallery.innerHTML = '<div class="text-[#666] text-sm mt-10 text-center font-medium">No past icons match your search.</div>';
        return;
    }
    
    // Grid layout with responsive columns, increased columns for smaller thumbnails
    let html = '<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 p-3">';
    
    filtered.forEach(img => {
        const url = img.url;
        const displayName = escapeHtml(getCleanDisplayName(img));
        const fullName = escapeHtml(img.name || 'icon');
        const thumbSrc = toAbsoluteAssetUrl(url);
        html += `
            <div class="group flex flex-col cursor-pointer border border-[#e5e7eb] hover:border-[#2f6e63] hover:shadow-md rounded-lg overflow-hidden bg-white transition-all duration-200"
                 onclick="selectPastIconAndClose('${escapeHtml(url)}')"
                 title="${fullName}">
                <div class="aspect-square flex items-center justify-center bg-[#f9fafb] group-hover:bg-white p-3 relative transition-colors duration-200">
                    <img src="${thumbSrc}" alt="${displayName}" class="w-16 h-16 object-contain transition-transform duration-200 group-hover:scale-110" loading="lazy">
                </div>
                <div class="bg-[#f9fafb] p-1.5 text-[10px] truncate text-center text-[#6b7280] border-t border-[#e5e7eb] leading-tight select-none">
                    ${displayName}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    gallery.innerHTML = html;
};

window.selectPastIconAndClose = function(url) {
    if (currentPastIconArticleIndex !== null) {
        selectImage(currentPastIconArticleIndex, url);
    }
    closePastIconsModal();
};

// Search Images
window.searchArticleImages = async (index) => {
    const article = articles[index];
    const queryInput = document.getElementById(`img-search-input-${index}`);
    const essence = queryInput ? String(queryInput.value || '').trim() : '';
    const query = formatImageSearchQuery(essence);
    const page = article.imagePage || 1;

    if (!essence) return alert('Please enter a search keyword.');

    article.imageSearchQuery = query;
    article.imagePage = 1;
    saveState();

    const grid = document.getElementById(`grid-${index}`);
    grid.innerHTML = '<div class="grid-placeholder">Searching...</div>';

    try {
        const res = await fetch('/api/images/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, page }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || data.error) {
            const msg = data.error || `Search failed (HTTP ${res.status})`;
            const hint = data.searchTerm ? ` Tried keyword: "${data.searchTerm}".` : '';
            grid.innerHTML = `<div class="grid-placeholder text-[#c62828]">${msg}${hint}</div>`;
            return;
        }

        const stateImages = Array.isArray(data.stateImages) ? data.stateImages : [];
        const freepikImages = Array.isArray(data.images) ? data.images : [];
        const hasResults = stateImages.length > 0 || freepikImages.length > 0;

        if (data.success && hasResults) {
            grid.innerHTML = '';
            const selectedUrl = articles[index].image || articles[index].publishedImageUrl || '';

            const appendResultThumb = (img, useWrap) => {
                const url = img.download || img.preview;
                const thumbSrc = useWrap
                    ? toAbsoluteAssetUrl(url)
                    : (resolvePurablisImageUrl(url) || getDownloadSafeAssetUrl(img.preview || url) || (img.preview || url));
                const isPicked = selectedUrl && toAbsoluteAssetUrl(selectedUrl) === toAbsoluteAssetUrl(url);
                const onPick = () => selectImage(index, url);
                if (useWrap) {
                    const wrap = document.createElement('div');
                    wrap.className = 'mini-grid-item-wrap state-icon-wrap';
                    wrap.setAttribute('data-pick-url', url);
                    if (isPicked) wrap.classList.add('is-selected');
                    wrap.title = img.title || '';
                    const imgEl = document.createElement('img');
                    imgEl.src = thumbSrc;
                    imgEl.className = 'mini-grid-item state-icon-item';
                    imgEl.alt = img.title || '';
                    imgEl.onclick = onPick;
                    wrap.appendChild(imgEl);
                    grid.appendChild(wrap);
                } else {
                    const imgEl = document.createElement('img');
                    imgEl.setAttribute('data-pick-url', url);
                    imgEl.src = thumbSrc;
                    imgEl.className = 'mini-grid-item';
                    if (isPicked) imgEl.classList.add('is-selected');
                    imgEl.alt = img.title || '';
                    imgEl.onclick = onPick;
                    grid.appendChild(imgEl);
                }
            };

            stateImages.forEach((img) => appendResultThumb(img, true));
            freepikImages.slice(0, 8).forEach((img) => appendResultThumb(img, false));

            if (data.freepikSkipped && data.freepikError) {
                const errDiv = document.createElement('div');
                errDiv.className = 'text-[0.75rem] text-[#c62828] mt-2 text-center w-full col-span-full';
                errDiv.innerHTML = `⚠️ Freepik/Flaticon search skipped. API error: ${data.freepikError}. (Check FREEPIK_API_KEY in server .env)`;
                grid.appendChild(errDiv);
            }

            if (freepikImages.length > 0) {
                const navDiv = document.createElement('div');
                navDiv.className = 'img-page-nav';
                const currentPage = article.imagePage || 1;
                const termNote = data.searchTerm && data.searchTerm !== query
                    ? ` <span class="text-[0.75rem] text-[#888]">(${data.searchTerm})</span>`
                    : '';
                navDiv.innerHTML =
                    `<button class="btn btn-sm btn-outline" ${currentPage <= 1 ? 'disabled' : ''} onclick="changeImagePage(${index}, -1)" title="Previous">&larr;</button>
                    <span class="text-[0.8rem] text-[#555]">Page ${currentPage}${termNote}</span>
                    <button class="btn btn-sm btn-outline" onclick="changeImagePage(${index}, 1)" title="Next">&rarr;</button>`;
                grid.appendChild(navDiv);
            }
        } else {
            const tried = data.searchTerm ? ` for "${data.searchTerm}"` : '';
            const stateHint = essence.length >= 2
                ? ' For a US state, type the full state name (e.g. Virginia, New York).'
                : '';
            let skipMsg = '';
            if (data.freepikSkipped && data.freepikError) {
                skipMsg = `<div class="text-[0.75rem] text-[#c62828] mt-2">⚠️ Freepik/Flaticon API error: ${data.freepikError}. (Check FREEPIK_API_KEY in server .env)</div>`;
            }
            grid.innerHTML = `<div class="grid-placeholder">No icons found${tried}.${stateHint} Try a simpler keyword (e.g. cannabis, hemp, veto).${skipMsg}</div>`;
        }
    } catch (e) {
        console.error(e);
        grid.innerHTML = `<div class="grid-placeholder text-[#c62828]">Error searching: ${e.message || 'network error'}</div>`;
    }
};

window.searchAllArticleImages = async () => {
    const relevantIndexes = articles
        .map((article, index) => ({ article, index }))
        .filter(({ article }) => (article.categories && article.categories.length > 0) || article.status === 'COOL FINDS')
        .map(({ index }) => index);

    if (relevantIndexes.length === 0) {
        return alert('No articles available in Image View.');
    }

    const btn = document.querySelector('[onclick="searchAllArticleImages()"]');
    if (btn) {
        btn.disabled = true;
        btn.textContent = `Searching 0/${relevantIndexes.length}...`;
    }

    let searched = 0;
    const usedSearchEssences = new Set();

    try {
        for (const index of relevantIndexes) {
            const article = articles[index];
            article.imageSearchQuery = buildDefaultImageSearchQuery(article.title, usedSearchEssences);

            await searchArticleImages(index);
            searched++;

            if (btn) {
                btn.textContent = `Searching ${searched}/${relevantIndexes.length}...`;
            }
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Search All';
        }
    }
};

function normalizePreviewDisplayUrl(url) {
    return resolvePurablisImageUrl(url) || '';
}

function repairArticleImagePreview(article) {
    if (!article) return;
    const resolved = resolvePurablisImageUrl(article);
    if (resolved) article.previewImageUrl = resolved;
}

function getArticlePreviewImageUrl(article) {
    if (!article) return '';
    repairArticleImagePreview(article);
    let url = resolvePurablisImageUrl(article) || '';
    if (url && url.includes('purablis.com')) {
        const sep = url.includes('?') ? '&' : '?';
        url = `${url}${sep}v=${Date.now()}`;
    }
    return url;
}

function buildSelectedImageHtml(index, article, { publishing = false } = {}) {
    let previewSrc = getArticlePreviewImageUrl(article);
    if (!previewSrc && article && article.originalImageUrl) {
        previewSrc = article.originalImageUrl;
    }
    if (publishing && article && article.originalImageUrl) {
        previewSrc = article.originalImageUrl;
    }
    if (!previewSrc) {
        return '<div class="no-image-placeholder">No Image</div>';
    }
    const safeUrl = escapeHtml(previewSrc);
    const published = article && (article.publishedImageUrl || (isPurablisUrl(article.image) ? article.image : ''));
    const badge = publishing
        ? '<span class="badge-published" title="Saving…">…</span>'
        : (published && isPurablisUrl(published) ? '<span class="badge-published" title="Published">P</span>' : '');
    const safeOriginal = escapeHtml(article && article.originalImageUrl ? article.originalImageUrl : '');
    const fallbackScript = `this.onerror=null; if('${safeOriginal}') { this.src='${safeOriginal}'; }`;
    return `<div class="selected-image-container">
            <img src="${safeUrl}" class="selected-preview-img" alt="Selected" onerror="${fallbackScript}">
            <button class="btn-remove-image" onclick="removeImage(${index})">×</button>
            ${badge}
        </div>`;
}

function markSearchResultSelection(index, url) {
    const grid = document.getElementById(`grid-${index}`);
    if (!grid) return;
    grid.querySelectorAll('.is-selected').forEach((el) => el.classList.remove('is-selected'));
    if (!url) return;
    const selected = toAbsoluteAssetUrl(url);
    grid.querySelectorAll('[data-pick-url]').forEach((el) => {
        if (toAbsoluteAssetUrl(el.getAttribute('data-pick-url')) === selected) {
            el.classList.add('is-selected');
        }
    });
}

// Select Image — saves a copy on purablis.com (Freepik URLs are not kept for send)
window.selectImage = async (index, url) => {
    if (!url) return;
    const displayUrl = toAbsoluteAssetUrl(url);
    const article = articles[index];
    article.originalImageUrl = displayUrl;
    article.publishImage = true;
    const needsPublish = !isPurablisUrl(displayUrl) || isExternalCdnImageUrl(displayUrl);
    article.previewImageUrl = needsPublish ? '' : resolvePurablisImageUrl(displayUrl);
    article.image = needsPublish ? null : resolvePurablisImageUrl(displayUrl);
    updateSelectedImageBox(index, { publishing: needsPublish });
    markSearchResultSelection(index, url);
    saveState();

    if (isPurablisUrl(displayUrl)) {
        article.publishedImageUrl = displayUrl;
        article.image = displayUrl;
        article.previewImageUrl = resolvePurablisImageUrl(article);
        updateSelectedImageBox(index);
        saveState();
        return;
    }

    article.publishedImageUrl = null;

    try {
        const pub = await publishUrlToPurablis(displayUrl, 'article');
        const published = typeof pub === 'string' ? pub : pub.url;
        article.publishedImageUrl = (typeof pub === 'object' && pub.url) ? pub.url : published;
        article.publicReachable = typeof pub === 'object' ? !!pub.publicReachable : false;
        article.image = article.publishedImageUrl;
        article.previewImageUrl = resolvePurablisImageUrl(article);
        saveState();
        updateSelectedImageBox(index);
        if (typeof pub === 'object' && pub.publicReachable === false) {
            console.warn('Image on FTP; public URL not reachable yet:', article.publishedImageUrl);
        }
    } catch (e) {
        console.error('Publish to purablis failed:', e);
        article.image = null;
        article.publishedImageUrl = null;
        article.previewImageUrl = '';
        saveState();
        updateSelectedImageBox(index);
        alert(
            'Image selected, but could not save a copy on purablis.com. '
            + 'Check FTP settings or use “Publish Selected to purablis” before sending.\n\n'
            + (e.message || ''),
        );
    }
};

// Remove Image
window.removeImage = (index) => {
    articles[index].image = null;
    articles[index].originalImageUrl = null;
    articles[index].publishedImageUrl = null;
    articles[index].previewImageUrl = null;
    saveState();
    const box = document.getElementById(`selected-img-${index}`);
    if (box) {
        box.innerHTML = `<div class="no-image-placeholder">No Image</div>`;
    }
};

// Change Image Page
window.changeImagePage = (index, delta) => {
    const article = articles[index];
    const newPage = (article.imagePage || 1) + delta;
    if (newPage < 1) return;

    article.imagePage = newPage;
    saveState();
    searchArticleImages(index);
};

// Upload local image file for an article (uploads to purablis.com via GoDaddy FTP)
window.uploadArticleImage = async (index, input) => {
    if (!input.files || !input.files[0]) return;

    const label = document.querySelector(`label[for="img-upload-input-${index}"]`);
    if (label) label.textContent = 'Uploading...';

    const formData = new FormData();
    formData.append('image', input.files[0]);
    try {
        const res = await fetch('/api/images/upload-article', {
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        if (data.success) {
            const imageUrl = data.url || '';
            articles[index].publishedImageUrl = data.published ? imageUrl : null;
            articles[index].image = data.published ? imageUrl : null;
            articles[index].previewImageUrl = data.published ? resolvePurablisImageUrl(articles[index]) : '';
            articles[index].originalImageUrl = articles[index].previewImageUrl;
            articles[index].publishImage = true;
            saveState();
            updateSelectedImageBox(index, { publishing: !data.published });

            if (data.published) {
                if (label) label.textContent = 'Uploaded (purablis)';
            } else if (data.storedInline && String(imageUrl).startsWith('data:')) {
                if (label) label.textContent = 'Saved (inline)';
            } else if (data.ftpError) {
                if (label) label.textContent = 'Saved locally';
                alert(
                    'Image saved on this computer. FTP to purablis.com failed — newsletter send may need Publish Selected.\n\n'
                    + (data.ftpError || ''),
                );
            } else {
                if (label) label.textContent = 'Uploaded';
            }
        } else {
            alert('Upload failed: ' + (data.error || 'Unknown error'));
        }
    } catch (e) {
        console.error(e);
        alert('Upload failed. See console for details.');
    } finally {
        if (label) label.textContent = 'Upload File';
        input.value = '';
    }
};

// --- STEP 4: INSPIRATIONAL IMAGES ---

function isInspirationalLibraryFilename(name) {
    const n = String(name || '').trim();
    if (!n || !/\.(png|jpe?g|gif|webp|svg)$/i.test(n)) return false;
    const lower = n.toLowerCase();
    if (lower.startsWith('freepik-') || lower.startsWith('state-') || lower.startsWith('upload-')) {
        return false;
    }
    if (lower.startsWith('insp-')) return true;
    if (lower.includes('_insp_') || lower.includes('insp_')) return true;
    if (/^\d{4}-\d{2}-\d{2}__/.test(n)) return true;
    return false;
}

function inspirationalItemFilename(item) {
    const raw = (item && (item.name || item.url)) || '';
    try {
        if (/^https?:\/\//i.test(raw)) return decodeURIComponent(new URL(raw).pathname.split('/').pop() || '');
    } catch (e) {
        // fall through
    }
    return String(raw).split('/').pop().split('?')[0] || '';
}

function filterInspirationalLibraryImages(images) {
    const seen = new Set();
    return (Array.isArray(images) ? images : [])
        .filter((item) => item && item.url && isInspirationalLibraryFilename(inspirationalItemFilename(item)))
        .map((item) => {
            const name = inspirationalItemFilename(item);
            const previewUrl = resolvePurablisImageUrl(item) || buildPublicInspirationalImageUrl(item);
            return { ...item, name: item.name || name, previewUrl };
        })
        .filter((item) => {
            const key = String(item.url).trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function getInspirationalDisplayUrl(itemOrUrl) {
    return resolvePurablisImageUrl(itemOrUrl) || buildPublicInspirationalImageUrl(itemOrUrl);
}

async function loadInspirationalLibrary() {
    const grid = document.getElementById('insp-gallery-grid');
    if (grid && inspirationalLibraryImages.length === 0) {
        grid.innerHTML = '<div class="grid-placeholder">Loading uploaded images...</div>';
    }

    try {
        const res = await fetch('/api/images/inspirational-library');
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to load uploaded images');
        }
        inspirationalLibraryImages = filterInspirationalLibraryImages(data.images || []);
        localStorage.setItem(INSPIRATIONAL_LIBRARY_CACHE_KEY, JSON.stringify(inspirationalLibraryImages));
    } catch (e) {
        console.error(e);
        if (grid && inspirationalLibraryImages.length === 0) {
            grid.innerHTML = '<div class="grid-placeholder">Could not load uploaded images.</div>';
        }
    }

    renderInspirationalView();
}

window.searchInspirational = async () => {
    const query = document.getElementById('insp-search-query').value;
    if (!query) return alert('Please enter a search term');

    const grid = document.getElementById('insp-results-grid');
    grid.innerHTML = '<div class="grid-placeholder">Searching...</div>';

    try {
        // Reusing the same image search endpoint
        const res = await fetch('/api/images/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, page: 1 }),
        });
        const data = await res.json();

        if (data.success && data.images.length > 0) {
            grid.innerHTML = '';
            // Limit to 8 images
            const displayImages = data.images.slice(0, 8);

            displayImages.forEach(img => {
                const div = document.createElement('div');
                const imgEl = document.createElement('img');
                imgEl.src = img.preview;
                imgEl.className = 'thumbnail-img';
                imgEl.onclick = () => selectInspirationalImage(img.download);
                div.appendChild(imgEl);
                grid.appendChild(div);
            });
        } else {
            grid.innerHTML = '<div class="grid-placeholder">No images found.</div>';
        }
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<div class="grid-placeholder">Error searching.</div>';
    }
};

window.uploadInspirationalImage = async () => {
    const input = document.getElementById('insp-upload-input');
    const btn = document.getElementById('btn-insp-upload');
    const status = document.getElementById('insp-upload-status');
    if (!input || !input.files || !input.files[0]) return alert('Choose an image file first.');

    btn.textContent = 'Uploading...';
    btn.disabled = true;
    if (status) status.textContent = 'Uploading image to purablis.com...';

    const formData = new FormData();
    formData.append('image', input.files[0]);
    try {
        const res = await fetch('/api/images/upload-inspirational', {
            method: 'POST',
            body: formData,
        });
        const data = await parseJsonResponse(res, 'Upload route did not return JSON. Restart the app server and try again.');
        if (data.success && data.url) {
            if (!isPurablisUrl(data.url)) {
                throw new Error('Upload did not return a purablis.com URL.');
            }
            inspirationalImages = [data.url];
            confirmationInspirationalImage = data.url;
            saveState();
            await loadInspirationalLibrary();
            renderInspirationalView();
            if (status) status.textContent = 'Uploaded to purablis.com and selected for the newsletter.';
        } else {
            alert('Upload failed: ' + (data.error || 'Unknown error'));
            if (status) status.textContent = 'Upload failed.';
        }
    } catch (e) {
        console.error(e);
        alert('Upload failed: ' + (e.message || 'Unknown error'));
        if (status) status.textContent = 'Upload failed: ' + (e.message || 'Unknown error');
    } finally {
        btn.textContent = 'Upload to Purablis';
        btn.disabled = false;
        input.value = '';
    }
};

window.addInspirationalUrl = async () => {
    const input = document.getElementById('insp-url-input');
    const btn = document.getElementById('btn-insp-url-upload');
    const status = document.getElementById('insp-upload-status');
    const url = input ? input.value.trim() : '';
    if (!url) return alert('Paste an image URL first.');

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Uploading...';
    }
    if (status) status.textContent = 'Fetching the pasted image and uploading to purablis.com...';

    try {
        const res = await fetch('/api/images/publish-inspirational-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });
        const data = await parseJsonResponse(res, 'URL upload route did not return JSON. Restart the app server and try again.');
        if (!res.ok || !data.success || !data.url) {
            throw new Error(data.error || 'Failed to upload image URL to purablis.com');
        }
        if (!isPurablisUrl(data.url)) {
            throw new Error('Upload did not return a purablis.com URL.');
        }

        inspirationalImages = [data.url];
        confirmationInspirationalImage = data.url;
        saveState();
        await loadInspirationalLibrary();
        renderInspirationalView();

        if (input) input.value = '';
        if (status) status.textContent = 'Uploaded to purablis.com and selected for the newsletter.';
    } catch (e) {
        console.error(e);
        if (status) status.textContent = 'Upload failed: ' + (e.message || 'Unknown error');
        alert('Failed to upload image URL: ' + (e.message || 'Unknown error'));
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Upload URL';
        }
    }
};

window.selectInspirationalImage = async (url) => {
    const status = document.getElementById('insp-upload-status');
    let finalUrl = url;
    if (!isPurablisUrl(url)) {
        if (status) status.textContent = 'Saving image copy on purablis.com...';
        try {
            finalUrl = unwrapPublishedResult(await publishUrlToPurablis(url, 'inspirational'));
            await loadInspirationalLibrary();
        } catch (e) {
            console.error(e);
            if (status) status.textContent = '';
            alert('Could not save inspirational image on purablis.com: ' + (e.message || 'Unknown error'));
            return;
        }
    }
    inspirationalImages = [finalUrl];
    confirmationInspirationalImage = finalUrl;
    saveState();
    renderInspirationalView();
    if (status) status.textContent = isPurablisUrl(finalUrl) ? 'Inspirational image saved on purablis.com.' : '';
};

window.removeInspirationalImage = (index) => {
    inspirationalImages.splice(index, 1);
    if (!inspirationalImages.length) {
        confirmationInspirationalImage = '';
    } else if (!inspirationalImages.includes(confirmationInspirationalImage)) {
        confirmationInspirationalImage = inspirationalImages[0];
    }
    saveState();
    renderInspirationalView();
};

window.deleteInspirationalLibraryImage = async (url) => {
    if (!confirm('Delete this uploaded inspirational image from the server library?')) return;

    try {
        const res = await fetch('/api/images/inspirational-library', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Delete failed');
        }

        inspirationalImages = inspirationalImages.filter(img => img !== url);
        inspirationalLibraryImages = inspirationalLibraryImages.filter(img => img.url !== url);
        localStorage.setItem(INSPIRATIONAL_LIBRARY_CACHE_KEY, JSON.stringify(inspirationalLibraryImages));
        saveState();
        await loadInspirationalLibrary();
    } catch (e) {
        console.error(e);
        alert('Failed to delete uploaded image: ' + e.message);
    }
};

function renderInspirationalView() {
    const galleryGrid = document.getElementById('insp-gallery-grid');
    const selectedGrid = document.getElementById('selected-insp-grid');
    if (!galleryGrid || !selectedGrid) return;

    galleryGrid.innerHTML = '';
    if (inspirationalLibraryImages.length === 0) {
        galleryGrid.innerHTML = '<div class="grid-placeholder">No uploaded inspirational images yet.</div>';
    } else {
        inspirationalLibraryImages.forEach((item) => {
            const { url, name } = item;
            const displaySrc = getInspirationalDisplayUrl(item);
            const div = document.createElement('div');
            div.className = 'insp-library-card';

            const imgEl = document.createElement('img');
            imgEl.src = displaySrc;
            imgEl.className = 'insp-library-preview';
            imgEl.title = name || 'Uploaded image';
            imgEl.onerror = function() {
                if (this.src !== url && url) {
                    this.src = url;
                }
            };
            imgEl.onclick = () => selectInspirationalImage(url);

            const previewWrap = document.createElement('div');
            previewWrap.className = 'insp-library-preview-wrap';
            previewWrap.appendChild(imgEl);

            const meta = document.createElement('div');
            meta.className = 'insp-library-meta';

            const title = document.createElement('div');
            title.className = 'insp-library-title';
            title.textContent = name || 'Uploaded inspirational image';

            const subtitle = document.createElement('div');
            subtitle.className = 'insp-library-subtitle';
            const dateStr = item.modifiedAt ? new Date(item.modifiedAt).toLocaleDateString() : '';
            subtitle.textContent = dateStr ? `Uploaded: ${dateStr}` : 'Stored on server and available for newsletter use.';

            const actions = document.createElement('div');
            actions.className = 'insp-library-actions';

            const selectBtn = document.createElement('button');
            selectBtn.textContent = 'Select';
            selectBtn.className = 'btn btn-primary btn-sm';
            selectBtn.onclick = (e) => {
                e.stopPropagation();
                selectInspirationalImage(url);
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'btn btn-sm insp-delete-btn';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteInspirationalLibraryImage(url);
            };

            actions.appendChild(selectBtn);
            actions.appendChild(deleteBtn);
            meta.appendChild(title);
            meta.appendChild(subtitle);
            meta.appendChild(actions);
            div.appendChild(previewWrap);
            div.appendChild(meta);
            galleryGrid.appendChild(div);
        });
    }

    selectedGrid.innerHTML = '';
    if (inspirationalImages.length === 0) {
        selectedGrid.innerHTML = '<div class="grid-placeholder">No images selected.</div>';
    } else {
        inspirationalImages.forEach((url, index) => {
            const libraryItem = inspirationalLibraryImages.find((item) => item.url === url);
            const displaySrc = libraryItem
                ? getInspirationalDisplayUrl(libraryItem)
                : getInspirationalDisplayUrl(url);
            const div = document.createElement('div');
            div.className = 'insp-selected-card';

            const imgEl = document.createElement('img');
            imgEl.src = displaySrc;
            imgEl.className = 'insp-selected-preview';
            imgEl.onerror = function() {
                if (this.src !== url && url) {
                    this.src = url;
                }
            };

            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '&times;';
            removeBtn.className = 'insp-selected-remove';
            removeBtn.onclick = () => removeInspirationalImage(index);

            const caption = document.createElement('div');
            caption.className = 'insp-selected-caption';
            caption.textContent = 'Selected for Confirmation and final newsletter';

            div.appendChild(imgEl);
            div.appendChild(removeBtn);
            div.appendChild(caption);
            selectedGrid.appendChild(div);
        });
    }
}

// --- STEP 5: TEXT EDITOR ---

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const ELIGIBLE_CATEGORY_STATUSES = ['Y', 'YM', 'COOL FINDS', 'LATER COOL'];

function normalizeArticleStatus(status) {
    const s = String(status ?? '').trim().toUpperCase();
    if (!s) return 'Y';
    if (s === 'N') return 'NO';
    if (s === 'M') return 'YM';
    return s;
}

function articleHasCategory(article, cat) {
    if (!Array.isArray(article.categories)) return false;
    const key = String(cat).trim().toUpperCase();
    return article.categories.some(c => String(c).trim().toUpperCase() === key);
}

function normalizeArticleDefaults(article) {
    if (!article || typeof article !== 'object') return;
    if (!article.status) article.status = 'Y';
    if (!article.categories) article.categories = article.category ? [article.category] : [];
    if (article.selected === undefined) article.selected = true;
    if (!article.ranks || typeof article.ranks !== 'object') article.ranks = {};
    // Legacy: checkbox picks without rank → keep as Y in column data
    ['MED', 'THC', 'CBD', 'INV'].forEach((cat) => {
        const key = String(cat).trim().toUpperCase();
        const rank = String(article.ranks[key] ?? article.ranks[cat] ?? '').trim().toUpperCase();
        if (!rank && article.useInNewsletter && article.useInNewsletter[key] === true) {
            article.ranks[key] = 'Y';
            if (!articleHasCategory(article, key)) article.categories.push(key);
        } else if (rank === 'M') {
            article.ranks[key] = 'YM';
        }
    });
}

function ensureCategoryPickOrder() {
    if (!newsletterContent.categoryPickOrder || typeof newsletterContent.categoryPickOrder !== 'object') {
        newsletterContent.categoryPickOrder = { MED: '', THC: '', CBD: '', INV: '' };
    }
    return newsletterContent.categoryPickOrder;
}

function parseCategoryPickOrder(category) {
    const raw = String(ensureCategoryPickOrder()[category] || '').trim();
    if (!raw) return [];
    return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function syncCategoryPickOrderInputs() {
    const picks = ensureCategoryPickOrder();
    ['MED', 'THC', 'CBD', 'INV'].forEach((cat) => {
        const el = document.getElementById(`pick-order-${cat}`);
        if (el) el.value = picks[cat] || '';
    });
}

window.updateCategoryPickOrder = (category, value) => {
    ensureCategoryPickOrder()[category] = value;
    saveState();
    updateStats();
};

function isArticleEligibleForCategoryPicks(article) {
    normalizeArticleDefaults(article);
    if (article.selected === false) return false;
    return ELIGIBLE_CATEGORY_STATUSES.includes(normalizeArticleStatus(article.status));
}

function ensureUseInNewsletter(article) {
    if (!article.useInNewsletter || typeof article.useInNewsletter !== 'object') {
        article.useInNewsletter = {};
    }
    return article.useInNewsletter;
}

/** Category column (MED/THC/CBD/INV) has Y, YM, or a numeric rank — used for Confirmation & summaries */
function isCategoryRankIncluded(article, category) {
    if (!isArticleEligibleForCategoryPicks(article)) return false;
    const rank = String(getRankForSort(article, category)).trim().toUpperCase();
    if (!rank) return false;
    if (/^\d+$/.test(rank)) return true;
    return ['Y', 'YM', 'M'].includes(rank);
}

/** Article is included when the category column has any non-empty rank (legacy / stats). */
function isUseInNewsletter(article, category) {
    return !!String(getRankForSort(article, category) ?? '').trim();
}

function getArticlesForCategory(category) {
    // Get article URLs in laterCoolArticles to exclude them from main articles
    const coolFindUrls = new Set(laterCoolArticles.map(a => a.url));

    return articles
        .filter(a => {
            if (a.selected === false) return false;
            // Exclude cool finds - they go in their own section only
            if (coolFindUrls.has(a.url)) return false;
            // Also exclude articles marked with COOL FINDS status
            if (a.status === 'COOL FINDS') return false;
            normalizeArticleDefaults(a);
            return isCategoryRankIncluded(a, category);
        })
        .sort((a, b) => {
            const rA = rankToSortValue(getRankForSort(a, category));
            const rB = rankToSortValue(getRankForSort(b, category));
            if (rA !== rB) return rA - rB;
            return (a.title || '').localeCompare(b.title || '');
        });
}

/** Order for subjects, template, and Text tab — uses top pick-order boxes when set. */
function getArticlesByPickOrder(category) {
    const eligible = getArticlesForCategory(category);
    const orderKeys = parseCategoryPickOrder(category);
    if (orderKeys.length === 0) return eligible;

    const result = [];
    const used = new Set();
    orderKeys.forEach((key) => {
        const keyNorm = key.toUpperCase();
        const match = eligible.find((a) => {
            const r = String(getRankForSort(a, category)).trim().toUpperCase();
            return r === keyNorm;
        });
        if (!match) return;
        const id = match.url || match.title || String(match.id);
        if (used.has(id)) return;
        used.add(id);
        result.push(match);
    });
    eligible.forEach((a) => {
        const id = a.url || a.title || String(a.id);
        if (used.has(id)) return;
        used.add(id);
        result.push(a);
    });
    return result;
}

function buildArticlesOnlyBlock(category) {
    const categoryArticles = getSummaryArticlesForCategory(category);
    if (categoryArticles.length === 0) {
        return '';
    }
    return categoryArticles.map((article, index) => {
        const title = article.title || 'Untitled';
        const url = article.url || '';
        const rank = getRankForSort(article, category);
        return `${index + 1}. [${rank}] ${title}\n${url}`;
    }).join('\n\n');
}

function mergePromptWithCategoryLinks(existingPrompt, category) {
    const promptBlock = buildArticlesOnlyBlock(category);
    const startMarker = `[[AUTO_CATEGORY_LINKS_${category}_START]]`;
    const endMarker = `[[AUTO_CATEGORY_LINKS_${category}_END]]`;
    const wrappedBlock = promptBlock
        ? `${startMarker}\n${promptBlock}\n${endMarker}`
        : `${startMarker}\n(No articles selected — enter rank in MED/THC/CBD/INV columns and pick-order boxes on Article View.)\n${endMarker}`;
    const current = String(existingPrompt || '').trim();
    const markerPattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, 'm');
    const brokenBlockPattern = new RegExp(`\\[\\[AUTO_CATEGORY_LINKS_${category}_[\\s\\S]*?(?=\\nhttps?:\\/\\/|\\n[A-Za-z0-9].*https?:\\/\\/|$)`, 'g');
    const cleaned = current
        .replace(markerPattern, '')
        .replace(brokenBlockPattern, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    if (!cleaned) {
        return wrappedBlock;
    }
    return `${wrappedBlock}\n\n${cleaned}`;
}

window.syncCategoryPrompt = (category) => {
    syncSummaryArticlesFromPicks(category);
};

function mergeArticlesOnlyBlock(category, existingText) {
    const categoryArticles = getSummaryArticlesForCategory(category);
    if (categoryArticles.length === 0) {
        return '';
    }
    
    const urlChunks = {};
    if (existingText) {
        const chunks = existingText.split(/\n\n+/);
        chunks.forEach(chunk => {
            const match = chunk.match(/(https?:\/\/[^\s]+)/);
            if (match) {
                const url = match[1].trim();
                urlChunks[url] = chunk;
            }
        });
    }

    return categoryArticles.map((article, index) => {
        const url = (article.url || '').trim();
        const defaultTitle = article.title || 'Untitled';
        const rank = getRankForSort(article, category);
        const prefix = `${index + 1}. [${rank}]`;
        
        if (url && urlChunks[url]) {
            let existingChunk = urlChunks[url];
            if (existingChunk.match(/^\d+\.\s*\[[^\]]+\]\s*/)) {
                existingChunk = existingChunk.replace(/^\d+\.\s*\[[^\]]+\]\s*/, prefix + ' ');
            } else {
                existingChunk = prefix + ' ' + existingChunk;
            }
            return existingChunk;
        } else {
            return `${prefix} ${defaultTitle}\n${url}`;
        }
    }).join('\n\n');
}

window.syncSummaryArticlesFromPicks = function syncSummaryArticlesFromPicks(category) {
    const content = newsletterContent[category] || (newsletterContent[category] = {
        intro: '',
        outro: '',
    });
    
    // Smart merge to preserve user edits while recalibrating links and ordering
    const block = mergeArticlesOnlyBlock(category, content.summaryArticlesText);
    content.summaryArticlesText = block;

    const articlesEl = document.getElementById('editor-summary-articles');
    if (articlesEl && currentEditorTab === category) {
        articlesEl.value = block;
    }
    saveState();
};

window.updateSummaryArticlesText = (category, value) => {
    const content = newsletterContent[category] || (newsletterContent[category] = {
        intro: '',
        outro: '',
    });
    content.summaryArticlesText = value;
    saveState();
};

const EDITOR_NEWSLETTER_CATEGORIES = ['MED', 'THC', 'CBD', 'INV'];

function getSelectedCategoryResults() {
    if (!newsletterContent.selectedResults) {
        newsletterContent.selectedResults = { MED: '', THC: '', CBD: '', INV: '' };
    }
    return newsletterContent.selectedResults;
}

function getNewsletterTextForCategory(category) {
    const selected = getSelectedCategoryResults();
    const created = ((newsletterContent[category] && newsletterContent[category].result) || '').trim();
    const chosen = (selected[category] || '').trim();
    // A Selected draft that still says a link wouldn't load is older than the
    // Created Result it came from, so exporting it would ship the stale copy.
    if (chosen && summaryDraftLooksIncomplete(chosen) && created && !summaryDraftLooksIncomplete(created)) {
        return created;
    }
    return chosen || created;
}

function formatAllNewslettersForExport() {
    return EDITOR_NEWSLETTER_CATEGORIES.map((cat) => `--- ${cat} ---\n${getNewsletterTextForCategory(cat)}`).join('\n\n');
}

function parseAllNewslettersImport(raw) {
    const result = { MED: '', THC: '', CBD: '', INV: '' };
    const matched = new Set();
    const text = String(raw || '').replace(/\r\n/g, '\n').trim();
    if (!text) return { result, found: 0, matched };

    const re = /(?:^|\n)[-—–]{1,3}\s*(MED|THC|CBD|INV)\s*[-—–]{1,3}\s*\n([\s\S]*?)(?=\n[-—–]{1,3}\s*(?:MED|THC|CBD|INV)\s*[-—–]{1,3}\s*\n|$)/gi;
    let match;
    while ((match = re.exec(text)) !== null) {
        const cat = match[1].toUpperCase();
        result[cat] = match[2].trim();
        matched.add(cat);
    }
    if (matched.size > 0) return { result, found: matched.size, matched };

    const rePlain = /(?:^|\n)(MED|THC|CBD|INV)\s*\n([\s\S]*?)(?=\n(?:MED|THC|CBD|INV)\s*\n|$)/gi;
    while ((match = rePlain.exec(text)) !== null) {
        const cat = match[1].toUpperCase();
        result[cat] = match[2].trim();
        matched.add(cat);
    }
    return { result, found: matched.size, matched };
}

function setBulkNewsletterStatus(message, isError = false) {
    const el = document.getElementById('bulk-newsletter-status');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('text-red-600', isError);
    el.classList.toggle('text-[#666]', !isError);
}

function getBulkWorkflowTab() {
    return newsletterContent.bulkWorkflowTab === 'changes' || newsletterContent.bulkWorkflowTab === 'updated'
        ? newsletterContent.bulkWorkflowTab
        : 'original';
}

function persistBulkWorkflowFields() {
    const orig = document.getElementById('editor-bulk-paste');
    const req = document.getElementById('editor-bulk-change-request');
    const upd = document.getElementById('editor-bulk-updated');
    if (orig) newsletterContent.bulkOriginalText = orig.value;
    if (req) newsletterContent.bulkChangeRequest = req.value;
    if (upd) newsletterContent.bulkUpdatedText = upd.value;
    saveState();
}

window.persistBulkWorkflowFields = persistBulkWorkflowFields;

function getBulkApplySourceEl() {
    const tab = getBulkWorkflowTab();
    if (tab === 'updated') return document.getElementById('editor-bulk-updated');
    if (tab === 'changes') {
        const updatedEl = document.getElementById('editor-bulk-updated');
        if (updatedEl && updatedEl.value.trim()) return updatedEl;
    }
    return document.getElementById('editor-bulk-paste');
}

function restoreBulkWorkflowUi() {
    const orig = document.getElementById('editor-bulk-paste');
    const req = document.getElementById('editor-bulk-change-request');
    const upd = document.getElementById('editor-bulk-updated');
    if (orig && orig.value !== (newsletterContent.bulkOriginalText || '')) {
        orig.value = newsletterContent.bulkOriginalText || '';
    }
    if (req && req.value !== (newsletterContent.bulkChangeRequest || '')) {
        req.value = newsletterContent.bulkChangeRequest || '';
    }
    if (upd && upd.value !== (newsletterContent.bulkUpdatedText || '')) {
        upd.value = newsletterContent.bulkUpdatedText || '';
    }
    switchBulkWorkflowTab(getBulkWorkflowTab(), { skipPersist: true });
}

function switchBulkWorkflowTab(tab, { skipPersist = false } = {}) {
    const next = (tab === 'changes' || tab === 'updated') ? tab : 'original';
    if (!skipPersist) persistBulkWorkflowFields();
    newsletterContent.bulkWorkflowTab = next;

    document.querySelectorAll('.bulk-tab-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-bulk-tab') === next);
    });

    const panes = {
        original: document.getElementById('bulk-pane-original'),
        changes: document.getElementById('bulk-pane-changes'),
        updated: document.getElementById('bulk-pane-updated'),
    };
    Object.entries(panes).forEach(([key, el]) => {
        if (!el) return;
        if (key === next) showWithClass(el, 'block');
        else hideWithClass(el);
    });

    const help = document.getElementById('bulk-workflow-help');
    if (help) {
        help.textContent = next === 'changes'
            ? 'Describe the edits you want. This sends the Original copy to the AI Model in the nav bar; the result appears on Updated.'
            : next === 'updated'
                ? 'AI-revised copy. Apply to Selected and Copy all 4 use this version while this tab is active.'
                : 'Copy once with MED / THC / CBD / INV labels. Edit in Grammarly, paste back here, then apply to Selected Content below.';
    }

    const showOriginalActions = next !== 'changes';
    const loadBtn = document.getElementById('bulk-btn-load');
    const copyBtn = document.getElementById('bulk-btn-copy');
    const applyBtn = document.getElementById('bulk-btn-apply');
    const sendBtn = document.getElementById('bulk-btn-send');
    if (loadBtn) {
        if (next === 'original') showWithClass(loadBtn, 'inline-flex');
        else hideWithClass(loadBtn);
    }
    if (copyBtn) {
        if (showOriginalActions) showWithClass(copyBtn, 'inline-flex');
        else hideWithClass(copyBtn);
    }
    if (applyBtn) {
        if (showOriginalActions) showWithClass(applyBtn, 'inline-flex');
        else hideWithClass(applyBtn);
    }
    if (sendBtn) {
        if (next === 'changes') showWithClass(sendBtn, 'inline-flex');
        else hideWithClass(sendBtn);
    }
    if (!skipPersist) saveState();
}
window.switchBulkWorkflowTab = switchBulkWorkflowTab;

window.loadBulkNewsletterText = () => {
    const el = document.getElementById('editor-bulk-paste');
    if (!el) return;
    el.value = formatAllNewslettersForExport();
    persistBulkWorkflowFields();
    switchBulkWorkflowTab('original');
    const empty = EDITOR_NEWSLETTER_CATEGORIES.filter((c) => !getNewsletterTextForCategory(c));
    if (empty.length === 4) {
        setBulkNewsletterStatus('No text in Selected or Created Result yet.', true);
        return;
    }
    const incomplete = incompleteExportCategories();
    if (incomplete.length) {
        setBulkNewsletterStatus(`Loaded, but ${incomplete.join(', ')} still says a link could not be read. Re-run Summarize All for those.`, true);
        return;
    }
    setBulkNewsletterStatus(empty.length ? `Loaded (${empty.join(', ')} empty).` : 'Loaded all four from Selected / Created Result.');
};

function incompleteExportCategories() {
    return EDITOR_NEWSLETTER_CATEGORIES.filter((c) => summaryDraftLooksIncomplete(getNewsletterTextForCategory(c)));
}

window.copyAllNewsletterText = () => {
    const tab = getBulkWorkflowTab();
    if (tab === 'updated') {
        const updatedEl = document.getElementById('editor-bulk-updated');
        const text = (updatedEl && updatedEl.value.trim()) || '';
        if (!text) {
            setBulkNewsletterStatus('Updated is empty. Send a change request first.', true);
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            setBulkNewsletterStatus('Copied Updated copy to clipboard.');
        }).catch((err) => {
            console.error('Failed to copy updated newsletters:', err);
            setBulkNewsletterStatus('Copy failed — select the Updated box and copy manually.', true);
        });
        return;
    }

    const text = formatAllNewslettersForExport();
    const empty = EDITOR_NEWSLETTER_CATEGORIES.filter((c) => !getNewsletterTextForCategory(c));
    if (empty.length === 4) {
        setBulkNewsletterStatus('Nothing to copy yet. Generate or Select content for each category first.', true);
        return;
    }
    const incomplete = incompleteExportCategories();
    if (incomplete.length) {
        setBulkNewsletterStatus(`Not copied — ${incomplete.join(', ')} still says a link could not be read. Re-run Summarize All for those.`, true);
        return;
    }
    const bulkEl = document.getElementById('editor-bulk-paste');
    if (bulkEl) bulkEl.value = text;
    persistBulkWorkflowFields();
    navigator.clipboard.writeText(text).then(() => {
        setBulkNewsletterStatus(
            empty.length
                ? `Copied to clipboard (${empty.join(', ')} empty).`
                : 'Copied all four to clipboard.',
        );
    }).catch((err) => {
        console.error('Failed to copy all newsletters:', err);
        setBulkNewsletterStatus('Copy failed — use Load from Selected and copy the box manually.', true);
    });
};

window.applyBulkNewsletterPaste = () => {
    const el = getBulkApplySourceEl();
    if (!el) return;
    const sourceLabel = el.id === 'editor-bulk-updated' ? 'Updated' : 'Original';
    const { result: parsed, found, matched } = parseAllNewslettersImport(el.value);
    if (found === 0) {
        setBulkNewsletterStatus(`No MED/THC/CBD/INV sections found in ${sourceLabel}. Use lines like: --- MED ---`, true);
        return;
    }
    const selected = getSelectedCategoryResults();
    const updated = [];
    matched.forEach((cat) => {
        selected[cat] = parsed[cat];
        updated.push(cat);
    });
    persistBulkWorkflowFields();
    saveState();
    renderEditorContent();
    setBulkNewsletterStatus(`Applied ${sourceLabel} to Selected Content: ${updated.join(', ')}.`);
};

window.requestBulkNewsletterChanges = async () => {
    persistBulkWorkflowFields();
    const origEl = document.getElementById('editor-bulk-paste');
    const reqEl = document.getElementById('editor-bulk-change-request');
    const updEl = document.getElementById('editor-bulk-updated');
    const sendText = document.getElementById('bulk-send-btn-text');
    const sendBtn = document.getElementById('bulk-btn-send');

    let originalText = origEl ? origEl.value.trim() : (newsletterContent.bulkOriginalText || '').trim();
    if (!originalText) {
        originalText = formatAllNewslettersForExport().trim();
        if (origEl) origEl.value = originalText;
        persistBulkWorkflowFields();
    }
    if (!originalText) {
        setBulkNewsletterStatus('Original is empty. Load from Selected first.', true);
        return;
    }
    const changeRequest = reqEl ? reqEl.value.trim() : (newsletterContent.bulkChangeRequest || '').trim();
    if (!changeRequest) {
        setBulkNewsletterStatus('Enter a change request first.', true);
        return;
    }

    if (sendText) sendText.textContent = 'Sending...';
    if (sendBtn) sendBtn.disabled = true;
    setBulkNewsletterStatus('Sending Original copy to the AI Model...');

    try {
        const res = await fetch('/api/articles/rewrite-newsletters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: originalText,
                changeRequest,
                model: document.getElementById('ai-model') ? document.getElementById('ai-model').value : '',
            }),
        });
        const data = await parseJsonResponse(res, 'Failed to rewrite newsletters.');
        if (!data.success) {
            showAiFailureAlert('Newsletter rewrite failed', data);
            setBulkNewsletterStatus(extractApiErrorMessage(data) || 'Rewrite failed.', true);
            return;
        }
        if (updEl) updEl.value = data.resultText || '';
        newsletterContent.bulkUpdatedText = data.resultText || '';
        switchBulkWorkflowTab('updated');
        setBulkNewsletterStatus('Updated copy is ready. Apply to Selected uses this version.');
    } catch (e) {
        console.error('Bulk newsletter rewrite error:', e);
        showAiFailureAlert('Newsletter rewrite failed', e.message || 'Unknown error');
        setBulkNewsletterStatus(e.message || 'Rewrite failed.', true);
    } finally {
        if (sendText) sendText.textContent = 'Send to AI';
        if (sendBtn) sendBtn.disabled = false;
    }
};

window.switchEditorTab = (category) => {
    currentEditorTab = category;

    // Update Tab UI
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => {
        if (t.textContent === category) t.classList.add('active');
        else t.classList.remove('active');
    });

    renderEditorContent();
};

window.renderEditorContent = () => {
    const container = document.getElementById('editor-content');
    if (!container) return;

    const content = newsletterContent[currentEditorTab];
    if (content.summaryArticlesText === undefined) {
        content.summaryArticlesText = buildArticlesOnlyBlock(currentEditorTab) || '';
    }
    const articlesTextValue = content.summaryArticlesText;

    const summaryRulesValue = normalizeSummaryRules(newsletterContent.summaryRules);
    const templateValue = (newsletterContent.templates && newsletterContent.templates[currentEditorTab]) || '';
    const selectedGreeting = newsletterContent.selectedGreeting || DEFAULT_GREETING;
    const greetingOptionsHtml = buildGreetingOptionsHtml(selectedGreeting);
    const customGreetings = getCustomGreetings();
    const customGreetingsListHtml = customGreetings.length
        ? `<ul class="mt-2 mb-0 pl-4 text-[0.8rem] text-[#555] list-disc">
            ${customGreetings.map((g) => `
                <li class="mb-1 flex items-center gap-2 flex-wrap">
                    <span>${escapeHtml(g)}</span>
                    <button type="button" class="text-[0.7rem] text-red-600 underline" onclick="removeCustomGreetingEnding(${JSON.stringify(g)})">Remove</button>
                </li>`).join('')}
           </ul>`
        : '';
    const selectedResults = getSelectedCategoryResults();
    const selectedSummaryHtml = ['MED', 'THC', 'CBD', 'INV'].map(cat => {
        const selectedText = selectedResults[cat] || '';
        const createdText = ((newsletterContent[cat] && newsletterContent[cat].result) || '').trim();
        const staleHtml = selectedText.trim() && createdText && selectedText.trim() !== createdText
            ? `<div class="mt-1 text-[0.72rem] text-[#b45309]">Differs from the latest Created Result.
                   <button type="button" class="underline font-semibold" onclick="selectGeneratedContent('${cat}')">Use newest</button>
               </div>`
            : '';
        return `<div class="p-3 border border-[#e0e0e0] rounded-lg bg-[#fafafa]">
                <div class="font-bold">${cat}</div>
                ${staleHtml}
                <textarea id="editor-selected-${cat}" rows="5" class="form-control text-[0.85rem] bg-white mt-2 p-2" oninput="updateSelectedCategoryResult('${cat}', this.value)" placeholder="No selected ${cat} content yet...">${escapeHtml(selectedText)}</textarea>
            </div>`;
    }).join('');
    const createdResultsHtml = ['MED', 'THC', 'CBD', 'INV'].map((cat) => {
        const text = (newsletterContent[cat] && newsletterContent[cat].result) || '';
        const isActive = cat === currentEditorTab;
        return `<div class="p-3 border rounded-lg ${isActive ? 'border-[#2f6e63] bg-white' : 'border-[#e0e0e0] bg-[#fafafa]'}">
                <div class="font-bold">${cat}${isActive ? ' <span class="text-[0.7rem] font-semibold text-[#2f6e63]">(active)</span>' : ''}</div>
                <textarea id="editor-result-${cat}" rows="6" class="form-control text-[0.85rem] bg-white mt-2 p-2" oninput="updateNewsletterContent('${cat}', 'result', this.value)" placeholder="No created ${cat} result yet...">${escapeHtml(text)}</textarea>
            </div>`;
    }).join('');

    container.innerHTML =
        `<div class="form-group mb-5 p-3 border border-[#c5cae9] rounded-lg bg-[#f8f9fc]">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label class="font-bold">Created Result</label>
                <div class="flex gap-2">
                    <button class="btn btn-primary btn-sm" onclick="selectGeneratedContent('${currentEditorTab}')">Select ${currentEditorTab}</button>
                    <button class="btn btn-outline btn-sm" onclick="copyEditorContent('${currentEditorTab}')">Copy ${currentEditorTab} Content</button>
                </div>
            </div>
            <p class="text-[0.8rem] text-[#555] mb-3">All four newsletters. Generate Summary fills the active tab (${currentEditorTab}).</p>
            <div class="grid grid-cols-2 gap-3">
                ${createdResultsHtml}
            </div>
        </div>

        <div class="form-group p-3 bg-[#f8f9fa] rounded-lg border border-[#e9ecef] mb-5">
            <label class="font-semibold">Template for ${currentEditorTab}</label>
            <p class="text-muted text-[0.8rem] mb-2.5">HTML template for this newsletter. Use {{SUMMARY}}, {{ARTICLES_HTML}}, {{INSPIRATIONAL_IMAGE}}, {{NEWSLETTER_NAME}} as placeholders.</p>
            <div class="flex flex-wrap gap-3 items-center mb-2.5">
                <input type="file" id="template-single-input" accept=".html,.htm" class="upload-input text-[0.85rem]">
                <button class="btn btn-secondary btn-sm" onclick="uploadSingleTemplate()">Upload 1 (for ${currentEditorTab})</button>
                <span class="text-[#999]">or</span>
                <input type="file" id="template-batch-input" accept=".html,.htm" multiple class="upload-input text-[0.85rem]">
                <button class="btn btn-secondary btn-sm" onclick="uploadAllTemplates()">Upload all 4</button>
            </div>
            <div id="template-status" class="text-[0.8rem] text-[#666] mb-2"></div>
            <textarea id="editor-template" rows="6" class="form-control font-[monospace] text-[0.8rem] bg-white p-2" oninput="updateTemplate('${currentEditorTab}', this.value)" placeholder="Paste or edit HTML template here..."></textarea>
        </div>

        <div class="grid grid-cols-[1fr_300px] gap-5 items-start">
            <div>
                <div class="form-group">
                    <label class="font-semibold">Articles for ${currentEditorTab} summary</label>
                    <p class="text-[0.8rem] text-[#777] mb-2">Only articles with a rank number in Article View. Edit here or sync from picks.</p>
                    <textarea id="editor-summary-articles" rows="10" class="form-control font-[monospace] text-[0.9rem] mt-1 p-2 bg-white border border-[#c8e6c9]" oninput="updateSummaryArticlesText('${currentEditorTab}', this.value)" placeholder="1. [1] Article title&#10;https://...">${escapeHtml(articlesTextValue)}</textarea>
                </div>

                <div class="flex items-center gap-2.5 mt-2 mb-4">
                    <button class="btn btn-secondary btn-sm" onclick="syncSummaryArticlesFromPicks('${currentEditorTab}')">Recalibrate Links from Article View</button>
                    <span class="text-[0.8rem] text-[#777]">Updates this list with your latest selections and ranks. Preserves your manual text edits.</span>
                </div>

                <div class="flex items-center gap-4 mb-5 justify-between flex-wrap">
                    <div class="flex items-center gap-4">
                        <label class="flex items-center gap-1.25 cursor-pointer text-[0.9rem]">
                            <input type="radio" id="rules-on-${currentEditorTab}" name="useRulesGroup-${currentEditorTab}" ${content.useRules !== false ? 'checked' : ''} onchange="updateNewsletterContent('${currentEditorTab}', 'useRules', true)">
                            Use Summary Rules
                        </label>
                        <label class="flex items-center gap-1.25 cursor-pointer text-[0.9rem]">
                            <input type="radio" id="rules-off-${currentEditorTab}" name="useRulesGroup-${currentEditorTab}" ${content.useRules === false ? 'checked' : ''} onchange="updateNewsletterContent('${currentEditorTab}', 'useRules', false)">
                            Custom (No Rules)
                        </label>
                    </div>
                    <button class="btn btn-secondary mr-2" onclick="forceManualContentModal('${currentEditorTab}')">
                        <span>Provide Article Text</span>
                    </button>
                    <button class="btn btn-primary" onclick="generateSummary('${currentEditorTab}')">
                        <span id="gen-btn-text-${currentEditorTab}">Generate Summary</span>
                    </button>
                </div>
            </div>

        </div>

        <div>
            <div id="editor-articles-list" class="mb-4 text-[0.85rem]"></div>

            <!-- Base Prompt (server-side, editable + saveable) -->
            <div class="form-group mb-4 border border-blue-200 rounded-lg p-3 bg-blue-50">
                <div class="flex items-center justify-between mb-1 flex-wrap gap-2">
                    <label class="font-semibold text-blue-800">Base System Prompt <span class="text-[0.7rem] font-normal text-blue-500">(6–7 lines, editor role — sent to AI before rules)</span></label>
                    <div class="flex items-center gap-2">
                        <span id="base-prompt-status" class="text-[0.7rem] text-gray-400"></span>
                        <button onclick="saveBasePrompt()" class="px-3 py-1 text-[0.75rem] bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold">Save</button>
                        <button onclick="resetBasePrompt()" class="px-3 py-1 text-[0.75rem] bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Reset</button>
                    </div>
                </div>
                <textarea id="editor-base-prompt" rows="6" class="form-control text-[0.85rem] font-mono mt-1 p-2 w-full border border-blue-200" placeholder="Loading..."></textarea>
                <div class="text-[0.7rem] text-blue-400 mt-1">Saved to server — persists across restarts. Edit here and click Save.</div>
            </div>

            <!-- Summary Rules (also saveable to server file) -->
            <div class="form-group border border-yellow-200 rounded-lg p-3 bg-[#fffde7]">
                <div class="flex items-center justify-between mb-1 flex-wrap gap-2">
                    <label class="font-semibold">Summary Rules <span class="text-[0.7rem] font-normal text-gray-500">(appended when "Use Summary Rules" is on)</span></label>
                    <div class="flex items-center gap-2">
                        <span id="rules-status" class="text-[0.7rem] text-gray-400"></span>
                        <button onclick="saveRulesToServer()" class="px-3 py-1 text-[0.75rem] bg-yellow-600 text-white rounded hover:bg-yellow-700 font-semibold">Save to Server</button>
                    </div>
                </div>
                <textarea id="editor-summary-rules" rows="14" class="form-control text-[0.85rem] border-[#fbc02d] mt-1 p-2 w-full" oninput="updateSummaryRules(this.value)" placeholder="Persistent rules sent as system instructions to the AI...">${summaryRulesValue}</textarea>
                <div class="text-[0.7rem] text-[#999] mt-1">Also auto-saved locally with your session. Click "Save to Server" to persist permanently.</div>
            </div>
        </div>

        <div class="mt-6 pt-4.5 border-t border-[#e5e7eb]">
            <label class="font-bold block mb-1">Selected Content</label>
            <p class="text-[0.8rem] text-[#666] mb-3">Filled from each tab’s “Select” button, or from the Grammarly box above via Apply to Selected.</p>
            <div class="grid grid-cols-2 gap-3.5">
                ${selectedSummaryHtml}
            </div>
        </div>

        <div class="mt-5 pt-4.5 border-t border-[#e5e7eb]">
            <label class="font-bold block mb-2.5">Closing line (before Jessica)</label>
            <select id="editor-greeting-select" class="form-control max-w-130 p-2 mb-2" onchange="updateSelectedGreeting(this.value)">
                ${greetingOptionsHtml}
            </select>
            <div class="flex flex-wrap items-center gap-2 mt-1">
                <input type="text" id="custom-greeting-input" class="form-control flex-1 min-w-50 text-[0.9rem] p-2" placeholder="Add a new ending, e.g. Stay safe out there,">
                <button type="button" class="btn btn-secondary btn-sm" onclick="addCustomGreetingEnding()">Add ending</button>
            </div>
            ${customGreetingsListHtml}
            <div class="text-[0.8rem] text-[#666] mt-2">Used in Confirmation as: …summary… then this line, then Jessica. Saved with your session.</div>
        </div>`;
    const templateEl = document.getElementById('editor-template');
    if (templateEl) templateEl.value = templateValue || '';
    const listEl = document.getElementById('editor-articles-list');
    if (listEl && typeof getSummaryArticlesForCategory === 'function') {
        const catArticles = getSummaryArticlesForCategory(currentEditorTab);
        const listHtml = catArticles.length
            ? catArticles.map((a, i) => {
                const title = escapeHtml(a.title || 'Untitled');
                const url = escapeHtml(a.url || '');
                const date = escapeHtml(a.date || '');
                return `<div class="py-2 border-b border-[#eee]">
                    <div class="font-semibold">${i + 1}. ${title}</div>
                    ${date ? `<div class="text-[0.75rem] text-[#777]">${date}</div>` : ''}
                    ${url ? `<a href="${url}" target="_blank" class="text-[0.78rem] break-all">${url}</a>` : '<span class="text-muted">No URL</span>'}
                </div>`;
            }).join('')
            : '<span class="text-muted">No articles picked for ' + currentEditorTab + '.</span>';
        listEl.innerHTML = '<label class="font-semibold">Picked in Article View for ' + currentEditorTab + '</label><div class="max-h-70 overflow-y-auto mt-1.5 leading-[1.4]">' + listHtml + '</div><div class="text-[0.7rem] text-[#999] mt-1">Uses pick-order box and rank values in the ' + currentEditorTab + ' column.</div>';
    }
    applyBasePromptToEditor();
};

function applyBasePromptToEditor() {
    const el = document.getElementById('editor-base-prompt');
    if (!el) return;
    if (cachedBasePrompt !== null) {
        el.value = cachedBasePrompt;
    }
    loadBasePromptFromServer();
}

window.updateSummaryRules = (value) => {
    newsletterContent.summaryRules = value || DEFAULT_SUMMARY_RULES;
    saveState();
};

// ── Base prompt & rules — server-side save/load ───────────────────────────────
async function loadBasePromptFromServer() {
    const el = document.getElementById('editor-base-prompt');
    const status = document.getElementById('base-prompt-status');
    if (!el) return;
    if (cachedBasePrompt !== null) {
        el.value = cachedBasePrompt;
    }
    try {
        const res = await fetch('/api/articles/summary-base-prompt');
        const data = await res.json();
        cachedBasePrompt = data.prompt || '';
        el.value = cachedBasePrompt;
        if (status) status.textContent = 'Loaded from server';
    } catch (e) {
        if (status) status.textContent = 'Could not load';
        if (cachedBasePrompt === null) el.value = '';
    }
}

window.saveBasePrompt = async () => {
    const el = document.getElementById('editor-base-prompt');
    const status = document.getElementById('base-prompt-status');
    if (!el) return;
    try {
        if (status) status.textContent = 'Saving…';
        const res = await fetch('/api/articles/summary-base-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: el.value }),
        });
        const data = await res.json();
        if (data.ok) cachedBasePrompt = el.value;
        if (status) status.textContent = data.ok ? '✓ Saved' : '✗ Error';
    } catch (e) {
        if (status) status.textContent = '✗ Save failed';
    }
};

window.resetBasePrompt = async () => {
    if (!confirm('Reset base prompt to the original default?')) return;
    const defaultPrompt = `You are a professional newsletter editor. Create a newsletter-ready summary for the provided category articles only.\n\nWrite exactly 6 to 7 short lines total.\nEach line should be concise, natural, and publication-ready.\nOnly use the fetched article content and article metadata provided by the user.\nDo not use outside knowledge.\nDo not mention URLs in the output.\nFocus on the most important developments across the provided articles for the selected category.\nNever say a link could not be accessed. Summarize every fetched article.`;
    const el = document.getElementById('editor-base-prompt');
    if (el) el.value = defaultPrompt;
    cachedBasePrompt = defaultPrompt;
    await window.saveBasePrompt();
};

window.saveRulesToServer = async () => {
    const el = document.getElementById('editor-summary-rules');
    const status = document.getElementById('rules-status');
    if (!el) return;
    try {
        if (status) status.textContent = 'Saving…';
        const res = await fetch('/api/articles/summary-rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rules: el.value }),
        });
        const data = await res.json();
        if (status) status.textContent = data.ok ? '✓ Saved to server' : '✗ Error';
    } catch (e) {
        if (status) status.textContent = '✗ Save failed';
    }
};

window.updateTemplate = (category, value) => {
    if (!newsletterContent.templates) newsletterContent.templates = {
        MED: '',
        THC: '',
        CBD: '',
        INV: '',
    };
    newsletterContent.templates[category] = value;
    saveState();
};

window.uploadSingleTemplate = () => {
    const input = document.getElementById('template-single-input');
    const category = currentEditorTab;
    const statusEl = document.getElementById('template-status');
    if (!input || !input.files || !input.files[0]) return alert('Choose an HTML file first.');
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
        if (!newsletterContent.templates) newsletterContent.templates = {
            MED: '',
            THC: '',
            CBD: '',
            INV: '',
        };
        newsletterContent.templates[category] = reader.result;
        saveState();
        input.value = '';
        if (statusEl) statusEl.textContent = `Template for ${category} uploaded.`;
        const ta = document.getElementById('editor-template');
        if (ta && currentEditorTab === category) ta.value = reader.result;
    };
    reader.readAsText(file);
};

window.uploadAllTemplates = () => {
    const input = document.getElementById('template-batch-input');
    const statusEl = document.getElementById('template-status');
    if (!input || !input.files || input.files.length !== 4) {
        return alert('Select exactly 4 HTML files (in order: MED, THC, CBD, INV).');
    }
    const categories = ['MED', 'THC', 'CBD', 'INV'];
    if (!newsletterContent.templates) newsletterContent.templates = {
        MED: '',
        THC: '',
        CBD: '',
        INV: '',
    };
    let loaded = 0;
    const done = () => {
        loaded++;
        if (loaded === 4) {
            saveState();
            input.value = '';
            if (statusEl) statusEl.textContent = 'All 4 templates uploaded (MED, THC, CBD, INV).';
            const ta = document.getElementById('editor-template');
            if (ta && newsletterContent.templates && newsletterContent.templates[currentEditorTab]) {
                ta.value = newsletterContent.templates[currentEditorTab];
            }
        }
    };
    for (let i = 0; i < 4; i++) {
        const file = input.files[i];
        const cat = categories[i];
        const reader = new FileReader();
        reader.onload = () => {
            newsletterContent.templates[cat] = reader.result;
            done();
        };
        reader.readAsText(file);
    }
};

// Store modal state globally to avoid onclick parameter issues
let currentManualContentState = null;
let currentMultiManualContentState = null;

// Manual content cache (by article URL)
let manualContentCache = (() => {
    try {
        return JSON.parse(localStorage.getItem('manual_article_content_cache') || '{}');
    } catch {
        return {};
    }
})();

window.saveCachedContent = (url, content) => {
    if (url && content.trim()) {
        manualContentCache[url] = content.trim();
        localStorage.setItem('manual_article_content_cache', JSON.stringify(manualContentCache));
    }
};

window.forceManualContentModal = (category) => {
    const articlesEl = document.getElementById('editor-summary-articles');
    const articlesText = articlesEl ? articlesEl.value.trim() : '';
    const categoryArticles = getSummaryArticlesForCategory(category, articlesText);
    
    if (categoryArticles.length === 0) {
        alert('No articles selected to provide text for.');
        return;
    }

    const unreadableArticles = categoryArticles.map((article, idx) => ({
        ...article,
        index: idx + 1
    }));

    const isUseRules = getUseRulesForCategory(category);
    const summaryRules = isUseRules ? normalizeSummaryRules(newsletterContent.summaryRules) : '';

    showManualContentModal(category, unreadableArticles, categoryArticles, isUseRules, summaryRules);
};

window.getCachedContent = (url) => {
    // This is kept for backward compatibility to read old cache, but we now prefer article.manualContent
    return manualContentCache[url] || null;
};

function articleUrlLinkHtml(url) {
    const href = String(url || '').trim();
    if (!href) return '';
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-700 underline break-all">${escapeHtml(href)}</a>`;
}

window.showManualContentModal = (category, unreadableArticles, allArticles, isUseRules, summaryRules) => {
    pruneMismatchedManualContent();
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-[rgba(22,34,30,0.5)] z-[2000] flex items-center justify-center p-4 backdrop-blur-md';
    modal.id = 'manual-content-modal';
    modal.onclick = (e) => e.target === modal && closeManualContentModal();

    let html = `
        <div onclick="event.stopPropagation()" class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-lg">
            <h2 class="text-xl font-bold mb-4">Missing Article Content</h2>
            <p class="text-sm text-gray-600 mb-4">${unreadableArticles.length} article(s) couldn't be fetched. Please paste their content below:</p>
    `;

    unreadableArticles.forEach((article, idx) => {
        const actualArticle = articles.find(a => a.url === article.url) || article;
        const paste = manualPasteState(actualArticle);
        const hasContent = paste.status === 'ok';
        const mismatchNote = paste.status === 'mismatch'
            ? '<p class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-2">Saved text was for a different article. Paste this article here.</p>'
            : '';
        html += `
            <div class="mb-6 pb-4 border-b border-gray-200">
                <div class="flex items-center gap-2 mb-2">
                    <h3 class="font-semibold text-sm">${article.index}. ${escapeHtml(article.title)}</h3>
                    ${hasContent ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Text Provided</span>' : ''}
                </div>
                <p class="text-xs text-gray-500 mb-2">${articleUrlLinkHtml(article.url)}</p>
                ${mismatchNote}
                <textarea id="manual-content-${idx}" placeholder="Paste article content here..." class="w-full h-32 p-2 border border-gray-300 rounded text-sm font-mono resize-none">${escapeHtml(paste.text)}</textarea>
            </div>
        `;
    });

    html += `
        <div class="flex gap-3 justify-end">
            <button onclick="closeManualContentModal()" class="btn btn-secondary px-4 py-2">Cancel</button>
            <button onclick="submitManualContent()" class="btn btn-primary px-4 py-2">Generate with Manual Content</button>
        </div>
    `;

    modal.innerHTML = html;

    // Store state in global variable
    currentManualContentState = {
        category,
        unreadableArticles,
        allArticles,
        isUseRules,
        summaryRules,
        modal
    };

    document.body.appendChild(modal);
};

window.closeManualContentModal = () => {
    const modal = document.getElementById('manual-content-modal');
    if (modal) modal.remove();
    currentManualContentState = null;
};

// Text of the "articles to summarize" box for a category, from persisted state
// (not the DOM, which only ever reflects the currently active tab). Detects
// leftover text from a previous week (none of its URLs match any currently
// picked article) and rebuilds it from the current picks before use, so a
// stale box can't get sent to the AI. Any overlap is left untouched so manual
// edits to the current picks' text aren't clobbered.
function getArticlesTextForCategory(category) {
    const content = newsletterContent[category];
    if (!content) return '';
    const synced = mergeArticlesOnlyBlock(category, content.summaryArticlesText) || buildArticlesOnlyBlock(category) || '';
    if (content.summaryArticlesText !== synced) {
        content.summaryArticlesText = synced;
        if (currentEditorTab === category) {
            const articlesEl = document.getElementById('editor-summary-articles');
            if (articlesEl) articlesEl.value = synced;
        }
        saveState();
    }
    return (content.summaryArticlesText || '').trim();
}

function getUseRulesForCategory(category) {
    const content = newsletterContent[category];
    return content ? content.useRules !== false : true;
}

// Builds the manualContent map (index -> text) from whatever content each
// article already has saved (article.manualContent or the local cache).
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

function getStoredManualText(article) {
    return String((article && article.manualContent) || getCachedContent(article && article.url) || '').trim();
}

// Pasted text is stored on the article object. An earlier index-based save put
// the burning-mouth article onto the SFGate row. Move matching text onto the
// right article and drop text that does not belong.
function pruneMismatchedManualContent() {
    (articles || []).forEach((article) => {
        const text = String(article.manualContent || '').trim();
        if (!text) return;
        if (contentMatchesArticleTitle(article.title, text)) return;
        const owner = (articles || []).find((other) => (
            other !== article && contentMatchesArticleTitle(other.title, text)
        ));
        if (owner && !String(owner.manualContent || '').trim()) {
            owner.manualContent = text;
        }
        delete article.manualContent;
        if (article.url && getCachedContent(article.url) === text) {
            try {
                delete manualContentCache[article.url];
                localStorage.setItem('manual_article_content_cache', JSON.stringify(manualContentCache));
            } catch (_) { /* ignore cache write errors */ }
        }
    });
}

function manualPasteState(article) {
    const text = getStoredManualText(article);
    if (!text) return { text: '', status: 'empty' };
    if (contentMatchesArticleTitle(article.title, text)) {
        return { text, status: 'ok' };
    }
    return { text: '', status: 'mismatch' };
}

function summaryDraftLooksIncomplete(text) {
    const t = String(text || '').toLowerCase();
    return /could not be accessed|couldn't be accessed|could not access|wouldn't load|would not load|did not load|could not summarize|couldn't summarize|send me the text|run (this|it) again|link did not load/.test(t);
}

function unreadablePicksForModal(categoryArticles) {
    return (categoryArticles || [])
        .map((article, idx) => ({
            ...article,
            index: idx + 1,
            title: article.title || '',
            url: article.url || '',
            date: article.date || '',
        }))
        .filter((article) => {
            const text = getStoredManualText(article);
            return !text || !contentMatchesArticleTitle(article.title, text);
        });
}

function buildManualContentMap(categoryArticles) {
    const manualContent = {};
    categoryArticles.forEach((article, index) => {
        const text = getStoredManualText(article);
        if (!text || !contentMatchesArticleTitle(article.title, text)) return;
        manualContent[index] = text;
        if (article.url) manualContent[article.url] = text;
    });
    return manualContent;
}

// Single shared network call used by both the per-category "Generate Summary"
// button and the "Summarize All" flow, so manual-content handling can't drift
// between the two paths.
async function requestCategorySummary(category, categoryArticles, articlesText, isUseRules, summaryRules, confirmed = false, checkOnly = false) {
    const manualContent = buildManualContentMap(categoryArticles);
    const res = await fetch('/api/articles/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: `Category: ${category}\n\nArticles to summarize:\n\n${articlesText}`,
            useRules: isUseRules,
            summaryRules,
            category,
            articles: categoryArticles,
            manualContent,
            confirmed,
            checkOnly,
            model: document.getElementById('ai-model') ? document.getElementById('ai-model').value : '',
        }),
        timeout: 60000,
    });
    return res.json();
}

function getCreatedResultEl(category) {
    return document.getElementById(`editor-result-${category}`) || document.getElementById('editor-result');
}

function applyGeneratedResult(category, resultText) {
    const previous = (newsletterContent[category].result || '').trim();
    const next = resultText || '';
    newsletterContent[category].result = next;

    // Selected Content is what "Copy all 4" exports. Carry a fresh generation
    // through when Selected was never hand-edited (empty, same as the previous
    // generation, or still carrying a "link wouldn't load" draft), so the export
    // can't silently ship the older copy. Real Grammarly edits are left alone.
    const selected = getSelectedCategoryResults();
    const current = (selected[category] || '').trim();
    if (!current || current === previous || summaryDraftLooksIncomplete(current)) {
        selected[category] = next;
        refreshBulkOriginalFromSelected();
    }

    saveState();
    const resultEl = getCreatedResultEl(category);
    if (resultEl) resultEl.value = next;
    const selectedEl = document.getElementById(`editor-selected-${category}`);
    if (selectedEl) selectedEl.value = selected[category] || '';
}

// Keeps the "All four newsletters" Original box in step with Selected Content
// after a regeneration, so the box the admin copies isn't a stale snapshot.
function refreshBulkOriginalFromSelected() {
    const text = formatAllNewslettersForExport();
    newsletterContent.bulkOriginalText = text;
    const orig = document.getElementById('editor-bulk-paste');
    if (orig) orig.value = text;
}

window.submitManualContent = async () => {
    if (!currentManualContentState) {
        alert('Modal state lost. Please try again.');
        return;
    }

    const { category, unreadableArticles } = currentManualContentState;

    unreadableArticles.forEach((article, idx) => {
        const textarea = document.getElementById(`manual-content-${idx}`);
        if (textarea && textarea.value.trim()) {
            const content = textarea.value.trim();

            // Save directly to the article object in global state
            const actualArticle = articles.find(a => a.url === article.url);
            if (actualArticle) {
                actualArticle.manualContent = content;
            }

            // Also save to cache as fallback for other categories that might share this url
            saveCachedContent(article.url, content);
        }
    });

    saveState(); // Persist to newsletters.json
    closeManualContentModal();

    // Re-run generation now that manual content is saved on the articles.
    await generateSummary(category, true);
};

window.generateSummary = async (category, confirmed = false) => {
    pruneMismatchedManualContent();
    const articlesText = getArticlesTextForCategory(category);
    const isUseRules = getUseRulesForCategory(category);
    const summaryRules = isUseRules ? normalizeSummaryRules(newsletterContent.summaryRules) : '';
    const categoryArticles = getSummaryArticlesForCategory(category);
    const btnText = document.getElementById(`gen-btn-text-${category}`);

    if (!articlesText) return alert('Add articles in the middle box, or click Sync from Article View picks.');
    if (categoryArticles.length === 0) return alert(`No articles picked for ${category}. In Article View, enter a rank number for each article.`);

    if (btnText) btnText.textContent = 'Generating...';

    try {
        const data = await requestCategorySummary(category, categoryArticles, articlesText, isUseRules, summaryRules, confirmed);

        if (data.success) {
            applyGeneratedResult(category, data.resultText);
            if (summaryDraftLooksIncomplete(data.resultText)) {
                const missing = unreadablePicksForModal(categoryArticles);
                if (missing.length) {
                    showManualContentModal(category, missing, categoryArticles, isUseRules, summaryRules);
                }
            }
        } else if (data.needsManualContent && data.unreadableArticles) {
            // Show modal for unreadable articles
            showManualContentModal(category, data.unreadableArticles, categoryArticles, isUseRules, summaryRules);
        } else {
            alert('Generation failed: ' + (data.error || 'Unknown error') + (data.details ? '\n' + data.details : ''));
        }
    } catch (e) {
        console.error('Summary generation error:', e);
        const errMsg = e.message || 'Unknown error';
        alert(`Error generating summary: ${errMsg}\n\nYour manual edits are preserved. Check that:\n- API keys are configured\n- Articles are accessible\n- You have API credits remaining`);
    } finally {
        if (btnText) btnText.textContent = 'Generate Summary';
    }
};

// Generates summaries for all four categories in one go. Any articles that
// can't be fetched across ANY of the categories are collected into a single
// modal so the admin is asked once for everything that's missing, instead of
// being interrupted category-by-category.
async function runSummarizeAllPass(categories, confirmed = false) {
    pruneMismatchedManualContent();
    const btnText = document.getElementById('summarize-all-btn-text');
    if (btnText) btnText.textContent = 'Checking articles...';

    const pending = [];
    const skipped = [];

    try {
        for (const category of categories) {
            const articlesText = getArticlesTextForCategory(category);
            const isUseRules = getUseRulesForCategory(category);
            const summaryRules = isUseRules ? normalizeSummaryRules(newsletterContent.summaryRules) : '';
            const categoryArticles = getSummaryArticlesForCategory(category);

            if (!articlesText || categoryArticles.length === 0) {
                skipped.push(category);
                continue;
            }

            let data;
            try {
                data = await requestCategorySummary(category, categoryArticles, articlesText, isUseRules, summaryRules, confirmed, true);
            } catch (e) {
                console.error(`Summarize All check error for ${category}:`, e);
                skipped.push(`${category} (${e.message || 'request failed'})`);
                continue;
            }

            if (data.needsManualContent && data.unreadableArticles) {
                pending.push({ category, unreadableArticles: data.unreadableArticles, categoryArticles, isUseRules, summaryRules });
            } else if (!data.success) {
                skipped.push(`${category} (${data.error || 'unknown error'})`);
            }
        }

        if (pending.length > 0) {
            showMultiCategoryManualContentModal(pending, categories);
            return;
        }

        if (btnText) btnText.textContent = 'Summarizing All...';
        const succeeded = [];
        for (const category of categories) {
            if (skipped.includes(category) || skipped.some((s) => String(s).startsWith(`${category} (`))) continue;
            const articlesText = getArticlesTextForCategory(category);
            const isUseRules = getUseRulesForCategory(category);
            const summaryRules = isUseRules ? normalizeSummaryRules(newsletterContent.summaryRules) : '';
            const categoryArticles = getSummaryArticlesForCategory(category);
            if (!articlesText || categoryArticles.length === 0) continue;

            let data;
            try {
                data = await requestCategorySummary(category, categoryArticles, articlesText, isUseRules, summaryRules, confirmed, false);
            } catch (e) {
                console.error(`Summarize All error for ${category}:`, e);
                skipped.push(`${category} (${e.message || 'request failed'})`);
                continue;
            }

            if (data.success && data.resultText) {
                applyGeneratedResult(category, data.resultText);
                succeeded.push(category);
                if (summaryDraftLooksIncomplete(data.resultText)) {
                    const missing = unreadablePicksForModal(categoryArticles);
                    if (missing.length) {
                        pending.push({ category, unreadableArticles: missing, categoryArticles, isUseRules, summaryRules });
                    }
                }
            } else if (data.needsManualContent && data.unreadableArticles) {
                pending.push({ category, unreadableArticles: data.unreadableArticles, categoryArticles, isUseRules, summaryRules });
            } else {
                skipped.push(`${category} (${data.error || 'unknown error'})`);
            }
        }

        if (pending.length > 0) {
            showMultiCategoryManualContentModal(pending, categories);
            return;
        }

        let msg = '';
        if (succeeded.length) msg += `Generated: ${succeeded.join(', ')}.`;
        if (skipped.length) msg += `${msg ? '\n' : ''}Skipped: ${skipped.join(', ')}.`;
        alert(msg || 'Nothing to summarize.');
    } finally {
        if (btnText) btnText.textContent = 'Summarize All';
    }
}

window.summarizeAll = async () => {
    await runSummarizeAllPass(['MED', 'THC', 'CBD', 'INV']);
};

window.showMultiCategoryManualContentModal = (pending, generateCategories) => {
    pruneMismatchedManualContent();
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-[rgba(22,34,30,0.5)] z-[2000] flex items-center justify-center p-4 backdrop-blur-md';
    modal.id = 'multi-manual-content-modal';
    modal.onclick = (e) => e.target === modal && closeMultiManualContentModal();

    const totalCount = pending.reduce((sum, p) => sum + p.unreadableArticles.length, 0);

    let html = `
        <div onclick="event.stopPropagation()" class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-lg">
            <h2 class="text-xl font-bold mb-4">Missing Article Content</h2>
            <p class="text-sm text-gray-600 mb-4">${totalCount} article(s) across ${pending.length} newsletter(s) couldn't be fetched. Please paste their content below:</p>
    `;

    pending.forEach((entry, catIdx) => {
        html += `<h3 class="font-bold text-sm mt-5 mb-2 text-[#333]">${entry.category}</h3>`;
        entry.unreadableArticles.forEach((article, idx) => {
            const actualArticle = articles.find(a => a.url === article.url) || article;
            const paste = manualPasteState(actualArticle);
            const hasContent = paste.status === 'ok';
            const mismatchNote = paste.status === 'mismatch'
                ? '<p class="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-2">Saved text was for a different article. Paste this article here.</p>'
                : '';
            html += `
                <div class="mb-6 pb-4 border-b border-gray-200">
                    <div class="flex items-center gap-2 mb-2">
                        <h4 class="font-semibold text-sm">${article.index}. ${escapeHtml(article.title)}</h4>
                        ${hasContent ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Text Provided</span>' : ''}
                    </div>
                    <p class="text-xs text-gray-500 mb-2">${articleUrlLinkHtml(article.url)}</p>
                    ${mismatchNote}
                    <textarea id="manual-content-multi-${catIdx}-${idx}" placeholder="Paste article content here..." class="w-full h-32 p-2 border border-gray-300 rounded text-sm font-mono resize-none">${escapeHtml(paste.text)}</textarea>
                </div>
            `;
        });
    });

    html += `
        <div class="flex gap-3 justify-end">
            <button onclick="closeMultiManualContentModal()" class="btn btn-secondary px-4 py-2">Cancel</button>
            <button onclick="submitMultiManualContent()" class="btn btn-primary px-4 py-2">Generate with Manual Content</button>
        </div>
    `;

    modal.innerHTML = html;
    currentMultiManualContentState = {
        pending,
        generateCategories: generateCategories || pending.map((p) => p.category),
    };
    document.body.appendChild(modal);
};

window.closeMultiManualContentModal = () => {
    const modal = document.getElementById('multi-manual-content-modal');
    if (modal) modal.remove();
    currentMultiManualContentState = null;
    const btnText = document.getElementById('summarize-all-btn-text');
    if (btnText) btnText.textContent = 'Summarize All';
};

window.submitMultiManualContent = async () => {
    if (!currentMultiManualContentState) {
        alert('Modal state lost. Please try again.');
        return;
    }
    const { pending, generateCategories } = currentMultiManualContentState;

    pending.forEach((entry, catIdx) => {
        entry.unreadableArticles.forEach((article, idx) => {
            const textarea = document.getElementById(`manual-content-multi-${catIdx}-${idx}`);
            if (textarea && textarea.value.trim()) {
                const content = textarea.value.trim();
                const actualArticle = articles.find(a => a.url === article.url);
                if (actualArticle) actualArticle.manualContent = content;
                saveCachedContent(article.url, content);
            }
        });
    });

    saveState();
    const modal = document.getElementById('multi-manual-content-modal');
    if (modal) modal.remove();
    currentMultiManualContentState = null;

    const retryCats = (generateCategories && generateCategories.length)
        ? generateCategories
        : pending.map((p) => p.category);
    await runSummarizeAllPass(retryCats, true);
};

window.updateSummary = (category, index, field, value) => {
    if (newsletterContent[category].summaries && newsletterContent[category].summaries[index]) {
        newsletterContent[category].summaries[index][field] = value;
        saveState();
    }
};

window.updateNewsletterContent = (category, field, value) => {
    newsletterContent[category][field] = value;
    saveState();
};

function getCustomGreetings() {
    if (!Array.isArray(newsletterContent.customGreetings)) {
        newsletterContent.customGreetings = [];
    }
    return newsletterContent.customGreetings;
}

function getAllGreetingOptions() {
    const custom = getCustomGreetings();
    const merged = [...GREETING_OPTIONS];
    custom.forEach((g) => {
        const text = String(g || '').trim();
        if (text && !merged.includes(text)) merged.push(text);
    });
    const selected = newsletterContent.selectedGreeting || DEFAULT_GREETING;
    if (selected && !merged.includes(selected)) merged.push(selected);
    return merged.sort((a, b) => a.localeCompare(b));
}

const GREETING_DATES = {
    'I hope you have a productive week!': '03-30-2026',
    'Thanks and have an amazing week!': '04-13-2026',
    'Happy 420,': '04-27-2026',
    'Have a magnificent week!': '05-02-2026',
    'Have a dynamite week!': '05-18-2026',
    'Have a brilliant week!': '05-25-2026',
    'I hope you had a great Memorial Day!': '05-26-2026',
    'Have a relaxing week,': '06-02-2026',
    'Have a fantastic week and stay safe,': '06-21-2026',
    'Have a wonderful week!': '06-29-2026'
};

function buildGreetingOptionsHtml(selectedGreeting) {
    const selected = selectedGreeting || DEFAULT_GREETING;
    return getAllGreetingOptions().map((greeting) => {
        const dateStr = GREETING_DATES[greeting] ? ` (${GREETING_DATES[greeting]})` : '';
        return `
        <option value="${escapeHtml(greeting)}" ${greeting === selected ? 'selected' : ''}>${escapeHtml(greeting)}${dateStr}</option>
        `;
    }).join('');
}

window.updateSelectedGreeting = (value) => {
    newsletterContent.selectedGreeting = value || DEFAULT_GREETING;
    saveState();
};

window.addCustomGreetingEnding = () => {
    const input = document.getElementById('custom-greeting-input');
    if (!input) return;
    const value = input.value.trim();
    if (!value) return alert('Enter a closing line to add (the line above “Jessica”).');
    const custom = getCustomGreetings();
    if (!custom.includes(value)) custom.push(value);
    newsletterContent.selectedGreeting = value;
    input.value = '';
    saveState();
    renderEditorContent();
};

window.removeCustomGreetingEnding = (value) => {
    const text = String(value || '').trim();
    if (!text) return;
    newsletterContent.customGreetings = getCustomGreetings().filter((g) => g !== text);
    if (newsletterContent.selectedGreeting === text) {
        newsletterContent.selectedGreeting = DEFAULT_GREETING;
    }
    saveState();
    renderEditorContent();
};

window.selectGeneratedContent = (category) => {
    const resultEl = getCreatedResultEl(category);
    const generatedText = resultEl ? resultEl.value.trim() : ((newsletterContent[category] && newsletterContent[category].result) || '').trim();

    if (!generatedText) {
        return alert(`No generated ${category} content to select yet.`);
    }

    const selectedResults = getSelectedCategoryResults();
    selectedResults[category] = generatedText;
    saveState();
    renderEditorContent();
};

window.updateSelectedCategoryResult = (category, value) => {
    const selectedResults = getSelectedCategoryResults();
    selectedResults[category] = value;
    saveState();
};

window.copyEditorContent = (category) => {
    const content = newsletterContent[category];
    const text = content.result || content.prompt || '';

    if (!text.trim()) return alert('Nothing to copy yet.');

    navigator.clipboard.writeText(text).then(() => {
        alert(`${category} content copied to clipboard!`);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
};

function renderEditorView() {
    restoreBulkWorkflowUi();
    switchEditorTab(currentEditorTab);
}

// --- STEP 6: CONFIRMATION ---

function renderConfirmationView() {
    const summary = document.getElementById('confirmation-summary');
    if (!summary) return;

    const newsletterNameInput = document.getElementById('newsletter-name');
    const activeNewsletterName = currentSessionName || (newsletterNameInput ? newsletterNameInput.value.trim() : '') || 'Newsletter';

    // Calculate stats from the same category-selection logic used in the app
    const stats = {
        MED: getArticlesForCategory('MED').length,
        THC: getArticlesForCategory('THC').length,
        CBD: getArticlesForCategory('CBD').length,
        INV: getArticlesForCategory('INV').length,
        COOL_FINDS: articles.filter(a => a.status === 'COOL FINDS').length,
    };
    const generatedSubjects = newsletterContent.generatedSubjects || {
        MED: '',
        THC: '',
        CBD: '',
        INV: '',
    };
    const subjectPrompt = normalizeSubjectPrompt(newsletterContent.subjectPrompt);

    summary.innerHTML =
        `<h3>Newsletter Summary</h3>
        <p><strong>Newsletter Name:</strong> ${activeNewsletterName}</p>
        <p><strong>Inspirational Images:</strong> ${inspirationalImages.length} selected</p>
        <div class="grid grid-cols-5 gap-2.5 mt-4">
            <div class="bg-[#e3f2fd] p-4 rounded-lg text-center">
                <strong class="block text-[1.2rem] text-[#0d47a1]">MED</strong>
                <span>${stats.MED} Articles</span>
            </div>
            <div class="bg-[#e8f5e9] p-4 rounded-lg text-center">
                <strong class="block text-[1.2rem] text-[#1b5e20]">THC</strong>
                <span>${stats.THC} Articles</span>
            </div>
            <div class="bg-[#fff3e0] p-4 rounded-lg text-center">
                <strong class="block text-[1.2rem] text-[#e65100]">CBD</strong>
                <span>${stats.CBD} Articles</span>
            </div>
            <div class="bg-[#f3e5f5] p-4 rounded-lg text-center">
                <strong class="block text-[1.2rem] text-[#4a148c]">INV</strong>
                <span>${stats.INV} Articles</span>
            </div>
            <div class="bg-[#e0f7fa] p-4 rounded-lg text-center">
                <strong class="block text-[1.2rem] text-[#006064]">COOL</strong>
                <span>${stats.COOL_FINDS} Finds</span>
            </div>
        </div>
        <div class="mt-5.5 p-4 border border-[#e5e7eb] rounded-[10px] bg-[#fafafa]">
            <div class="flex justify-between items-start gap-4 flex-wrap mb-3">
                <div>
                    <div class="text-[1rem] font-bold mb-1">Subject Generator</div>
                    <div class="text-[0.82rem] text-[#666]">Uses articles listed in the pick-order boxes on Article View (comma-separated rank numbers from each column).</div>
                </div>
                <div class="flex gap-2.5 flex-wrap">
                    <button id="btn-generate-subjects" class="btn btn-primary btn-sm" onclick="generateAllSubjects()"><span id="btn-generate-subjects-text">Generate Subjects</span></button>
                    <button class="btn btn-outline btn-sm" type="button" onclick="pushStateToServer()" title="Save the subject prompt and generated subjects to Supabase">Push To Server</button>
                </div>
            </div>
            <textarea class="form-control mb-3 text-[0.9rem] p-2" rows="3" oninput="updateSubjectPrompt(this.value)">${escapeHtml(subjectPrompt)}</textarea>
            <div class="grid grid-cols-2 gap-3">
                ${['MED', 'THC', 'CBD', 'INV'].map((cat) => `
                    <div class="p-3 border border-[#e5e7eb] rounded-lg bg-white">
                        <div class="flex justify-between items-center gap-2.5">
                            <strong>${cat}</strong>
                            <button class="btn btn-outline btn-sm" onclick="copyGeneratedSubject('${cat}')">Copy</button>
                        </div>
                        <textarea class="form-control text-[0.88rem] bg-white mt-2 p-2" rows="3" oninput="updateGeneratedSubject('${cat}', this.value)" placeholder="Generate a subject for ${cat}...">${escapeHtml(generatedSubjects[cat] || '')}</textarea>
                    </div>
                `).join('')}
            </div>
        </div>`;
    const uploadBtn = document.getElementById('btn-upload-newsletters');
    const exportGenBtn = document.getElementById('btn-export-generated');
    if (uploadBtn) uploadBtn.disabled = !lastGeneratedNewsletter;
    if (exportGenBtn) exportGenBtn.disabled = !lastGeneratedNewsletter;
    renderConfirmationPreviews();
}

function getActiveNewsletterName() {
    const newsletterNameInput = document.getElementById('newsletter-name');
    return currentSessionName || (newsletterNameInput ? newsletterNameInput.value.trim() : '') || 'Newsletter';
}

function getSelectedOrGeneratedSummary(category) {
    const selectedResults = getSelectedCategoryResults();
    return (selectedResults[category] || (newsletterContent[category] && newsletterContent[category].result) || '').trim();
}

function getSubjectArticlesForCategory(category) {
    return getArticlesByPickOrder(category).filter((a) => isCategoryRankIncluded(a, category));
}

const TEMPLATE_FIXED_CONTENT = {
    logoHref: 'http://www.purablis.com',
    logoSrc: 'https://purablis.com/Newsletter%20images/Purablis-newsletter-logo.png',
    youtubeHref: 'https://www.youtube.com/Purablis',
    youtubeIconSrc: 'https://cdn-images.mailchimp.com/icons/social-block-v2/outline-color-youtube-96.png',
    unsubscribeHref: 'https://ap.lovethelist.com/index.php/lists/qk5307z6w1e34/unsubscribe/unsubscribe-direct',
    contactEmail: 'news@lovethelist.com',
    footerAddress: 'Purablis Media · 177 Arana Dr. Martinez · CA, 94553 · USA',
    footerLegal: 'Copyright and image use not authorized. Please contact news@purabici.com for disputes or removal.',
};

function isIncludedInConfirmation(article) {
    return article.publishImage !== false;
}

function getMainArticlesForCategory(category) {
    return getArticlesByPickOrder(category).filter((a) => isCategoryRankIncluded(a, category));
}

function getInterestingFindsArticles() {
    return articles
        .filter(a => a.status === 'COOL FINDS')
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
}

function getDownloadSafeAssetUrl(url) {
    const value = (url || '').trim();
    if (!value) return '';
    if (/^data:/i.test(value)) return value;
    if (/^blob:/i.test(value)) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (/^\/\//.test(value)) return `${window.location.protocol}${value}`;
    if (value.startsWith('/')) return `${window.location.origin}${value}`;
    return value;
}

function isPublicHostedUrl(url) {
    const value = getDownloadSafeAssetUrl(url);
    if (!/^https:\/\//i.test(value)) return false;
    try {
        const hostname = new URL(value).hostname.toLowerCase();
        return hostname !== 'localhost' && hostname !== '127.0.0.1';
    } catch (e) {
        return false;
    }
}

function isPurablisUrl(url) {
    return Boolean(url && String(url).includes('purablis.com'));
}

function isAppStateIconUrl(url) {
    return Boolean(url && /\/(?:all\/states|state_icons_dark)\//i.test(String(url)));
}

function toAbsoluteAssetUrl(url) {
    const value = String(url || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
    if (value.startsWith('//')) return `${window.location.protocol}${value}`;
    if (value.startsWith('/') && typeof window !== 'undefined') {
        return `${window.location.origin}${value}`;
    }
    return value;
}

function unwrapPublishedResult(result) {
    return typeof result === 'string' ? result : (result && result.url) || '';
}

async function publishUrlToPurablis(url, target = 'article') {
    let absolute = url;
    if (absolute.startsWith('/') && !absolute.startsWith('//') && typeof window !== 'undefined') {
        absolute = window.location.origin + absolute;
    }
    const res = await fetch('/api/images/publish-to-purablis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: absolute, target }),
    });
    const data = await res.json();
    if (data.success && data.url) {
        return {
            url: data.url,
            previewUrl: data.url || data.configuredUrl || url,
            publicReachable: data.publicReachable,
            filename: data.filename,
        };
    }
    throw new Error(data.error || 'Publish failed');
}

function updateSelectedImageBox(index, { publishing = false } = {}) {
    const box = document.getElementById(`selected-img-${index}`);
    if (!box) return;
    const article = articles[index] || {};
    box.innerHTML = buildSelectedImageHtml(index, article, { publishing });
}

/** Preview, Confirmation, MailWizz — always public purablis (or other https CDN), never localhost proxy */
function getArticleImageUrl(article) {
    let url = resolvePurablisImageUrl(article);
    if (url && url.includes('purablis.com')) {
        const sep = url.includes('?') ? '&' : '?';
        url = `${url}${sep}v=${Date.now()}`;
    }
    return url;
}

function getArticleImageUrlForSend(article) {
    let url = resolvePurablisImageUrl(article);
    if (url && url.includes('purablis.com')) {
        const sep = url.includes('?') ? '&' : '?';
        url = `${url}${sep}v=${Date.now()}`;
    }
    return url;
}

function setArticleImageSrcWithFallback(imgEl, article, url) {
    if (!imgEl) return;
    let src = url || resolvePurablisImageUrl(article);
    if (!src) return;
    if (src.includes('purablis.com')) {
        const sep = src.includes('?') ? '&' : '?';
        src = `${src}${sep}v=${Date.now()}`;
    }
    const title = ((article && article.title) || 'Article image').slice(0, 120);
    imgEl.setAttribute('src', src);
    imgEl.setAttribute('alt', title);
    imgEl.setAttribute('width', '60');
    imgEl.setAttribute('class', 'mcnImage');
    imgEl.setAttribute(
        'style',
        'display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;max-width:60px;width:60px;height:auto;',
    );
    imgEl.removeAttribute('onerror');
}

// archive.today mirrors under several TLDs — all the same site, none of them reveal
// the real periodical in the hostname the way a normal news URL does.
const ARCHIVE_HOSTNAMES = ['archive.is', 'archive.ph', 'archive.today', 'archive.li', 'archive.vn', 'archive.fo', 'archive.md'];
function isArchiveUrl(url) {
    if (!url) return false;
    try {
        const hostname = new URL(url).hostname.replace(/^www\./i, '');
        return ARCHIVE_HOSTNAMES.includes(hostname);
    } catch (e) {
        return false;
    }
}

// Regex twin of isArchiveUrl used by unwrapArchivedArticleUrl to detect snapshot hosts.
function isArchiveSnapshotHost(hostname) {
    return /^archive\.(is|ph|today|li|md|vn|fo)$/i.test(String(hostname || '').replace(/^www\./i, ''));
}

// Tries to recover the original publisher URL embedded in an archive.is snapshot
// link (query ?url= or the URL embedded in the path). Returns the input unchanged
// when the snapshot doesn't expose the original.
function unwrapArchivedArticleUrl(url) {
    if (!url) return url;
    try {
        const parsed = new URL(url);
        if (!isArchiveSnapshotHost(parsed.hostname)) return url;

        const queryUrl = parsed.searchParams.get('url');
        if (queryUrl && /^https?:\/\//i.test(queryUrl)) {
            return queryUrl;
        }

        let path = parsed.pathname || '';
        try {
            path = decodeURIComponent(path);
        } catch (e) {
            // Keep the raw path if it is not URI-encoded.
        }

        const match = path.match(/https?:\/{1,2}\S+/i);
        if (!match) return url;

        const embedded = match[0].replace(/^(https?:\/)([^/])/i, '$1/$2');
        new URL(embedded);
        return embedded;
    } catch (e) {
        return url;
    }
}

function hostnameFromUrl(url) {
    try {
        return new URL(url).hostname.replace(/^www\./i, '');
    } catch (e) {
        return '';
    }
}

function getSourceLabel(articleOrUrl) {
    const isArticleObj = articleOrUrl && typeof articleOrUrl === 'object';
    const url = isArticleObj ? (articleOrUrl.url || '') : (articleOrUrl || '');
    const originalSourceUrl = isArticleObj ? (articleOrUrl.originalSourceUrl || '') : '';
    // The original (non-archived) URL, when we have one, always beats the archive.is
    // hostname — that's the whole point of asking for it.
    const originalHostname = originalSourceUrl ? hostnameFromUrl(originalSourceUrl) : '';
    if (originalHostname) return `More at ${originalHostname}...`;
    if (!url) return 'More at purablis.com...';
    // For archive.is snapshots with no stored originalSourceUrl, try to auto-recover
    // the publisher URL embedded in the snapshot link before falling back to the host.
    const resolvedUrl = isArchiveUrl(url) ? unwrapArchivedArticleUrl(url) : url;
    const hostname = hostnameFromUrl(resolvedUrl);
    return hostname ? `More at ${hostname}...` : 'More at source...';
}

// archive.is can't be scraped (no-scrape protection — confirmed it blocks even direct
// fetch tools), so there's no way to auto-resolve the real publisher URL. Opens the
// archive link so the user can read it, then asks them to paste the original article
// URL, which getSourceLabel uses to derive the real hostname for "More at ...".
window.promptArchiveOriginalUrl = (index) => {
    const article = articles[index];
    if (!article) return;
    window.open(article.url, '_blank', 'noopener');
    const value = window.prompt(
        'This is an archive.is link — paste the ORIGINAL article URL (the publisher\'s own link) so we can show the real source in "More at...":',
        article.originalSourceUrl || '',
    );
    if (value === null) return;
    const trimmed = value.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
        alert('That doesn\'t look like a URL (must start with http:// or https://). Not saved.');
        return;
    }
    articles[index].originalSourceUrl = trimmed;
    saveState();
    renderArticles();
};

function getInspirationalNewsletterUrl(itemOrUrl) {
    return getInspirationalDisplayUrl(itemOrUrl);
}

function chooseConfirmationInspirationalImage() {
    const available = inspirationalImages.map(getInspirationalNewsletterUrl).filter(Boolean);
    if (!available.length) {
        confirmationInspirationalImage = '';
        return '';
    }
    const selected = confirmationInspirationalImage ? getInspirationalNewsletterUrl(confirmationInspirationalImage) : '';
    if (selected && available.includes(selected)) {
        return selected;
    }
    return available[0];
}

async function loadConfirmationTemplate(category) {
    if (confirmationTemplateCache[category]) {
        return confirmationTemplateCache[category];
    }
    try {
        const res = await fetch(`/api/newsletters/template/${category}`);
        const html = await res.text();
        if (res.ok && html && html.trim().startsWith('<')) {
            confirmationTemplateCache[category] = html;
            return html;
        }
    } catch (error) {
        console.warn(`Could not load example template for ${category}:`, error);
    }

    if (newsletterContent.templates && newsletterContent.templates[category]) {
        confirmationTemplateCache[category] = newsletterContent.templates[category];
        return confirmationTemplateCache[category];
    }

    throw new Error(`Could not load ${category} template.`);
}

function buildFallbackConfirmationHtml(category) {
    const newsletterName = escapeHtml(getActiveNewsletterName());
    const summary = escapeHtml(getSelectedOrGeneratedSummary(category)).replace(/\n/g, '<br>');
    const weeklyHtml = getMainArticlesForCategory(category).map(article => {
        const title = escapeHtml(article.title || 'Untitled');
        const url = article.url || '#';
        const source = escapeHtml(getSourceLabel(article));
        const image = getArticleImageUrl(article);
        const imgTag = image && article.publishImage !== false
            ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(article.title || '')}" width="60" style="display:block;border:0;max-width:60px;width:60px;height:auto;object-fit:cover;border-radius:6px;">`
            : '';
        return `<div style="display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #eee;">
                ${imgTag}
                <div>
                    <a href="${url}" target="_blank" style="color: #111; font-weight: 700; text-decoration: none;">${title}</a>
                    <div><a href="${url}" target="_blank" style="color: #2a6edc; font-size: 0.85rem;">${source}</a></div>
                </div>
            </div>`;
    }).join('');
    const findsHtml = getInterestingFindsArticles().slice(0, 4).map(article => {
        const title = escapeHtml(article.title || 'Untitled');
        const url = article.url || '#';
        return `<li style="margin-bottom: 8px;"><a href="${url}" target="_blank">${title}</a></li>`;
    }).join('');
    const inspiration = chooseConfirmationInspirationalImage();
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${newsletterName} - ${category}</title></head><body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1>${newsletterName} - ${category}</h1>
        <p>${summary || 'No summary selected yet.'}</p>
        <h2>Weekly News</h2>
        ${weeklyHtml || '<p>No weekly news articles selected yet.</p>'}
        <h2>Interesting Finds</h2>
        <ul>${findsHtml || '<li>No interesting finds selected yet.</li>'}</ul>
        <h2>Inspiration</h2>
        ${inspiration ? `<img src="${inspiration}" alt="Inspiration" style="max-width: 100%;">` : '<p>No inspirational image selected yet.</p>'}
    </body></html>`;
}

function applySummaryToTemplate(doc, category) {
    const summaryText = getSelectedOrGeneratedSummary(category);
    const introCell = Array.from(doc.querySelectorAll('td, div, p')).find(el => (el.textContent || '').includes('Hi [FNAME],'));
    if (!introCell || !summaryText) return;
    const selectedGreeting = escapeHtml(newsletterContent.selectedGreeting || DEFAULT_GREETING);

    const lines = summaryText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => escapeHtml(line));

    introCell.innerHTML = `<span style="font-size: 14px; line-height: 150%; color: #000000;">Hi [FNAME],<br><br>${lines.join('<br>')}<br><br>${selectedGreeting}<br>Jessica<br><br>If this newsletter&#8217;s not for you, just <a href="${TEMPLATE_FIXED_CONTENT.unsubscribeHref}" style="color: #2baadf; text-decoration: underline;">unsubscribe</a> and you won&#8217;t hear from us again. :) </span><br />&nbsp;`;
}

function getGeneratedConfirmationHeading(category) {
    if (newsletterContent.generatedHeadings && newsletterContent.generatedHeadings[category]) {
        return newsletterContent.generatedHeadings[category];
    }
    return '';
}

function enforceFixedTemplateChrome(doc, category) {
    const logoLink = doc.querySelector('td.puralog_width a');
    if (logoLink) {
        logoLink.href = TEMPLATE_FIXED_CONTENT.logoHref;
        logoLink.target = '_blank';
    }
    const logoImg = doc.querySelector('img.puralogsize');
    if (logoImg) {
        logoImg.src = TEMPLATE_FIXED_CONTENT.logoSrc;
        logoImg.alt = 'Purablis Media';
    }

    const generatedHeading = getGeneratedConfirmationHeading(category);
    const headerTextCell = doc.querySelector('td.text strong');
    if (headerTextCell && generatedHeading) {
        headerTextCell.textContent = generatedHeading;
    }

    const youtubeLink = doc.querySelector('td.mcnFollowIconContent a');
    if (youtubeLink) {
        youtubeLink.href = TEMPLATE_FIXED_CONTENT.youtubeHref;
        youtubeLink.target = '_blank';
    }
    const youtubeImg = doc.querySelector('img.mcnFollowBlockIcon');
    if (youtubeImg) {
        youtubeImg.src = TEMPLATE_FIXED_CONTENT.youtubeIconSrc;
        youtubeImg.alt = 'YouTube';
    }

    const footerBlocks = Array.from(doc.querySelectorAll('table.footer td'));
    if (footerBlocks[0]) {
        footerBlocks[0].innerHTML =
            `<div><em>Copyright &copy; 2026 Purablis, All rights reserved.</em></div>
            <div>Email Contact:</div>
            <div><a href="mailto:${TEMPLATE_FIXED_CONTENT.contactEmail}" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; color: #0000f1; font-weight: normal; text-decoration: underline;" target="_blank">${TEMPLATE_FIXED_CONTENT.contactEmail}</a><br />
            <a href="${TEMPLATE_FIXED_CONTENT.unsubscribeHref}" style="color: #2baadf; text-decoration: underline;">Unsubscribe</a></div>
            <div>${escapeHtml(TEMPLATE_FIXED_CONTENT.footerAddress).replace(/·/g, '&middot;')}</div>`;
    }
    if (footerBlocks[1]) {
        footerBlocks[1].innerHTML = `<span style="font-size: 11px; line-height: 150%; color: #989898;">${escapeHtml(TEMPLATE_FIXED_CONTENT.footerLegal)}</span>`;
    }
}

function buildArticleTableHtml(sampleHtml, article) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = sampleHtml;
    const table = wrapper.firstElementChild;
    if (!table) return sampleHtml;

    const url = article.url || '#';
    const title = article.title || 'Untitled';
    const image = getArticleImageUrl(article);
    const sourceLabel = getSourceLabel(article);

    Array.from(table.querySelectorAll('a')).forEach(link => {
        link.href = url;
        link.setAttribute('target', '_blank');
    });

    const imageEl = table.querySelector('img.mcnImage, img');
    if (imageEl) {
        if (image && article.publishImage !== false) {
            setArticleImageSrcWithFallback(imageEl, article, image);
        } else {
            imageEl.removeAttribute('src');
            imageEl.style.display = 'none';
        }
    }

    const descEl = table.querySelector('.a-desc');
    if (descEl) {
        descEl.textContent = title;
    } else {
        const strongEl = table.querySelector('strong');
        if (strongEl) strongEl.textContent = title;
    }

    const sourceEl = table.querySelector('.cblue');
    if (sourceEl) {
        sourceEl.textContent = sourceLabel;
    }

    return table.outerHTML;
}

function findHeaderTableBounds(html, marker) {
    const markerIndex = html.indexOf(marker);
    if (markerIndex === -1) return null;
    const tableStart = html.lastIndexOf('<table', markerIndex);
    const tableEnd = html.indexOf('</table>', markerIndex);
    if (tableStart === -1 || tableEnd === -1) return null;
    return { start: tableStart, end: tableEnd + 8 };
}

function buildSummaryHtml(category) {
    const summaryText = getSelectedOrGeneratedSummary(category);
    if (!summaryText) return null;
    const selectedGreeting = escapeHtml(newsletterContent.selectedGreeting || DEFAULT_GREETING);
    const lines = summaryText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => escapeHtml(line));
    return `<div style="text-align: justify;">
            <span style="font-size: 14px; line-height: 150%; color: #000000;">
                Hi [FNAME],<br/>
                <br/>
                ${lines.join('<br />\n\t\t\t\t\t\t\t\t\t')}<br/>
                <br/>
                ${selectedGreeting}<br/>
                Jessica<br/>
                <br/>
                If this newsletter&#8217;s not for you, just <a href="${TEMPLATE_FIXED_CONTENT.unsubscribeHref}" style="color: #2baadf; text-decoration: underline;">unsubscribe</a> and you won&#8217;t hear from us again. :)
            </span><br/>
            &nbsp;
        </div>`;
}

function replaceArticleSection(html, startMarker, endMarker, articles) {
    const startBounds = findHeaderTableBounds(html, startMarker);
    const endBounds = findHeaderTableBounds(html, endMarker);
    if (!startBounds || !endBounds || endBounds.start <= startBounds.end) return html;

    const currentSection = html.slice(startBounds.end, endBounds.start);
    const sampleMatch = currentSection.match(/<table[^>]*class="mcnCaptionRightImageContentContainer"[\s\S]*?<\/table>/i);
    if (!sampleMatch) return html;

    const renderedTables = articles.map(article => buildArticleTableHtml(sampleMatch[0], article)).join('\n');
    return html.slice(0, startBounds.end) + '\n\n' + renderedTables + '\n\n' + html.slice(endBounds.start);
}

function renderTemplateHtml(category, templateHtml) {
    let html = templateHtml;
    const mainArticles = getMainArticlesForCategory(category);
    const findsArticles = getInterestingFindsArticles();
    const summaryHtml = buildSummaryHtml(category);

    if (summaryHtml) {
        html = html.replace(/<div style="text-align: justify;">[\s\S]*?&nbsp;\s*<\/div>/i, summaryHtml);
    }

    html = replaceArticleSection(html, 'Weekly News', 'Interesting Finds', mainArticles);
    html = replaceArticleSection(html, 'Interesting Finds', 'Inspiration', findsArticles);

    const inspirationImage = chooseConfirmationInspirationalImage();
    if (inspirationImage) {
        html = html.replace(/(<a[^>]*target="_blank"[^>]*title="">\s*<img alt="Inspiration" class="mcnImage2" src=")([^"]*)(")/i, `$1${inspirationImage}$3`);
    }

    html = html.replace(/<a href="http:\/\/www\.purablis\.com" target="_blank"><img alt="" class="puralogsize" src="[^"]*" \/><\/a>/i, `<a href="${TEMPLATE_FIXED_CONTENT.logoHref}" target="_blank"><img alt="" class="puralogsize" src="${TEMPLATE_FIXED_CONTENT.logoSrc}" /></a>`);
    html = html.replace(/<a href="https:\/\/www\.youtube\.com\/Purablis"[\s\S]*?<img alt="YouTube" class="mcnFollowBlockIcon" src="[^"]*"[\s\S]*?<\/a>/i, `<a href="${TEMPLATE_FIXED_CONTENT.youtubeHref}" style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;" target="_blank"><img alt="YouTube" class="mcnFollowBlockIcon" src="${TEMPLATE_FIXED_CONTENT.youtubeIconSrc}" style="width: 30px; max-width: 30px; display: block; border: 0; height: auto; outline: none; text-decoration: none;-ms-interpolation-mode: bicubic;" width="30" /></a>`);
    html = html.replace(/<a href="https:\/\/ap\.lovethelist\.com\/index\.php\/lists\/qk5307z6w1e34\/unsubscribe\/unsubscribe-direct" style="color: #2baadf; text-decoration: underline;">unsubscribe<\/a>/i, `<a href="${TEMPLATE_FIXED_CONTENT.unsubscribeHref}" style="color:#2baadf;text-decoration:underline;">unsubscribe</a>`);
    html = html.replace(/<a href="https:\/\/ap\.lovethelist\.com\/index\.php\/lists\/qk5307z6w1e34\/unsubscribe\/unsubscribe-direct" style="color: #2baadf; text-decoration: underline;">Unsubscribe<\/a>/i, `<a href="${TEMPLATE_FIXED_CONTENT.unsubscribeHref}" style="color:#2baadf;text-decoration:underline;">Unsubscribe</a>`);

    const generatedHeading = getGeneratedConfirmationHeading(category);
    if (generatedHeading) {
        html = html.replace(/(<td class="text"[^>]*><strong>)([\s\S]*?)(<\/strong><\/td>)/i, `$1${escapeHtml(generatedHeading)}$3`);
    }

    return html;
}

async function buildConfirmationHtml(category) {
    try {
        const templateHtml = await loadConfirmationTemplate(category);
        const rendered = renderTemplateHtml(category, templateHtml);
        confirmationRenderedHtml[category] = rendered;
        return rendered;
    } catch (error) {
        console.error(`Failed to build ${category} confirmation HTML:`, error);
        const fallbackHtml = buildFallbackConfirmationHtml(category);
        confirmationRenderedHtml[category] = fallbackHtml;
        return fallbackHtml;
    }
}

window.switchConfirmationTab = (category) => {
    currentConfirmationTab = category;
    renderConfirmationPreviews();
};

window.downloadConfirmationHtml = async (category) => {
    const zip = new JSZip();
    const filename =
        `${getActiveNewsletterName().replace(/[^\w\-]+/g, '-') || 'newsletter'}-${category}`;
    zip.file(
        `${filename}.html`,
        confirmationRenderedHtml[category] || await buildConfirmationHtml(category),
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await zip.generateAsync({ type: 'blob' }));
    a.download = `${filename}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.downloadConfirmationDoc = async (category) => {
    const html = confirmationRenderedHtml[category] || await buildConfirmationHtml(category);
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getActiveNewsletterName().replace(/[^\w\-]+/g, '-') || 'newsletter'}-${category}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

async function renderConfirmationPreviews() {
    const container = document.getElementById('confirmation-previews');
    if (!container) return;

    const statusEl = document.getElementById('public-image-status');
    if (statusEl) statusEl.textContent = 'Linking images on purablis.com…';
    try {
        repairMisplacedPurablisImageUrls();
        inferPublicImageSettingsFromArticles();
        const resolved = await ensureConfirmationPurablisUrls();
        if (statusEl && resolved.checked) {
            statusEl.textContent = `${resolved.reachable}/${resolved.checked} images on purablis.com`;
        }
    } catch (e) {
        console.warn('ensureConfirmationPurablisUrls:', e);
        syncArticleImageFieldsFromPublished();
        if (statusEl) statusEl.textContent = 'Using local image URLs (server check failed)';
    }

    // const selectedSummary = getSelectedOrGeneratedSummary(currentConfirmationTab);
    const admonition =
        getHeadlineFormatAdmonition(
            articles
                .filter(a =>
                    a.categories.includes(currentConfirmationTab) &&
                    a.publishImage &&
                    ['Y', 'YM', 'COOL FINDS', 'LATER COOL'].includes(a.status),
                ).map(a => a.title),
        );
    container.innerHTML =
        `<div class="tabs-container mb-4.5 border-b border-[#ddd]">
            <button
                class="tab-btn ${currentConfirmationTab === 'MED' ? 'active' : ''}"
                onclick="switchConfirmationTab('MED')">
                MED
            </button>
            <button
                class="tab-btn ${currentConfirmationTab === 'THC' ? 'active' : ''}"
                onclick="switchConfirmationTab('THC')">
                THC
            </button>
            <button
                class="tab-btn ${currentConfirmationTab === 'CBD' ? 'active' : ''}"
                onclick="switchConfirmationTab('CBD')">
                CBD
            </button>
            <button
                class="tab-btn ${currentConfirmationTab === 'INV' ? 'active' : ''}"
                onclick="switchConfirmationTab('INV')">
                INV
            </button>
        </div>
        <div class="flex justify-between items-start gap-4 flex-wrap mb-3.5">
            <div>
                <div>
                    <span class="text-base font-bold">${currentConfirmationTab} Preview</span>
                    <span class="text-base font-bold text-[${admonition.color}]"><b>${admonition.symbol}</b></span>
                </div>
                <span class="text-sm text-[${admonition.color}] mt-1">${admonition.message}</span>
            </div>
            <div class="flex gap-2.5 flex-wrap">
                <button
                    class="btn btn-outline btn-sm"
                    onclick="verifyPublicArticleImages(true)"
                    title="HEAD-check purablis.com image URLs for this issue">
                    Check public images
                </button>
                <button
                    class="btn btn-primary btn-sm"
                    onclick="downloadConfirmationHtml('${currentConfirmationTab}')"
                    title="ZIP file to upload as MailWizz template">
                    Download HTML
                </button>
                <button
                    class="btn btn-outline btn-sm"
                    onclick="downloadConfirmationDoc('${currentConfirmationTab}')"
                    title="Legacy Microsoft Office document format">
                    Download DOC
                </button>
            </div>
        </div>
        <div
            id="confirmation-preview-frame-wrap"
            class="border border-[#ddd] rounded-[10px] overflow-auto bg-white">
            <div class="p-6 text-center text-[#666]">
                Loading ${currentConfirmationTab} template preview...
            </div>
        </div>`;

    const html = await buildConfirmationHtml(currentConfirmationTab);
    const frameWrap = document.getElementById('confirmation-preview-frame-wrap');
    if (!frameWrap) return;

    frameWrap.innerHTML =
        `<iframe
            title="${currentConfirmationTab} newsletter preview"
            class="w-full max-w-[900px] border-0 bg-white block mx-auto"
            style="min-height: 1500px; height: 1500px;"></iframe>`;
    const iframe = frameWrap.querySelector('iframe');
    if (iframe) {
        iframe.onload = () => {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                if (doc && doc.body) {
                    const height = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight || 0);
                    iframe.style.height = `${height + 50}px`;
                }
            } catch (e) {
                console.warn('Could not auto-adjust iframe height:', e);
            }
        };
        iframe.srcdoc = html;
    }
}

window.updateSubjectPrompt = (value) => {
    newsletterContent.subjectPrompt = normalizeSubjectPrompt(value);
    saveState();
};

window.updateGeneratedSubject = (category, value) => {
    if (!newsletterContent.generatedSubjects) {
        newsletterContent.generatedSubjects = { MED: '', THC: '', CBD: '', INV: '' };
    }
    newsletterContent.generatedSubjects[category] = value;
    saveState();
};

window.copyGeneratedSubject = async (category) => {
    const text = (newsletterContent.generatedSubjects && newsletterContent.generatedSubjects[category]) || '';
    if (!text.trim()) return alert(`No ${category} subject to copy yet.`);
    await navigator.clipboard.writeText(text);
    alert(`${category} subject copied.`);
};

window.generateAllSubjects = async () => {
    const categories = ['MED', 'THC', 'CBD', 'INV'];
    const btn = document.getElementById('btn-generate-subjects');
    const btnText = document.getElementById('btn-generate-subjects-text');
    const categoryArticles = {};
    categories.forEach((category) => {
        categoryArticles[category] = getSubjectArticlesForCategory(category).map((article, index) => ({
            index: index + 1,
            title: article.title || '',
            url: article.url || '',
            date: article.date || '',
            description: article.description || '',
        }));
    });

    const hasAnyArticles = categories.some((category) => categoryArticles[category].length > 0);
    if (!hasAnyArticles) {
        return alert('No articles for subject lines. Enter numbers in the MED/THC/CBD/INV columns and list them in the pick-order boxes (e.g. 1,2,3).');
    }

    const prompt = normalizeSubjectPrompt(newsletterContent.subjectPrompt);
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Generating...';
    try {
        const res = await fetch('/api/articles/generate-subjects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                categories: categoryArticles,
                model: 'gemini-flash-3-0',
            }),
        });
        const data = await parseJsonResponse(res, 'Subject generation route did not return JSON. Restart the app server and try again.');
        if (!res.ok || !data.success || !data.subjects) {
            throw new Error(data.error || 'Failed to generate subjects');
        }
        newsletterContent.generatedSubjects = {
            MED: data.subjects.MED || '',
            THC: data.subjects.THC || '',
            CBD: data.subjects.CBD || '',
            INV: data.subjects.INV || '',
        };
        saveState();
        renderConfirmationView();
    } catch (e) {
        console.error(e);
        alert('Failed to generate subjects: ' + e.message);
    } finally {
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = 'Generate Subjects';
    }
};

window.exportSpreadsheet = () => {
    // Filter unique articles by URL to avoid duplicates in spreadsheet
    const seenUrls = new Set();
    const chosen = articles.filter(a => {
        if (!['Y', 'YM', 'COOL FINDS'].includes(a.status)) return false;
        if (a.url && seenUrls.has(a.url)) return false;
        if (a.url) seenUrls.add(a.url);
        return true;
    });

    if (chosen.length === 0) return alert('No chosen articles to export.');

    const medText = (newsletterContent.MED && newsletterContent.MED.result) || '';
    const thcText = (newsletterContent.THC && newsletterContent.THC.result) || '';
    const cbdText = (newsletterContent.CBD && newsletterContent.CBD.result) || '';
    const invText = (newsletterContent.INV && newsletterContent.INV.result) || '';

    const dataStartRow = 3;
    const lastRow = Math.max(dataStartRow + chosen.length - 1, 500);

    const aoa = [
        [
            '', '',
            { t: 'n', f: `=COUNTA(C${dataStartRow}:C${lastRow})` },
            { t: 'n', f: `=COUNTA(D${dataStartRow}:D${lastRow})` },
            { t: 'n', f: `=COUNTA(E${dataStartRow}:E${lastRow})` },
            { t: 'n', f: `=COUNTA(F${dataStartRow}:F${lastRow})` },
            '', '',
            medText, thcText, cbdText, invText,
        ],
        ['Title', 'URL', 'MED', 'THC', 'CBD', 'INV', 'Image URL', 'Published Image URL', 'MED Newsletter Text', 'THC Newsletter Text', 'CBD Newsletter Text', 'INV Newsletter Text'],
    ];

    chosen.forEach(a => {
        const med = (a.ranks && a.ranks.MED) && String(a.ranks.MED).trim();
        const thc = (a.ranks && a.ranks.THC) && String(a.ranks.THC).trim();
        const cbd = (a.ranks && a.ranks.CBD) && String(a.ranks.CBD).trim();
        const inv = (a.ranks && a.ranks.INV) && String(a.ranks.INV).trim();
        const imgUrl = a.image || '';
        const publishedImgUrl = (a.image && a.image.includes('purablis.com')) ? a.image : (a.publishedImageUrl || '');
        aoa.push([
            a.title || '',
            a.url || '',
            med || undefined,
            thc || undefined,
            cbd || undefined,
            inv || undefined,
            imgUrl,
            publishedImgUrl,
            '', '', '', '',
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
        { wch: 40 }, { wch: 50 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 },
        { wch: 60 }, { wch: 60 },
        { wch: 50 }, { wch: 50 }, { wch: 50 }, { wch: 50 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Newsletter Export');
    const name = document.getElementById('newsletter-name')?.value || 'newsletter';
    XLSX.writeFile(wb, `${String(name).replace(/[^a-zA-Z0-9 ]/g, '')}-export.xlsx`);
};

window.exportNewsletter = () => {
    const data = {
        meta: {
            name: document.getElementById('newsletter-name').value,
            generatedAt: new Date().toISOString(),
        },
        inspirationalImages,
        content: newsletterContent,
        articles: articles.filter(a => ['Y', 'YM', 'COOL FINDS'].includes(a.status)),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

function buildArticlesHtml(category) {
    const seenUrls = new Set();
    const relevant = getArticlesByPickOrder(category).filter(a => {
        if (a.url && seenUrls.has(a.url)) return false;
        if (a.url) seenUrls.add(a.url);
        return true;
    });
    return relevant.map(a => {
        const imgUrl = getArticleImageUrlForSend(a);
        return `
        <div class="article-item">
            ${imgUrl ? `<img src="${escapeHtml(imgUrl)}" alt="" style="max-width: 90px; height: 90px; object-fit: cover;">` : ''}
            <div>
                <strong>${(a.title || '').replace(/</g, '&lt;')}</strong>
                <a href="${a.url || '#'}">${(a.url || '').replace(/</g, '&lt;')}</a>
            </div>
        </div>
    `;
    }).join('');
}

window.generateNewsletters = async () => {
    const newsletterName = document.getElementById('newsletter-name')?.value || 'Newsletter';
    const statusEl = document.getElementById('generate-status');
    const uploadBtn = document.getElementById('btn-upload-newsletters');
    if (statusEl) statusEl.textContent = 'Linking images on purablis.com…';
    try {
        await ensureConfirmationPurablisUrls();
    } catch (e) {
        console.warn('resolve purablis URLs:', e);
    }
    if (statusEl) statusEl.textContent = 'Saving any missing images on purablis.com…';
    const publishResult = await ensureAllArticleImagesOnPurablis({ silent: true });
    if (publishResult.fail > 0) {
        const proceed = confirm(
            `${publishResult.fail} image(s) could not be saved on purablis.com. `
            + 'Newsletter HTML may still use Freepik or other external URLs.\n\nGenerate anyway?',
        );
        if (!proceed) {
            if (statusEl) statusEl.textContent = 'Generation cancelled — fix images or FTP first.';
            return;
        }
    }
    let inspirationalImg = '';
    try {
        inspirationalImg = await ensureInspirationalImageOnPurablis();
    } catch (e) {
        console.error(e);
        const proceed = confirm(
            'Inspirational image could not be saved on purablis.com.\n\n'
            + (e.message || 'Unknown error')
            + '\n\nGenerate without it?',
        );
        if (!proceed) {
            if (statusEl) statusEl.textContent = 'Generation cancelled — fix inspirational image or FTP.';
            return;
        }
        inspirationalImg = inspirationalImages && inspirationalImages[0]
            ? getInspirationalDisplayUrl(inspirationalImages[0])
            : '';
    }
    inspirationalImg = getInspirationalNewsletterUrl(inspirationalImg) || buildPublicInspirationalImageUrl(inspirationalImages[0]);

    const newsletters = {};
    const categories = ['MED', 'THC', 'CBD', 'INV'];

    for (const cat of categories) {
        const template = (newsletterContent.templates && newsletterContent.templates[cat]) || '';
        const resultText = (newsletterContent[cat] && newsletterContent[cat].result) || '';
        const articlesHtml = buildArticlesHtml(cat);

        let html = template;

        if (html) {
            html = html
                .replace(/\{\{SUMMARY\}\}/g, resultText)
                .replace(/\{\{ARTICLES_HTML\}\}/g, articlesHtml)
                .replace(/\{\{INSPIRATIONAL_IMAGE\}\}/g, inspirationalImg)
                .replace(/\{\{NEWSLETTER_NAME\}\}/g, newsletterName);
        } else {
            const safeResult = (resultText || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
            html =
                `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${(newsletterName + ' - ' + cat).replace(/</g, '&lt;')}</title></head><body>
                <h1>${(newsletterName + ' - ' + cat).replace(/</g, '&lt;')}</h1>
                ${inspirationalImg ? `<img src="${inspirationalImg.replace(/"/g, '&quot;')}" alt="Header" style="max-width: 100%;">` : ''}
                <div class="summary">${safeResult}</div>
                <div class="articles">${articlesHtml}</div>
                </body></html>`;
        }

        newsletters[cat] = {
            html,
            resultText,
            articles: getArticlesByPickOrder(cat).filter(a => ['Y', 'YM'].includes(a.status)),
            inspirationalImage: inspirationalImg,
        };
    }

    lastGeneratedNewsletter = {
        meta: { name: newsletterName, generatedAt: new Date().toISOString() },
        newsletters,
        inspirationalImages,
        articles: articles.filter(a => ['Y', 'YM', 'COOL FINDS'].includes(a.status)),
    };

    if (uploadBtn) uploadBtn.disabled = false;
    const exportBtn = document.getElementById('btn-export-generated');
    if (exportBtn) exportBtn.disabled = false;
    if (statusEl) statusEl.textContent = `Generated ${categories.length} newsletters. Ready to upload.`;
};

window.exportGeneratedNewsletter = () => {
    if (!lastGeneratedNewsletter) return alert('Generate newsletters first.');
    const blob = new Blob([JSON.stringify(lastGeneratedNewsletter, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-generated-${(lastGeneratedNewsletter.meta.name || 'newsletter').replace(/\s/g, '-')}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.uploadNewslettersToServer = async () => {
    if (!lastGeneratedNewsletter) return alert('Generate newsletters first.');
    const statusEl = document.getElementById('generate-status');
    const uploadBtn = document.getElementById('btn-upload-newsletters');
    const name = lastGeneratedNewsletter.meta.name;
    if (!name) return alert('Enter a newsletter name on the first page.');

    if (uploadBtn) uploadBtn.disabled = true;
    if (statusEl) statusEl.textContent = 'Uploading...';

    try {
        const res = await fetch('/api/newsletters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, generated: lastGeneratedNewsletter }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
            if (statusEl) statusEl.textContent = `Saved to database as "${name}".`;
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (e) {
        console.error(e);
        if (statusEl) statusEl.textContent = 'Upload failed: ' + (e.message || 'network error');
        if (uploadBtn) uploadBtn.disabled = false;
    }
};

async function ensureInspirationalImageOnPurablis() {
    const raw = inspirationalImages && inspirationalImages[0]
        ? getDownloadSafeAssetUrl(inspirationalImages[0])
        : '';
    if (!raw) return '';

    if (isPurablisUrl(raw)) {
        confirmationInspirationalImage = raw;
        return raw;
    }

    const published = unwrapPublishedResult(await publishUrlToPurablis(raw, 'inspirational'));
    inspirationalImages = [published];
    confirmationInspirationalImage = published;
    saveState();
    await loadInspirationalLibrary();
    return published;
}

async function ensureAllArticleImagesOnPurablis(options = {}) {
    const { silent = false } = options;
    const relevant = articles.filter(a => (['MED', 'THC', 'CBD', 'INV'].some(cat => isCategoryRankIncluded(a, cat))) || a.status === 'COOL FINDS');
    const withImages = relevant.filter(a => {
        const hasImage = a.image || a.originalImageUrl;
        const wantsPublish = a.publishImage !== false;
        const isAlreadyPublished = a.publishedImageUrl && isPurablisUrl(a.publishedImageUrl);
        const isBlob = (a.image && a.image.startsWith('blob:'));
        return (hasImage && wantsPublish && !isAlreadyPublished) || isBlob;
    });

    if (withImages.length === 0) {
        const allPublished = relevant.every(a => !a.image || (a.publishedImageUrl && isPurablisUrl(a.publishedImageUrl)));
        if (!silent) {
            alert(allPublished ? 'All images are already on purablis.com.' : 'No images to publish. Select images for articles first.');
        }
        return { ok: 0, fail: 0, errors: [], allPublished };
    }

    let ok = 0;
    let fail = 0;
    const errors = [];
    for (let i = 0; i < withImages.length; i++) {
        const a = withImages[i];
        const idx = articles.indexOf(a);
        const sourceUrl = a.originalImageUrl || a.image;
        if (!sourceUrl) continue;
        try {
            const pub = await publishUrlToPurablis(sourceUrl, 'article');
            const published = typeof pub === 'string' ? pub : pub.url;
            articles[idx].previewImageUrl = '';
            articles[idx].originalImageUrl = '';
            articles[idx].publishedImageUrl = (typeof pub === 'object' && pub.url) ? pub.url : published;
            articles[idx].publicReachable = typeof pub === 'object' ? !!pub.publicReachable : false;
            articles[idx].image = articles[idx].publishedImageUrl;
            articles[idx].previewImageUrl = resolvePurablisImageUrl(articles[idx]);
            articles[idx].originalImageUrl = articles[idx].previewImageUrl;
            ok++;
            updateSelectedImageBox(idx);
            saveState();
        } catch (e) {
            fail++;
            errors.push((a.title || 'Article').slice(0, 30) + ': ' + (e.message || 'Network error'));
            console.warn('Publish failed for', sourceUrl, e);
        }
    }
    return { ok, fail, errors, allPublished: fail === 0 && ok >= 0 };
}

window.publishAllImagesToPurablis = async () => {
    const btn = document.querySelector('[onclick="publishAllImagesToPurablis()"]') || document.querySelector('[onclick="AllImagesToPurabpublishlis()"]');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Publishing…';
    }
    const result = await ensureAllArticleImagesOnPurablis({ silent: true });
    if (btn) {
        btn.disabled = false;
        btn.textContent = 'Publish Selected to purablis';
    }
    if (result.ok === 0 && result.fail === 0) {
        const relevant = articles.filter(a => (['MED', 'THC', 'CBD', 'INV'].some(cat => isCategoryRankIncluded(a, cat))) || a.status === 'COOL FINDS');
        const allPublished = relevant.every(a => !a.image || (a.publishedImageUrl && isPurablisUrl(a.publishedImageUrl)));
        alert(allPublished ? 'All images are already on purablis.com.' : 'No images to publish. Select images for articles first.');
        return;
    }
    let msg = result.ok > 0 ? `Published ${result.ok} image(s) to purablis.com.` : '';
    if (result.fail > 0) {
        msg += (msg ? ' ' : '') + `${result.fail} failed.`;
        if (result.errors.length) msg += '\n' + result.errors.slice(0, 3).join('\n');
    }
    if (!msg) msg = 'No images were published.';
    alert(msg);
};

window.AllImagesToPurabpublishlis = window.publishAllImagesToPurablis;

window.downloadAllImagesZip = async () => {
    const withImages =
        articles
            .filter(a =>
                (['MED', 'THC', 'CBD', 'INV'].some(cat => isCategoryRankIncluded(a, cat))) ||
                a.status === 'COOL FINDS',
            ).filter(a => a.image || a.originalImageUrl);

    if (withImages.length === 0) {
        return alert('No images selected. Select images for articles first.');
    }

    const zip = new JSZip();
    let done = 0;
    const total = withImages.length;

    // CSV Manifest content
    let csvContent = "ID,Title,Original Image URL,Published Image URL,Filename\n";

    // Map to track processed URLs to avoid duplicates in ZIP
    // Key: URL, Value: Filename in ZIP
    const processedUrls = new Map();
    // Set to track used filenames to avoid collisions
    const usedFilenames = new Set();

    const btn = document.querySelector('[onclick="downloadAllImagesZip()"]');

    for (let i = 0; i < withImages.length; i++) {
        const a = withImages[i];

        // Prefer original URL for downloading, fallback to current
        let url = a.originalImageUrl || a.image;
        if (url && url.startsWith('/') && !url.startsWith('//')) {
            url = window.location.origin + url;
        }

        if (!url) continue;

        let filename = processedUrls.get(url);

        if (!filename) {
            // New URL, determine filename
            // 1. Try to get from original URL
            if (a.originalImageUrl) {
                try {
                    const urlObj = new URL(a.originalImageUrl);
                    const pathname = decodeURIComponent(urlObj.pathname);
                    const name = pathname.split('/').pop();
                    if (name && name.includes('.')) {
                        filename = name;
                    }
                } catch (e) {
                }
            }

            // 2. Try to get from current image URL (if local path)
            if (!filename && a.image && !a.image.startsWith('data:') && !a.image.startsWith('blob:')) {
                try {
                    const name = a.image.split('/').pop();
                    if (name && name.includes('.')) {
                        filename = name;
                    }
                } catch (e) {
                }
            }

            // 3. Fallback to title
            const ext = (url.match(/\.(png|jpg|jpeg|gif|webp|svg)/i)) ? url.match(/\.(png|jpg|jpeg|gif|webp|svg)/i)[0] : '.png';
            if (!filename) {
                const safeTitle = (a.title || `article-${i + 1}`).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40);
                filename = `${safeTitle}${ext}`;
            } else {
                // Ensure extension is correct if we extracted a name without one (unlikely given checks) or replace if needed?
                // Actually, if we extracted a filename, we trust it has an extension.
                // But we should sanitize it.
                filename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
            }

            // Ensure unique filename
            if (usedFilenames.has(filename)) {
                const namePart = filename.lastIndexOf('.') > 0 ? filename.substring(0, filename.lastIndexOf('.')) : filename;
                const extPart = filename.lastIndexOf('.') > 0 ? filename.substring(filename.lastIndexOf('.')) : ext;
                let counter = 1;
                let newFilename = `${namePart}-${counter}${extPart}`;
                while (usedFilenames.has(newFilename)) {
                    counter++;
                    newFilename = `${namePart}-${counter}${extPart}`;
                }
                filename = newFilename;
            }

            usedFilenames.add(filename);
            processedUrls.set(url, filename);

            // Add file to ZIP
            try {
                if (url.startsWith('data:')) {
                    const base64 = url.split(',')[1];
                    if (base64) zip.file(filename, base64, { base64: true });
                } else {
                    const res = await fetch(url, { mode: 'cors' });
                    if (res.ok) {
                        const blob = await res.blob();
                        zip.file(filename, blob);
                    } else {
                        console.warn(`Failed to fetch ${url}: ${res.status}`);
                        zip.file(filename + '.txt', `Failed to download: ${url} (Status: ${res.status})`);
                    }
                }
            } catch (e) {
                console.warn('Could not fetch image:', url?.slice(0, 50), e);
                zip.file(filename + '.error.txt', `Error downloading: ${url}\n${e.message}`);
            }
        }

        // Add to CSV
        const csvRow = [
            i + 1,
            `"${(a.title || '').replace(/"/g, '""')}"`,
            `"${(a.originalImageUrl || '').replace(/"/g, '""')}"`,
            `"${(a.publishedImageUrl || '').replace(/"/g, '""')}"`,
            `"${filename}"`,
        ].join(',');

        // Avoid duplicate rows in CSV if same article is processed twice (should not happen with unique array, but safe check)
        if (!csvContent.includes(csvRow)) {
            csvContent += csvRow + "\n";
        }

        done++;
        if (btn && (done % 5 === 0 || done === total)) {
            btn.textContent = `Downloading... ${done}/${total}`;
        }
    }

    // Add CSV to zip
    zip.file("images_manifest.csv", csvContent);

    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `newsletter-images-${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    if (btn) btn.textContent = 'Download All Images (ZIP)';
};

window.exportArticlesXls = () => {
    const allArticles = [...articles, ...archivedArticles, ...laterCoolArticles];
    if (allArticles.length === 0) return alert('No articles to export.');
    const headers = ['Title', 'URL', 'Description', 'Date', 'Status', 'Paywall', 'MED', 'THC', 'CBD', 'INV', 'Notes', 'Image URL'];
    const optionalCell = (value) => {
        const text = String(value ?? '').trim();
        return text ? text : undefined;
    };
    const rows = allArticles.map(a => ([
        a.title || '',
        a.url || '',
        optionalCell(a.description),
        optionalCell(a.date),
        optionalCell(a.status),
        a.paywall ? 'Yes' : 'No',
        optionalCell(a.ranks && a.ranks.MED),
        optionalCell(a.ranks && a.ranks.THC),
        optionalCell(a.ranks && a.ranks.CBD),
        optionalCell(a.ranks && a.ranks.INV),
        optionalCell(a.notes),
        optionalCell(a.image),
    ]));

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Auto-size columns
    const colWidths = headers.map((key, index) => {
        const maxLen = Math.max(key.length, ...rows.map(r => String(r[index] ?? '').length));
        return { wch: Math.min(maxLen + 2, 60) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Articles');
    const name = document.getElementById('newsletter-name').value || 'newsletter';
    XLSX.writeFile(wb, `${name.replace(/[^a-zA-Z0-9 ]/g, '')}-articles.xlsx`);
};

function updateChosenFileName(inputId, labelId) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    if (!label) return;
    label.textContent = input && input.files && input.files.length > 0
        ? input.files[0].name
        : 'No file chosen';
}

function assignImportedArticles(importedArticles) {
    const importedAt = new Date().toISOString();
    const withUrl = (importedArticles || []).filter((a) => a.url);
    const { articles: newArticles } = filterDuplicateArticlesClient(withUrl, articles || []);
    
    // Map new articles with addedAt
    const mappedNew = newArticles.map(article => ({
        ...article,
        addedAt: article.addedAt || importedAt
    }));
    
    // Append the unique new articles to our existing articles list
    const combined = [...(articles || []), ...mappedNew];
    
    // Re-index all sequentially
    articles = combined.map((article, index) => ({
        ...article,
        id: index + 1
    }));
}

function upsertImportedSession(name) {
    if (!name) return;
    const sessions = getSavedSessions();
    sessions[name] = buildSessionPayload();
    saveSavedSessions(sessions);
    setCurrentSessionName(name);
    populateSavedDropdown();
}

async function uploadArticlesWorkbook(
    {
        inputId,
        buttonId,
        buttonLabel,
        replacePrompt,
        successMessage,
        switchToStep2 = false,
    },
) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    const nameEl = document.getElementById('newsletter-name');
    const newsletterName = (nameEl && nameEl.value.trim()) || 'Week 1';

    if (!input || !input.files || !input.files.length) {
        alert('Please select an Excel file first.');
        return false;
    }

    if (replacePrompt && articles.length > 0 && !confirm(replacePrompt.replace('{count}', articles.length))) {
        return false;
    }

    if (button) {
        button.disabled = true;
        button.textContent = 'Uploading...';
    }

    const formData = new FormData();
    formData.append('file', input.files[0]);
    formData.append('newsletterName', newsletterName);

    try {
        const response = await fetch('/api/articles/upload', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Upload failed.');
        }

        assignImportedArticles(data.articles || []);
        if (nameEl) {
            nameEl.value = data.newsletterName || newsletterName;
        }
        saveState();
        upsertImportedSession((data.newsletterName || newsletterName).trim());
        renderArticles();

        if (switchToStep2) {
            switchStep(2);
        } else {
            updateStats();
        }

        alert(successMessage.replace('{count}', articles.length).replace('{name}', data.newsletterName || newsletterName));
        input.value = '';
        return true;
    } catch (err) {
        console.error(err);
        alert(err.message || 'Upload failed. See console.');
        return false;
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = buttonLabel;
        }
    }
}

// Event Listeners for Steps
steps.forEach((step) => {
    step.addEventListener('click', () => {
        const targetId = step.getAttribute('data-step');
        switchStep(targetId);
    });
});

// File Upload Preview
const fileInput = document.getElementById('excel-upload');
const articleViewFileInput = document.getElementById('article-view-excel-upload');

if (fileInput) {
    fileInput.addEventListener('change', () => updateChosenFileName('excel-upload', 'file-name'));
}

if (articleViewFileInput) {
    articleViewFileInput.addEventListener('change', () => updateChosenFileName('article-view-excel-upload', 'article-view-file-name'));
}

const btnLoadTemplate = document.getElementById('btn-load-template');
if (btnLoadTemplate) {
    btnLoadTemplate.addEventListener('click', () => {
        const headers = ['Title', 'URL', 'Description', 'Date', 'Status', 'Paywall', 'MED', 'THC', 'CBD', 'INV', 'Notes', 'Image URL'];
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        ws['!cols'] = headers.map(() => ({ wch: 18 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Articles');
        XLSX.writeFile(wb, 'newsletter-articles-template.xlsx');
    });
}

// Compact timestamp for "added" indicator (e.g. 2/28)
function formatAddedAt(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return (d.getMonth() + 1) + '/' + d.getDate();
}

window.setBatchFilter = (value) => {
    batchFilter = value || '';
};

// Render Articles Function (Table View)
function renderArticles() {
    const list = document.getElementById('articles-list');
    if (!list) return;
    list.innerHTML = ''; // Clear existing

    const titleSortSelect = document.getElementById('article-sort-order');
    if (titleSortSelect) {
        titleSortSelect.value = articleTitleSortOrder;
    }

    // Populate batch filter dropdown (unique addedAt, sorted)
    const batchSelect = document.getElementById('batch-filter-select');
    if (batchSelect) {
        const addedAts = [...new Set(articles.map(a => a.addedAt).filter(Boolean))].sort();
        const currentVal = batchSelect.value;
        batchSelect.innerHTML = '<option value="">All</option>' + addedAts.map(iso => {
            const label = formatAddedAt(iso) + ' ' + (new Date(iso).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
            }));
            return `<option value="${iso}">${label}</option>`;
        }).join('');
        batchSelect.value = batchFilter || '';
    }

    if (articles.length === 0) {
        list.innerHTML += '<div class="p-5 text-center text-[#777]">No articles found. Please try searching again.</div>';
        updateStats();
        return;
    }

    const indicesToShow = batchFilter
        ? articles.map((a, i) => i).filter(i => articles[i].addedAt === batchFilter)
        : articles.map((a, i) => i);

    list.innerHTML +=
        indicesToShow
            .map(realIndex => {
                const article = articles[realIndex];
                const index = realIndex;

                // Ensure defaults
                if (!article.status) article.status = 'Y';
                if (!article.categories) {
                    // Backward compatibility if single category exists
                    article.categories = article.category ? [article.category] : [];
                }
                if (!article.notes) article.notes = article.keyword || ''; // Migration
                if (article.selected === undefined) article.selected = true;

                // Checkbox logic for categories
                const isStatusValid = ['Y', 'YM', 'M', 'COOL FINDS', 'LATER COOL'].includes(article.status);
                const disabledAttr = isStatusValid ? '' : 'disabled';
                const disabledClass = isStatusValid ? '' : 'opacity-50 cursor-not-allowed';

                const categoryInputs = ['MED', 'THC', 'CBD', 'INV']
                        .map(cat => {
                            const rank = getRankForSort(article, cat);
                            return `<div class="col-cat col-cat-pick flex flex-col items-center gap-0.5 min-w-0 w-full">
                                <label class="text-[0.55rem] text-[#888] font-bold tracking-wide">${cat}</label>
                                <input
                                    type="text"
                                    value="${escapeHtml(rank)}"
                                    data-cat="${cat}"
                                    oninput="updateCategoryRank(${index}, '${cat}', this.value)"
                                    onkeydown="handleCatRankKeydown(event, ${index}, '${cat}')"
                                    class="${disabledClass} cat-rank-input w-full text-center px-0.5 py-1 text-[0.75rem] border border-[#d8dee8] rounded"
                                    ${disabledAttr}
                                    placeholder="#"
                                    title="Rank for ${cat} (number, Y, YM). Tab moves to next column.">
                            </div>`;
                        }).join('');
                const admonition = getHeadlineLengthAdmonition(article.title);

                return `<div class="article-row">
                    <div class="col-selected">
                        <input
                            type="checkbox"
                            ${article.selected ? 'checked' : ''}
                            onchange="updateArticleField(${index}, 'selected', this.checked)">
                    </div>

                    <div class="col-article">
                        <div class="flex items-start gap-2">
                            <textarea
                                class="title-edit font-[inherit] shrink-0 resize-y" cols="44" rows="2"
                                onchange="updateArticleField(${index}, 'title', this.value)">${article.title}</textarea>
                            <div class="flex flex-col" id="admonition-container-${index}">
                                <span
                                    class="article-added-at"
                                    title="${article.addedAt ? 'Added ' + article.addedAt : 'No add date'}">
                                    ${article.addedAt ? 'added ' + formatAddedAt(article.addedAt) : '—'}
                                </span>
                                ${admonition !== null ? `<span class="admonition-text font-bold text-[0.75rem] text-[${admonition.color}] mt-2">${admonition.message}</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="col-date">
                        <input
                            type="text"
                            value="${article.date || ''}"
                            onchange="updateArticleField(${index}, 'date', this.value)"
                            placeholder="MM/DD/YY">
                    </div>

                    <div class="col-paywall">
                        <input
                            type="checkbox"
                            ${article.paywall ? 'checked' : ''}
                            onchange="updateArticleField(${index}, 'paywall', this.checked)">
                    </div>

                    <div class="col-status">
                        <select onchange="updateArticleField(${index}, 'status', this.value)">
                            <option value="">Status...</option>
                            <option value="Y" ${article.status === 'Y' ? 'selected' : ''}>Y</option>
                            <option value="YM" ${article.status === 'YM' ? 'selected' : ''}>YM</option>
                            <option value="M" ${article.status === 'M' ? 'selected' : ''}>M</option>
                            <option value="NO" ${article.status === 'NO' ? 'selected' : ''}>NO</option>
                            <option value="COOL FINDS" ${article.status === 'COOL FINDS' ? 'selected' : ''}>COOL FINDS</option>
                            <option value="LATER COOL" ${article.status === 'LATER COOL' ? 'selected' : ''}>Later Cool</option>
                        </select>
                    </div>

                    ${categoryInputs}

                    <div class="col-keyword">
                        <textarea
                            class="form-control w-full h-15 text-[0.85rem] resize-y"
                            onchange="updateArticleField(${index}, 'notes', this.value)"
                            placeholder="Notes..."
                        >${article.notes || ''}</textarea>
                    </div>

                    <div class="col-actions">
                        <button
                            class="btn btn-sm btn-outline text-[#f57c00] border-[#f57c00] mb-2 w-full"
                            onclick="archiveArticle(${index})">
                            Archive
                        </button>
                        <button
                            class="btn btn-sm btn-outline text-[#d32f2f] border-[#d32f2f] w-full"
                            onclick="removeArticle(${index})">
                            Remove
                        </button>
                    </div>

                    <div class="article-summary-cell">
                        <p class="article-summary" title="${escapeHtml(article.description || '')}">
                            ${article.description ? escapeHtml(article.description.substring(0, 600)) : 'No description'}
                        </p>
                        ${article.summary ? `<details class="mt-1 text-[0.85rem]">
                            <summary class="cursor-pointer text-[#1976d2]">Article summary (from real page text)</summary>
                            <p class="mt-1 text-[#444]">${escapeHtml(article.summary)}</p>
                        </details>` : ''}
                    </div>

                    <div class="col-span-full flex items-start gap-1.25 mt-2 border-t border-dashed border-[#e2e8f0] pt-2">
                        <span class="text-[0.7rem] font-bold text-[#64748b] pt-1">URL:</span>
                        <textarea
                            class="url-edit text-[0.8rem] py-0.5 px-1.25 w-full text-[#2f6e63] resize-y"
                            rows="2"
                            onchange="updateArticleField(${index}, 'url', this.value)">${article.url}</textarea>
                        <a href="${article.url}" target="_blank" title="Open Link" class="no-underline mt-1">🔗</a>
                        ${isArchiveUrl(article.url) ? `<button
                            type="button"
                            onclick="promptArchiveOriginalUrl(${index})"
                            class="no-underline mt-1 bg-transparent border-0 cursor-pointer p-0"
                            title="${article.originalSourceUrl ? `Original source: ${escapeHtml(article.originalSourceUrl)} — click to change` : 'Archive.is link — click to add the original article URL for "More at..."'}">
                            ${article.originalSourceUrl ? '🌐' : '❓🌐'}
                        </button>` : ''}
                    </div>
                </div>`;
            }).join('');

    updateStats();
    highlightLongTitles();
    syncCategoryPickOrderInputs();
}

function highlightLongTitles() {
    const list = document.getElementById('articles-list');
    if (!list) return;
    list.querySelectorAll('.title-edit').forEach(ta => {
        if (ta.scrollHeight > ta.clientHeight) {
            ta.classList.add('title-overflow');
        } else {
            ta.classList.remove('title-overflow');
        }
    });
}

// Update Article Field
window.updateArticleField = async (index, field, value) => {
    if (field === 'status' && value === 'LATER COOL') {
        const article = articles[index];
        article.status = 'LATER COOL';
        
        try {
            // Get global Later Cool bucket
            const res = await fetch('/api/state?key=later_cool');
            let globalLaterCool = [];
            if (res.ok) {
                const data = await res.json();
                if (data.value && Array.isArray(data.value)) {
                    globalLaterCool = data.value;
                }
            }
            
            globalLaterCool.push(article);
            
            await fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'later_cool', value: globalLaterCool })
            });
            
            articles.splice(index, 1);
            saveState();
            renderArticles();
            const activeStep = document.querySelector('.step.active');
            if (activeStep && activeStep.getAttribute('data-step') === '3') renderImagesView();
            alert('Article moved to your Later Cool Finds vault!');
        } catch (e) {
            console.error(e);
            alert('Failed to save to Later Cool vault: ' + e.message);
        }
        return;
    }
    articles[index][field] = value;

    // Logic: If status becomes invalid, clear categories?
    if (field === 'status') {
        if (!['Y', 'YM', 'COOL FINDS'].includes(value)) {
            articles[index].categories = [];
        }
        if (value === 'NO') {
            if (!articles[index].ranks) articles[index].ranks = {};
            ['MED', 'THC', 'CBD', 'INV'].forEach(cat => {
                articles[index].ranks[cat] = '';
                delete articles[index][cat];
                delete articles[index][cat.toLowerCase()];
            });
        }
        // Re-render to update disabled states and unchecked boxes
        renderArticles();
    } else if (field === 'url') {
        // Re-render to update the link icon
        renderArticles();
    } else if (field === 'title') {
        const container = document.getElementById(`admonition-container-${index}`);
        const admonition = getHeadlineLengthAdmonition(value);
        const oldSpan = container.querySelector('.admonition-text');
        if (oldSpan) {
            oldSpan.remove();
        }
        if (admonition) {
            const span = document.createElement('span');
            span.className = `admonition-text font-bold text-[0.75rem] text-[${admonition.color}] mt-2`;
            span.innerHTML = admonition.message;
            container.appendChild(span);
        }

        saveState();
        requestAnimationFrame(highlightLongTitles);
    } else {
        // For other fields, just save
        saveState();
    }
};

window.openAddArticleModal = () => {
    const modal = document.getElementById('add-article-modal');
    if (!modal) return;
    document.getElementById('add-article-title').value = '';
    document.getElementById('add-article-url').value = '';
    document.getElementById('add-article-status').value = 'Y';
    ['med', 'thc', 'cbd', 'inv'].forEach(c => {
        document.getElementById('add-article-' + c).value = '';
    });
    showWithClass(modal, 'flex');
};

window.closeAddArticleModal = () => {
    const modal = document.getElementById('add-article-modal');
    if (modal) hideWithClass(modal);
};

window.addArticleFromModal = () => {
    const title = document.getElementById('add-article-title').value.trim() || 'Untitled';
    const url = document.getElementById('add-article-url').value.trim() || '';
    const status = document.getElementById('add-article-status').value;
    const ranks = {};
    ['MED', 'THC', 'CBD', 'INV'].forEach(cat => {
        const v = document.getElementById('add-article-' + cat.toLowerCase()).value.trim();
        if (v) ranks[cat] = v;
    });
    const newArticle = {
        id: 1,
        title,
        url,
        description: '',
        date: '',
        categories: Object.keys(ranks),
        ranks,
        notes: '',
        paywall: false,
        status: status || 'Y',
        image: null,
        imageSearchQuery: '',
        isValid: true,
        selected: true,
        addedAt: new Date().toISOString(),
    };
    articles.forEach(a => {
        a.id = (a.id || 0) + 1;
    });
    articles.unshift(newArticle);
    saveState();
    renderArticles();
    closeAddArticleModal();
};

const CATEGORY_RANK_ORDER = ['MED', 'THC', 'CBD', 'INV'];

window.handleCatRankKeydown = (event, index, cat) => {
    if (event.key !== 'Tab') return;
    const row = event.target.closest('.article-row');
    if (!row) return;
    const order = CATEGORY_RANK_ORDER;
    const pos = order.indexOf(cat);
    if (pos < 0) return;
    const nextCat = event.shiftKey ? order[pos - 1] : order[pos + 1];
    if (!nextCat) return;
    const nextInput = row.querySelector(`input.cat-rank-input[data-cat="${nextCat}"]`);
    if (!nextInput || nextInput.disabled) return;
    event.preventDefault();
    nextInput.focus();
    if (typeof nextInput.select === 'function') nextInput.select();
};

window.updateCategoryRank = (index, cat, value) => {
    const article = articles[index];
    if (!article) return;
    if (!article.ranks || typeof article.ranks !== 'object') article.ranks = {};
    if (!article.categories) article.categories = [];

    const rank = String(value ?? '').trim();
    const key = String(cat).trim().toUpperCase();

    if (!rank) {
        delete article.ranks[key];
        delete article.ranks[cat];
        if (article.useInNewsletter && typeof article.useInNewsletter === 'object') {
            article.useInNewsletter[key] = false;
        }
        article.categories = article.categories.filter(
            (c) => String(c).trim().toUpperCase() !== key,
        );
    } else {
        article.ranks[key] = rank;
        if (!articleHasCategory(article, key)) {
            article.categories.push(key);
        }
    }

    normalizeArticleDefaults(article);
    saveState();
    updateStats();
};

// Sort order for MED/THC/CBD/INV: lowest numbers first, then cool finds, then Y, YM, Maybe (M), No, then empty.
const RANK_SORT_ORDER = {
    'COOL FINDS': 50,
    'LATER COOL': 51,
    'Y': 52,
    'YM': 53,
    'M': 54,
    'NO': 55,
};

function rankToSortValue(rank) {
    if (rank === undefined || rank === null) return 999;
    const s = String(rank).trim();
    if (!s) return 999;
    const n = parseInt(s, 10);
    if (!isNaN(n)) return n;  // numbers 1, 2, 3... first (lowest first)
    const u = s.toUpperCase();
    if (RANK_SORT_ORDER[u] !== undefined) return RANK_SORT_ORDER[u];
    if (u.startsWith('COOL')) return RANK_SORT_ORDER['COOL FINDS'];
    if (u.startsWith('LATER')) return RANK_SORT_ORDER['LATER COOL'];
    return 999;
}

// Effective rank: stored #, legacy category, or category checkbox pick.
function getRankForSort(article, cat) {
    normalizeArticleDefaults(article);
    const key = String(cat).trim().toUpperCase();
    let r = String(
        article.ranks[key] ?? article.ranks[cat] ?? article.ranks[key.toLowerCase()] ?? '',
    ).trim();
    return r;
}

// Sort Articles: sortKey 'status' | 'MED' | 'THC' | 'CBD' | 'INV'. MED/THC/CBD/INV = by that rank ascending (lowest first).
const STATUS_ORDER = ['Y', 'YM', 'M', 'NO', 'COOL FINDS', 'LATER COOL'];
window.sortArticles = (sortKey) => {
    if (!articles || articles.length === 0) return;
    articleTitleSortOrder = '';
    const titleSortSelect = document.getElementById('article-sort-order');
    if (titleSortSelect) titleSortSelect.value = '';

    if (sortKey === 'status') {
        articles.sort((a, b) => {
            const i = STATUS_ORDER.indexOf((a.status || '').toUpperCase());
            const j = STATUS_ORDER.indexOf((b.status || '').toUpperCase());
            const orderA = i >= 0 ? i : STATUS_ORDER.length;
            const orderB = j >= 0 ? j : STATUS_ORDER.length;
            if (orderA !== orderB) return orderA - orderB;
            return (a.status || '').localeCompare(b.status || '');
        });
    } else if (['MED', 'THC', 'CBD', 'INV'].includes(sortKey)) {
        const tieOrder = ['MED', 'THC', 'CBD', 'INV'].filter(c => c !== sortKey);
        articles.sort((a, b) => {
            const rA = rankToSortValue(getRankForSort(a, sortKey));
            const rB = rankToSortValue(getRankForSort(b, sortKey));
            if (rA !== rB) return rA - rB;
            for (const cat of tieOrder) {
                const tA = rankToSortValue(getRankForSort(a, cat));
                const tB = rankToSortValue(getRankForSort(b, cat));
                if (tA !== tB) return tA - tB;
            }
            return (a.title || '').localeCompare(b.title || '');
        });
    }
    saveState();
    renderArticles();
};

// Sort by MED, then THC, then CBD, then INV (lowest number first). Uses same effective rank as display.
window.sortByRanks = () => {
    if (!articles || articles.length === 0) return;
    articleTitleSortOrder = '';
    const titleSortSelect = document.getElementById('article-sort-order');
    if (titleSortSelect) titleSortSelect.value = '';
    const order = ['MED', 'THC', 'CBD', 'INV'];
    articles.sort((a, b) => {
        for (const cat of order) {
            const rA = rankToSortValue(getRankForSort(a, cat));
            const rB = rankToSortValue(getRankForSort(b, cat));
            if (rA !== rB) return rA - rB;
        }
        return (a.title || '').localeCompare(b.title || '');
    });
    saveState();
    renderArticles();
};

window.sortArticlesByTitle = (order) => {
    articleTitleSortOrder = order || '';
    if (!articles || articles.length === 0 || !articleTitleSortOrder) {
        renderArticles();
        return;
    }

    if (articleTitleSortOrder === 'oldnew' || articleTitleSortOrder === 'newold') {
        const direction = articleTitleSortOrder === 'newold' ? -1 : 1;
        articles.sort((a, b) => {
            const timeA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
            const timeB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
            if (timeA !== timeB) return (timeA - timeB) * direction;
            return String(a.title || '').localeCompare(String(b.title || ''));
        });
        saveState();
        renderArticles();
        return;
    }

    const direction = articleTitleSortOrder === 'za' ? -1 : 1;
    articles.sort((a, b) => {
        const titleA = String(a.title || '').trim().toLowerCase();
        const titleB = String(b.title || '').trim().toLowerCase();
        return titleA.localeCompare(titleB) * direction;
    });
    saveState();
    renderArticles();
};

window.sortImagesView = (order) => {
    imageViewSortOrder = order || '';
    renderImagesView();
};

function isPrioritySummaryRank(rank) {
    const value = String(rank ?? '').trim();
    return ['1', '2', '3', '4'].includes(value);
}

// Articles used for Text summaries (respects pick-order boxes when set).
function getSummaryArticlesForCategory(category) {
    const eligible = getArticlesForCategory(category);
    const orderKeys = parseCategoryPickOrder(category);
    const limit = 3;
    const result = [];
    const used = new Set();
    const add = (article) => {
        if (!article || result.length >= limit) return;
        const id = article.url || article.title || String(article.id);
        if (used.has(id)) return;
        used.add(id);
        result.push(article);
    };

    orderKeys.forEach((key) => {
        const keyNorm = key.toUpperCase();
        add(eligible.find((a) => String(getRankForSort(a, category)).trim().toUpperCase() === keyNorm));
    });
    eligible.forEach((article) => add(article));
    return result;
}

function getSelectedRankCounts() {
    let counts = { MED: 0, THC: 0, CBD: 0, INV: 0 };
    const coolFindUrls = new Set((laterCoolArticles || []).map(a => a.url));

    articles.forEach(a => {
        if (a.selected === false) return;
        if (a.status === 'COOL FINDS') return;
        if (coolFindUrls.has(a.url)) return;

        ['MED', 'THC', 'CBD', 'INV'].forEach(cat => {
            let r = String((a.ranks && a.ranks[cat]) || '').trim().toUpperCase();
            if (r === 'Y' || r === 'YM' || r === 'M' || /^\d+$/.test(r)) {
                counts[cat]++;
            }
        });
    });
    return counts;
}

/**
 * The counts live in the nav row, which every step shares — but they describe the
 * article list, and Image View has its own separate stats. So show them on Article
 * View only rather than having two disagreeing rows on screen at once.
 */
function syncStatsVisibility() {
    const statsEl = document.getElementById('article-stats');
    if (!statsEl) return;
    const active = document.querySelector('.step.active');
    const onArticleView = !!active && active.getAttribute('data-step') === '2';
    statsEl.classList.toggle('hidden', !onArticleView);
}

function updateStats() {
    const statsEl = document.getElementById('article-stats');
    if (!statsEl) return;
    syncStatsVisibility();

    articles.forEach(normalizeArticleDefaults);

    let selectedCount = 0;
    articles.forEach(a => {
        if (a.selected !== false) selectedCount++;
    });

    const counts = getSelectedRankCounts();

    const sessionLabel = currentSessionName
        ? `<span class="stat-item bg-[#e8eaf6] text-[#283593] font-semibold">${currentSessionName}</span>`
        : '';

    // Total counts every article brought back, with no exclusions at all — unlike
    // Selected (checkbox state) and the category counts, which both skip rows.
    const totalCount = articles.length;
    const yCount = articles.filter((a) => normalizeArticleStatus(a.status) === 'Y').length;

    const statsHtml =
        `${sessionLabel}
        <span class="stat-item bg-[#e0f7fa] text-[#006064]" title="Articles checked in the Select column">Sel: ${selectedCount}</span>
        <span class="stat-item font-semibold" title="Every article brought back, including unchecked ones">Total: ${totalCount}</span>
        <span class="stat-item bg-[#e8f5e9] text-[#1b5e20] font-semibold" title="Articles whose Status is Y">Y: ${yCount}</span>
        <span class="stat-item bg-[#e3f2fd] text-[#0d47a1]" title="Articles with rank # in MED">MED: ${counts.MED}</span>
        <span class="stat-item bg-[#e8f5e9] text-[#1b5e20]" title="Articles with rank # in THC">THC: ${counts.THC}</span>
        <span class="stat-item bg-[#fff3e0] text-[#e65100]" title="Articles with rank # in CBD">CBD: ${counts.CBD}</span>
        <span class="stat-item bg-[#f3e5f5] text-[#4a148c]" title="Articles with rank # in INV">INV: ${counts.INV}</span>`;
    statsEl.innerHTML = statsHtml;
    const footerEl = document.getElementById('article-stats-footer');
    if (footerEl) footerEl.innerHTML = statsHtml;
}

window.removeSelectedArticles = () => {
    const count = articles.filter((a) => a.selected !== false).length;
    if (!count) {
        alert('No articles checked. Use the Select column checkboxes (All / None), then Remove checked.');
        return;
    }
    if (!confirm(`Remove ${count} checked article(s) from this workspace?\n\nSaved sessions in the dropdown are not deleted.`)) {
        return;
    }
    articles = articles.filter((a) => a.selected === false);
    saveState();
    renderArticles();
    const activeStep = document.querySelector('.step.active');
    if (activeStep && activeStep.getAttribute('data-step') === '3') {
        renderImagesView();
    }
};

window.openSelectedArticles = () => {
    const toOpen = articles.filter((a) => a.selected !== false);
    if (!toOpen.length) {
        alert('No articles checked. Use the Select column checkboxes, then click Open selected.');
        return;
    }
    if (!confirm(`You are about to open ${toOpen.length} tabs. Your browser's pop-up blocker may prevent this unless you "Allow Pop-ups" for this site. Continue?`)) {
        return;
    }
    toOpen.forEach(a => {
        if (a.url && a.url.startsWith('http')) {
            window.open(a.url, '_blank');
        }
    });
};

window.fixRedirectLinks = async () => {
    const urlsToFix = articles
        .filter(a => a.url && a.url.includes('vertexaisearch.cloud.google.com'))
        .map(a => a.url);

    if (urlsToFix.length === 0) {
        alert('No Google Redirect (vertexaisearch) URLs found in the current articles.');
        return;
    }

    const btn = document.querySelector('button[onclick="fixRedirectLinks()"]');
    const originalText = btn.innerText;
    btn.innerText = 'Fixing...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/articles/resolve-urls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: urlsToFix })
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        if (data.success && data.resolved) {
            let fixedCount = 0;
            articles.forEach(a => {
                if (data.resolved[a.url] && data.resolved[a.url] !== a.url) {
                    a.url = data.resolved[a.url];
                    fixedCount++;
                }
            });
            saveState();
            renderArticles();
            alert(`Successfully resolved ${fixedCount} redirect URLs to direct links!`);
        } else {
            alert('Failed to resolve URLs.');
        }
    } catch (e) {
        console.error('Error fixing links:', e);
        alert('An error occurred while fixing the links.');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

window.archiveSelectedArticles = () => {
    const toArchive = articles.filter((a) => a.selected !== false);
    if (!toArchive.length) {
        alert('No articles checked. Use the Select column checkboxes (All / None), then Archive checked.');
        return;
    }
    if (!confirm(`Archive ${toArchive.length} checked article(s)?`)) {
        return;
    }
    archivedArticles.push(...toArchive);
    articles = articles.filter((a) => a.selected === false);
    saveState();
    renderArticles();
};

// Remove Article (no confirmation)
window.removeArticle = (index) => {
    articles.splice(index, 1);
    saveState();
    renderArticles();
    const activeStep = document.querySelector('.step.active');
    if (activeStep && activeStep.getAttribute('data-step') === '3') {
        renderImagesView();
    }
};

window.archiveArticle = (index) => {
    const article = articles[index];
    archivedArticles.push(article);
    articles.splice(index, 1);
    saveState();
    renderArticles();
    const activeStep = document.querySelector('.step.active');
    if (activeStep && activeStep.getAttribute('data-step') === '3') {
        renderImagesView();
    }
};

// --- SESSION SAVE / LOAD ---

function getSavedSessions() {
    return JSON.parse(localStorage.getItem('newsletter_saved_sessions') || '{}');
}

function saveSavedSessions(sessions) {
    localStorage.setItem('newsletter_saved_sessions', JSON.stringify(sessions));
    fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'sessions', value: sessions }),
    }).catch(() => {
    });
}

window.saveSession = () => {
    const name = document.getElementById('newsletter-name').value.trim();
    if (!name) return alert('Please enter a newsletter name on the first page.');

    const sessions = getSavedSessions();
    sessions[name] = buildSessionPayload();
    saveSavedSessions(sessions);
    setCurrentSessionName(name);
    populateSavedDropdown();
    alert(`Saved "${name}" (${articles.length} articles).`);
};

window.loadSession = () => {
    const dropdown = document.getElementById('saved-sessions-dropdown');
    const name = dropdown.value;
    if (!name) return alert('Please select a saved session.');

    const sessions = getSavedSessions();
    const session = sessions[name];
    if (!session) return alert('Session not found.');

    if (articles.length > 0 && !confirm(`This will replace the current ${articles.length} articles. Continue?`)) return;

    articles = session.articles || [];
    const savedAt = session.savedAt || new Date().toISOString();
    articles.forEach(a => {
        if (!a.addedAt) a.addedAt = savedAt;
    });
    archivedArticles = session.archivedArticles || [];
    laterCoolArticles = session.laterCoolArticles || [];
    inspirationalImages = session.inspirationalImages || [];
    const nc = session.newsletterContent || {
        MED: { intro: '', outro: '' },
        THC: { intro: '', outro: '' },
        CBD: { intro: '', outro: '' },
        INV: { intro: '', outro: '' },
    };
    newsletterContent = {
        ...nc,
        templates: nc.templates || { MED: '', THC: '', CBD: '', INV: '' },
        summaryRules: normalizeSummaryRules(nc.summaryRules),
        selectedGreeting: nc.selectedGreeting || DEFAULT_GREETING,
        customGreetings: Array.isArray(nc.customGreetings) ? nc.customGreetings.filter(Boolean) : [],
        subjectPrompt: normalizeSubjectPrompt(nc.subjectPrompt),
        generatedSubjects: nc.generatedSubjects || { MED: '', THC: '', CBD: '', INV: '' },
        categoryPickOrder: nc.categoryPickOrder || { MED: '', THC: '', CBD: '', INV: '' },
        publicImageBase: nc.publicImageBase || session.publicImageBase || DEFAULT_PUBLIC_IMAGE_BASE,
        publicImageSubfolder: nc.publicImageSubfolder != null
            ? nc.publicImageSubfolder
            : (session.publicImageSubfolder != null ? session.publicImageSubfolder : DEFAULT_ARTICLE_PUBLIC_SUBFOLDER),
        stateIconsPublicBase: nc.stateIconsPublicBase || DEFAULT_STATE_ICONS_PUBLIC_BASE,
        inspirationalPublicBase: nc.inspirationalPublicBase || DEFAULT_INSPIRATIONAL_PUBLIC_BASE,
    };
    inferPublicImageSettingsFromArticles();
    syncPublicImageSettingsUi();

    setCurrentSessionName(name);
    if (typeof session.aiQuery === 'string') {
        setAiQuery(session.aiQuery);
    }
    saveState();
    renderArticles();
    const activeStep = document.querySelector('.step.active');
    if (activeStep && activeStep.getAttribute('data-step') === '3') {
        renderImagesView();
    }
    alert(`Loaded "${name}" (${articles.length} articles).`);
};

window.deleteSession = () => {
    const dropdown = document.getElementById('saved-sessions-dropdown');
    const name = dropdown.value;
    if (!name) return alert('Please select a session to delete.');
    if (!confirm(`Delete saved session "${name}"?`)) return;

    const sessions = getSavedSessions();
    delete sessions[name];
    saveSavedSessions(sessions);
    populateSavedDropdown();
};

function populateSavedDropdown() {
    const dropdownStep1 = document.getElementById('saved-sessions-dropdown-step1');
    const dropdown = document.getElementById('saved-sessions-dropdown');
    const dropdownStep3 = document.getElementById('saved-sessions-dropdown-step3');
    const nameInput = document.getElementById('newsletter-name');

    const sessions = getSavedSessions();
    const names = Object.keys(sessions).sort();

    const optionsHtml =
        names
            .map(name => {
                const s = sessions[name];
                const count = (s.articles || []).length;
                const date = s.savedAt ? new Date(s.savedAt).toLocaleDateString() : '';
                return `<option value="${name}">${name} (${count} articles, ${date})</option>`;
            }).join('');

    if (dropdownStep1) {
        dropdownStep1.innerHTML = '<option value="">Saved newsletters</option>' + optionsHtml;
    }
    if (dropdown) {
        dropdown.innerHTML = '<option value="">-- Select --</option>' + optionsHtml;
    }
    if (dropdownStep3) {
        dropdownStep3.innerHTML = '<option value="">-- Select --</option>' + optionsHtml;
    }

    const selectedName = currentSessionName || (nameInput ? nameInput.value.trim() : '') || localStorage.getItem(LAST_SESSION_NAME_KEY) || '';
    if (selectedName) {
        setCurrentSessionName(selectedName);
    }

    const hintEl = document.getElementById('state-load-hint');
    const textEl = document.getElementById('state-load-hint-text');
    if (hintEl && names.length === 0) {
        showWithClass(hintEl, 'block');
        if (textEl && textEl.textContent === 'Loading…') {
            if (typeof window.updateStateHintFromDiagnostic === 'function') window.updateStateHintFromDiagnostic();
        }
    }
}

window.loadSessionFromStep3 = () => {
    const dropdownStep3 = document.getElementById('saved-sessions-dropdown-step3');
    const dropdown = document.getElementById('saved-sessions-dropdown');
    if (dropdownStep3 && dropdown) {
        dropdown.value = dropdownStep3.value;
    }
    loadSession();
};

window.deleteSessionFromStep3 = () => {
    const dropdownStep3 = document.getElementById('saved-sessions-dropdown-step3');
    const dropdown = document.getElementById('saved-sessions-dropdown');
    if (dropdownStep3 && dropdown) {
        dropdown.value = dropdownStep3.value;
    }
    deleteSession();
};

window.pushStateToServer = async function () {
    try {
        await convertLocalUploadUrlsForSharing();
        const workspace = buildWorkspaceState();
        const localSessions = buildSessionsState(true);

        let serverSessions = {};
        try {
            const sessRes = await fetch('/api/state?key=sessions');
            if (sessRes.ok) {
                const data = await sessRes.json();
                if (data.value && typeof data.value === 'object') {
                    serverSessions = data.value;
                }
            }
        } catch (e) {
            console.warn('Could not load server sessions before merge:', e);
        }

        const {
            merged: sessions,
            addedFromLocal,
            updatedFromLocal,
            serverOnly,
            total,
            localCount,
        } = mergeSessionStores(serverSessions, localSessions);

        const requests = [
            fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'workspace', value: workspace }),
            }),
            fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'sessions', value: sessions }),
            }),
        ];
        if (lastGeneratedNewsletter && lastGeneratedNewsletter.meta && lastGeneratedNewsletter.meta.name) {
            requests.push(
                fetch('/api/newsletters', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: lastGeneratedNewsletter.meta.name,
                        generated: lastGeneratedNewsletter,
                    }),
                }),
            );
        }

        const responses = await Promise.all(requests);
        const failed = [];
        for (const res of responses) {
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                failed.push(err.error || res.status);
            }
        }

        if (failed.length === 0) {
            persistWorkspaceLocal(workspace);
            localStorage.setItem('newsletter_saved_sessions', JSON.stringify(sessions));
            const pushedName = currentSessionName || document.getElementById('newsletter-name')?.value.trim() || '';
            if (pushedName) setCurrentSessionName(pushedName);
            populateSavedDropdown();
            const generatedNote = lastGeneratedNewsletter ? ', generated newsletter synced' : '';
            const sessionNames = Object.keys(sessions).sort().join(', ');
            alert(
                'Pushed to server.\n\n' +
                'Workspace: ' + articles.length + ' articles, ' + archivedArticles.length + ' archived, ' +
                laterCoolArticles.length + ' later cool' + generatedNote + '.\n\n' +
                'Saved newsletters: ' + total + ' total on server.\n' +
                'This browser had: ' + localCount + '\n' +
                'New from this browser: ' + addedFromLocal + '\n' +
                'Updated (newer save here): ' + updatedFromLocal + '\n' +
                'Only on server (kept): ' + serverOnly + '\n\n' +
                'Names: ' + sessionNames,
            );
        } else {
            alert('Push failed: ' + failed.join('; '));
        }
    } catch (e) {
        alert('Push failed: ' + (e.message || 'network error'));
    }
};

window.getLaterCoolFinds = async function () {
    try {
        const res = await fetch('/api/state?key=later_cool');
        let globalLaterCool = [];
        if (res.ok) {
            const data = await res.json();
            if (data.value && Array.isArray(data.value)) {
                globalLaterCool = data.value;
            }
        }
        
        // Also grab any legacy local ones just in case
        const fromLocal = laterCoolArticles || [];
        let toAdd = [...globalLaterCool, ...fromLocal];
        
        // Deduplicate by URL
        const uniqueToAdd = [];
        const seenUrls = new Set(articles.map(a => a.url)); // Don't add if already in current active articles
        
        toAdd.forEach(a => {
            if (a.url && !seenUrls.has(a.url)) {
                uniqueToAdd.push(a);
                seenUrls.add(a.url);
            }
        });

        if (uniqueToAdd.length === 0) {
            alert('No new Later Cool finds saved in your vault.');
            return;
        }
        
        const addedAt = new Date().toISOString();
        uniqueToAdd.forEach(a => {
            a.addedAt = a.addedAt || addedAt;
            // Ensure status is forced to LATER COOL so it's obvious when they pop in
            a.status = 'LATER COOL';
        });
        
        articles = [...uniqueToAdd, ...articles];
        
        // Clear local legacy bucket
        laterCoolArticles = [];
        
        // Clear global DB bucket now that we've pulled them to the active workspace
        await fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'later_cool', value: [] })
        });
        
        saveState();
        renderArticles();
        alert('Pulled ' + uniqueToAdd.length + ' Later Cool find(s) from your vault to the top of your list.');
    } catch (e) {
        alert('Failed to get Later Cool finds: ' + (e.message || 'network error'));
    }
};

window.refreshStateFromServer = async function () {
    const hintEl = document.getElementById('state-load-hint');
    const textEl = document.getElementById('state-load-hint-text');
    try {
        const [wrRes, sessRes] = await Promise.all([
            fetch('/api/state?key=workspace'),
            fetch('/api/state?key=sessions'),
        ]);
        let msg = '';
        if (wrRes.ok) {
            const { value } = await wrRes.json();
            if (value && value.articles) {
                applyWorkspaceState(value, { mergeLibrary: true });
                if (typeof renderArticles === 'function') renderArticles();
                const activeStep = document.querySelector('.step.active');
                if (activeStep && activeStep.getAttribute('data-step') === '3' && typeof renderImagesView === 'function') {
                    renderImagesView();
                }
                msg = (value.articles || []).length + ' articles in workspace. ';
                if (value.currentSessionName) {
                    setCurrentSessionName(value.currentSessionName);
                } else if (!currentSessionName) {
                    restoreLastSessionSelection();
                }
                syncSessionDropdownSelection(currentSessionName);
            }
        } else if (wrRes.status === 503) {
            msg = 'Server database not configured. ';
            if (hintEl) showWithClass(hintEl, 'block');
            await window.updateStateHintFromDiagnostic();
        }
        if (sessRes.ok) {
            const { value } = await sessRes.json();
            if (value && typeof value === 'object') {
                const local = getSavedSessions();
                const { merged, addedFromLocal, serverOnly, total } = mergeSessionStores(value, local);
                localStorage.setItem('newsletter_saved_sessions', JSON.stringify(merged));
                if (typeof populateSavedDropdown === 'function') populateSavedDropdown();
                msg += total + ' saved session(s). ';
                if (addedFromLocal) msg += addedFromLocal + ' added from this browser. ';
                if (serverOnly) msg += serverOnly + ' only on server. ';
                if (hintEl) hideWithClass(hintEl);
            }
        } else if (sessRes.status === 503) {
            msg = (msg || '') + 'Sessions: server database not configured.';
            if (hintEl) showWithClass(hintEl, 'block');
            await window.updateStateHintFromDiagnostic();
        }
        alert(msg || 'No data from server. Check the yellow hint above for details.');
    } catch (e) {
        if (hintEl) showWithClass(hintEl, 'block');
        if (textEl) textEl.textContent = 'Could not reach server: ' + (e.message || 'network error') + '. Check that the API is deployed (e.g. Vercel runs the Express server).';
        alert('Could not reach server: ' + (e.message || 'network error'));
    }
};

// --- QUERY MODE TOGGLE (Search More / Modify Existing) ---

let step2QueryMode = 'search';

window.setQueryMode = (mode) => {
    step2QueryMode = mode;
    const searchBtn = document.getElementById('toggle-search-more');
    const modifyBtn = document.getElementById('toggle-modify');
    const queryInput = document.getElementById('step2-query');
    const actionBtn = document.getElementById('btn-step2-query');

    searchBtn.classList.toggle('active', mode === 'search');
    modifyBtn.classList.toggle('active', mode === 'modify');

    if (mode === 'search') {
        queryInput.placeholder = 'Search for more articles to add...';
        actionBtn.textContent = 'Find Articles';
    } else {
        queryInput.placeholder = "E.g., 'Shorten descriptions', 'Make titles punchier'...";
        actionBtn.textContent = 'Apply Changes';
    }
};

window.executeStep2Query = async () => {
    if (step2QueryMode === 'search') {
        await searchMoreArticles();
    } else {
        await modifyExistingArticles();
    }
};

// --- SEARCH MORE ARTICLES (deduplicates by URL and title) ---

async function searchMoreArticles() {
    const prompt = document.getElementById('step2-query').value.trim();
    if (!prompt) return alert('Please enter a search query.');

    saveRecentPrompt(prompt);
    setAiQuery(prompt);
    saveState();

    const btn = document.getElementById('btn-step2-query');
    const status = document.getElementById('step2-query-status');
    const model = document.getElementById('ai-model').value;
    const searchEngine = getArticleSearchEngine();
    const newsletterName = document.getElementById('newsletter-name').value;

    btn.disabled = true;
    btn.textContent = 'Searching...';
    hideWithClass(status);

    try {
        const existingUrls = articles.map(a => a.url).filter(Boolean);
        const response = await fetch('/api/articles/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, newsletterName, model, existingUrls, searchEngine }),
        });

        const data = await parseJsonResponse(
            response,
            'Search failed: server returned HTML instead of JSON (often a timeout or missing API key on Vercel). Check Vercel env vars and try again.',
        );

        if (data.success && data.articles) {
            const workspaceBefore = articles;
            const { articles: newArticles, skipped: dupeCount } = filterDuplicateArticlesClient(
                data.articles,
                workspaceBefore,
            );

            // Assign IDs continuing from current max; mark when added
            const maxId = articles.reduce((max, a) => Math.max(max, a.id || 0), 0);
            const addedAt = new Date().toISOString();
            newArticles.forEach((a, i) => {
                a.id = maxId + i + 1;
                a.addedAt = addedAt;
            });

            // Add the raw results immediately so they're never lost, even if
            // verification/categorization below is slow or fails.
            articles = articles.concat(newArticles);
            saveState();
            renderArticles();

            const dupeCountTotal = (data.duplicateCount || 0) + dupeCount;
            let msg = `Added ${newArticles.length} new articles.`;
            if (dupeCountTotal > 0) msg += ` (${dupeCountTotal} duplicates skipped)`;

            if (data.stage === 'raw' && newArticles.length > 0) {
                msg += ' Verifying & categorizing...';
                status.textContent = msg;
                showWithClass(status, 'block');
                try {
                    const verifyResult = await verifyArticlesRemote(newArticles, workspaceBefore);
                    const verified = verifyResult.articles;
                    const verifiedByUrl = {};
                    verified.forEach(a => { verifiedByUrl[normalizeUrl(a.url)] = a; });
                    articles = articles.map(a => {
                        const v = verifiedByUrl[normalizeUrl(a.url)];
                        return v ? { ...v, id: a.id, addedAt: a.addedAt } : a;
                    }).filter(a => {
                        // Drop newly-added articles that failed verification (rejected/invalid URL)
                        const wasNew = newArticles.some(n => n.id === a.id);
                        return !wasNew || verifiedByUrl[normalizeUrl(a.url)];
                    });
                    saveState();
                    renderArticles();
                    status.textContent = `Added ${verified.length} new articles.`
                        + (dupeCountTotal > 0 ? ` (${dupeCountTotal} duplicates skipped)` : '')
                        + (verifyResult.rejectedCount ? ` ${verifyResult.rejectedCount} rejected.` : '')
                        + (verifyResult.duplicateCount ? ` ${verifyResult.duplicateCount} title dupes removed after verify.` : '')
                        + verifyReportSuffix();
                } catch (verifyErr) {
                    console.error("Verification error (raw articles were kept):", verifyErr);
                    status.textContent = `Added ${newArticles.length} new articles, but verification/categorization failed or timed out — kept them unverified.`;
                }
            } else {
                status.textContent = msg;
                showWithClass(status, 'block');
            }
        } else {
            const clarification = await getAiClarificationFromError(data);
            const details = clarification || String(data.details || '').trim();
            showAiFailureAlert('Search failed', data);
        }
    } catch (err) {
        console.error(err);
        if (isAnthropicCreditError(err.message)) {
            showAiFailureAlert('Search failed — Claude credits', { error: err.message });
        } else {
            alert('Search failed. See console for details.');
        }
    } finally {
        btn.disabled = false;
        btn.textContent = 'Find Articles';
    }
}

function normalizeUrl(url) {
    if (!url) return '';
    return url.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
}

// --- SAME-STORY GROUPING ------------------------------------------------------
// Ten publishers writing up one bill signing are ten distinct articles with ten
// distinct URLs, so URL dedupe never sees them. The whole list goes to the model in
// one request (Modify can't do this — it works in batches of 8 and cannot delete),
// and the result is only ever a proposal the user confirms here.

let duplicateGroups = [];

window.findDuplicateStories = async () => {
    if (articles.length < 2) return alert('Need at least 2 articles to compare.');

    const btn = document.getElementById('btn-find-duplicates');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Comparing...';

    try {
        const response = await fetch('/api/articles/find-duplicates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: document.getElementById('ai-model').value,
                articles: articles.map((a) => ({
                    title: a.title,
                    url: a.url,
                    date: a.date || '',
                    description: a.description || '',
                    sourceLabel: a.sourceLabel || '',
                })),
            }),
        });

        const data = await parseJsonResponse(response, 'Grouping failed: server returned HTML instead of JSON (often a timeout).');
        if (!data.success) {
            showAiFailureAlert('Grouping failed', data);
            return;
        }

        duplicateGroups = data.groups || [];
        if (duplicateGroups.length === 0) {
            alert(`Compared all ${data.compared} articles — no two are covering the same story.`);
            return;
        }
        renderDuplicateGroups(data);
    } catch (err) {
        console.error(err);
        if (isAnthropicCreditError(err.message)) {
            showAiFailureAlert('Grouping failed — Claude credits', { error: err.message });
        } else {
            alert('Grouping failed: ' + (err.message || 'See console for details.'));
        }
    } finally {
        btn.disabled = false;
        btn.textContent = original;
    }
};

function renderDuplicateGroups(data) {
    const body = document.getElementById('duplicate-groups-body');
    const modal = document.getElementById('duplicate-groups-modal');
    if (!body || !modal) return;

    body.innerHTML = duplicateGroups.map((group, gi) => {
        const members = [group.keep, ...group.drop];
        const skipped = group.skipped === true;

        const rows = members.map((idx) => {
            const a = articles[idx];
            if (!a) return '';
            const isKeep = idx === group.keep;
            const source = a.sourceLabel || (a.url || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
            const fate = skipped
                ? '· kept'
                : (isKeep ? '· <b>KEEP THIS ONE</b>' : '· will be removed');
            return `
              <label class="flex items-start gap-2 py-1.5 px-2 rounded ${isKeep && !skipped ? 'bg-[#e8f5e9]' : 'hover:bg-[#fafafa]'} cursor-pointer">
                <input type="radio" name="dupe-group-${gi}" value="${idx}" ${isKeep && !skipped ? 'checked' : ''} onchange="setDuplicateKeep(${gi}, ${idx})" class="mt-1" title="Keep this one, remove the others">
                <span class="flex-1 min-w-0">
                  <span class="block text-[0.85rem] ${isKeep && !skipped ? 'font-semibold text-[#1b5e20]' : 'text-[#333]'}">${escapeHtml(a.title || '(untitled)')}</span>
                  <span class="block text-[0.72rem] text-[#777]">${escapeHtml(source)} · ${escapeHtml(a.date || 'no date')} ${fate}</span>
                </span>
              </label>`;
        }).join('');

        // "None" belongs in the same radio set as the articles: choosing a keeper and
        // choosing to leave the group alone are the same decision, so they should be
        // the same control rather than a separate checkbox elsewhere.
        const noneRow = `
              <label class="flex items-start gap-2 py-1.5 px-2 mt-1 rounded border-t border-[#f0eee8] ${skipped ? 'bg-[#fff8e1]' : 'hover:bg-[#fafafa]'} cursor-pointer">
                <input type="radio" name="dupe-group-${gi}" value="none" ${skipped ? 'checked' : ''} onchange="setDuplicateSkip(${gi}, true)" class="mt-1" title="Leave this whole group alone">
                <span class="flex-1 min-w-0">
                  <span class="block text-[0.85rem] ${skipped ? 'font-semibold text-[#e65100]' : 'text-[#555]'}">None — keep all ${members.length}, change nothing</span>
                  <span class="block text-[0.72rem] text-[#777]">Use this when the grouping is wrong</span>
                </span>
              </label>`;

        return `
          <div class="mb-4 border ${skipped ? 'border-[#ffcc80]' : 'border-[#e0ddd5]'} rounded-lg overflow-hidden">
            <div class="py-1.5 px-2.5 ${skipped ? 'bg-[#fff8e1]' : 'bg-[#f6f4ef]'} flex items-baseline gap-2 flex-wrap">
              <span class="text-[0.85rem] font-semibold text-[#16423c]">${escapeHtml(group.topic)}</span>
              <span class="text-[0.72rem] text-[#777]">${members.length} articles${group.reason ? ` · ${escapeHtml(group.reason)}` : ''}</span>
              ${skipped ? '<span class="ml-auto text-[0.72rem] font-semibold text-[#e65100]">skipped</span>' : ''}
            </div>
            <div class="p-1.5">${rows}${noneRow}</div>
          </div>`;
    }).join('');

    updateDuplicateSummary(data.compared);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

/** "Keep all" opts a whole group out, so nothing in it is touched. */
window.setDuplicateSkip = (groupIndex, skipped) => {
    if (!duplicateGroups[groupIndex]) return;
    duplicateGroups[groupIndex].skipped = !!skipped;
    renderDuplicateGroups({ compared: articles.length });
};

window.setAllDuplicateSkip = (skipped) => {
    duplicateGroups.forEach((g) => { g.skipped = !!skipped; });
    renderDuplicateGroups({ compared: articles.length });
};

/** Every article marked for removal across the groups still in play. */
function duplicatesMarkedForRemoval() {
    return duplicateGroups.filter((g) => !g.skipped).flatMap((g) => g.drop);
}

window.setDuplicateKeep = (groupIndex, keepIndex) => {
    const group = duplicateGroups[groupIndex];
    if (!group) return;
    const members = [group.keep, ...group.drop];
    group.keep = keepIndex;
    group.drop = members.filter((i) => i !== keepIndex);
    // Picking an article is the opposite of "None", so it takes the group off skip.
    group.skipped = false;
    renderDuplicateGroups({ compared: articles.length });
};

function updateDuplicateSummary(compared) {
    const el = document.getElementById('duplicate-groups-summary');
    const total = duplicatesMarkedForRemoval().length;
    const active = duplicateGroups.filter((g) => !g.skipped).length;

    if (el) {
        el.textContent = total === 0
            ? `${duplicateGroups.length} group(s) found — nothing marked for removal.`
            : `${active} group(s) across ${compared || articles.length} articles — keeping ${active}, removing ${total}.`;
    }

    // Buttons name what actually happens to the articles you did NOT pick.
    const archiveBtn = document.getElementById('btn-dupe-archive');
    const removeBtn = document.getElementById('btn-dupe-remove');
    if (archiveBtn) {
        archiveBtn.textContent = total ? `Archive the other ${total}` : 'Archive the others';
        archiveBtn.disabled = total === 0;
        archiveBtn.style.opacity = total === 0 ? '0.45' : '';
    }
    if (removeBtn) {
        removeBtn.textContent = total ? `Delete the other ${total}` : 'Delete the others';
        removeBtn.disabled = total === 0;
        removeBtn.style.opacity = total === 0 ? '0.45' : '';
    }
}

window.closeDuplicateGroups = () => {
    const modal = document.getElementById('duplicate-groups-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

window.applyDuplicateGroups = (mode) => {
    const doomed = new Set(duplicatesMarkedForRemoval());
    const keeping = duplicateGroups.filter((g) => !g.skipped).length;
    if (doomed.size === 0) return alert('Nothing is marked for removal.');

    const verb = mode === 'archive' ? 'Archive' : 'Permanently delete';
    if (!confirm(`${verb} ${doomed.size} article(s)?\n\nThe ${keeping} you picked (highlighted green) stay in the list.`)) return;

    // Indexes refer to the current array, so partition in one pass rather than
    // splicing repeatedly (which would shift every index after the first removal).
    const kept = [];
    const dropped = [];
    articles.forEach((a, i) => (doomed.has(i) ? dropped : kept).push(a));

    if (mode === 'archive') archivedArticles.push(...dropped);
    articles = kept;

    duplicateGroups = [];
    saveState();
    renderArticles();
    closeDuplicateGroups();
    alert(`${mode === 'archive' ? 'Archived' : 'Removed'} ${dropped.length} duplicate article(s). ${articles.length} remain.`);
};

// --- PRIORITY SOURCES ---------------------------------------------------------
// Sites we sweep in full: every article they publish in the date window is pulled
// and judged against the newsletter criteria, instead of hoping the AI's general
// web search happens to surface them.

const PRIORITY_SOURCES_KEY = 'newsletter_priority_sources';

let prioritySources = [];
let prioritySourceChecks = {};   // url -> last access-check result

function defaultPrioritySources() {
    return [
        { url: 'https://norml.org/', label: 'NORML', restrictions: 'Policy, arrests, legalization. Skip fundraising and internship posts.', enabled: true },
        { url: 'https://mjbizdaily.com/', label: 'MJBizDaily', restrictions: 'Business and regulatory news. Skip conference promos.', enabled: true },
        { url: 'https://ganjapreneur.com/', label: 'Ganjapreneur', restrictions: 'Industry news. Skip podcast and sponsored posts.', enabled: true },
        { url: 'https://stratcann.com/', label: 'StratCann', restrictions: 'Canadian market news.', enabled: true },
        { url: 'https://hemptoday.net/', label: 'HempToday', restrictions: 'Hemp/CBD supply chain and international hemp policy.', enabled: true },
        { url: 'https://prohibitionpartners.com/international-cannabis-weekly/', label: 'Prohibition Partners ICW', restrictions: 'International cannabis weekly round-ups.', enabled: true },
    ];
}

function loadPrioritySources() {
    try {
        const saved = JSON.parse(localStorage.getItem(PRIORITY_SOURCES_KEY) || 'null');
        if (saved && Array.isArray(saved.sources)) {
            prioritySources = saved.sources;
            prioritySourceChecks = saved.checks || {};
            const since = document.getElementById('priority-since');
            const until = document.getElementById('priority-until');
            const limit = document.getElementById('priority-per-source-limit');
            if (since && saved.since) since.value = saved.since;
            if (until && saved.until) until.value = saved.until;
            if (limit && saved.perSourceLimit) limit.value = saved.perSourceLimit;
            if (saved.collapsed) togglePrioritySourcesBox(true);
        } else {
            prioritySources = defaultPrioritySources();
        }
    } catch (e) {
        prioritySources = defaultPrioritySources();
    }
    if (!document.getElementById('priority-since')?.value) setPriorityWindowDays(14, { silent: true });
    renderPrioritySources();
}

window.savePrioritySources = function () {
    try {
        localStorage.setItem(PRIORITY_SOURCES_KEY, JSON.stringify({
            sources: prioritySources,
            checks: prioritySourceChecks,
            since: document.getElementById('priority-since')?.value || '',
            until: document.getElementById('priority-until')?.value || '',
            perSourceLimit: document.getElementById('priority-per-source-limit')?.value || 40,
            collapsed: document.getElementById('priority-sources-body')?.classList.contains('hidden') || false,
        }));
    } catch (e) {
        console.error('Failed to save priority sources', e);
    }
    updatePrioritySourcesSummary();
};

window.togglePrioritySourcesBox = function (forceCollapse) {
    const body = document.getElementById('priority-sources-body');
    const caret = document.getElementById('priority-sources-caret');
    if (!body) return;
    const collapse = forceCollapse === true ? true : !body.classList.contains('hidden') ;
    body.classList.toggle('hidden', collapse);
    if (caret) caret.textContent = collapse ? '▸' : '▾';
    if (forceCollapse !== true) savePrioritySources();
};

window.setPriorityWindowDays = function (days, options = {}) {
    const since = document.getElementById('priority-since');
    const until = document.getElementById('priority-until');
    const now = new Date();
    if (until) until.value = now.toISOString().slice(0, 10);
    if (since) since.value = new Date(now.getTime() - days * 864e5).toISOString().slice(0, 10);
    if (!options.silent) savePrioritySources();
};

function accessBadge(url) {
    const check = prioritySourceChecks[url];
    if (!check) return '<span class="text-[0.72rem] text-[#999]">not checked</span>';
    if (!check.ok) {
        return `<span class="text-[0.72rem] text-[#c62828] font-semibold" title="${escapeHtml(check.blockReason || 'blocked')}">✕ blocked</span>`;
    }
    const label = check.degraded ? '◐ limited' : '✓ readable';
    const color = check.degraded ? '#e65100' : '#2e7d32';
    const detail = `${check.method || 'ok'}${check.itemCount ? ` · ${check.itemCount} items` : ''}${check.articlesChecked ? ` · pages ${check.articlesReadable}/${check.articlesChecked}` : ''}`;
    return `<span class="text-[0.72rem] font-semibold" style="color:${color}" title="${escapeHtml((check.notes || []).join(' '))}">${label}</span><br><span class="text-[0.65rem] text-[#888]">${escapeHtml(detail)}</span>`;
}

function renderPrioritySources() {
    const list = document.getElementById('priority-sources-list');
    if (!list) return;

    if (prioritySources.length === 0) {
        list.innerHTML = '<div class="p-3 text-[0.85rem] text-[#888]">No sources yet. Use "+ Add site".</div>';
        updatePrioritySourcesSummary();
        return;
    }

    list.innerHTML = prioritySources.map((s, i) => `
        <div class="grid grid-cols-[36px_1.1fr_1.4fr_150px_70px] gap-2 items-center py-1.5 px-2.5 border-t border-[#eee] ${s.enabled === false ? 'opacity-50' : ''}">
          <input type="checkbox" ${s.enabled === false ? '' : 'checked'} onchange="updatePrioritySource(${i}, 'enabled', this.checked)" title="Include in sweeps">
          <div class="flex flex-col gap-0.5">
            <input type="text" value="${escapeHtml(s.label || '')}" placeholder="Name" class="py-0.5 px-1 text-[0.8rem] font-semibold border border-transparent hover:border-[#ddd] rounded bg-transparent" onchange="updatePrioritySource(${i}, 'label', this.value)">
            <input type="text" value="${escapeHtml(s.url || '')}" placeholder="https://example.com/" class="py-0.5 px-1 text-[0.72rem] text-[#0d47a1] border border-transparent hover:border-[#ddd] rounded bg-transparent" onchange="updatePrioritySource(${i}, 'url', this.value)">
          </div>
          <input type="text" value="${escapeHtml(s.restrictions || '')}" placeholder="e.g. policy only, skip press releases" class="py-1 px-1.5 text-[0.78rem] border border-[#e5e5e5] rounded" onchange="updatePrioritySource(${i}, 'restrictions', this.value)">
          <div class="leading-tight">${accessBadge(s.url)}</div>
          <div class="flex gap-1 justify-end">
            <button type="button" class="header-link-btn text-[0.72rem]" onclick="checkPrioritySources(${i})" title="Check this site only">Check</button>
            <button type="button" class="header-link-btn text-[0.72rem] text-[#d32f2f]" onclick="removePrioritySource(${i})" title="Remove">✕</button>
          </div>
        </div>`).join('');

    updatePrioritySourcesSummary();
}

function updatePrioritySourcesSummary() {
    const el = document.getElementById('priority-sources-summary');
    if (!el) return;
    const on = prioritySources.filter((s) => s.enabled !== false).length;
    const checked = prioritySources.filter((s) => prioritySourceChecks[s.url]).length;
    const blocked = prioritySources.filter((s) => prioritySourceChecks[s.url] && !prioritySourceChecks[s.url].ok).length;
    el.textContent = `${on}/${prioritySources.length} on` + (checked ? ` · ${checked} checked${blocked ? ` · ${blocked} blocked` : ''}` : '');
}

window.updatePrioritySource = function (index, field, value) {
    if (!prioritySources[index]) return;
    if (field === 'url') {
        let url = String(value).trim();
        if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
        // The old URL's access result no longer describes this row.
        delete prioritySourceChecks[prioritySources[index].url];
        prioritySources[index].url = url;
    } else {
        prioritySources[index][field] = value;
    }
    savePrioritySources();
    if (field === 'url' || field === 'enabled') renderPrioritySources();
};

window.addPrioritySource = function () {
    prioritySources.push({ url: '', label: '', restrictions: '', enabled: true });
    savePrioritySources();
    renderPrioritySources();
};

window.removePrioritySource = function (index) {
    const s = prioritySources[index];
    if (!s) return;
    if (s.url && !confirm(`Remove ${s.label || s.url} from priority sources?`)) return;
    delete prioritySourceChecks[s.url];
    prioritySources.splice(index, 1);
    savePrioritySources();
    renderPrioritySources();
};

window.resetPrioritySources = function () {
    if (!confirm('Restore the built-in starter list? Your edits to this list will be lost.')) return;
    prioritySources = defaultPrioritySources();
    prioritySourceChecks = {};
    savePrioritySources();
    renderPrioritySources();
};

function setPriorityStatus(message, color = '#2f6e63') {
    const el = document.getElementById('priority-sources-status');
    if (!el) return;
    el.textContent = message || '';
    el.style.color = color;
}

/**
 * Pre-flight: fetch each site and report whether it can be read, by which route, and
 * whether its actual article pages come back or hit a bot wall. Pass an index to
 * check a single row.
 */
window.checkPrioritySources = async function (index) {
    const targets = typeof index === 'number'
        ? [prioritySources[index]].filter(Boolean)
        : prioritySources.filter((s) => s.url);
    if (targets.length === 0) return alert('Add at least one site first.');

    const btn = document.getElementById('btn-check-priority-sources');
    if (typeof index !== 'number' && btn) { btn.disabled = true; btn.textContent = 'Checking...'; }
    setPriorityStatus(`Checking ${targets.length} site${targets.length > 1 ? 's' : ''}...`, '#666');

    try {
        const response = await fetch('/api/articles/priority-sources/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sources: targets }),
        });
        const data = await parseJsonResponse(response, 'Access check failed: server returned HTML instead of JSON.');
        if (!data.success || !Array.isArray(data.results)) throw new Error(data.error || 'Access check failed.');

        data.results.forEach((r) => { prioritySourceChecks[r.url] = r; });
        savePrioritySources();
        renderPrioritySources();
        renderPriorityAccessReport(data.results);

        const okCount = data.results.filter((r) => r.ok && !r.degraded).length;
        const limited = data.results.filter((r) => r.ok && r.degraded).length;
        const blocked = data.results.filter((r) => !r.ok).length;
        setPriorityStatus(`${okCount} fully readable, ${limited} limited, ${blocked} blocked.`, blocked ? '#c62828' : '#2f6e63');
    } catch (err) {
        console.error(err);
        setPriorityStatus(`Access check failed: ${err.message}`, '#c62828');
    } finally {
        if (typeof index !== 'number' && btn) { btn.disabled = false; btn.textContent = 'Check access'; }
    }
};

function renderPriorityAccessReport(results) {
    const box = document.getElementById('priority-sources-report');
    if (!box) return;
    box.innerHTML = `<div class="font-semibold mb-1.5">Access check</div>` + results.map((r) => {
        const head = r.ok
            ? (r.degraded
                ? `<span style="color:#e65100">◐ ${escapeHtml(r.label)}</span> — limited (${escapeHtml(r.method || '')})`
                : `<span style="color:#2e7d32">✓ ${escapeHtml(r.label)}</span> — readable via ${escapeHtml(r.method || '')}${r.uaProfile === 'bot' ? ' (needs non-browser User-Agent)' : ''}`)
            : `<span style="color:#c62828">✕ ${escapeHtml(r.label)}</span> — no route in${r.blockReason ? `: ${escapeHtml(r.blockReason)}` : ''}`;
        const notes = (r.notes || []).map((n) => `<li>${escapeHtml(n)}</li>`).join('');
        return `<div class="mb-2"><div>${head}</div>${notes ? `<ul class="list-disc ml-5 text-[0.75rem] text-[#666]">${notes}</ul>` : ''}</div>`;
    }).join('');
    showWithClass(box, 'block');
}

/** Harvest every article in the window from the enabled sites, then evaluate them. */
window.sweepPrioritySources = async function () {
    const enabled = prioritySources.filter((s) => s.enabled !== false && s.url);
    if (enabled.length === 0) return alert('No sites are enabled. Tick at least one row.');

    const since = document.getElementById('priority-since')?.value || '';
    const until = document.getElementById('priority-until')?.value || '';
    const perSourceLimit = parseInt(document.getElementById('priority-per-source-limit')?.value, 10) || 40;
    const model = document.getElementById('ai-model').value;

    const btn = document.getElementById('btn-sweep-priority-sources');
    btn.disabled = true;
    btn.textContent = 'Sweeping...';
    setPriorityStatus(`Pulling articles from ${enabled.length} site${enabled.length > 1 ? 's' : ''}...`, '#666');

    try {
        const response = await fetch('/api/articles/priority-sources/sweep', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sources: enabled,
                since,
                until,
                model,
                perSourceLimit,
                existingUrls: articles.map((a) => a.url).filter(Boolean),
                extraInstructions: document.getElementById('step2-query')?.value.trim() || '',
            }),
        });

        const data = await parseJsonResponse(
            response,
            'Sweep failed: server returned HTML instead of JSON (often a timeout). Try a shorter date window or fewer sites.',
        );

        if (!data.success) {
            showAiFailureAlert('Priority sweep failed', data);
            setPriorityStatus('Sweep failed.', '#c62828');
            return;
        }

        renderPrioritySweepReport(data);

        const newArticles = data.articles || [];
        if (newArticles.length === 0) {
            setPriorityStatus(`Swept ${data.harvested || 0} articles — none met the criteria.`, '#e65100');
            return;
        }

        // Same merge path as an AI search: dedupe, assign ids, save immediately.
        const existingUrlSet = new Set(articles.map((a) => normalizeUrl(a.url)));
        const fresh = newArticles.filter((a) => !existingUrlSet.has(normalizeUrl(a.url)));
        const maxId = articles.reduce((max, a) => Math.max(max, a.id || 0), 0);
        const addedAt = new Date().toISOString();
        fresh.forEach((a, i) => { a.id = maxId + i + 1; a.addedAt = addedAt; });

        articles = articles.concat(fresh);
        saveState();
        renderArticles();

        setPriorityStatus(`Swept ${data.harvested} articles, kept ${fresh.length}. Verifying...`, '#2f6e63');

        // Skip verification for Google-News redirect links — they can't be resolved
        // server-side and verification would drop them.
        const verifiable = fresh.filter((a) => !a.isRedirectLink);
        if (verifiable.length) {
            try {
                // Pass the pre-existing list so verify can also drop title-level dupes.
                const verifyResult = await verifyArticlesRemote(verifiable, articles.filter((a) => a.addedAt !== addedAt));
                const verified = verifyResult.articles || [];

                // Verification can rewrite a URL (redirect resolution), so title is
                // carried as a second key — otherwise a rewritten article looks like
                // one that was dropped.
                const lookup = new Map();
                verified.forEach((a) => {
                    lookup.set(normalizeUrl(a.url), a);
                    if (a.title) lookup.set(`t:${a.title.toLowerCase().trim()}`, a);
                });
                const find = (a) => lookup.get(normalizeUrl(a.url)) || lookup.get(`t:${String(a.title || '').toLowerCase().trim()}`);

                const verifiableIds = new Set(verifiable.map((a) => a.id));
                articles = articles
                    .map((a) => {
                        const v = find(a);
                        return v ? { ...a, ...v, id: a.id, addedAt: a.addedAt, notes: a.notes } : a;
                    })
                    // Drop the ones verification rejected — a dead URL, or a real
                    // publication date outside the newsletter's window.
                    .filter((a) => !(verifiableIds.has(a.id) && a.addedAt === addedAt && !find(a)));

                saveState();
                renderArticles();
            } catch (verifyErr) {
                console.error('Sweep verification failed (articles kept):', verifyErr);
            }
        }
        setPriorityStatus(`Swept ${data.harvested} articles, added ${articles.filter(a=>a.addedAt===addedAt).length} to the list.` + verifyReportSuffix(), '#2f6e63');
    } catch (err) {
        console.error(err);
        if (isAnthropicCreditError(err.message)) {
            showAiFailureAlert('Priority sweep failed — Claude credits', { error: err.message });
        } else {
            setPriorityStatus(`Sweep failed: ${err.message}`, '#c62828');
        }
    } finally {
        btn.disabled = false;
        btn.textContent = 'Sweep sources';
    }
};

function renderPrioritySweepReport(data) {
    const box = document.getElementById('priority-sources-report');
    if (!box) return;
    const rows = (data.sources || []).map((s) => {
        const status = s.blocked
            ? '<span style="color:#c62828">no route in</span>'
            : `via ${escapeHtml(s.method || '?')}${s.degraded ? ' <span style="color:#e65100">(headlines only)</span>' : ''}`;
        return `<li><b>${escapeHtml(s.label)}</b> — ${s.harvested} article${s.harvested === 1 ? '' : 's'} ${status}</li>`;
    }).join('');
    const errors = (data.evalErrors || []).length
        ? `<div class="mt-1.5 text-[#c62828]">Some batches failed to evaluate: ${escapeHtml(data.evalErrors.join('; '))}</div>`
        : '';
    box.innerHTML = `<div class="font-semibold mb-1.5">Sweep: ${data.harvested} pulled, ${data.kept} met the criteria</div>
        <ul class="list-disc ml-5 text-[0.78rem]">${rows}</ul>${errors}`;
    showWithClass(box, 'block');
}

function normalizeArticleTitle(title) {
    return String(title || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[''`´]/g, "'")
        .replace(/[""]/g, '')
        .replace(/[^\w\s']/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function filterDuplicateArticlesClient(incoming, existingArticles = []) {
    const urlSet = new Set((existingArticles || []).map((a) => normalizeUrl(a.url)).filter(Boolean));
    const titleSet = new Set(
        (existingArticles || [])
            .map((a) => normalizeArticleTitle(a.title))
            .filter((t) => t.length >= 12),
    );
    const articles = [];
    let skipped = 0;
    for (const article of incoming || []) {
        const urlKey = normalizeUrl(article.url);
        const titleKey = normalizeArticleTitle(article.title);
        if (urlKey && urlSet.has(urlKey)) { skipped += 1; continue; }
        if (titleKey.length >= 12 && titleSet.has(titleKey)) { skipped += 1; continue; }
        if (urlKey) urlSet.add(urlKey);
        if (titleKey.length >= 12) titleSet.add(titleKey);
        articles.push(article);
    }
    return { articles, skipped };
}

// Stage 2 (URL verification + categorization) is a separate, slower request from
// the AI search itself, so a timeout there never throws away search results the
// user already paid Claude credits for. Callers should already have the raw
// articles rendered/saved before calling this.
/**
 * The date window every intake path is held to. Lives on the Priority Sources row so
 * there is one control rather than one per feature; verification uses it to drop
 * articles whose real publication date falls outside the newsletter's period.
 */
function currentDateWindow() {
    return {
        since: document.getElementById('priority-since')?.value || '',
        until: document.getElementById('priority-until')?.value || '',
    };
}

let lastVerifyReport = null;

async function verifyArticlesRemote(rawArticles, existingArticles = []) {
    const { since, until } = currentDateWindow();
    const response = await fetch('/api/articles/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            articles: rawArticles,
            existingArticles: Array.isArray(existingArticles) ? existingArticles : [],
            since,
            until,
        }),
    });
    const data = await parseJsonResponse(
        response,
        'Verification failed: server returned HTML instead of JSON (often a timeout). Your found articles were kept, unverified.',
    );
    if (!data.success || !Array.isArray(data.articles)) {
        throw new Error(data.error || 'Verification failed.');
    }
    lastVerifyReport = {
        corrected: data.datesCorrected || [],
        rejected: Array.isArray(data.rejected) ? data.rejected : [],
        window: `${since || 'any'} to ${until || 'today'}`,
    };
    return {
        articles: data.articles,
        rejectedCount: data.rejectedCount || 0,
        duplicateCount: data.duplicateCount || 0,
        rejected: Array.isArray(data.rejected) ? data.rejected : [],
    };
}

function formatVerifyStatusMessage(keptCount, rejectedCount, duplicateCount = 0) {
    const parts = [`Verified ${keptCount} articles`];
    const extras = [];
    if (rejectedCount) extras.push(`${rejectedCount} rejected`);
    if (duplicateCount) extras.push(`${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'} removed`);
    if (extras.length) parts.push(`(${extras.join(', ')})`);
    return `${parts[0]}${parts[1] ? ` ${parts[1]}` : ''}.`;
}

/** Short sentence describing any date corrections/drops from the last verify pass. */
function verifyReportSuffix() {
    if (!lastVerifyReport) return '';
    const parts = [];
    if (lastVerifyReport.corrected.length) parts.push(`corrected ${lastVerifyReport.corrected.length} wrong date(s)`);
    const outOfWindow = lastVerifyReport.rejected.filter((r) => /outside/.test(r.reason || '')).length;
    if (outOfWindow) parts.push(`dropped ${outOfWindow} published outside ${lastVerifyReport.window}`);
    return parts.length ? ` — ${parts.join(', ')}.` : '';
}

// --- MODIFY EXISTING ARTICLES ---

const MODIFY_BATCH_SIZE = 8;
const MODIFY_MAX_PER_REQUEST = 12;

function isTitleFocusedModifyPrompt(prompt) {
    const p = String(prompt || '').toLowerCase();
    return p.includes('title') && !p.includes('description') && !p.includes('summary');
}

async function callModifyArticlesBatchOnce(prompt, batchArticles, model) {
    const response = await fetch('/api/articles/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt,
            articles: batchArticles,
            model,
            titleOnly: isTitleFocusedModifyPrompt(prompt),
        }),
    });

    const data = await parseJsonResponse(
        response,
        'Modify failed: server returned HTML instead of JSON (often a timeout). Try fewer articles per batch or Claude Sonnet.',
    );

    if (!response.ok) {
        throw new Error(extractApiErrorMessage(data) || `HTTP ${response.status}`);
    }

    if (!data.success || !Array.isArray(data.articles)) {
        throw new Error(extractApiErrorMessage(data) || 'Modify did not return articles');
    }

    return data.articles;
}

async function callModifyArticlesBatch(prompt, batchArticles, model) {
    return callModifyArticlesBatchOnce(prompt, batchArticles, model);
}

async function modifyExistingArticles() {
    const prompt = document.getElementById('step2-query').value.trim();
    if (!prompt) return alert('Please enter a modification instruction.');

    const selectedIndices = articles
        .map((a, i) => (a.selected !== false ? i : -1))
        .filter((i) => i !== -1);
    if (selectedIndices.length === 0) {
        return alert('No articles selected. Check the Select column (All/None), then try again.');
    }

    const selectedArticles = selectedIndices.map((i) => ({
        index: i,
        article: articles[i],
    }));

    const btn = document.getElementById('btn-step2-query');
    const status = document.getElementById('step2-query-status');
    const modelEl = document.getElementById('ai-model');
    const model = modelEl ? modelEl.value : 'claude-sonnet-4-6';

    btn.disabled = true;
    hideWithClass(status);

    const batches = [];
    for (let i = 0; i < selectedArticles.length; i += MODIFY_BATCH_SIZE) {
        batches.push(selectedArticles.slice(i, i + MODIFY_BATCH_SIZE));
    }

    let modifiedTotal = 0;

    try {
        for (let b = 0; b < batches.length; b++) {
            const batch = batches[b];
            btn.textContent = batches.length > 1
                ? `Modifying ${b + 1}/${batches.length}...`
                : 'Modifying...';
            if (status) {
                status.textContent = batches.length > 1
                    ? `Processing batch ${b + 1} of ${batches.length} (${batch.length} articles)...`
                    : 'Modifying...';
                showWithClass(status, 'block');
            }

            const payload = batch.map(({ index, article }) => ({
                _index: index,
                title: article.title,
                description: article.description,
                url: article.url,
                date: article.date || '',
            }));

            const results = await callModifyArticlesBatch(prompt, payload, model);

            // Results are matched to articles BY POSITION, so a short response would
            // shift every later article onto the wrong row and silently overwrite it
            // (e.g. when an instruction tempts the model into dropping items, which
            // Modify must never do — it can only edit fields in place).
            if (results.length !== batch.length) {
                throw new Error(
                    `The AI returned ${results.length} articles for a batch of ${batch.length}. `
                    + 'Nothing was changed, to avoid overwriting the wrong rows. '
                    + 'Modify can only edit articles in place — to drop redundant coverage, use "Group same stories".',
                );
            }

            const count = batch.length;
            for (let i = 0; i < count; i++) {
                const originalIndex = batch[i].index;
                const original = articles[originalIndex];
                const modArticle = results[i];
                if (!original || !modArticle) continue;
                if (modArticle.title != null) original.title = modArticle.title;
                if (modArticle.description != null) original.description = modArticle.description;
                if (modArticle.url) original.url = modArticle.url;
                if (modArticle.date != null) original.date = modArticle.date;
                modifiedTotal++;
            }
        }

        saveRecentPrompt(prompt);
        saveState();
        renderArticles();
        setAiCreditWarningVisible(false);
        if (status) {
            status.textContent = `Modified ${modifiedTotal} article(s) in ${batches.length} batch(es). Rankings and status were kept.`;
            showWithClass(status, 'block');
        }
    } catch (err) {
        console.error(err);
        if (isAnthropicCreditError(err.message)) {
            showAiFailureAlert('Modify failed — Claude credits', { error: err.message });
        } else {
            alert('Modify failed: ' + (err.message || 'See browser console for details.'));
        }
    } finally {
        btn.disabled = false;
        btn.textContent = 'Apply Changes';
    }
}

// Recent Prompts Logic
function loadRecentPrompts() {
    const prompts = JSON.parse(localStorage.getItem('recentPrompts') || '[]');
    ['recent-prompts', 'recent-prompts-step2'].forEach((containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        if (prompts.length === 0) return;

        const label = document.createElement('span');
        label.textContent = 'Recent: ';
        label.style.fontWeight = '600';
        container.appendChild(label);

        prompts.forEach(p => {
            const span = document.createElement('span');
            span.textContent = p.length > 50 ? p.substring(0, 50) + '...' : p;
            span.title = p;
            span.style.cursor = 'pointer';
            span.style.textDecoration = 'underline';
            span.style.marginRight = '10px';
            span.onclick = () => {
                setAiQuery(p);
                saveState();
            };
            container.appendChild(span);
        });
    });
}

function saveRecentPrompt(prompt) {
    let prompts = JSON.parse(localStorage.getItem('recentPrompts') || '[]');
    // Remove duplicate if exists
    prompts = prompts.filter(p => p !== prompt);
    // Add to front
    prompts.unshift(prompt);
    // Keep only last 3
    if (prompts.length > 3) prompts = prompts.slice(0, 3);
    localStorage.setItem('recentPrompts', JSON.stringify(prompts));
    loadRecentPrompts();
}

loadRecentPrompts();
populateSavedDropdown();
loadPrioritySources();

syncStatsVisibility();

let aiQuerySyncTimeout = null;
function syncAiQueryFromInput(sourceEl) {
    const value = sourceEl ? sourceEl.value : '';
    setAiQuery(value);
    if (aiQuerySyncTimeout) clearTimeout(aiQuerySyncTimeout);
    aiQuerySyncTimeout = setTimeout(() => saveState(), 600);
}

['ai-prompt', 'step2-query'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', () => syncAiQueryFromInput(el));
    }
});

// "Find Articles" Button Logic
const searchBtn = document.getElementById('btn-search-articles');
const nextStep2Btn = document.getElementById('btn-next-step-2');
const nextStep2BottomBtn = document.getElementById('btn-next-step-2-bottom');
const searchStatus = document.getElementById('search-status');

if (nextStep2Btn) {
    nextStep2Btn.addEventListener('click', () => switchStep(2));
}

if (nextStep2BottomBtn) {
    nextStep2BottomBtn.addEventListener('click', () => switchStep(2));
}

if (searchBtn) {
    searchBtn.addEventListener('click', async () => {
        const prompt = document.getElementById('ai-prompt').value;
        const newsletterName = document.getElementById('newsletter-name').value;
        const model = document.getElementById('ai-model').value;
        const searchEngine = getArticleSearchEngine();

        if (!prompt) {
            alert("Please enter a prompt to search for articles.");
            return;
        }

        if (articles.length > 0) {
            if (!confirm(`This will replace the ${articles.length} articles currently in the workspace.\n\nMake sure you've saved first if you need them.\n\nContinue?`)) {
                return;
            }
        }

        saveRecentPrompt(prompt);
        setAiQuery(prompt);
        if (newsletterName) setCurrentSessionName(newsletterName);

        console.log("Initiating AI Search...", { newsletterName, prompt, model, searchEngine });

        searchBtn.disabled = true;
        searchBtn.textContent = "Searching...";
        if (searchStatus) hideWithClass(searchStatus);

        try {
            const response = await fetch('/api/articles/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, newsletterName, model, searchEngine }),
            });

            const data = await parseJsonResponse(
                response,
                'Search failed: server returned HTML instead of JSON (often a timeout or missing API key on Vercel).',
            );

            if (data.success) {
                console.log("AI Search Results:", data.articles);
                const now = new Date().toISOString();
                const addedAtByUrl = {};
                data.articles.forEach(a => {
                    if (!a.addedAt) a.addedAt = now;
                    addedAtByUrl[normalizeUrl(a.url)] = a.addedAt;
                });

                // Show + save the raw results immediately so they're never lost,
                // even if the verification/categorization step below is slow or fails.
                articles = data.articles;
                batchFilter = null; // Clear batch filter so new articles show up
                saveState();
                renderArticles();

                if (searchStatus) {
                    searchStatus.textContent = data.stage === 'raw'
                        ? `Found ${data.articles.length} articles. Verifying & categorizing...`
                        : `Found ${data.articles.length} articles!`;
                    showWithClass(searchStatus, 'inline');
                }
                if (nextStep2Btn) {
                    showWithClass(nextStep2Btn, 'inline-block');
                }

                if (data.stage === 'raw') {
                    try {
                        const verifyResult = await verifyArticlesRemote(data.articles, []);
                        articles = verifyResult.articles.map(a => ({ ...a, addedAt: addedAtByUrl[normalizeUrl(a.url)] || now }));
                        saveState();
                        renderArticles();
                        if (searchStatus) {
                            searchStatus.textContent = formatVerifyStatusMessage(
                                articles.length,
                                verifyResult.rejectedCount,
                                (data.duplicateCount || 0) + verifyResult.duplicateCount,
                            );
                        }
                    } catch (verifyErr) {
                        console.error("Verification error (raw articles were kept):", verifyErr);
                        if (searchStatus) {
                            searchStatus.textContent = `Found ${data.articles.length} articles, but verification/categorization failed or timed out — kept them unverified. You can edit categories manually, or search again to retry.`;
                        }
                    }
                }

            } else {
                // Show specific error message from backend (e.g. "Credit balance too low")
                const clarification = await getAiClarificationFromError(data);
                const details = clarification || String(data.details || '').trim();
                showAiFailureAlert('Search failed', data);
                if (data.details) console.error("Error Details:", data.details);
            }
        } catch (err) {
            console.error("Network/Parsing Error:", err);
            if (isAnthropicCreditError(err.message)) {
                showAiFailureAlert('Search failed — Claude credits', { error: err.message });
            } else {
                alert("Search failed. Please check your connection and try again.\nSee console for details.");
            }
        } finally {
            searchBtn.disabled = false;
            searchBtn.textContent = "Find Articles";
        }
    });
}

// "Upload & Load" Button Logic
const uploadBtn = document.getElementById('btn-upload-file');
if (uploadBtn) {
    uploadBtn.addEventListener('click', async () => {
        const success = await uploadArticlesWorkbook({
            inputId: 'excel-upload',
            buttonId: 'btn-upload-file',
            buttonLabel: 'Upload & Load',
            replacePrompt: 'You have {count} articles in your workspace. This will add the new articles from the Excel sheet to your list without deleting them. Continue?',
            successMessage: 'Loaded {count} articles for "{name}".',
            switchToStep2: true,
        });
        if (success) {
            updateChosenFileName('excel-upload', 'file-name');
        }
    });
}

const articleViewUploadBtn = document.getElementById('btn-article-view-upload');
if (articleViewUploadBtn) {
    articleViewUploadBtn.addEventListener('click', async () => {
        const success = await uploadArticlesWorkbook({
            inputId: 'article-view-excel-upload',
            buttonId: 'btn-article-view-upload',
            buttonLabel: 'Upload XLS Here',
            replacePrompt: 'You have {count} articles. This will add the articles from the Excel sheet to your list without deleting them. Continue?',
            successMessage: 'Restored {count} articles into "{name}". You can continue from Article View now.',
        });
        if (success) {
            updateChosenFileName('article-view-excel-upload', 'article-view-file-name');
        }
    });
}

// Step 2 Buttons
const btnBackStep1 = document.getElementById('btn-back-step-1');
const btnNextStep3 = document.getElementById('btn-next-step-3');

if (btnBackStep1) {
    btnBackStep1.addEventListener('click', () => switchStep(1));
}

if (btnNextStep3) {
    btnNextStep3.addEventListener('click', () => switchStep(3));
}

// Step 3 Buttons
const btnBackStep2 = document.getElementById('btn-back-step-2');
const btnNextStep4 = document.getElementById('btn-next-step-4');

if (btnBackStep2) {
    btnBackStep2.addEventListener('click', () => switchStep(2));
}

if (btnNextStep4) {
    btnNextStep4.addEventListener('click', () => switchStep(4));
}

// Step 4 Buttons
const btnBackStep3 = document.getElementById('btn-back-step-3');
const btnNextStep5 = document.getElementById('btn-next-step-5');

if (btnBackStep3) {
    btnBackStep3.addEventListener('click', () => switchStep(3));
}

if (btnNextStep5) {
    btnNextStep5.addEventListener('click', () => switchStep(5));
}

// Step 5 Buttons
const btnBackStep4 = document.getElementById('btn-back-step-4');
const btnNextStep6 = document.getElementById('btn-next-step-6');

if (btnBackStep4) {
    btnBackStep4.addEventListener('click', () => switchStep(4));
}

if (btnNextStep6) {
    btnNextStep6.addEventListener('click', () => switchStep(6));
}

// Step 6 Buttons
const btnBackStep5 = document.getElementById('btn-back-step-5');

if (btnBackStep5) {
    btnBackStep5.addEventListener('click', () => switchStep(5));
}

// Saved Newsletter Selector (Step 1)
const savedSessionsDropdownStep1 = document.getElementById('saved-sessions-dropdown-step1');
if (savedSessionsDropdownStep1) {
    savedSessionsDropdownStep1.addEventListener('change', (e) => {
        const selectedName = e.target.value;
        if (selectedName) {
            setCurrentSessionName(selectedName);
        }
    });
}

const newsletterNameInput = document.getElementById('newsletter-name');
if (newsletterNameInput) {
    newsletterNameInput.addEventListener('input', () => {
        setCurrentSessionName(newsletterNameInput.value.trim());
    });
}

// ----------------------------------------------------
// Archive Search Logic (Past Newsletters)
// ----------------------------------------------------

let cachedSessionsForSearch = null;
let archiveSearchDebounceTimer = null;

window.openArchiveSearch = async function() {
    const modal = document.getElementById('archive-search-modal');
    const content = document.getElementById('archive-search-modal-content');
    const input = document.getElementById('archive-search-input');
    const stats = document.getElementById('archive-search-stats');

    if (!modal || !content) return;

    // Clear search input and results
    if (input) input.value = '';
    const container = document.getElementById('archive-search-results-container');
    if (container) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-[350px] text-gray-400 gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 text-[#2f6e632d]">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
                </svg>
                <span class="text-sm text-[#555] font-medium">Type a word above to search previous newsletters...</span>
            </div>
        `;
    }
    if (stats) stats.textContent = "Newsletter database loaded. Ready to search.";

    // Show modal and start animations
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);

    if (input) input.focus();
    
    // Add Esc key listener
    window.addEventListener('keydown', handleArchiveSearchEscKey);

    // Lazy-load sessions if not already cached
    if (!cachedSessionsForSearch) {
        stats.textContent = "Loading previous newsletters database...";
        try {
            const res = await fetch('/api/state?key=sessions');
            if (res.ok) {
                const { value } = await res.json();
                cachedSessionsForSearch = value || {};
                stats.textContent = "Newsletter database loaded. Ready to search.";
            } else {
                throw new Error("Server responded with " + res.status);
            }
        } catch (e) {
            console.warn("Failed to fetch sessions from server, falling back to local storage:", e);
            cachedSessionsForSearch = JSON.parse(localStorage.getItem('newsletter_saved_sessions') || '{}');
            stats.textContent = "Offline newsletter database loaded.";
        }
        
        // Trigger search on whatever is currently typed in
        if (input && input.value.trim()) {
            performArchiveSearch();
        }
    }
};

window.closeArchiveSearch = function() {
    const modal = document.getElementById('archive-search-modal');
    const content = document.getElementById('archive-search-modal-content');
    if (!modal || !content) return;
    
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }, 200);
    
    window.removeEventListener('keydown', handleArchiveSearchEscKey);
};

function handleArchiveSearchEscKey(event) {
    if (event.key === 'Escape') {
        closeArchiveSearch();
    }
}

window.debounceArchiveSearch = function() {
    clearTimeout(archiveSearchDebounceTimer);
    archiveSearchDebounceTimer = setTimeout(() => {
        performArchiveSearch();
    }, 250);
};

window.performArchiveSearch = function() {
    const query = document.getElementById('archive-search-input').value.trim();
    const container = document.getElementById('archive-search-results-container');
    const stats = document.getElementById('archive-search-stats');
    
    if (!container) return;
    
    if (!query) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-[350px] text-gray-400 gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 text-[#2f6e632d]">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
                </svg>
                <span class="text-sm text-[#555] font-medium">Type a word above to search previous newsletters...</span>
            </div>
        `;
        if (stats) stats.textContent = "No search query entered.";
        return;
    }
    
    if (!cachedSessionsForSearch) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-[350px] text-[#856404] bg-[#fff3cd] border border-[#fbc02d] rounded-xl p-5 gap-2">
                <span class="font-bold">Database is loading...</span>
                <span class="text-xs">Your past newsletter data is loading from Supabase. Search will automatically execute once ready.</span>
            </div>
        `;
        return;
    }
    
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    // Sort sessions in reverse chronological order (newest sessions first)
    const sortedSessions = Object.entries(cachedSessionsForSearch).sort((a, b) => {
        const aName = a[0];
        const bName = b[0];
        
        // Custom extract number helper (e.g. "Week 19" -> 19)
        const aNum = parseInt(aName.replace(/\D/g, '')) || 0;
        const bNum = parseInt(bName.replace(/\D/g, '')) || 0;
        
        if (aNum !== bNum) return bNum - aNum;
        return bName.localeCompare(aName);
    });
    
    for (const [sessionName, sessionData] of sortedSessions) {
        const sessionArticles = sessionData.articles || [];
        for (const article of sessionArticles) {
            if (article.title && article.title.toLowerCase().includes(lowerQuery)) {
                // Determine category ranks (must be 'Y', 'YM', or numerical rank to be considered "included")
                const activeCategories = [];
                ['MED', 'THC', 'CBD', 'INV'].forEach(cat => {
                    const r = String((article.ranks && article.ranks[cat]) || '').trim().toUpperCase();
                    if (r === 'Y' || r === 'YM' || /^\\d+$/.test(r)) {
                        activeCategories.push(cat);
                    }
                });
                
                // Fallback check
                if (activeCategories.length === 0 && Array.isArray(article.categories)) {
                    article.categories.forEach(cat => {
                        if (['MED', 'THC', 'CBD', 'INV'].includes(cat) && (article.status === 'Y' || article.status === 'YM')) {
                            activeCategories.push(cat);
                        }
                    });
                }
                
                results.push({
                    title: article.title,
                    url: article.url || '#',
                    date: article.date || (article.addedAt ? article.addedAt.substring(0, 10) : '') || (sessionData.savedAt ? sessionData.savedAt.substring(0, 10) : '') || 'Unknown Date',
                    session: sessionName,
                    categories: [...new Set(activeCategories)],
                });
            }
        }
    }
    
    if (stats) {
        stats.textContent = `Found ${results.length} matching articles in previous issues.`;
    }
    
    if (results.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-[350px] text-gray-500 gap-3 bg-gray-50/50 rounded-2xl border border-dashed border-[#84725322]">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 text-gray-300">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-sm font-semibold">No matches found</span>
                <span class="text-xs text-[#777] text-center max-w-[320px]">"${query}" was not found in any article titles of previous newsletters. Feel free to use this topic!</span>
            </div>
        `;
        return;
    }
    
    // Highlight helper
    const highlightMatches = (text, search) => {
        if (!search) return text;
        const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
        return text.replace(regex, `<mark class="bg-[#ffeb3b80] text-[#16423c] font-semibold px-0.5 rounded">$1</mark>`);
    };
    
    container.innerHTML = results.map(res => {
        const catBadges = res.categories.length > 0 
            ? res.categories.map(cat => {
                let badgeClass = 'bg-gray-100 text-gray-700';
                if (cat === 'MED') badgeClass = 'bg-[#e8eaf6] text-[#0d47a1] border border-[#0d47a118]';
                else if (cat === 'THC') badgeClass = 'bg-[#e8f5e9] text-[#1b5e20] border border-[#1b5e2018]';
                else if (cat === 'CBD') badgeClass = 'bg-[#fff3e0] text-[#e65100] border border-[#e6510018]';
                else if (cat === 'INV') badgeClass = 'bg-[#f3e5f5] text-[#4a148c] border border-[#4a148c18]';
                return `<span class="px-2 py-0.5 text-[0.7rem] font-bold rounded-md ${badgeClass}">${cat}</span>`;
            }).join(' ')
            : `<span class="px-2 py-0.5 text-[0.7rem] font-medium rounded-md bg-gray-100 text-gray-500 border border-gray-200">UNRANKED</span>`;

        return `
            <div class="p-4 mb-3 rounded-2xl border border-[#8472531e] bg-white hover:border-[#2f6e6377] hover:shadow-[0_4px_20px_rgba(22,34,30,0.04)] transition-all flex flex-col gap-2">
                <div class="flex justify-between items-start gap-4">
                    <a href="${res.url}" target="_blank" rel="noopener" class="text-[0.95rem] font-serif font-bold text-[#16423c] hover:text-[#2f6e63] hover:underline leading-snug break-words">
                        ${highlightMatches(res.title, query)}
                    </a>
                    <span class="shrink-0 text-[0.75rem] font-semibold text-[#666] bg-[#84725310] px-2.5 py-1 rounded-full border border-[#84725315]">
                        📅 ${res.date}
                    </span>
                </div>
                
                <div class="text-[0.75rem] text-[#22554e] truncate break-all opacity-85">
                    <a href="${res.url}" target="_blank" rel="noopener" class="hover:underline">
                        ${res.url}
                    </a>
                </div>

                <div class="flex items-center gap-2 mt-1 flex-wrap">
                    <span class="text-[0.7rem] font-bold tracking-wider text-[#7c6953] uppercase mr-1">Appeared in:</span>
                    <span class="px-2.5 py-0.75 text-[0.75rem] font-bold rounded-lg bg-[#eddab82f] text-[#715734] border border-[#8472531a] shadow-sm">${res.session}</span>
                    <div class="flex items-center gap-1.5 ml-2">
                        ${catBadges}
                    </div>
                </div>
            </div>
        `;
    }).join('');
};
