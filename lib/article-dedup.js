/**
 * Deduplicate articles by URL and by normalized headline (syndicated partner URLs).
 */

const MIN_TITLE_DEDUP_LENGTH = 12;

function normalizeArticleUrl(url) {
    return String(url || '').trim().toLowerCase().replace(/\/$/, '');
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

function isTitleDedupKey(titleKey) {
    return titleKey.length >= MIN_TITLE_DEDUP_LENGTH;
}

function buildDedupSets(articleList) {
    const urlSet = new Set();
    const titleSet = new Set();
    for (const article of articleList || []) {
        const urlKey = normalizeArticleUrl(article?.url);
        const titleKey = normalizeArticleTitle(article?.title);
        if (urlKey) urlSet.add(urlKey);
        if (isTitleDedupKey(titleKey)) titleSet.add(titleKey);
    }
    return { urlSet, titleSet };
}

function isDuplicateArticle(article, dedupSets) {
    const urlKey = normalizeArticleUrl(article?.url);
    const titleKey = normalizeArticleTitle(article?.title);
    if (urlKey && dedupSets.urlSet.has(urlKey)) return true;
    if (isTitleDedupKey(titleKey) && dedupSets.titleSet.has(titleKey)) return true;
    return false;
}

function registerArticleKeys(article, dedupSets) {
    const urlKey = normalizeArticleUrl(article?.url);
    const titleKey = normalizeArticleTitle(article?.title);
    if (urlKey) dedupSets.urlSet.add(urlKey);
    if (isTitleDedupKey(titleKey)) dedupSets.titleSet.add(titleKey);
}

/**
 * @param {object[]} incoming
 * @param {object[]} [existingArticles]
 * @returns {{ articles: object[], skipped: number }}
 */
function filterDuplicateArticles(incoming, existingArticles = []) {
    const dedupSets = buildDedupSets(existingArticles);
    const articles = [];
    let skipped = 0;

    for (const article of incoming || []) {
        if (isDuplicateArticle(article, dedupSets)) {
            skipped += 1;
            continue;
        }
        registerArticleKeys(article, dedupSets);
        articles.push(article);
    }

    return { articles, skipped };
}

function dedupeArticleList(articles) {
    return filterDuplicateArticles(articles, []);
}

module.exports = {
    MIN_TITLE_DEDUP_LENGTH,
    normalizeArticleUrl,
    normalizeArticleTitle,
    filterDuplicateArticles,
    dedupeArticleList,
};
