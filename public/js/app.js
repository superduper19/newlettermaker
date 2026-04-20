import validateHeadlines from './headline-validator.js';

const GREETING_OPTIONS = Array.from(new Set([
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
    'enjoy your week',
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
const DEFAULT_GREETING = 'Have a fantastic week and stay safe,';
const DEFAULT_SUMMARY_RULES = [
    '1.  Only use the URLs provided in the user input.',
    '2.  Do not use prior knowledge.',
    '3.  Do not supplement with outside research.',
    '4.  Do not infer facts not explicitly stated in the article.',
    '5.  If a link cannot be accessed, explicitly state that the link could',
    '    not be accessed.',
    '6.  If a paywall prevents access, explicitly state that the article is',
    '    paywalled.',
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
    if (
        text.includes('# Newsletter Summary Rules') ||
        text.includes('## SYSTEM PROMPT: Newsletter Summary Engine') ||
        text.includes('## SOURCE RESTRICTIONS') ||
        text.includes('## SUMMARY STRUCTURE') ||
        text.includes('## OUTPUT FORMAT')
    ) {
        return DEFAULT_SUMMARY_RULES;
    }
    return value;
}

const LEGACY_DEFAULT_SUBJECT_PROMPT =
    'From the top 3 articles for each 4 category, create a small Clicky subject by suitable emojis. ' +
    'Keep emojis first then subjects with space and don\'t use "|" in between. ' +
    'Same articles should have same subjects.';
const DEFAULT_SUBJECT_PROMPT =
    'From the top 3 articles for each 4 category, create a small Clicky subject by suitable emojis. ' +
    'Keep emojis first then subjects with space and don\'t use "|" in between. ' +
    'Same articles should have same subjects.';

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
    templates: { MED: '', THC: '', CBD: '', INV: '' },
    summaryRules: DEFAULT_SUMMARY_RULES,
    selectedGreeting: DEFAULT_GREETING,
    subjectPrompt: DEFAULT_SUBJECT_PROMPT,
    generatedSubjects: { MED: '', THC: '', CBD: '', INV: '' },
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

// Load State: first from LocalStorage (instant), then from Supabase if configured (overwrites)
try {
    const saved = localStorage.getItem('newsletter_articles');
    if (saved) {
        const data = JSON.parse(saved);
        if (Array.isArray(data)) {
            articles = data;
        } else {
            applyWorkspaceState(data, { mergeLibrary: true });
        }
    }
    const savedLibrary = localStorage.getItem(INSPIRATIONAL_LIBRARY_CACHE_KEY);
    if (savedLibrary) {
        inspirationalLibraryImages = JSON.parse(savedLibrary);
    }
} catch (e) {
    console.error('Failed to load state', e);
}

function buildWorkspaceState() {
    return {
        articles,
        archivedArticles,
        laterCoolArticles,
        inspirationalImages,
        confirmationInspirationalImage,
        inspirationalLibraryImages,
        newsletterContent,
        lastGeneratedNewsletter,
    };
}

function persistWorkspaceLocal(state) {
    const nextState = state || buildWorkspaceState();
    localStorage.setItem('newsletter_articles', JSON.stringify(nextState));
    localStorage.setItem(
        INSPIRATIONAL_LIBRARY_CACHE_KEY,
        JSON.stringify(nextState.inspirationalLibraryImages || []),
    );
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
    articles = Array.isArray(value.articles) ? value.articles : [];
    archivedArticles = Array.isArray(value.archivedArticles) ? value.archivedArticles : [];
    laterCoolArticles = Array.isArray(value.laterCoolArticles) ? value.laterCoolArticles : [];
    inspirationalImages = Array.isArray(value.inspirationalImages) ? value.inspirationalImages : [];
    confirmationInspirationalImage =
        typeof value.confirmationInspirationalImage === 'string'
            ? value.confirmationInspirationalImage
            : '';
    if (Array.isArray(value.inspirationalLibraryImages)) {
        inspirationalLibraryImages = value.inspirationalLibraryImages;
    } else if (!mergeLibrary) {
        inspirationalLibraryImages = [];
    }
    const nc =
        value.newsletterContent || {
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
        subjectPrompt: normalizeSubjectPrompt(nc.subjectPrompt),
        generatedSubjects: nc.generatedSubjects || { MED: '', THC: '', CBD: '', INV: '' },
    };
    lastGeneratedNewsletter = value.lastGeneratedNewsletter || null;
    persistWorkspaceLocal(buildWorkspaceState());
}

function buildSessionsState(includeCurrentWorkspace = false) {
    const sessions = getSavedSessions();
    if (includeCurrentWorkspace) {
        const nameEl = document.getElementById('newsletter-name');
        const name = currentSessionName || (nameEl ? nameEl.value.trim() : '');
        if (name) {
            sessions[name] = {
                articles: JSON.parse(JSON.stringify(articles)),
                archivedArticles: JSON.parse(JSON.stringify(archivedArticles)),
                inspirationalImages: [...inspirationalImages],
                newsletterContent: JSON.parse(JSON.stringify(newsletterContent)),
                savedAt: new Date().toISOString(),
            };
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

    articles =
        articles.map((article) => ({
            ...article,
            image: mapUrl(article.image),
            originalImageUrl: mapUrl(article.originalImageUrl),
            publishedImageUrl: mapUrl(article.publishedImageUrl),
            uploadedImageUrl: mapUrl(article.uploadedImageUrl),
        }));
    inspirationalImages = inspirationalImages.map(mapUrl);
    inspirationalLibraryImages =
        inspirationalLibraryImages.map((item) =>
            item && item.url
                ? {
                    ...item,
                    url: mapUrl(item.url),
                } : item,
        );
}

async function parseJsonResponse(res, fallbackMessage) {
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/json')) {
        return res.json();
    }
    const text = await res.text();
    const looksLikeHtml = /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text);
    if (looksLikeHtml) {
        throw new Error(
            fallbackMessage ||
            'Server returned HTML instead of JSON. Restart the app server and try again.',
        );
    }
    throw new Error(fallbackMessage || 'Server did not return JSON.');
}

async function getAiClarificationFromError(data) {
    const directDetails = String(data?.details || '').trim();
    if (directDetails) {
        return directDetails;
    }

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
            textEl.textContent =
                'Cannot reach server. Check deployment and try Refresh from server.';
            return;
        }
        if (!d.hasUrl) {
            textEl.textContent =
                'Server: SUPABASE_URL is not set in Vercel → Settings → Environment Variables. ' +
                'Add it and redeploy.';
            return;
        }
        if (!d.hasKey) {
            textEl.textContent =
                'Server: No Supabase key set. Add SUPABASE_SECRET_KEY ' +
                '(or SUPABASE_SERVICE_ROLE_KEY) in Vercel → Environment Variables, then redeploy.';
            return;
        }
        if (d.initError) {
            textEl.textContent = 'Server: ' + d.initError + ' Check Vercel env vars and redeploy.';
            return;
        }
        if (d.dbError) {
            textEl.textContent =
                'DB error: ' +
                d.dbError +
                ' (table: ' +
                (d.table || 'newsletter_state') +
                '). Check Supabase table exists and RLS allows read.';
            return;
        }
        textEl.textContent =
            'No sessions in database yet. Click Refresh from server after saving Week 1 from the ' +
            'app or running the upload script.';
    } catch (e) {
        showWithClass(hintEl, 'block');
        textEl.textContent =
            'Cannot reach /api/state. Is the server running? On Vercel, ensure the app is ' +
            'deployed with the Express server (see docs).';
    }
};

(async function loadFromDb() {
    try {
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
                const local = JSON.parse(localStorage.getItem('newsletter_saved_sessions') || '{}');
                const merged = { ...value };
                Object.keys(local).forEach(k => {
                    if (!(k in merged)) merged[k] = local[k];
                });
                localStorage.setItem('newsletter_saved_sessions', JSON.stringify(merged));
                if (typeof populateSavedDropdown === 'function') populateSavedDropdown();
                if (hintEl) hideWithClass(hintEl);
                const nameEl = document.getElementById('newsletter-name');
                if (nameEl && nameEl.value.trim()) {
                    currentSessionName = nameEl.value.trim();
                }
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

// Clear State
window.clearWorkspace = () => {
    if (confirm(
        'Are you sure you want to clear all articles and start fresh? ' +
        'This cannot be undone.',
    )) {
        articles = [];
        inspirationalImages = [];
        newsletterContent = {
            MED: { intro: '', outro: '' },
            THC: { intro: '', outro: '' },
            CBD: { intro: '', outro: '' },
            INV: { intro: '', outro: '' },
        };
        saveState();
        renderArticles();
        switchStep(1);
    }
};

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
    } else if (step === 6) {
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
    const relevant =
        articles.filter(a =>
            (a.categories && a.categories.length > 0) ||
            a.status === 'COOL FINDS' ||
            a.status === 'M',
        );
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
        .filter(a =>
            a.selected !== false &&
            ((a.categories && a.categories.length > 0) ||
                a.status === 'COOL FINDS' ||
                a.status === 'M'),
        ).slice();

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
        list.innerHTML =
            '<div class="p-7.5 text-center text-[#777]">' +
            '   No selected articles are ready for Image View yet. ' +
            '   Check the articles you want in Article View and assign categories first.' +
            '</div>';
        return;
    }

    // Table header
    list.innerHTML =
        `<div class="img-table-header">
            <div class="img-col-select img-header-select">
                <div class="header-label">Publish</div>
                <div class="header-inline-actions">
                    <button
                        type="button"
                        class="header-link-btn"
                        onclick="toggleAllImagePublish(true)">
                        All
                    </button>
                    <span>/</span>
                    <button
                        type="button"
                        class="header-link-btn"
                        onclick="toggleAllImagePublish(false)">
                        None
                    </button>
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

    relevantArticles.forEach((article) => {
        const originalIndex = articles.indexOf(article);

        if (!article.imageSearchQuery) {
            const words = article.title.split(' ').filter(w => w.length > 3);
            article.imageSearchQuery = words.slice(0, 2).join(' ');
        }

        const selectedImageHtml =
            article.image
                ? `<div class="selected-image-container">
                    <img
                        src="${article.image}"
                        class="img-fluid max-h-30"
                        onerror="this.onerror = null; this.src = '${article.originalImageUrl || ''}'; this.parentElement.classList.add('img-fallback');">
                    <button class="btn-remove-image" onclick="removeImage(${originalIndex})">
                        &times;
                    </button>
                    ${
                    article.image.includes('purablis.com')
                        ? '<span class="badge-published" title="Published">P</span>'
                        : ''
                }
                </div>`
                : `<div class="no-image-placeholder">No Image</div>`;

        const gridId = `grid-${originalIndex}`;

        const catInputs = ['MED', 'THC', 'CBD', 'INV'].map(cat => {
            let rank = (article.ranks && article.ranks[cat]) || '';
            return `<div class="img-col-cat">
                <input
                    type="text"
                    value="${rank}"
                    oninput="updateCategoryRank(${originalIndex}, '${cat}', this.value)"
                    class="w-full text-center h-8 py-1 px-px border border-[#ddd] rounded text-[0.8rem] font-semibold box-border">
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
                    <div class="flex gap-1.25 mb-2">
                        <input
                            type="text"
                            id="img-search-input-${originalIndex}"
                            value="${article.imageSearchQuery}"
                            placeholder="Keyword..."
                            class="form-control h-8 py-1 px-px text-sm">
                        <button
                            class="btn btn-sm btn-primary whitespace-nowrap"
                            onclick="searchArticleImages(${originalIndex})">
                            Search
                        </button>
                    </div>
                    <div class="border-t border-[#eee] pt-1.5">
                        <input
                            type="file"
                            accept="image/*"
                            id="img-upload-input-${originalIndex}"
                            class="hidden"
                            onchange="uploadArticleImage(${originalIndex}, this)">
                        <label
                            for="img-upload-input-${originalIndex}"
                            class="btn btn-sm btn-secondary cursor-pointer m-0 text-[0.78rem] py-1 px-2.5">
                            Upload File
                        </label>
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
    const relevantArticles =
        articles.filter(a =>
            a.selected !== false &&
            ((a.categories && a.categories.length > 0) ||
                a.status === 'COOL FINDS' ||
                a.status === 'M'),
        );
    const counts = getSelectedRankCounts();
    let selectedCount = 0;
    relevantArticles.forEach(a => {
        if (a.publishImage !== false) selectedCount++;
    });
    const sessionLabel = currentSessionName
        ? `<span class="stat-item bg-[#e8eaf6] text-[#283593] font-semibold">
            ${currentSessionName}
        </span>`
        : '';

    const count = relevantArticles.length;
    const countClass = count === 25
        ? 'bg-[#e8f5e9] text-[#1b5e20] font-bold border-2 border-[#4caf50]'
        : 'bg-[#ffebee] text-[#c62828] font-bold border-2 border-[#e57373]';

    statsEl.innerHTML =
        `${sessionLabel}
        <span class="stat-item ${countClass}" title="Target is 25 articles">
            Total: ${count} / 25
        </span>
        <span
            class="stat-item bg-[#e0f7fa] text-[#006064]"
            title="Articles currently selected for Image View">
            Selected: ${selectedCount}
        </span>
        <span class="stat-item bg-[#e3f2fd] text-[#0d47a1]">MED: ${counts.MED}</span>
        <span class="stat-item bg-[#e8f5e9] text-[#1b5e20]">THC: ${counts.THC}</span>
        <span class="stat-item bg-[#fff3e0] text-[#e65100]">CBD: ${counts.CBD}</span>
        <span class="stat-item bg-[#f3e5f5] text-[#4a148c]">INV: ${counts.INV}</span>`;
}

// Search Images
window.searchArticleImages = async (index) => {
    const article = articles[index];
    const queryInput = document.getElementById(`img-search-input-${index}`);
    const query = queryInput ? queryInput.value : '';
    const page = article.imagePage || 1;

    if (!query) return alert('Please enter a search term');

    // Update query in state
    article.imageSearchQuery = query;
    saveState();

    const grid = document.getElementById(`grid-${index}`);
    grid.innerHTML = '<div class="grid-placeholder">Searching...</div>';

    try {
        const res = await fetch('/api/images/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, page }),
        });
        const data = await res.json();

        if (data.success && data.images.length > 0) {
            grid.innerHTML = '';
            const displayImages = data.images.slice(0, 8);

            displayImages.forEach(img => {
                const imgEl = document.createElement('img');
                imgEl.src = img.preview;
                imgEl.className = 'mini-grid-item';
                imgEl.onclick = () => selectImage(index, img.download);
                grid.appendChild(imgEl);
            });

            const navDiv = document.createElement('div');
            navDiv.className = 'img-page-nav';
            const currentPage = article.imagePage || 1;
            navDiv.innerHTML =
                `<button
                    class="btn btn-sm btn-outline"
                    ${currentPage <= 1 ? 'disabled' : ''}
                    onclick="changeImagePage(${index}, -1)"
                    title="Previous">
                    &larr;
                </button>
                <span class="text-[0.8rem] text-[#555]">Page ${currentPage}</span>
                <button
                    class="btn btn-sm btn-outline"
                    onclick="changeImagePage(${index}, 1)"
                    title="Next">
                    &rarr;
                </button>`;
            grid.appendChild(navDiv);
        } else {
            grid.innerHTML = '<div class="grid-placeholder">No images found.</div>';
        }
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<div class="grid-placeholder">Error searching.</div>';
    }
};

window.searchAllArticleImages = async () => {
    const relevantIndexes = articles
        .map((article, index) => ({ article, index }))
        .filter(({ article }) =>
            (article.categories && article.categories.length > 0) ||
            article.status === 'COOL FINDS' ||
            article.status === 'M',
        ).map(({ index }) => index);

    if (relevantIndexes.length === 0) {
        return alert('No articles available in Image View.');
    }

    const btn = document.querySelector('[onclick="searchAllArticleImages()"]');
    if (btn) {
        btn.disabled = true;
        btn.textContent = `Searching 0/${relevantIndexes.length}...`;
    }

    let searched = 0;

    try {
        for (const index of relevantIndexes) {
            const article = articles[index];
            if (!article.imageSearchQuery) {
                const words = (article.title || '').split(' ').filter(w => w.length > 3);
                article.imageSearchQuery = words.slice(0, 2).join(' ');
            }

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

// Select Image
window.selectImage = (index, url) => {
    articles[index].image = url;
    // When selecting a new image (from search or upload), treat it as the original source
    articles[index].originalImageUrl = url;

    // If the URL is already a purablis URL, mark it as published
    if (url && url.includes('purablis.com')) {
        articles[index].publishedImageUrl = url;
    } else {
        articles[index].publishedImageUrl = null;
    }

    saveState();
    // Update the "Big Image" box
    const box = document.getElementById(`selected-img-${index}`);
    if (box) {
        box.innerHTML =
            `<div class="selected-image-container">
                <img
                    src="${url}"
                    class="img-fluid max-h-37.5"
                    onerror="this.onerror = null; this.src = '${articles[index].originalImageUrl || ''}'; this.parentElement.classList.add('img-fallback');">
                <button class="btn-remove-image" onclick="removeImage(${index})">&times;</button>
            </div>`;
    }
};

// Remove Image
window.removeImage = (index) => {
    articles[index].image = null;
    articles[index].originalImageUrl = null;
    articles[index].publishedImageUrl = null;
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
            // selectImage will set image and originalImageUrl to the returned URL
            // If published=true, data.url is the public URL. If false, it's local.
            selectImage(index, data.url);

            if (data.published) {
                articles[index].publishedImageUrl = data.url;
                saveState();
                if (label) label.textContent = 'Uploaded (purablis)';
            } else if (data.ftpError && label) label.textContent = 'Local only';
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
        inspirationalLibraryImages = data.images || [];
        localStorage.setItem(
            INSPIRATIONAL_LIBRARY_CACHE_KEY,
            JSON.stringify(inspirationalLibraryImages),
        );
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
    if (!query) {
        return alert('Please enter a search term');
    }

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
    if (!input || !input.files || !input.files[0]) {
        return alert('Choose an image file first.');
    }

    btn.textContent = 'Uploading...';
    btn.disabled = true;
    if (status) status.textContent = 'Uploading image to Supabase Storage...';

    const formData = new FormData();
    formData.append('image', input.files[0]);

    try {
        const data =
            await parseJsonResponse(
                await fetch('/api/images/upload-inspirational', {
                    method: 'POST',
                    body: formData,
                }),
                'Upload route did not return JSON. Restart the app server and try again.',
            );
        if (data.success && data.url) {
            if (!isPublicHostedUrl(data.url)) {
                throw new Error('Upload did not return a public Supabase URL.');
            }
            inspirationalImages = [data.url];
            confirmationInspirationalImage = data.url;
            saveState();
            await loadInspirationalLibrary();
            renderInspirationalView();
            if (status) {
                status.textContent =
                    'Uploaded to Supabase Storage and selected for the newsletter.';
            }
        } else {
            alert('Upload failed: ' + (data.error || 'Unknown error'));
            if (status) {
                status.textContent = 'Upload failed.';
            }
        }
    } catch (e) {
        console.error(e);
        alert('Upload failed: ' + (e.message || 'Unknown error'));
        if (status) {
            status.textContent = 'Upload failed: ' + (e.message || 'Unknown error');
        }
    } finally {
        btn.textContent = 'Upload to Supabase';
        btn.disabled = false;
        input.value = '';
    }
};

window.addInspirationalUrl = async () => {
    const input = document.getElementById('insp-url-input');
    const btn = document.getElementById('btn-insp-url-upload');
    const status = document.getElementById('insp-upload-status');
    const url = input ? input.value.trim() : '';
    if (!url) {
        return alert('Paste an image URL first.');
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Uploading...';
    }
    if (status) {
        status.textContent = 'Fetching the pasted image and uploading it to Supabase Storage...';
    }

    try {
        const res =
            await fetch('/api/images/publish-inspirational-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });
        const data =
            await parseJsonResponse(
                res,
                'URL upload route did not return JSON. Restart the app server and try again.',
            );
        if (!res.ok || !data.success || !data.url) {
            throw new Error(data.error || 'Failed to upload image URL to Supabase');
        }
        if (!isPublicHostedUrl(data.url)) {
            throw new Error('Upload did not return a public Supabase URL.');
        }

        inspirationalImages = [data.url];
        confirmationInspirationalImage = data.url;
        saveState();
        await loadInspirationalLibrary();
        renderInspirationalView();

        if (input) {
            input.value = '';
        }
        if (status) {
            status.textContent = 'Uploaded to Supabase Storage and selected for the newsletter.';
        }
    } catch (e) {
        console.error(e);
        if (status) {
            status.textContent = 'Upload failed: ' + (e.message || 'Unknown error');
        }
        alert('Failed to upload image URL: ' + (e.message || 'Unknown error'));
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Upload URL';
        }
    }
};

window.selectInspirationalImage = (url) => {
    if (!isPublicHostedUrl(url)) {
        alert('Please select an inspirational image with a public Supabase URL.');
        return;
    }
    inspirationalImages = [url];
    confirmationInspirationalImage = url;
    saveState();
    renderInspirationalView();
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
        localStorage.setItem(
            INSPIRATIONAL_LIBRARY_CACHE_KEY,
            JSON.stringify(inspirationalLibraryImages),
        );
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
        galleryGrid.innerHTML =
            '<div class="grid-placeholder">No uploaded inspirational images yet.</div>';
    } else {
        inspirationalLibraryImages.forEach(({ url, name }) => {
            const div = document.createElement('div');
            div.className = 'insp-library-card';

            const imgEl = document.createElement('img');
            imgEl.src = url;
            imgEl.className = 'insp-library-preview';
            imgEl.title = name || 'Uploaded image';
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
            subtitle.textContent = 'Stored on server and available for newsletter use.';

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
            const div = document.createElement('div');
            div.className = 'insp-selected-card';

            const imgEl = document.createElement('img');
            imgEl.src = url;
            imgEl.className = 'insp-selected-preview';

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

function buildCategoryPrompt(category) {
    const categoryArticles = getSummaryArticlesForCategory(category);
    if (categoryArticles.length === 0) {
        return `CATEGORY: ${category}\nNo priority-ranked articles (1-4) ` +
            'currently selected for this category.';
    }

    const articleLines = categoryArticles.map((article, index) => {
        const title = article.title || 'Untitled';
        const url = article.url || '';
        return `${index + 1}. ${title}\n${url}`;
    }).join('\n\n');

    return [
        `CATEGORY: ${category}`,
        'Use only the priority-ranked article links below as the source set for this category ' +
        'summary.',
        'Create a strong 6-7 line newsletter-ready summary for this category.',
        '',
        articleLines,
    ].join('\n');
}

function mergePromptWithCategoryLinks(existingPrompt, category) {
    const promptBlock = buildCategoryPrompt(category);
    const startMarker = `[[AUTO_CATEGORY_LINKS_${category}_START]]`;
    const endMarker = `[[AUTO_CATEGORY_LINKS_${category}_END]]`;
    const wrappedBlock = `${startMarker}\n${promptBlock}\n${endMarker}`;
    const current = String(existingPrompt || '').trim();
    const markerPattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, 'm');
    const brokenBlockPattern = new RegExp(
        `\\[\\[AUTO_CATEGORY_LINKS_${category}_[\\s\\S]*?(?=\\nhttps?:\\/\\/|\\n[A-Za-z0-9].*https?:\\/\\/|$)`,
        'g',
    );
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
    const content = newsletterContent[category] || (newsletterContent[category] = {
        intro: '',
        outro: '',
    });
    const mergedPrompt = mergePromptWithCategoryLinks('', category);
    content.prompt = mergedPrompt;

    const promptEl = document.getElementById('editor-prompt');
    if (promptEl && currentEditorTab === category) {
        promptEl.value = mergedPrompt;
    }
    saveState();
};

function getSelectedCategoryResults() {
    if (!newsletterContent.selectedResults) {
        newsletterContent.selectedResults = { MED: '', THC: '', CBD: '', INV: '' };
    }
    return newsletterContent.selectedResults;
}

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
    const promptValue = mergePromptWithCategoryLinks(content.prompt || '', currentEditorTab);
    if (content.prompt !== promptValue) {
        content.prompt = promptValue;
        saveState();
    }

    const summaryRulesValue = normalizeSummaryRules(newsletterContent.summaryRules);
    const resultValue = content.result || '';
    const templateValue =
        (newsletterContent.templates && newsletterContent.templates[currentEditorTab]) ||
        '';
    const selectedGreeting = newsletterContent.selectedGreeting || DEFAULT_GREETING;
    const greetingOptionsHtml =
        GREETING_OPTIONS
            .map(greeting =>
                `<option
                    value="${escapeHtml(greeting)}"
                    ${greeting === selectedGreeting ? 'selected' : ''}>
                    ${escapeHtml(greeting)}
                </option>`,
            ).join('');
    const selectedResults = getSelectedCategoryResults();
    const selectedSummaryHtml = ['MED', 'THC', 'CBD', 'INV'].map(cat => {
        const selectedText = selectedResults[cat] || '';
        return `<div class="p-3 border border-[#e0e0e0] rounded-lg bg-[#fafafa]">
                <div class="font-bold">${cat}</div>
                <textarea
                    rows="5"
                    class="form-control text-sm bg-white mt-2 p-2"
                    oninput="updateSelectedCategoryResult('${cat}', this.value)"
                    placeholder="No selected ${cat} content yet...">${selectedText}</textarea>
            </div>`;
    }).join('');

    container.innerHTML =
        `<div class="form-group p-3 bg-[#f8f9fa] rounded-lg border border-[#e9ecef] mb-5">
            <label class="font-semibold">Template for ${currentEditorTab}</label>
            <p class="text-muted text-[0.8rem] mb-2.5">
                HTML template for this newsletter. Use {{SUMMARY}}, {{ARTICLES_HTML}},
                {{INSPIRATIONAL_IMAGE}}, {{NEWSLETTER_NAME}} as placeholders.
            </p>
            <div class="flex flex-wrap gap-3 items-center mb-2.5">
                <input
                    type="file"
                    id="template-single-input"
                    accept=".html,.htm"
                    class="upload-input text-sm">
                <button class="btn btn-secondary btn-sm"  onclick="uploadSingleTemplate()">
                    Upload 1 (for ${currentEditorTab})
                </button>
                <span class="text-[#999]">or</span>
                <input
                    type="file"
                    id="template-batch-input"
                    accept=".html,.htm"
                    multiple class="upload-input text-sm">
                <button class="btn btn-secondary btn-sm" onclick="uploadAllTemplates()">
                    Upload all 4
                </button>
            </div>
            <div id="template-status" class="text-[0.8rem] text-[#666] mb-2"></div>
            <textarea
                id="editor-template"
                rows="6"
                class="form-control font-[monospace] text-[0.8rem] bg-white p-2"
                oninput="updateTemplate('${currentEditorTab}', this.value)"
                placeholder="Paste or edit HTML template here..."></textarea>
        </div>

        <div class="grid grid-cols-[1fr_300px] gap-5 items-start">
            <div>
                <div class="form-group">
                    <label class="font-semibold">Prompt</label>
                    <textarea
                        id="editor-prompt"
                        rows="8"
                        class="form-control font-[monospace] text-[0.9rem] mt-2 p-2"
                        oninput="updateNewsletterContent('${currentEditorTab}', 'prompt', this.value)">${promptValue}</textarea>
                </div>

                <div class="flex items-center gap-2.5 mt-2 mb-4">
                    <button
                        class="btn btn-secondary btn-sm"
                        onclick="syncCategoryPrompt('${currentEditorTab}')">
                        Refresh Category Links
                    </button>
                    <span class="text-[0.8rem] text-[#777]">
                        The prompt auto-loads all article links for ${currentEditorTab}.
                    </span>
                </div>

                <div class="flex items-center gap-4 mb-5 justify-between flex-wrap">
                    <div class="flex items-center gap-4">
                        <label class="flex items-center gap-1.25 cursor-pointer text-[0.9rem]">
                            <input
                                type="radio"
                                id="rules-on-${currentEditorTab}"
                                name="useRulesGroup-${currentEditorTab}"
                                ${content.useRules !== false ? 'checked' : ''}
                                onchange="updateNewsletterContent('${currentEditorTab}', 'useRules', true)">
                            Use Summary Rules
                        </label>
                        <label class="flex items-center gap-1.25 cursor-pointer text-[0.9rem]">
                            <input
                                type="radio"
                                id="rules-off-${currentEditorTab}"
                                name="useRulesGroup-${currentEditorTab}"
                                ${content.useRules === false ? 'checked' : ''}
                                onchange="updateNewsletterContent('${currentEditorTab}', 'useRules', false)">
                            Custom (No Rules)
                        </label>
                    </div>
                    <button class="btn btn-primary" onclick="generateSummary('${currentEditorTab}')">
                        <span id="gen-btn-text-${currentEditorTab}">Generate Summary</span>
                    </button>
                </div>
            </div>

        </div>

        <div>
            <div id="editor-articles-list" class="mb-4 text-sm"></div>
            <div class="form-group">
                <label class="font-semibold">Summary Rules</label>
                <textarea
                    id="editor-summary-rules"
                    rows="14"
                    class="form-control text-sm bg-[#fffde7] border-[#fbc02d] mt-2 p-2"
                    oninput="updateSummaryRules(this.value)"
                    placeholder="Persistent rules sent as system instructions to the AI...">${summaryRulesValue}</textarea>
                <div class="text-[0.7rem] text-[#999] mt-1">
                    These rules persist across saves and categories.
                </div>
            </div>
        </div>

        <div class="form-group mt-2.5">
            <label class="font-semibold">Created Result</label>
            <textarea
                id="editor-result"
                rows="10"
                class="form-control text-[0.9rem] bg-[#f5f5f5] mt-2 p-2"
                oninput="updateNewsletterContent('${currentEditorTab}', 'result', this.value)"
                placeholder="The AI-generated result will appear here...">${resultValue}</textarea>
        </div>

        <div class="flex justify-end gap-2.5 mt-4">
            <button
                class="btn btn-primary btn-sm"
                onclick="selectGeneratedContent('${currentEditorTab}')">
                Select ${currentEditorTab}
            </button>
            <button
                class="btn btn-outline btn-sm"
                onclick="copyEditorContent('${currentEditorTab}')">
                Copy ${currentEditorTab} Content
            </button>
        </div>

        <div class="mt-6 pt-4.5 border-t border-[#e5e7eb]">
            <label class="font-bold block mb-3">Selected Content</label>
            <div class="grid grid-cols-2 gap-3.5">
                ${selectedSummaryHtml}
            </div>
        </div>

        <div class="mt-5 pt-4.5 border-t border-[#e5e7eb]">
            <label class="font-bold block mb-2.5">Greetings Selection</label>
            <select class="form-control max-w-130 p-2" onchange="updateSelectedGreeting(this.value)">
                ${greetingOptionsHtml}
            </select>
            <div class="text-[0.8rem] text-[#666] mt-2">
                This changes only the greeting line. The sign-off name stays as Jessica.
            </div>
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
                    ${date ? `<div class="text-xs text-[#777]">${date}</div>` : ''}
                    ${
                    url
                        ? `<a
                                href="${url}" target="_blank"
                                class="text-xs break-all">
                                ${url}
                            </a>`
                        : '<span class="text-muted">No URL</span>'
                }
                </div>`;
            }).join('')
            : `<span class="text-muted">No priority 1-4 articles for ${currentEditorTab}.</span>`;
        listEl.innerHTML =
            `<label class="font-semibold">Summary Source Articles for ${currentEditorTab}</label>
            <div class="max-h-70 overflow-y-auto mt-1.5 leading-[1.4]">${listHtml}</div>
            <div class="text-[0.7rem] text-[#999] mt-1">
                Only articles marked 1, 2, 3, or 4 in Article View/Image View are used here for
                summary generation.
            </div>`;
    }
};

window.updateSummaryRules = (value) => {
    newsletterContent.summaryRules = value || DEFAULT_SUMMARY_RULES;
    saveState();
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
            if (ta &&
                newsletterContent.templates &&
                newsletterContent.templates[currentEditorTab]) {
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

window.generateSummary = async (category) => {
    const prompt = document.getElementById('editor-prompt').value;
    const rulesOnEl = document.getElementById(`rules-on-${category}`);
    const isUseRules = rulesOnEl ? rulesOnEl.checked : true;
    const summaryRules = isUseRules ? normalizeSummaryRules(newsletterContent.summaryRules) : '';
    const categoryArticles = getSummaryArticlesForCategory(category);
    const btnText = document.getElementById(`gen-btn-text-${category}`);

    if (!prompt) {
        return alert('Please enter a prompt.');
    }
    if (categoryArticles.length === 0) {
        return alert(`No priority-ranked articles (1-4) found for ${category}.`);
    }

    btnText.textContent = 'Generating...';

    try {
        const res = await fetch('/api/articles/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                useRules: isUseRules,
                summaryRules,
                category,
                articles: categoryArticles,
                model: document.getElementById('ai-model')
                    ? document.getElementById('ai-model').value
                    : '',
            }),
        });
        const data = await res.json();

        if (data.success) {
            const resultText = data.resultText || '';
            newsletterContent[category].result = resultText;
            saveState();
            const resultEl = document.getElementById('editor-result');
            if (resultEl) resultEl.value = resultText;
        } else {
            alert(
                'Generation failed: ' +
                (data.error || 'Unknown error') + (data.details ? '\n' + data.details : ''),
            );
        }
    } catch (e) {
        console.error(e);
        alert('Error generating summary: ' + e.message);
    } finally {
        btnText.textContent = 'Generate Summary';
    }
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

window.updateSelectedGreeting = (value) => {
    newsletterContent.selectedGreeting = value || DEFAULT_GREETING;
    saveState();
};

window.selectGeneratedContent = (category) => {
    const resultEl = document.getElementById('editor-result');
    const generatedText = resultEl
        ? resultEl.value.trim()
        : ((newsletterContent[category] && newsletterContent[category].result) || '').trim();

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
    switchEditorTab(currentEditorTab);
}

// --- STEP 6: CONFIRMATION ---

function renderConfirmationView() {
    const summary = document.getElementById('confirmation-summary');
    if (!summary) return;

    const newsletterNameInput = document.getElementById('newsletter-name');
    const activeNewsletterName = currentSessionName ||
        (newsletterNameInput ? newsletterNameInput.value.trim() : '') ||
        'Newsletter';

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
                    <div class="text-[0.82rem] text-[#666]">
                        Uses the top 3 priority articles for each category and generates clicky
                        email subjects with emojis.
                    </div>
                </div>
                <div class="flex gap-2.5 flex-wrap">
                    <button
                        id="btn-generate-subjects"
                        class="btn btn-primary btn-sm"
                        onclick="generateAllSubjects()">
                        <span id="btn-generate-subjects-text">Generate Subjects</span>
                    </button>
                    <button
                        class="btn btn-outline btn-sm"
                        type="button"
                        onclick="pushStateToServer()"
                        title="Save the subject prompt and generated subjects to Supabase">
                        Push to Server
                    </button>
                </div>
            </div>
            <textarea
                class="form-control mb-3 text-[0.9rem] p-2"
                rows="3"
                oninput="updateSubjectPrompt(this.value)">${escapeHtml(subjectPrompt)}</textarea>
            <div class="grid grid-cols-2 gap-3">
                ${['MED', 'THC', 'CBD', 'INV'].map((cat) => `
                    <div class="p-3 border border-[#e5e7eb] rounded-lg bg-white">
                        <div class="flex justify-between items-center gap-2.5">
                            <strong>${cat}</strong>
                            <button
                                class="btn btn-outline btn-sm"
                                onclick="copyGeneratedSubject('${cat}')">
                                Copy
                            </button>
                        </div>
                        <textarea
                            class="form-control text-[0.88rem] bg-white mt-2 p-2"
                            rows="3"
                            oninput="updateGeneratedSubject('${cat}', this.value)"
                            placeholder="Generate a subject for ${cat}...">${escapeHtml(generatedSubjects[cat] || '')}</textarea>
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
    return currentSessionName ||
        (newsletterNameInput ? newsletterNameInput.value.trim() : '') ||
        'Newsletter';
}

function getActiveNewsletterFilename(category) {
    return `${getActiveNewsletterName().replace(/[^\w\-]+/g, '-') || 'newsletter'}-${category}`;
}

function getSelectedOrGeneratedSummary(category) {
    const selectedResults = getSelectedCategoryResults();
    return (selectedResults[category] ||
        (newsletterContent[category] && newsletterContent[category].result) || '').trim();
}

function getSubjectArticlesForCategory(category) {
    return getSummaryArticlesForCategory(category)
        .filter(a => ['Y', 'YM'].includes(a.status))
        .slice(0, 3);
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
    return getArticlesForCategory(category).filter(a =>
        ['Y', 'YM'].includes(a.status) &&
        isIncludedInConfirmation(a),
    );
}

function getInterestingFindsArticles() {
    return articles
        .filter(a => a.status === 'COOL FINDS' && isIncludedInConfirmation(a))
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

function getArticleImageUrl(article) {
    return getDownloadSafeAssetUrl(
        article.publishedImageUrl ||
        article.image ||
        article.originalImageUrl ||
        article.uploadedImageUrl ||
        '',
    );
}

function getSourceLabel(url) {
    if (!url) return 'More at purablis.com...';
    try {
        const hostname = new URL(url).hostname.replace(/^www\./i, '');
        return `More at ${hostname}...`;
    } catch (e) {
        return 'More at source...';
    }
}

function chooseConfirmationInspirationalImage() {
    const available = inspirationalImages.map(getDownloadSafeAssetUrl).filter(isPublicHostedUrl);
    if (!available.length) {
        confirmationInspirationalImage = '';
        return '';
    }
    const selected = getDownloadSafeAssetUrl(confirmationInspirationalImage);
    if (selected && available.includes(selected)) {
        confirmationInspirationalImage = selected;
        return selected;
    }
    confirmationInspirationalImage = available[0];
    return confirmationInspirationalImage;
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
        const source = escapeHtml(getSourceLabel(article.url || ''));
        const image = getArticleImageUrl(article);
        return `<div style="display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #eee;">
                ${
            image
                ? `<img
                            src="${image}"
                            alt=""
                            style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px;">`
                : ''
        }
                <div>
                    <a
                        href="${url}"
                        target="_blank"
                        style="color: #111; font-weight: 700; text-decoration: none;">
                        ${title}
                    </a>
                    <div>
                        <a
                            href="${url}"
                            target="_blank"
                            style="color: #2a6edc; font-size: 0.85rem;">
                            ${source}
                        </a>
                    </div>
                </div>
            </div>`;
    }).join('');
    const findsHtml = getInterestingFindsArticles().slice(0, 4).map(article => {
        const title = escapeHtml(article.title || 'Untitled');
        const url = article.url || '#';
        return `<li style="margin-bottom: 8px;"><a href="${url}" target="_blank">${title}</a></li>`;
    }).join('');
    const inspiration = chooseConfirmationInspirationalImage();
    return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8"><title>${newsletterName} - ${category}</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
            <h1>${newsletterName} - ${category}</h1>
            <p>${summary || 'No summary selected yet.'}</p>
            <h2>Weekly News</h2>
            ${weeklyHtml || '<p>No weekly news articles selected yet.</p>'}
            <h2>Interesting Finds</h2>
            <ul>${findsHtml || '<li>No interesting finds selected yet.</li>'}</ul>
            <h2>Inspiration</h2>
            ${
        inspiration
            ? `<img src="${inspiration}" alt="Inspiration" style="max-width: 100%;">`
            : '<p>No inspirational image selected yet.</p>'
    }
        </body>
        </html>`;
}

function applySummaryToTemplate(doc, category) {
    const summaryText = getSelectedOrGeneratedSummary(category);
    const introCell = Array
        .from(doc.querySelectorAll('td, div, p'))
        .find(el => (el.textContent || '').includes('Hi [FNAME],'));
    if (!introCell || !summaryText) return;
    const selectedGreeting = escapeHtml(newsletterContent.selectedGreeting || DEFAULT_GREETING);

    const lines = summaryText
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => escapeHtml(line));

    introCell.innerHTML =
        `<span style="font-size: 14px; line-height: 150%; color: #000000;">
            Hi [FNAME],
            <br>
            <br>
            ${lines.join('<br>')}
            <br>
            <br>
            ${selectedGreeting}
            <br>
            Jessica
            <br>
            <br>
            If this newsletter&#8217;s not for you, just
            <a
                href="${TEMPLATE_FIXED_CONTENT.unsubscribeHref}"
                style="color: #2baadf; text-decoration: underline;">
                unsubscribe
            </a> and you won&#8217;t hear from us again. :)
        </span>
        <br/>
        &nbsp;`;
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
            <div>
                <a
                    href="mailto:${TEMPLATE_FIXED_CONTENT.contactEmail}"
                    style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; color: #0000f1; font-weight: normal; text-decoration: underline;"
                    target="_blank">
                    ${TEMPLATE_FIXED_CONTENT.contactEmail}
                </a>
                <br/>
                <a
                    href="${TEMPLATE_FIXED_CONTENT.unsubscribeHref}"
                    style="color: #2baadf; text-decoration: underline;">
                    Unsubscribe
                </a>
            </div>
            <div>
                ${escapeHtml(TEMPLATE_FIXED_CONTENT.footerAddress).replace(/·/g, '&middot;')}
            </div>`;
    }
    if (footerBlocks[1]) {
        footerBlocks[1].innerHTML =
            `<span style="font-size: 11px; line-height: 150%; color: #989898;">
                ${escapeHtml(TEMPLATE_FIXED_CONTENT.footerLegal)}
            </span>`;
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
    const sourceLabel = getSourceLabel(article.url || '');

    Array.from(table.querySelectorAll('a')).forEach(link => {
        link.href = url;
        link.setAttribute('target', '_blank');
    });

    const imageEl = table.querySelector('img.mcnImage, img');
    if (imageEl && image) {
        imageEl.src = image;
        imageEl.alt = title;
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
                If this newsletter&#8217;s not for you, just
                <a
                    href="${TEMPLATE_FIXED_CONTENT.unsubscribeHref}"
                    style="color: #2baadf; text-decoration: underline;">
                    unsubscribe
                </a> and you won&#8217;t hear from us again. :)
            </span><br/>
            &nbsp;
        </div>`;
}

function replaceArticleSection(html, startMarker, endMarker, articles) {
    const startBounds = findHeaderTableBounds(html, startMarker);
    const endBounds = findHeaderTableBounds(html, endMarker);
    if (!startBounds || !endBounds || endBounds.start <= startBounds.end) {
        return html;
    }

    const currentSection = html.slice(startBounds.end, endBounds.start);
    const sampleMatch =
        currentSection
            .match(/<table[^>]*class="mcnCaptionRightImageContentContainer"[\s\S]*?<\/table>/i);
    if (!sampleMatch) {
        return html;
    }

    const renderedTables =
        articles
            .map(article => buildArticleTableHtml(sampleMatch[0], article))
            .join('\n');
    return html.slice(0, startBounds.end) +
        '\n\n' +
        renderedTables +
        '\n\n' +
        html.slice(endBounds.start);
}

function renderTemplateHtml(category, templateHtml) {
    let html = templateHtml;
    const mainArticles = getMainArticlesForCategory(category);
    const findsArticles = getInterestingFindsArticles();
    const summaryHtml = buildSummaryHtml(category);

    if (summaryHtml) {
        html =
            html.replace(
                /<div style="text-align: justify;">[\s\S]*?&nbsp;\s*<\/div>/i,
                summaryHtml,
            );
    }

    html = replaceArticleSection(html, 'Weekly News', 'Interesting Finds', mainArticles);
    html = replaceArticleSection(html, 'Interesting Finds', 'Inspiration', findsArticles);

    const inspirationImage = chooseConfirmationInspirationalImage();
    if (inspirationImage) {
        html =
            html.replace(
                /(<a[^>]*target="_blank"[^>]*title="">\s*<img alt="Inspiration" class="mcnImage2" src=")([^"]*)(")/i,
                `$1${inspirationImage}$3`,
            );
    }

    html =
        html.replace(
            /<a href="http:\/\/www\.purablis\.com" target="_blank"><img alt="" class="puralogsize" src="[^"]*" \/><\/a>/i,
            `<a
                href="${TEMPLATE_FIXED_CONTENT.logoHref}"
                target="_blank">
                <img alt="" class="puralogsize" src="${TEMPLATE_FIXED_CONTENT.logoSrc}"/>
            </a>`,
        );
    html =
        html.replace(
            /<a href="https:\/\/www\.youtube\.com\/Purablis"[\s\S]*?<img alt="YouTube" class="mcnFollowBlockIcon" src="[^"]*"[\s\S]*?<\/a>/i,
            `<a
                href="${TEMPLATE_FIXED_CONTENT.youtubeHref}"
                style="mso-line-height-rule: exactly; -ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;"
                target="_blank">
                <img
                    alt="YouTube"
                    class="mcnFollowBlockIcon"
                    src="${TEMPLATE_FIXED_CONTENT.youtubeIconSrc}"
                    style="width: 30px; max-width: 30px; display: block; border: 0; height: auto; outline: none; text-decoration: none;-ms-interpolation-mode: bicubic;"
                    width="30"/>
            </a>`,
        );
    html =
        html.replace(
            /<a href="https:\/\/ap\.lovethelist\.com\/index\.php\/lists\/qk5307z6w1e34\/unsubscribe\/unsubscribe-direct" style="color: #2baadf; text-decoration: underline;">unsubscribe<\/a>/i,
            `<a
                href="${TEMPLATE_FIXED_CONTENT.unsubscribeHref}"
                style="color:#2baadf;text-decoration:underline;">
                unsubscribe
            </a>`,
        );
    html =
        html.replace(
            /<a href="https:\/\/ap\.lovethelist\.com\/index\.php\/lists\/qk5307z6w1e34\/unsubscribe\/unsubscribe-direct" style="color: #2baadf; text-decoration: underline;">Unsubscribe<\/a>/i,
            `<a
                href="${TEMPLATE_FIXED_CONTENT.unsubscribeHref}"
                style="color:#2baadf;text-decoration:underline;">
                Unsubscribe
            </a>`,
        );

    const generatedHeading = getGeneratedConfirmationHeading(category);
    if (generatedHeading) {
        html =
            html.replace(
                /(<td class="text"[^>]*><strong>)([\s\S]*?)(<\/strong><\/td>)/i,
                `$1${escapeHtml(generatedHeading)}$3`,
            );
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
    const filename = getActiveNewsletterFilename(category);
    zip.file(
        `${filename}.html`,
        confirmationRenderedHtml[category] || await buildConfirmationHtml(category),
    );
    const a = document.createElement('a');
    const url = URL.createObjectURL(await zip.generateAsync({ type: 'blob' }));
    a.href = url;
    a.download = `${filename}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.downloadConfirmationDoc = async (category) => {
    const a = document.createElement('a');
    const url = URL.createObjectURL(
        new Blob(
            [confirmationRenderedHtml[category] || await buildConfirmationHtml(category)],
            { type: 'application/msword' },
        ),
    );
    a.href = url;
    a.download = `${getActiveNewsletterFilename(category)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

async function renderConfirmationPreviews() {
    const container = document.getElementById('confirmation-previews');
    if (!container) return;

    // const selectedSummary = getSelectedOrGeneratedSummary(currentConfirmationTab);
    const { previewColor, previewText, previewUnicode } =
        validateHeadlines(
            articles
                .filter(a =>
                    a.categories.includes(currentConfirmationTab) &&
                    a.publishImage &&
                    ['Y', 'YM', 'COOL FINDS', 'LATER COOL'].includes(a.status),
                ).map(a => a.title),
        );
    console.log(
        articles
            .filter(a =>
                a.categories.includes(currentConfirmationTab) &&
                a.publishImage &&
                ['Y', 'YM', 'COOL FINDS', 'LATER COOL'].includes(a.status),
            ).map(a => a.title),
    )
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
                    <span class="text-base font-bold text-[${previewColor}]">
                        <b>${previewUnicode}</b>
                    </span>
                </div>
                <span class="text-sm text-[${previewColor}] mt-1">${previewText}</span>
            </div>
            <div class="flex gap-2.5 flex-wrap">
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
            class="w-225 min-w-225 min-h-275 border-0 bg-white block mx-auto"></iframe>`;
    const iframe = frameWrap.querySelector('iframe');
    if (iframe) iframe.srcdoc = html;
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
    const text =
        (newsletterContent.generatedSubjects && newsletterContent.generatedSubjects[category]) ||
        '';
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
        categoryArticles[category] =
            getSubjectArticlesForCategory(category)
                .map((article, index) => ({
                    index: index + 1,
                    title: article.title || '',
                    url: article.url || '',
                    date: article.date || '',
                    description: article.description || '',
                }));
    });

    const hasAnyArticles = categories.some((category) => categoryArticles[category].length > 0);
    if (!hasAnyArticles) {
        return alert(
            'No top priority articles (1, 2, 3) are ' +
            'available yet for subject generation.',
        );
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
        const data =
            await parseJsonResponse(
                res,
                'Subject generation route did not return JSON. ' +
                'Restart the app server and try again.',
            );
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
        [
            'Title',
            'URL',
            'MED',
            'THC',
            'CBD',
            'INV',
            'Image URL',
            'Published Image URL',
            'MED Newsletter Text',
            'THC Newsletter Text',
            'CBD Newsletter Text',
            'INV Newsletter Text',
        ],
    ];

    chosen.forEach(a => {
        const med = (a.ranks && a.ranks.MED) && String(a.ranks.MED).trim();
        const thc = (a.ranks && a.ranks.THC) && String(a.ranks.THC).trim();
        const cbd = (a.ranks && a.ranks.CBD) && String(a.ranks.CBD).trim();
        const inv = (a.ranks && a.ranks.INV) && String(a.ranks.INV).trim();
        const imgUrl = a.image || '';
        const publishedImgUrl =
            (a.image && a.image.includes('purablis.com'))
                ? a.image
                : (a.publishedImageUrl || '');
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
    const relevant = getArticlesForCategory(category).filter(a => {
        if (a.url && seenUrls.has(a.url)) return false;
        if (a.url) seenUrls.add(a.url);
        return true;
    });
    return relevant.map(a => `
        <div class="article-item">
            ${
        a.image
            ? `<img
                        src="${a.image}"
                        alt=""
                        style="max-width: 90px; height: 90px; object-fit: cover;"
                        onerror="this.onerror = null; this.src = '${a.originalImageUrl || ''}';">`
            : ''
    }
            <div>
                <strong>${(a.title || '').replace(/</g, '&lt;')}</strong>
                <a href="${a.url || '#'}">${(a.url || '').replace(/</g, '&lt;')}</a>
            </div>
        </div>
    `).join('');
}

window.generateNewsletters = () => {
    const newsletterName = document.getElementById('newsletter-name')?.value || 'Newsletter';
    const statusEl = document.getElementById('generate-status');
    const uploadBtn = document.getElementById('btn-upload-newsletters');
    const inspirationalImg =
        inspirationalImages && inspirationalImages[0]
            ? inspirationalImages[0]
            : '';

    const newsletters = {};
    const categories = ['MED', 'THC', 'CBD', 'INV'];

    for (const cat of categories) {
        const template = (newsletterContent.templates && newsletterContent.templates[cat]) || '';
        const resultText = (newsletterContent[cat] && newsletterContent[cat].result) || '';
        const articlesHtml = buildArticlesHtml(cat);

        let html = template;

        if (html) {
            html =
                html
                    .replace(/\{\{SUMMARY\}\}/g, resultText)
                    .replace(/\{\{ARTICLES_HTML\}\}/g, articlesHtml)
                    .replace(/\{\{INSPIRATIONAL_IMAGE\}\}/g, inspirationalImg)
                    .replace(/\{\{NEWSLETTER_NAME\}\}/g, newsletterName);
        } else {
            const safeResult =
                (resultText || '')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\n/g, '<br>');
            html =
                `<!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>${(newsletterName + ' - ' + cat).replace(/</g, '&lt;')}</title>
                </head>
                <body>
                    <h1>${(newsletterName + ' - ' + cat).replace(/</g, '&lt;')}</h1>
                    ${
                    inspirationalImg
                        ? `<img
                                src="${inspirationalImg.replace(/"/g, '&quot;')}"
                                alt="Header"
                                style="max-width: 100%;">`
                        : ''}
                    <div class="summary">${safeResult}</div>
                    <div class="articles">${articlesHtml}</div>
                </body>
                </html>`;
        }

        newsletters[cat] = {
            html,
            resultText,
            articles:
                articles.filter(a =>
                    ['Y', 'YM', 'COOL FINDS'].includes(a.status) &&
                    a.categories &&
                    a.categories.includes(cat),
                ),
            inspirationalImage: inspirationalImg,
        };
    }

    lastGeneratedNewsletter = {
        meta: { name: newsletterName, generatedAt: new Date().toISOString() },
        newsletters,
        inspirationalImages,
        articles: articles.filter(a => ['Y', 'YM', 'COOL FINDS'].includes(a.status)),
    };

    if (uploadBtn) {
        uploadBtn.disabled = false;
    }
    const exportBtn = document.getElementById('btn-export-generated');
    if (exportBtn) {
        exportBtn.disabled = false;
    }
    if (statusEl) {
        statusEl.textContent = `Generated ${categories.length} newsletters. Ready to upload.`;
    }
};

window.exportGeneratedNewsletter = () => {
    if (!lastGeneratedNewsletter) return alert('Generate newsletters first.');
    const blob =
        new Blob(
            [JSON.stringify(lastGeneratedNewsletter, null, 2)],
            { type: 'application/json' },
        );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
        `newsletter-generated-${(lastGeneratedNewsletter.meta.name || 'newsletter')
            .replace(/\s/g, '-')}-${Date.now()}.json`;
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

window.publishAllImagesToPurablis = async () => {
    const relevant =
        articles.filter(a =>
            (a.categories && a.categories.length > 0) ||
            a.status === 'COOL FINDS' || a.status === 'M',
        );
    // Filter: has image, publish flag not false, AND (not yet published OR published URL doesn't match current image)
    // We want to ensure everything is on purablis.
    const withImages = relevant.filter(a => {
        const hasImage = a.image || a.originalImageUrl;
        const wantsPublish = a.publishImage !== false;
        // Force re-verification/publishing if previous published URL is not reachable?
        // For now, if we have a published URL, assume it's done unless user manually cleared it.
        // But if verification logic was added, we might want to re-run.
        // Let's just check if it's already published.
        const isAlreadyPublished =
            a.publishedImageUrl && a.publishedImageUrl.includes('purablis.com');
        const isBlob = (a.image && a.image.startsWith('blob:'));

        // If it's a blob, we definitely need to publish.
        // If it's a URL but not purablis, we need to publish.
        // If it is purablis, we skip unless we want to force re-upload.

        return (hasImage && wantsPublish && !isAlreadyPublished) || isBlob;
    });

    if (withImages.length === 0) {
        const hasAny = relevant.some(a => a.image);
        // Check if any are actually published
        const allPublished =
            relevant.every(a =>
                !a.image ||
                (a.publishedImageUrl && a.publishedImageUrl.includes('purablis.com')),
            );

        return alert(
            allPublished ?
                'All images are already published to purablis.com.'
                : 'No images to publish. Select images for articles first.',
        );
    }

    const btn = document.querySelector('[onclick="publishAllImagesToPurablis()"]');
    if (btn) btn.disabled = true;

    let ok = 0, fail = 0;
    const errors = [];
    for (let i = 0; i < withImages.length; i++) {
        const a = withImages[i];
        const idx = articles.indexOf(a);

        // Prefer original source, fall back to current image
        let url = a.originalImageUrl || a.image;

        if (!url) continue;

        if (url.startsWith('/') && !url.startsWith('//') && typeof window !== 'undefined') {
            url = window.location.origin + url;
        }

        try {
            const res = await fetch('/api/images/publish-to-purablis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });
            const data = await res.json();
            if (data.success && data.url) {
                // Verify the published URL works before updating the UI
                let urlWorks = false;
                try {
                    await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = resolve;
                        img.onerror = () => reject(new Error('Image failed to load'));
                        img.src = data.url;
                        setTimeout(() => reject(new Error('Timeout')), 5000);
                    });
                    urlWorks = true;
                } catch (e) {
                    console.warn(`Published URL unreachable: ${data.url}`, e);
                }

                // Update state regardless, but be careful with display
                articles[idx].publishedImageUrl = data.url;

                // 3. Ensure original is kept (if it wasn't set before, set it now to what we just used)
                if (!articles[idx].originalImageUrl) {
                    articles[idx].originalImageUrl = url;
                }

                if (urlWorks) {
                    // Only switch display if it works
                    articles[idx].image = data.url;
                    ok++;

                    const box = document.getElementById(`selected-img-${idx}`);
                    if (box) {
                        box.innerHTML =
                            `<div class="selected-image-container">
                                <img
                                    src="${data.url}"
                                    class="img-fluid max-h-30"
                                    onerror="this.onerror = null; this.src = '${articles[idx].originalImageUrl || ''}'; this.parentElement.classList.add('img-fallback');">
                                <button class="btn-remove-image" onclick="removeImage(${idx})">
                                    &times;
                                </button>
                                <span class="badge-published" title="Published">P</span>
                            </div>`;
                    }
                } else {
                    fail++;
                    errors.push(
                        (a.title || 'Article').slice(0, 30) +
                        ': Uploaded, but URL unreachable.',
                    );
                }
                saveState();
            } else {
                fail++;
                errors.push(
                    (a.title || 'Article').slice(0, 30) +
                    ': ' +
                    (data.error || 'Unknown error'),
                );
            }
        } catch (e) {
            fail++;
            errors.push(
                (a.title || 'Article').slice(0, 30) +
                ': ' +
                (e.message || 'Network error'),
            );
            console.warn('Publish failed for', url, e);
        }
        if (btn) btn.textContent = `Publishing ${i + 1}/${withImages.length}...`;
    }

    if (btn) {
        btn.disabled = false;
        btn.textContent = 'Publish Selected to purablis';
    }
    let msg = ok > 0 ? `Published ${ok} image(s) to purablis.com.` : '';
    if (fail > 0) {
        msg +=
            (msg ? ' ' : '') +
            `${fail} failed.` +
            (errors.length ? '\n' + errors.slice(0, 3).join('\n') : '');
    }
    if (!msg) {
        msg = 'No images were published.';
    }
    alert(msg);
};

window.downloadAllImagesZip = async () => {
    const withImages =
        articles
            .filter(a =>
                (a.categories && a.categories.length > 0) ||
                a.status === 'COOL FINDS' ||
                a.status === 'M',
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
            if (!filename &&
                a.image &&
                !a.image.startsWith('data:') &&
                !a.image.startsWith('blob:')) {
                try {
                    const name = a.image.split('/').pop();
                    if (name && name.includes('.')) {
                        filename = name;
                    }
                } catch (e) {
                }
            }

            // 3. Fallback to title
            const ext =
                (url.match(/\.(png|jpg|jpeg|gif|webp|svg)/i))
                    ? url.match(/\.(png|jpg|jpeg|gif|webp|svg)/i)[0]
                    : '.png';
            if (!filename) {
                const safeTitle =
                    (a.title || `article-${i + 1}`)
                        .replace(/[^a-zA-Z0-9-_]/g, '_')
                        .slice(0, 40);
                filename = `${safeTitle}${ext}`;
            } else {
                // Ensure extension is correct if we extracted a name without one (unlikely given checks) or replace if needed?
                // Actually, if we extracted a filename, we trust it has an extension.
                // But we should sanitize it.
                filename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
            }

            // Ensure unique filename
            if (usedFilenames.has(filename)) {
                const namePart =
                    filename.lastIndexOf('.') > 0
                        ? filename.substring(0, filename.lastIndexOf('.'))
                        : filename;
                const extPart =
                    filename.lastIndexOf('.') > 0
                        ? filename.substring(filename.lastIndexOf('.'))
                        : ext;
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
                        zip.file(
                            filename + '.txt',
                            `Failed to download: ${url} (Status: ${res.status})`,
                        );
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
    if (articles.length === 0) return alert('No articles to export.');
    const headers = [
        'Title',
        'URL',
        'Description',
        'Date',
        'Status',
        'Paywall',
        'MED',
        'THC',
        'CBD',
        'INV',
        'Notes',
        'Image URL',
    ];
    const optionalCell = (value) => {
        const text = String(value ?? '').trim();
        return text ? text : undefined;
    };
    const rows = articles.map(a => ([
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
    articles = (importedArticles || []).map((article, index) => ({
        ...article,
        id: index + 1,
        addedAt: article.addedAt || importedAt,
    }));
    archivedArticles = [];
    laterCoolArticles = [];
}

function upsertImportedSession(name) {
    if (!name) return;
    const sessions = getSavedSessions();
    sessions[name] = {
        articles: JSON.parse(JSON.stringify(articles)),
        archivedArticles: JSON.parse(JSON.stringify(archivedArticles)),
        inspirationalImages: [...inspirationalImages],
        newsletterContent: JSON.parse(JSON.stringify(newsletterContent)),
        savedAt: new Date().toISOString(),
    };
    saveSavedSessions(sessions);
    currentSessionName = name;
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

    if (replacePrompt &&
        articles.length > 0 &&
        !confirm(replacePrompt.replace('{count}', articles.length))) {
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

        alert(
            successMessage
                .replace('{count}', articles.length)
                .replace('{name}', data.newsletterName || newsletterName),
        );
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
    articleViewFileInput.addEventListener('change', () =>
        updateChosenFileName('article-view-excel-upload', 'article-view-file-name'),
    );
}

const btnLoadTemplate = document.getElementById('btn-load-template');
if (btnLoadTemplate) {
    btnLoadTemplate.addEventListener('click', () => {
        const headers = [
            'Title',
            'URL',
            'Description',
            'Date',
            'Status',
            'Paywall',
            'MED',
            'THC',
            'CBD',
            'INV',
            'Notes',
            'Image URL',
        ];
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
        list.innerHTML +=
            '<div class="p-5 text-center text-[#777]">' +
            '  No articles found. Please try searching again.' +
            '</div>';
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
                const isStatusValid =
                    ['Y', 'YM', 'M', 'COOL FINDS', 'LATER COOL'].includes(article.status);
                const disabledAttr = isStatusValid ? '' : 'disabled';
                const disabledClass = isStatusValid ? '' : 'opacity-50 cursor-not-allowed';

                const categoryInputs =
                    ['MED', 'THC', 'CBD', 'INV']
                        .map(cat => {
                            let rank = (
                                article.ranks &&
                                (article.ranks[cat] ?? article.ranks[cat.toLowerCase()])
                            ) ?? (article.categories && article.categories.includes(cat)
                                ? 'Y' :
                                '');
                            // Same resolution as getRankForSort so display and sort match (incl. lowercase keys)

                            return `<div class="col-cat">
                                <input
                                    type="text"
                                    value="${rank}"
                                    oninput="updateCategoryRank(${index}, '${cat}', this.value)"
                                    class="${disabledClass}"
                                    ${disabledAttr}
                                    placeholder="">
                            </div>`;
                        }).join('');

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
                                class="title-edit font-[inherit] flex-1 min-w-30"
                                rows="2"
                                onchange="updateArticleField(${index}, 'title', this.value)">${article.title}</textarea>
                            <span
                                class="article-added-at"
                                title="${article.addedAt ? 'Added ' + article.addedAt : 'No add date'}">
                                ${article.addedAt ? 'added ' + formatAddedAt(article.addedAt) : '—'}
                            </span>
                        </div>
                        <p class="my-1.25 text-sm text-[#666]">
                            ${
                    article.description
                        ? article.description.substring(0, 120) + '...'
                        : 'No description'
                }
                        </p>

                        <div class="flex items-center gap-1.25">
                            <input
                                type="text"
                                class="url-edit text-[0.8rem] py-0.5 px-1.25 w-full text-[#2f6e63]"
                                value="${article.url}"
                                onchange="updateArticleField(${index}, 'url', this.value)">
                            <a
                                href="${article.url}"
                                target="_blank" title="Open Link" class="no-underline">
                                🔗
                            </a>
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
                            <option value="Y" ${article.status === 'Y' ? 'selected' : ''}>
                                Y
                            </option>
                            <option value="YM" ${article.status === 'YM' ? 'selected' : ''}>
                                YM
                            </option>
                            <option value="M" ${article.status === 'M' ? 'selected' : ''}>
                                M
                            </option>
                            <option value="NO" ${article.status === 'NO' ? 'selected' : ''}>
                                NO
                            </option>
                            <option
                                value="COOL FINDS"
                                ${article.status === 'COOL FINDS' ? 'selected' : ''}>
                                COOL FINDS
                            </option>
                            <option
                                value="LATER COOL"
                                ${article.status === 'LATER COOL' ? 'selected' : ''}>
                                Later Cool
                            </option>
                        </select>
                    </div>

                    ${categoryInputs}

                    <div class="col-keyword">
                        <textarea
                            class="form-control w-full h-15 text-sm resize-y"
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
                </div>`;
            }).join('');

    updateStats();
    highlightLongTitles();
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
window.updateArticleField = (index, field, value) => {
    if (field === 'status' && value === 'LATER COOL') {
        const article = articles[index];
        article.status = 'LATER COOL';
        laterCoolArticles.push(article);
        articles.splice(index, 1);
        saveState();
        renderArticles();
        const activeStep = document.querySelector('.step.active');
        if (activeStep && activeStep.getAttribute('data-step') === '3') renderImagesView();
        return;
    }
    articles[index][field] = value;

    // Logic: If status becomes invalid, clear categories?
    if (field === 'status') {
        if (!['Y', 'YM', 'COOL FINDS'].includes(value)) {
            articles[index].categories = [];
        }
        // Re-render to update disabled states and unchecked boxes
        renderArticles();
    } else if (field === 'url') {
        // Re-render to update the link icon
        renderArticles();
    } else if (field === 'title') {
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

window.updateCategoryRank = (index, cat, value) => {
    const article = articles[index];
    if (!article.ranks) article.ranks = {};

    const rank = value.trim();

    if (!rank) {
        // Remove from ranks
        delete article.ranks[cat];
        // Remove from categories array if it exists
        if (article.categories && article.categories.includes(cat)) {
            article.categories = article.categories.filter(c => c !== cat);
        }
    } else {
        // Add/Update rank
        article.ranks[cat] = rank;
        // Add to categories array if not present
        if (!article.categories) article.categories = [];
        if (!article.categories.includes(cat)) {
            article.categories.push(cat);
        }
    }

    saveState();
    updateStats(); // Refresh stats
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

// Effective rank for sorting: ranks[cat] or categories.includes(cat)->'Y'. Keep numbers as-is so 1,2,3 sort first.
function getRankForSort(article, cat) {
    if (!article.ranks) {
        if (article.categories && article.categories.includes(cat)) return 'Y';
        return '';
    }
    let r = article.ranks[cat] ?? article.ranks[cat.toLowerCase()] ?? '';
    if (!r && article.categories && article.categories.includes(cat)) r = 'Y';
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

// Articles used for Text summaries: only explicit priority ranks 1-4.
function getSummaryArticlesForCategory(category) {
    return articles.filter(a => {
        if (!['Y', 'YM', 'COOL FINDS', 'LATER COOL'].includes(a.status)) return false;
        if (a.selected === false) return false;
        const rank = getRankForSort(a, category);
        return isPrioritySummaryRank(rank);
    }).sort((a, b) => {
        const rA = rankToSortValue(getRankForSort(a, category));
        const rB = rankToSortValue(getRankForSort(b, category));
        if (rA !== rB) return rA - rB;
        return (a.title || '').localeCompare(b.title || '');
    });
}

// Articles shown in Confirmation/final newsletter: broader ranked + selected article set.
function getArticlesForCategory(category) {
    return articles
        .filter(a => {
            if (!['Y', 'YM', 'COOL FINDS', 'LATER COOL'].includes(a.status)) return false;
            if (a.selected === false) return false;
            const rank = getRankForSort(a, category);
            return rank !== '' && rank !== undefined;
        }).sort((a, b) => {
            const rA = rankToSortValue(getRankForSort(a, category));
            const rB = rankToSortValue(getRankForSort(b, category));
            if (rA !== rB) return rA - rB;
            return (a.title || '').localeCompare(b.title || '');
        });
}

function getSelectedRankCounts() {
    return {
        MED: getArticlesForCategory('MED').length,
        THC: getArticlesForCategory('THC').length,
        CBD: getArticlesForCategory('CBD').length,
        INV: getArticlesForCategory('INV').length,
    };
}

function updateStats() {
    const statsEl = document.getElementById('article-stats');
    if (!statsEl) return;

    const counts = getSelectedRankCounts();
    let selectedCount = 0;

    articles.forEach(a => {
        if (a.selected !== false) selectedCount++;
    });

    const sessionLabel = currentSessionName
        ? `<span class="stat-item bg-[#e8eaf6] text-[#283593] font-semibold">
            ${currentSessionName}
        </span>`
        : '';

    const statsHtml =
        `${sessionLabel}
        <span class="stat-item" title="Total articles in list">Total: ${articles.length}</span>
        <span
            class="stat-item bg-[#e0f7fa] text-[#006064]"
            title="Articles checked in the Select column">
            Selected: ${selectedCount}
        </span>
        <span class="stat-item bg-[#e3f2fd] text-[#0d47a1]">MED: ${counts.MED}</span>
        <span class="stat-item bg-[#e8f5e9] text-[#1b5e20]">THC: ${counts.THC}</span>
        <span class="stat-item bg-[#fff3e0] text-[#e65100]">CBD: ${counts.CBD}</span>
        <span class="stat-item bg-[#f3e5f5] text-[#4a148c]">INV: ${counts.INV}</span>`;
    statsEl.innerHTML = statsHtml;
    const footerEl = document.getElementById('article-stats-footer');
    if (footerEl) footerEl.innerHTML = statsHtml;
}

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

let currentSessionName = '';

window.saveSession = () => {
    const name = document.getElementById('newsletter-name').value.trim();
    if (!name) return alert('Please enter a newsletter name on the first page.');

    const sessions = getSavedSessions();
    sessions[name] = {
        articles: JSON.parse(JSON.stringify(articles)),
        archivedArticles: JSON.parse(JSON.stringify(archivedArticles)),
        inspirationalImages: [...inspirationalImages],
        newsletterContent: JSON.parse(JSON.stringify(newsletterContent)),
        savedAt: new Date().toISOString(),
    };
    saveSavedSessions(sessions);
    currentSessionName = name;
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

    if (articles.length > 0 &&
        !confirm(`This will replace the current ${articles.length} articles. Continue?`)) {
        return;
    }

    articles = session.articles || [];
    const savedAt = session.savedAt || new Date().toISOString();
    articles.forEach(a => {
        if (!a.addedAt) a.addedAt = savedAt;
    });
    archivedArticles = session.archivedArticles || [];
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
        subjectPrompt: normalizeSubjectPrompt(nc.subjectPrompt),
        generatedSubjects: nc.generatedSubjects || { MED: '', THC: '', CBD: '', INV: '' },
    };

    document.getElementById('newsletter-name').value = name;
    currentSessionName = name;
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

    const selectedName = currentSessionName || (nameInput ? nameInput.value.trim() : '');
    if (selectedName) {
        if (dropdownStep1) dropdownStep1.value = selectedName;
        if (dropdown) dropdown.value = selectedName;
        if (dropdownStep3) dropdownStep3.value = selectedName;
    }

    const hintEl = document.getElementById('state-load-hint');
    const textEl = document.getElementById('state-load-hint-text');
    if (hintEl && names.length === 0) {
        showWithClass(hintEl, 'block');
        if (textEl &&
            textEl.textContent === 'Loading…' &&
            typeof window.updateStateHintFromDiagnostic === 'function') {
            window.updateStateHintFromDiagnostic();
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
        const sessions = buildSessionsState(true);
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
        if (lastGeneratedNewsletter &&
            lastGeneratedNewsletter.meta &&
            lastGeneratedNewsletter.meta.name) {
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
            currentSessionName =
                currentSessionName ||
                document.getElementById('newsletter-name')?.value.trim() ||
                '';
            populateSavedDropdown();
            const generatedNote = lastGeneratedNewsletter ? ', generated newsletter synced' : '';
            alert(
                'Pushed to server: ' +
                articles.length +
                ' articles, ' +
                archivedArticles.length +
                ' archived, ' +
                laterCoolArticles.length +
                ' later cool, ' +
                Object.keys(sessions).length +
                ' saved session(s)' +
                generatedNote +
                '.',
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
        const res = await fetch('/api/state?key=workspace');
        const wr = res.ok ? await res.json() : {};
        const value = wr.value || {};
        const fromServer = value.laterCoolArticles || [];
        const fromLocal = laterCoolArticles || [];
        const toAdd = fromServer.length ? fromServer : fromLocal;
        if (toAdd.length === 0) {
            alert('No Later Cool finds saved.');
            return;
        }
        const addedAt = new Date().toISOString();
        toAdd.forEach(a => {
            a.addedAt = a.addedAt || addedAt;
        });
        articles = [...toAdd, ...articles];
        laterCoolArticles = [];
        saveState();
        renderArticles();
        alert('Added ' + toAdd.length + ' Later Cool find(s) to the top.');
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
                if (activeStep &&
                    activeStep.getAttribute('data-step') === '3' &&
                    typeof renderImagesView === 'function') {
                    renderImagesView();
                }
                msg = (value.articles || []).length + ' articles in workspace. ';
                const nameEl = document.getElementById('newsletter-name');
                if (nameEl && nameEl.value.trim()) {
                    currentSessionName = nameEl.value.trim();
                }
            }
        } else if (wrRes.status === 503) {
            msg = 'Server database not configured. ';
            if (hintEl) showWithClass(hintEl, 'block');
            await window.updateStateHintFromDiagnostic();
        }
        if (sessRes.ok) {
            const { value } = await sessRes.json();
            if (value && typeof value === 'object') {
                const local = JSON.parse(localStorage.getItem('newsletter_saved_sessions') || '{}');
                const merged = { ...value };
                Object.keys(local).forEach(k => {
                    if (!(k in merged)) {
                        merged[k] = local[k];
                    }
                });
                localStorage.setItem('newsletter_saved_sessions', JSON.stringify(merged));
                if (typeof populateSavedDropdown === 'function') populateSavedDropdown();
                const n = Object.keys(merged).length;
                msg += n + ' saved session(s) (server + local).';
                if (hintEl) {
                    hideWithClass(hintEl);
                }
            }
        } else if (sessRes.status === 503) {
            msg = (msg || '') + 'Sessions: server database not configured.';
            if (hintEl) {
                showWithClass(hintEl, 'block');
            }
            await window.updateStateHintFromDiagnostic();
        }
        alert(msg || 'No data from server. Check the yellow hint above for details.');
    } catch (e) {
        if (hintEl) {
            showWithClass(hintEl, 'block');
        }
        if (textEl) {
            textEl.textContent =
                'Could not reach server: ' +
                (e.message || 'network error') +
                '. Check that the API is deployed (e.g. Vercel runs the Express server).';
        }
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

// --- SEARCH MORE ARTICLES (deduplicates by URL) ---

async function searchMoreArticles() {
    const prompt = document.getElementById('step2-query').value.trim();
    if (!prompt) return alert('Please enter a search query.');

    const btn = document.getElementById('btn-step2-query');
    const status = document.getElementById('step2-query-status');
    const model = document.getElementById('ai-model').value;
    const newsletterName = document.getElementById('newsletter-name').value;

    btn.disabled = true;
    btn.textContent = 'Searching...';
    hideWithClass(status);

    try {
        const response = await fetch('/api/articles/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, newsletterName, model }),
        });

        const data = await response.json();

        if (data.success && data.articles) {
            const existingUrls = new Set(articles.map(a => normalizeUrl(a.url)));
            const newArticles = data.articles.filter(a => !existingUrls.has(normalizeUrl(a.url)));

            // Assign IDs continuing from current max; mark when added
            const maxId = articles.reduce((max, a) => Math.max(max, a.id || 0), 0);
            const addedAt = new Date().toISOString();
            newArticles.forEach((a, i) => {
                a.id = maxId + i + 1;
                a.addedAt = addedAt;
            });

            articles = articles.concat(newArticles);
            saveState();
            renderArticles();

            const dupeCount = data.articles.length - newArticles.length;
            let msg = `Added ${newArticles.length} new articles.`;
            if (dupeCount > 0) msg += ` (${dupeCount} duplicates skipped)`;
            status.textContent = msg;
            showWithClass(status, 'block');
        } else {
            const clarification = await getAiClarificationFromError(data);
            const details = clarification || String(data.details || '').trim();
            alert('Search Error: ' + (details || data.error || 'Unknown error'));
        }
    } catch (err) {
        console.error(err);
        alert('Search failed. See console for details.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Find Articles';
    }
}

function normalizeUrl(url) {
    if (!url) {
        return '';
    }
    return url.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
}

// --- MODIFY EXISTING ARTICLES ---

async function modifyExistingArticles() {
    const prompt = document.getElementById('step2-query').value.trim();
    if (!prompt) {
        return alert('Please enter a modification instruction.');
    }

    const selectedIndices = articles.map((a, i) => a.selected ? i : -1).filter(i => i !== -1);
    if (selectedIndices.length === 0) {
        return alert('No articles selected. Check the boxes on articles you want to modify.');
    }

    const selectedArticles = selectedIndices.map(i => articles[i]);
    const btn = document.getElementById('btn-step2-query');
    const status = document.getElementById('step2-query-status');

    btn.disabled = true;
    btn.textContent = 'Modifying...';
    hideWithClass(status);

    try {
        const response = await fetch('/api/articles/modify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                articles: selectedArticles,
                model: document.getElementById('ai-model').value,
            }),
        });

        const data = await response.json();
        if (data.success) {
            data.articles.forEach((modArticle, i) => {
                const originalIndex = selectedIndices[i];
                if (articles[originalIndex]) {
                    if (modArticle.title) {
                        articles[originalIndex].title = modArticle.title;
                    }
                    if (modArticle.description) {
                        articles[originalIndex].description = modArticle.description;
                    }
                    if (modArticle.url) {
                        articles[originalIndex].url = modArticle.url;
                    }
                    if (modArticle.date) {
                        articles[originalIndex].date = modArticle.date;
                    }
                }
            });
            saveState();
            renderArticles();
            status.textContent = `Modified ${data.articles.length} articles.`;
            showWithClass(status, 'block');
        } else {
            const clarification = await getAiClarificationFromError(data);
            const details = clarification || String(data.details || '').trim();
            alert('Error: ' + (details || data.error || 'Unknown error'));
        }
    } catch (err) {
        console.error(err);
        alert('Modification failed.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Apply Changes';
    }
}

// Recent Prompts Logic
function loadRecentPrompts() {
    const prompts = JSON.parse(localStorage.getItem('recentPrompts') || '[]');
    const container = document.getElementById('recent-prompts');
    if (!container) return;

    container.innerHTML = '';
    if (prompts.length > 0) {
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
                document.getElementById('ai-prompt').value = p;
            };
            container.appendChild(span);
        });
    }
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

        if (!prompt) {
            alert("Please enter a prompt to search for articles.");
            return;
        }

        if (articles.length > 0) {
            if (!confirm(
                `This will replace the ${articles.length} articles currently in the workspace.\n\n ` +
                "Make sure you've saved first if you need them.\n\nContinue?",
            )) {
                return;
            }
        }

        saveRecentPrompt(prompt);
        currentSessionName = '';

        console.log('Initiating AI Search...', { newsletterName, prompt, model });

        searchBtn.disabled = true;
        searchBtn.textContent = 'Searching...';
        if (searchStatus) hideWithClass(searchStatus);

        try {
            const response = await fetch('/api/articles/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, newsletterName, model }),
            });

            const data = await response.json();

            if (data.success) {
                console.log("AI Search Results:", data.articles);
                articles = data.articles; // Store in state
                renderArticles(); // Render to grid

                // Stay on page, show success message and next button
                if (searchStatus) {
                    searchStatus.textContent = `Found ${data.articles.length} articles!`;
                    showWithClass(searchStatus, 'inline');
                }
                if (nextStep2Btn) {
                    showWithClass(nextStep2Btn, 'inline-block');
                }
            } else {
                // Show specific error message from backend (e.g. "Credit balance too low")
                const clarification = await getAiClarificationFromError(data);
                const details = clarification || String(data.details || '').trim();
                alert('Search Error:\n' + (details || data.error || 'Unknown error'));
                if (data.details) console.error("Error Details:", data.details);
            }
        } catch (err) {
            console.error("Network/Parsing Error:", err);
            alert(
                'Search failed. Please check your connection and try again.\n' +
                'See console for details.',
            );
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
            replacePrompt:
                'This will replace the current {count} articles in your workspace. Continue?',
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
            replacePrompt:
                'This will replace the current {count} articles shown in Article View and clear ' +
                'archived/later-cool lists. Continue?',
            successMessage:
                'Restored {count} articles into "{name}". You can continue from Article View now.',
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
            document.getElementById('newsletter-name').value = selectedName;
            currentSessionName = selectedName;
        }
    });
}

const newsletterNameInput = document.getElementById('newsletter-name');
if (newsletterNameInput) {
    newsletterNameInput.addEventListener('input', () => {
        currentSessionName = newsletterNameInput.value.trim();
        if (savedSessionsDropdownStep1) {
            savedSessionsDropdownStep1.value = currentSessionName;
        }
    });
}
