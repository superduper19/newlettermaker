// Global State
let articles = [];
let archivedArticles = [];
let laterCoolArticles = [];
let inspirationalImages = [];
let newsletterContent = {
    MED: { intro: '', outro: '' },
    THC: { intro: '', outro: '' },
    CBD: { intro: '', outro: '' },
    INV: { intro: '', outro: '' },
    templates: { MED: '', THC: '', CBD: '', INV: '' }
};
let currentEditorTab = 'MED';
let lastGeneratedNewsletter = null;
let batchFilter = ''; // '' = all, or addedAt ISO string to show only that batch

// Load State: first from LocalStorage (instant), then from Supabase if configured (overwrites)
try {
    const saved = localStorage.getItem('newsletter_articles');
    if (saved) {
        const data = JSON.parse(saved);
        if (Array.isArray(data)) {
            articles = data;
        } else {
            articles = data.articles || [];
            archivedArticles = data.archivedArticles || [];
            laterCoolArticles = data.laterCoolArticles || [];
            inspirationalImages = data.inspirationalImages || [];
            const nc = data.newsletterContent || { MED: { intro: '', outro: '' }, THC: { intro: '', outro: '' }, CBD: { intro: '', outro: '' }, INV: { intro: '', outro: '' } };
            newsletterContent = { ...nc, templates: nc.templates || { MED: '', THC: '', CBD: '', INV: '' } };
        }
    }
} catch (e) {
    console.error('Failed to load state', e);
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
            hintEl.classList.add('hidden');
            return;
        }
        hintEl.classList.remove('hidden');
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
        hintEl.classList.remove('hidden');
        textEl.textContent = 'Cannot reach /api/state. Is the server running? On Vercel, ensure the app is deployed with the Express server (see docs).';
    }
};

(async function loadFromDb() {
    try {
        const [wrRes, sessRes] = await Promise.all([
            fetch('/api/state?key=workspace'),
            fetch('/api/state?key=sessions')
        ]);
        const hintEl = document.getElementById('state-load-hint');
        if (sessRes.status === 503 || wrRes.status === 503) {
            if (hintEl) hintEl.classList.remove('hidden');
            await window.updateStateHintFromDiagnostic();
        }
        if (wrRes.ok) {
            const { value } = await wrRes.json();
            if (value && value.articles) {
                articles = value.articles || [];
                archivedArticles = value.archivedArticles || [];
                laterCoolArticles = value.laterCoolArticles || [];
                inspirationalImages = value.inspirationalImages || [];
                const nc = value.newsletterContent || newsletterContent;
                newsletterContent = { ...nc, templates: nc.templates || { MED: '', THC: '', CBD: '', INV: '' } };
                localStorage.setItem('newsletter_articles', JSON.stringify({ articles, archivedArticles, laterCoolArticles, inspirationalImages, newsletterContent }));
                if (typeof renderArticles === 'function') renderArticles();
            }
        }
        if (sessRes.ok) {
            const { value } = await sessRes.json();
            if (value && typeof value === 'object') {
                const local = JSON.parse(localStorage.getItem('newsletter_saved_sessions') || '{}');
                const merged = { ...value };
                Object.keys(local).forEach(k => { if (!(k in merged)) merged[k] = local[k]; });
                localStorage.setItem('newsletter_saved_sessions', JSON.stringify(merged));
                if (typeof populateSavedDropdown === 'function') populateSavedDropdown();
                if (hintEl) hintEl.classList.add('hidden');
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
        if (hintEl) hintEl.classList.remove('hidden');
        await window.updateStateHintFromDiagnostic();
    }
})();

let workspaceSyncTimeout = null;
function saveState() {
    const state = {
        articles,
        archivedArticles,
        laterCoolArticles,
        inspirationalImages,
        newsletterContent
    };
    localStorage.setItem('newsletter_articles', JSON.stringify(state));
    // Debounced sync to Supabase
    if (workspaceSyncTimeout) clearTimeout(workspaceSyncTimeout);
    workspaceSyncTimeout = setTimeout(() => {
        fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'workspace', value: state })
        }).catch(() => {});
    }, 800);
}

// Clear State
window.clearWorkspace = () => {
    if (confirm('Are you sure you want to clear all articles and start fresh? This cannot be undone.')) {
        articles = [];
        inspirationalImages = [];
        newsletterContent = {
            MED: { intro: '', outro: '' },
            THC: { intro: '', outro: '' },
            CBD: { intro: '', outro: '' },
            INV: { intro: '', outro: '' }
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
    // Update Navigation UI
    steps.forEach(s => s.classList.remove('active'));
    const activeStep = document.querySelector(`.step[data-step="${stepNumber}"]`);
    if (activeStep) activeStep.classList.add('active');

    // Show Corresponding View
    views.forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(`step-${stepNumber}`);
    if (targetView) targetView.classList.add('active');

    // Logic for specific steps
    if (stepNumber == 2) {
        populateSavedDropdown();
        renderArticles();
    } else if (stepNumber == 3) {
        populateSavedDropdown();
        renderImagesView();
    } else if (stepNumber == 4) {
        renderInspirationalView();
    } else if (stepNumber == 5) {
        renderEditorView();
    } else if (stepNumber == 6) {
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
    const relevant = articles.filter(a => (a.categories && a.categories.length > 0) || a.status === 'COOL FINDS' || a.status === 'M');
    relevant.forEach(a => {
        a.publishImage = select;
    });
    saveState();
    renderImagesView();
};

window.renderImagesView = () => {
    const list = document.getElementById('images-list');
    list.innerHTML = '';

    const relevantArticles = articles.filter(a => (a.categories && a.categories.length > 0) || a.status === 'COOL FINDS' || a.status === 'M');

    if (relevantArticles.length === 0) {
        list.innerHTML = '<div class="px-[30px] py-[30px] text-center text-gray-500">No articles with categories. Go back to Article View and assign categories first.</div>';
        return;
    }

    // Table header
    list.innerHTML = `
        <div class="img-table-header">
            <div class="img-col-select flex flex-col items-center gap-0.5">
                <span class="text-[0.75rem]">Publish</span>
                <span class="text-[0.65rem] cursor-pointer underline" onclick="toggleAllImagePublish(true)">All</span>
                <span class="text-[0.65rem] cursor-pointer underline" onclick="toggleAllImagePublish(false)">None</span>
            </div>
            <div class="img-col-article">Article</div>
            <div class="img-col-cat">MED</div>
            <div class="img-col-cat">THC</div>
            <div class="img-col-cat">CBD</div>
            <div class="img-col-cat">INV</div>
            <div class="img-col-search">Image Search</div>
            <div class="img-col-selected">Selected</div>
            <div class="img-col-results">Results</div>
            <div class="img-col-actions">Actions</div>
        </div>
    `;

    relevantArticles.forEach((article) => {
        const originalIndex = articles.indexOf(article);

        if (!article.imageSearchQuery) {
            const words = article.title.split(' ').filter(w => w.length > 3);
            article.imageSearchQuery = words.slice(0, 2).join(' ');
        }

        const selectedImageHtml = article.image
            ? `<div class="selected-image-container">
                 <img src="${article.image}" class="img-fluid max-h-[120px]" onerror="this.onerror=null;this.src='${article.originalImageUrl || ''}';this.parentElement.classList.add('img-fallback');">
                 <button class="btn-remove-image" onclick="removeImage(${originalIndex})">×</button>
                 ${article.image.includes('purablis.com') ? '<span class="badge-published" title="Published">P</span>' : ''}
               </div>`
            : `<div class="no-image-placeholder">No Image</div>`;

        const gridId = `grid-${originalIndex}`;

        const catInputs = ['MED', 'THC', 'CBD', 'INV'].map(cat => {
            let rank = (article.ranks && article.ranks[cat]) || '';
            return `<div class="img-col-cat">
                <input type="text" value="${rank}"
                    oninput="updateCategoryRank(${originalIndex}, '${cat}', this.value)"
                    class="w-full text-center py-[4px] px-[1px] border border-gray-300 rounded-[4px] text-[0.8rem] box-border">
            </div>`;
        }).join('');

        if (article.publishImage === undefined) article.publishImage = !!article.image;

        const rowHtml = `
            <div class="img-table-row">
                <div class="img-col-select flex items-center justify-center pt-[8px]">
                    <input type="checkbox" ${article.publishImage ? 'checked' : ''} onchange="updateArticleField(${originalIndex}, 'publishImage', this.checked)">
                </div>
                <div class="img-col-article">
                    <textarea class="title-edit text-sm" rows="2"
                        onchange="updateArticleField(${originalIndex}, 'title', this.value)"
                        style="font-family: inherit;"
                    >${article.title}</textarea>
                    <a href="${article.url}" target="_blank" class="article-link-sm">${article.url}</a>
                </div>
                ${catInputs}
                <div class="img-col-search">
                    <div class="flex gap-1.25 mb-[8px]">
                        <input type="text" class="form-control px-[8px] py-1.25 text-[0.85rem]"
                            id="img-search-input-${originalIndex}"
                            value="${article.imageSearchQuery}"
                            placeholder="Keyword...">
                        <button class="btn btn-sm btn-primary whitespace-nowrap" onclick="searchArticleImages(${originalIndex})">Search</button>
                    </div>
                    <div class="border-t border-gray-200 pt-1.5">
                        <input type="file" accept="image/*" id="img-upload-input-${originalIndex}" class="hidden" onchange="uploadArticleImage(${originalIndex}, this)">
                        <label for="img-upload-input-${originalIndex}" class="btn btn-sm btn-secondary cursor-pointer m-0 text-[0.78rem] py-[4px] px-2.5">Upload File</label>
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
                    <button class="btn btn-sm btn-outline text-orange-600 border-orange-600 mb-1.25 w-full" onclick="archiveArticle(${originalIndex})">Archive</button>
                    <button class="btn btn-sm btn-outline text-red-600 border-red-600 w-full" onclick="removeArticle(${originalIndex})">Remove</button>
                </div>
            </div>
        `;
        list.innerHTML += rowHtml;
    });

    updateImageViewStats();
};

function updateImageViewStats() {
    const statsEl = document.getElementById('image-view-stats');
    if (!statsEl) return;
    const relevantArticles = articles.filter(a => (a.categories && a.categories.length > 0) || a.status === 'COOL FINDS' || a.status === 'M');
    const counts = { MED: 0, THC: 0, CBD: 0, INV: 0 };
    let validStatusCount = 0;
    const validStatuses = ['Y', 'YM', 'COOL FINDS'];
    relevantArticles.forEach(a => {
        if (validStatuses.includes(a.status)) validStatusCount++;
        if (a.ranks) {
            ['MED', 'THC', 'CBD', 'INV'].forEach(cat => {
                if (a.ranks[cat]) counts[cat]++;
            });
        }
    });
    const sessionLabel = currentSessionName
        ? `<span class="stat-item bg-indigo-100 text-indigo-800 font-semibold">${currentSessionName}</span>`
        : '';

    const count = relevantArticles.length;
    const countStyle = count === 25
        ? 'bg-green-100 text-green-900 font-bold border-2 border-green-500'
        : 'bg-red-100 text-red-900 font-bold border-2 border-red-300';

    statsEl.innerHTML = `
        ${sessionLabel}
        <span class="stat-item ${countStyle}" title="Target is 25 articles">Total: ${count} / 25</span>
        <span class="stat-item bg-cyan-100 text-cyan-900">Selected: ${validStatusCount}</span>
        <span class="stat-item bg-blue-100 text-blue-900">MED: ${counts.MED}</span>
        <span class="stat-item bg-green-100 text-green-900">THC: ${counts.THC}</span>
        <span class="stat-item bg-amber-100 text-amber-900">CBD: ${counts.CBD}</span>
        <span class="stat-item bg-purple-100 text-purple-900">INV: ${counts.INV}</span>
    `;
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
            body: JSON.stringify({ query, page })
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
            navDiv.innerHTML = `
                <button class="btn btn-sm btn-outline" ${currentPage <= 1 ? 'disabled' : ''} onclick="changeImagePage(${index}, -1)" title="Previous">&larr;</button>
                <span class="text-[0.8rem] text-gray-600">Page ${currentPage}</span>
                <button class="btn btn-sm btn-outline" onclick="changeImagePage(${index}, 1)" title="Next">&rarr;</button>
            `;
            grid.appendChild(navDiv);
        } else {
            grid.innerHTML = '<div class="grid-placeholder">No images found.</div>';
        }
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<div class="grid-placeholder">Error searching.</div>';
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
        box.innerHTML = `
            <div class="selected-image-container">
                 <img src="${url}" class="img-fluid max-h-[150px]" onerror="this.onerror=null;this.src='${articles[index].originalImageUrl || ''}';this.parentElement.classList.add('img-fallback');">
                 <button class="btn-remove-image" onclick="removeImage(${index})">×</button>
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
            body: formData
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
            }
            else if (data.ftpError && label) label.textContent = 'Local only';
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
            body: JSON.stringify({ query, page: 1 })
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
    if (status) status.textContent = 'Uploading to server and publishing...';

    const formData = new FormData();
    formData.append('image', input.files[0]);

    try {
        const res = await fetch('/api/images/upload-inspirational', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success && data.url) {
            inspirationalImages.push(data.url);
            saveState();
            renderInspirationalView();
            const pubMsg = data.published ? ' (published to GoDaddy)' : ' (local only — FTP not configured)';
            if (status) status.textContent = 'Uploaded' + pubMsg;
            if (data.ftpError && status) status.textContent += ' FTP error: ' + data.ftpError;
        } else {
            alert('Upload failed: ' + (data.error || 'Unknown error'));
            if (status) status.textContent = 'Upload failed.';
        }
    } catch (e) {
        console.error(e);
        alert('Upload failed. See console.');
        if (status) status.textContent = 'Upload failed.';
    } finally {
        btn.textContent = 'Upload';
        btn.disabled = false;
        input.value = '';
    }
};

window.addInspirationalUrl = () => {
    const input = document.getElementById('insp-url-input');
    const status = document.getElementById('insp-upload-status');

    if (!input || !input.value.trim()) {
        return alert('Please enter an image URL.');
    }

    const url = input.value.trim();

    // Basic URL validation
    try {
        new URL(url);
    } catch (e) {
        return alert('Invalid URL. Please enter a valid HTTP/HTTPS URL.');
    }

    inspirationalImages.push(url);
    saveState();
    renderInspirationalView();

    if (status) status.textContent = 'Image URL added successfully.';
    input.value = '';

    // Clear status message after 3 seconds
    setTimeout(() => {
        if (status) status.textContent = '';
    }, 3000);
};

window.selectInspirationalImage = (url) => {
    inspirationalImages.push(url);
    saveState();
    renderInspirationalView();
};

window.removeInspirationalImage = (index) => {
    inspirationalImages.splice(index, 1);
    saveState();
    renderInspirationalView();
};

function renderInspirationalView() {
    const selectedGrid = document.getElementById('selected-insp-grid');
    if (!selectedGrid) return;

    selectedGrid.innerHTML = '';
    if (inspirationalImages.length === 0) {
        selectedGrid.innerHTML = '<div class="grid-placeholder">No images selected.</div>';
        return;
    }

    inspirationalImages.forEach((url, index) => {
        const div = document.createElement('div');
        div.className = 'relative';

        const imgEl = document.createElement('img');
        imgEl.src = url;
        imgEl.className = 'thumbnail-img';

        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '&times;';
        removeBtn.className = 'absolute top-1.25 right-1.25 bg-red-600 text-white border-0 rounded-full w-5 h-5 cursor-pointer';
        removeBtn.onclick = () => removeInspirationalImage(index);

        div.appendChild(imgEl);
        div.appendChild(removeBtn);
        selectedGrid.appendChild(div);
    });
}

// --- STEP 5: TEXT EDITOR ---

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
    let promptValue = content.prompt || '';

    const summaryRulesValue = newsletterContent.summaryRules || '';
    const resultValue = content.result || '';
    const templateValue = (newsletterContent.templates && newsletterContent.templates[currentEditorTab]) || '';

    container.innerHTML = `
        <div class="form-group p-3 bg-gray-50 rounded-lg border border-gray-200 mb-5">
            <label class="font-semibold">Template for ${currentEditorTab}</label>
            <p class="text-muted text-[0.8rem] mb-2.5">HTML template for this newsletter. Use {{SUMMARY}}, {{ARTICLES_HTML}}, {{INSPIRATIONAL_IMAGE}}, {{NEWSLETTER_NAME}} as placeholders.</p>
            <div class="flex flex-wrap gap-3 items-center mb-2.5">
                <input type="file" id="template-single-input" accept=".html,.htm" class="text-[0.85rem]">
                <button class="btn btn-secondary btn-sm" onclick="uploadSingleTemplate()">Upload 1 (for ${currentEditorTab})</button>
                <span class="text-gray-400">or</span>
                <input type="file" id="template-batch-input" accept=".html,.htm" multiple class="text-[0.85rem]">
                <button class="btn btn-secondary btn-sm" onclick="uploadAllTemplates()">Upload all 4</button>
            </div>
            <div id="template-status" class="text-[0.8rem] text-gray-500 mb-2"></div>
            <textarea id="editor-template" rows="6" class="form-control font-mono text-[0.8rem] bg-white" oninput="updateTemplate('${currentEditorTab}', this.value)" placeholder="Paste or edit HTML template here..."></textarea>
        </div>

        <div class="grid grid-cols-[1fr_300px] gap-5 items-start">
            <div>
                <div class="form-group">
                    <label class="font-semibold">Prompt</label>
                    <textarea id="editor-prompt" rows="8" class="form-control font-mono text-[0.9rem] mt-2.5" oninput="updateNewsletterContent('${currentEditorTab}', 'prompt', this.value)">${promptValue}</textarea>
                </div>

                <div class="flex items-center gap-2.5 my-[5px] mb-3.75">
                    <input type="text" id="bring-articles-input" placeholder="e.g. 1,2,3" class="w-[120px] px-2.5 py-1.5 border border-gray-300 rounded-[4px] text-[0.9rem]">
                    <button class="btn btn-secondary btn-sm" onclick="bringArticlesToPrompt('${currentEditorTab}')">Bring Articles</button>
                </div>

                <div class="flex items-center gap-3.75 mb-5 justify-between flex-wrap">
                    <div class="flex items-center gap-3.75">
                        <label class="flex items-center gap-1.25 cursor-pointer text-[0.9rem]">
                            <input type="radio" id="rules-on-${currentEditorTab}" name="useRulesGroup-${currentEditorTab}" ${content.useRules !== false ? 'checked' : ''} onchange="updateNewsletterContent('${currentEditorTab}', 'useRules', true)">
                            Use Summary Rules
                        </label>
                        <label class="flex items-center gap-1.25 cursor-pointer text-[0.9rem]">
                            <input type="radio" id="rules-off-${currentEditorTab}" name="useRulesGroup-${currentEditorTab}" ${content.useRules === false ? 'checked' : ''} onchange="updateNewsletterContent('${currentEditorTab}', 'useRules', false)">
                            Custom (No Rules)
                        </label>
                    </div>
                    <button class="btn btn-primary" onclick="generateSummary('${currentEditorTab}')">
                        <span id="gen-btn-text-${currentEditorTab}">Generate Summary</span>
                    </button>
                </div>
            </div>

            <div>
                <div id="editor-articles-list" class="mb-3.75 text-[0.85rem]"></div>
                <div class="form-group">
                    <label class="font-semibold">Summary Rules</label>
                    <textarea id="editor-summary-rules" rows="14" class="form-control text-[0.85rem] bg-yellow-50 border-yellow-400" oninput="updateSummaryRules(this.value)" placeholder="Persistent rules sent as system instructions to the AI...">${summaryRulesValue}</textarea>
                    <div class="text-[0.7rem] text-gray-400 mt-1">These rules persist across saves and categories.</div>
                </div>
            </div>
        </div>

        <div class="form-group mt-2.5">
            <label class="font-semibold">Created Result</label>
            <textarea id="editor-result" rows="10" class="form-control text-[0.9rem] bg-gray-100 mt-2.5" oninput="updateNewsletterContent('${currentEditorTab}', 'result', this.value)" placeholder="The AI-generated result will appear here...">${resultValue}</textarea>
        </div>

        <div class="flex justify-end gap-2.5 mt-3.75">
            <button class="btn btn-outline btn-sm" onclick="copyEditorContent('${currentEditorTab}')">Copy ${currentEditorTab} Content</button>
        </div>
    `;
    const templateEl = document.getElementById('editor-template');
    if (templateEl) templateEl.value = templateValue || '';
    const listEl = document.getElementById('editor-articles-list');
    if (listEl && typeof getArticlesForCategory === 'function') {
        const catArticles = getArticlesForCategory(currentEditorTab);
        const listHtml = catArticles.length
            ? catArticles.map((a, i) => (i + 1) + '. ' + (a.title || 'Untitled').replace(/</g, '&lt;').substring(0, 48) + ((a.title || '').length > 48 ? '…' : '')).join('<br>')
            : '<span class="text-muted">No articles with ' + currentEditorTab + ' rank.</span>';
        listEl.innerHTML = '<label class="font-semibold">Articles for ' + currentEditorTab + '</label><div class="max-h-[200px] overflow-y-auto mt-1.5 leading-[1.4]">' + listHtml + '</div><div class="text-[0.7rem] text-gray-400 mt-1">Use numbers above in &quot;Bring Articles&quot; (e.g. 1,2,3).</div>';
    }
};

window.bringArticlesToPrompt = (category) => {
    const input = document.getElementById('bring-articles-input');
    if (!input || !input.value.trim()) return alert('Enter article numbers separated by commas (e.g. 1,2,3).');
    const nums = input.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
    if (nums.length === 0) return alert('Enter valid article numbers separated by commas (e.g. 1,2,3).');

    const categoryArticles = getArticlesForCategory(category);

    const selected = nums.map(n => categoryArticles[n - 1]).filter(Boolean);
    if (selected.length === 0) return alert('No matching articles for those numbers. Use the numbered list for ' + category + ' (right side).');

    const urls = selected.map(a => a.url).join('\n');

    const promptEl = document.getElementById('editor-prompt');
    if (promptEl) {
        const existing = promptEl.value.trim();
        promptEl.value = existing ? existing + '\n\n' + urls : urls;
        updateNewsletterContent(category, 'prompt', promptEl.value);
    }
};

window.updateSummaryRules = (value) => {
    newsletterContent.summaryRules = value;
    saveState();
};

window.updateTemplate = (category, value) => {
    if (!newsletterContent.templates) newsletterContent.templates = { MED: '', THC: '', CBD: '', INV: '' };
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
        if (!newsletterContent.templates) newsletterContent.templates = { MED: '', THC: '', CBD: '', INV: '' };
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
    if (!newsletterContent.templates) newsletterContent.templates = { MED: '', THC: '', CBD: '', INV: '' };
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

window.generateSummary = async (category) => {
    const prompt = document.getElementById('editor-prompt').value;
    const rulesOnEl = document.getElementById(`rules-on-${category}`);
    const isUseRules = rulesOnEl ? rulesOnEl.checked : true;
    const summaryRules = isUseRules ? (newsletterContent.summaryRules || '') : '';
    const btnText = document.getElementById(`gen-btn-text-${category}`);

    if (!prompt) return alert('Please enter a prompt.');

    btnText.textContent = 'Generating...';

    try {
        const res = await fetch('/api/articles/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, useRules: isUseRules, summaryRules, category })
        });
        const data = await res.json();

        if (data.success) {
            const resultText = data.resultText || '';
            newsletterContent[category].result = resultText;
            saveState();
            const resultEl = document.getElementById('editor-result');
            if (resultEl) resultEl.value = resultText;
        } else {
            alert('Generation failed: ' + (data.error || 'Unknown error') + (data.details ? '\n' + data.details : ''));
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

    // Calculate stats
    const stats = { MED: 0, THC: 0, CBD: 0, INV: 0, COOL_FINDS: 0 };
    articles.forEach(a => {
        if (a.status === 'COOL FINDS') {
            stats.COOL_FINDS++;
        } else if (['Y', 'YM'].includes(a.status) && a.categories) {
            a.categories.forEach(c => {
                if (stats[c] !== undefined) stats[c]++;
            });
        }
    });

    summary.innerHTML = `
        <h3>Newsletter Summary</h3>
        <p><strong>Newsletter Name:</strong> ${document.getElementById('newsletter-name').value}</p>
        <p><strong>Inspirational Images:</strong> ${inspirationalImages.length} selected</p>
        <div class="grid grid-cols-5 gap-2.5 mt-3.75">
            <div class="bg-blue-100 p-3.75 rounded-lg text-center">
                <strong class="block text-[1.2rem] text-blue-900">MED</strong>
                <span>${stats.MED} Articles</span>
            </div>
            <div class="bg-green-100 p-3.75 rounded-lg text-center">
                <strong class="block text-[1.2rem] text-green-900">THC</strong>
                <span>${stats.THC} Articles</span>
            </div>
            <div class="bg-amber-100 p-3.75 rounded-lg text-center">
                <strong class="block text-[1.2rem] text-amber-900">CBD</strong>
                <span>${stats.CBD} Articles</span>
            </div>
            <div class="bg-purple-100 p-3.75 rounded-lg text-center">
                <strong class="block text-[1.2rem] text-purple-900">INV</strong>
                <span>${stats.INV} Articles</span>
            </div>
            <div class="bg-cyan-100 p-3.75 rounded-lg text-center">
                <strong class="block text-[1.2rem] text-cyan-900">COOL</strong>
                <span>${stats.COOL_FINDS} Finds</span>
            </div>
        </div>
    `;
    const uploadBtn = document.getElementById('btn-upload-newsletters');
    const exportGenBtn = document.getElementById('btn-export-generated');
    if (uploadBtn) uploadBtn.disabled = !lastGeneratedNewsletter;
    if (exportGenBtn) exportGenBtn.disabled = !lastGeneratedNewsletter;
}

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
            medText, thcText, cbdText, invText
        ],
        ['Title', 'URL', 'MED', 'THC', 'CBD', 'INV', 'Image URL', 'Published Image URL', 'MED Newsletter Text', 'THC Newsletter Text', 'CBD Newsletter Text', 'INV Newsletter Text']
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
            '', '', '', ''
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
        { wch: 40 }, { wch: 50 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 },
        { wch: 60 }, { wch: 60 },
        { wch: 50 }, { wch: 50 }, { wch: 50 }, { wch: 50 }
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
            generatedAt: new Date().toISOString()
        },
        inspirationalImages,
        content: newsletterContent,
        articles: articles.filter(a => ['Y', 'YM', 'COOL FINDS'].includes(a.status))
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
            ${a.image ? `<img src="${a.image}" alt="" class="max-w-[90px] h-[90px] object-cover" onerror="this.onerror=null;this.src='${a.originalImageUrl || ''}';">` : ''}
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
    const inspirationalImg = inspirationalImages && inspirationalImages[0] ? inspirationalImages[0] : '';

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
            html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${(newsletterName + ' - ' + cat).replace(/</g, '&lt;')}</title></head><body>
                <h1>${(newsletterName + ' - ' + cat).replace(/</g, '&lt;')}</h1>
                ${inspirationalImg ? `<img src="${inspirationalImg.replace(/"/g, '&quot;')}" alt="Header" class="max-w-full">` : ''}
                <div class="summary">${safeResult}</div>
                <div class="articles">${articlesHtml}</div>
            </body></html>`;
        }

        newsletters[cat] = {
            html,
            resultText,
            articles: articles.filter(a => ['Y', 'YM', 'COOL FINDS'].includes(a.status) && a.categories && a.categories.includes(cat)),
            inspirationalImage: inspirationalImg
        };
    }

    lastGeneratedNewsletter = {
        meta: { name: newsletterName, generatedAt: new Date().toISOString() },
        newsletters,
        inspirationalImages,
        articles: articles.filter(a => ['Y', 'YM', 'COOL FINDS'].includes(a.status))
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
            body: JSON.stringify({ name, generated: lastGeneratedNewsletter })
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
    const relevant = articles.filter(a => (a.categories && a.categories.length > 0) || a.status === 'COOL FINDS' || a.status === 'M');
    // Filter: has image, publish flag not false, AND (not yet published OR published URL doesn't match current image)
    // We want to ensure everything is on purablis.
    const withImages = relevant.filter(a => {
        const hasImage = a.image || a.originalImageUrl;
        const wantsPublish = a.publishImage !== false;
        // Force re-verification/publishing if previous published URL is not reachable?
        // For now, if we have a published URL, assume it's done unless user manually cleared it.
        // But if verification logic was added, we might want to re-run.
        // Let's just check if it's already published.
        const isAlreadyPublished = a.publishedImageUrl && a.publishedImageUrl.includes('purablis.com');
        const isBlob = (a.image && a.image.startsWith('blob:'));

        // If it's a blob, we definitely need to publish.
        // If it's a URL but not purablis, we need to publish.
        // If it is purablis, we skip unless we want to force re-upload.

        return (hasImage && wantsPublish && !isAlreadyPublished) || isBlob;
    });

    if (withImages.length === 0) {
        const hasAny = relevant.some(a => a.image);
        // Check if any are actually published
        const allPublished = relevant.every(a => !a.image || (a.publishedImageUrl && a.publishedImageUrl.includes('purablis.com')));

        return alert(allPublished ? 'All images are already published to purablis.com.' : 'No images to publish. Select images for articles first.');
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
                body: JSON.stringify({ url })
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
                        box.innerHTML = `<div class="selected-image-container"><img src="${data.url}" class="img-fluid max-h-[120px]" onerror="this.onerror=null;this.src='${articles[idx].originalImageUrl || ''}';this.parentElement.classList.add('img-fallback');"><button class="btn-remove-image" onclick="removeImage(${idx})">×</button><span class="badge-published" title="Published">P</span></div>`;
                    }
                } else {
                    fail++;
                    errors.push((a.title || 'Article').slice(0, 30) + ': Uploaded, but URL unreachable.');
                }
                saveState();
            } else {
                fail++;
                errors.push((a.title || 'Article').slice(0, 30) + ': ' + (data.error || 'Unknown error'));
            }
        } catch (e) {
            fail++;
            errors.push((a.title || 'Article').slice(0, 30) + ': ' + (e.message || 'Network error'));
            console.warn('Publish failed for', url, e);
        }
        if (btn) btn.textContent = `Publishing ${i + 1}/${withImages.length}...`;
    }

    if (btn) {
        btn.disabled = false;
        btn.textContent = 'Publish Selected to purablis';
    }
    let msg = ok > 0 ? `Published ${ok} image(s) to purablis.com.` : '';
    if (fail > 0) msg += (msg ? ' ' : '') + `${fail} failed.` + (errors.length ? '\n' + errors.slice(0, 3).join('\n') : '');
    if (!msg) msg = 'No images were published.';
    alert(msg);
};

window.downloadAllImagesZip = async () => {
    const relevant = articles.filter(a => (a.categories && a.categories.length > 0) || a.status === 'COOL FINDS' || a.status === 'M');
    const withImages = relevant.filter(a => a.image || a.originalImageUrl);

    if (withImages.length === 0) return alert('No images selected. Select images for articles first.');
    if (typeof JSZip === 'undefined') return alert('JSZip not loaded. Please refresh the page.');

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
                } catch (e) {}
            }

            // 2. Try to get from current image URL (if local path)
            if (!filename && a.image && !a.image.startsWith('data:') && !a.image.startsWith('blob:')) {
                try {
                    const name = a.image.split('/').pop();
                    if (name && name.includes('.')) {
                        filename = name;
                    }
                } catch(e) {}
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
            `"${filename}"`
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

    const rows = articles.map(a => ({
        'Title': a.title || '',
        'URL': a.url || '',
        'Description': a.description || '',
        'Date': a.date || '',
        'Status': a.status || '',
        'Paywall': a.paywall ? 'Yes' : 'No',
        'MED': (a.ranks && a.ranks.MED) || '',
        'THC': (a.ranks && a.ranks.THC) || '',
        'CBD': (a.ranks && a.ranks.CBD) || '',
        'INV': (a.ranks && a.ranks.INV) || '',
        'Notes': a.notes || '',
        'Image URL': a.image || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-size columns
    const colWidths = Object.keys(rows[0]).map(key => {
        const maxLen = Math.max(key.length, ...rows.map(r => String(r[key]).length));
        return { wch: Math.min(maxLen + 2, 60) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Articles');
    const name = document.getElementById('newsletter-name').value || 'newsletter';
    XLSX.writeFile(wb, `${name.replace(/[^a-zA-Z0-9 ]/g, '')}-articles.xlsx`);
};

// Event Listeners for Steps
steps.forEach((step) => {
    step.addEventListener('click', () => {
        const targetId = step.getAttribute('data-step');
        switchStep(targetId);
    });
});

// File Upload Preview
const fileInput = document.getElementById('excel-upload');
const fileNameDisplay = document.getElementById('file-name');

if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileNameDisplay.textContent = e.target.files[0].name;
        } else {
            fileNameDisplay.textContent = "No file chosen";
        }
    });
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

window.setBatchFilter = (value) => { batchFilter = value || ''; };

// Render Articles Function (Table View)
function renderArticles() {
    const list = document.getElementById('articles-list');
    list.innerHTML = ''; // Clear existing

    // Populate batch filter dropdown (unique addedAt, sorted)
    const batchSelect = document.getElementById('batch-filter-select');
    if (batchSelect) {
        const addedAts = [...new Set(articles.map(a => a.addedAt).filter(Boolean))].sort();
        const currentVal = batchSelect.value;
        batchSelect.innerHTML = '<option value="">All</option>' + addedAts.map(iso => {
            const label = formatAddedAt(iso) + ' ' + (new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
            return `<option value="${iso}">${label}</option>`;
        }).join('');
        batchSelect.value = batchFilter || '';
    }

    // Add Top Controls
    const controls = document.createElement('div');
    controls.className = 'controls-row justify-between mb-5';
    controls.innerHTML = `
        <button class="btn btn-secondary" onclick="switchStep(1)">Back: Search</button>
        <button class="btn btn-primary" onclick="switchStep(3)">Next: Image View</button>
    `;
    list.appendChild(controls);

    if (articles.length === 0) {
        list.innerHTML += '<div class="px-5 py-5 text-center text-gray-500">No articles found. Please try searching again.</div>';
        updateStats();
        return;
    }

    const indicesToShow = batchFilter
        ? articles.map((a, i) => i).filter(i => articles[i].addedAt === batchFilter)
        : articles.map((a, i) => i);

    list.innerHTML += indicesToShow.map(realIndex => {
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

        const categoryInputs = ['MED', 'THC', 'CBD', 'INV'].map(cat => {
            let rank = (article.ranks && (article.ranks[cat] ?? article.ranks[cat.toLowerCase()])) ?? (article.categories && article.categories.includes(cat) ? 'Y' : '');
            // Same resolution as getRankForSort so display and sort match (incl. lowercase keys)

            return `
                <div class="col-cat">
                    <input type="text"
                        value="${rank}"
                        oninput="updateCategoryRank(${index}, '${cat}', this.value)"
                        class="${disabledClass}"
                        ${disabledAttr}
                        placeholder=""
                    >
                </div>
            `;
        }).join('');

        return `
            <div class="article-row">
                <div class="col-selected">
                    <input type="checkbox"
                        ${article.selected ? 'checked' : ''}
                        onchange="updateArticleField(${index}, 'selected', this.checked)">
                </div>

                <div class="col-article">
                    <div class="flex items-start gap-2">
                        <textarea
                            class="title-edit"
                            rows="2"
                            onchange="updateArticleField(${index}, 'title', this.value)"
                            style="font-family: inherit;"
                        >${article.title}</textarea>
                        <span class="article-added-at" title="${article.addedAt ? 'Added ' + article.addedAt : 'No add date'}">${article.addedAt ? 'added ' + formatAddedAt(article.addedAt) : '—'}</span>
                    </div>
                    <p class="my-1.25 text-[0.85rem] text-gray-500">
                        ${article.description ? article.description.substring(0, 120) + '...' : 'No description'}
                    </p>

                    <div class="flex items-center gap-1.25">
                        <input
                            type="text"
                            class="url-edit text-[0.8rem] px-1.25 py-0.5 w-full text-blue-600"
                            value="${article.url}"
                            onchange="updateArticleField(${index}, 'url', this.value)"
                        >
                        <a href="${article.url}" target="_blank" title="Open Link" class="no-underline">🔗</a>
                    </div>
                </div>

                <div class="col-date">
                    <input type="text"
                        value="${article.date || ''}"
                        onchange="updateArticleField(${index}, 'date', this.value)"
                        placeholder="MM/DD/YY"
                    >
                </div>

                <div class="col-paywall">
                    <input type="checkbox"
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
                        class="form-control w-full h-[60px] text-[0.85rem] resize-y"
                        onchange="updateArticleField(${index}, 'notes', this.value)"
                        placeholder="Notes..."
                    >${article.notes || ''}</textarea>
                </div>

                <div class="col-actions">
                    <button class="btn btn-sm btn-outline text-orange-600 border-orange-600 mb-1.25 w-full" onclick="archiveArticle(${index})">Archive</button>
                    <button class="btn btn-sm btn-outline text-red-600 border-red-600 w-full" onclick="removeArticle(${index})">Remove</button>
                </div>
            </div>
        `;
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
    ['med', 'thc', 'cbd', 'inv'].forEach(c => { document.getElementById('add-article-' + c).value = ''; });
    modal.classList.remove('hidden');
};

window.closeAddArticleModal = () => {
    const modal = document.getElementById('add-article-modal');
    if (modal) modal.classList.add('hidden');
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
        addedAt: new Date().toISOString()
    };
    articles.forEach(a => { a.id = (a.id || 0) + 1; });
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
    'NO': 55
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

// Articles for a category in display order: same filter + sort as table (numbers 1,2,3 first, then Y, etc.).
function getArticlesForCategory(category) {
    return articles.filter(a => {
        if (!['Y', 'YM', 'COOL FINDS', 'LATER COOL'].includes(a.status)) return false;
        const rank = getRankForSort(a, category);
        return rank !== '' && rank !== undefined;
    }).sort((a, b) => {
        const rA = rankToSortValue(getRankForSort(a, category));
        const rB = rankToSortValue(getRankForSort(b, category));
        if (rA !== rB) return rA - rB;
        return (a.title || '').localeCompare(b.title || '');
    });
}

function updateStats() {
    const statsEl = document.getElementById('article-stats');
    if (!statsEl) return;

    const counts = { MED: 0, THC: 0, CBD: 0, INV: 0 };
    let validStatusCount = 0;
    const validStatuses = ['Y', 'YM', 'COOL FINDS'];

    articles.forEach(a => {
        const isValid = validStatuses.includes(a.status);
        if (isValid) validStatusCount++;

        if (a.ranks) {
            ['MED', 'THC', 'CBD', 'INV'].forEach(cat => {
                if (a.ranks[cat]) counts[cat]++;
            });
        }
    });

    const sessionLabel = currentSessionName
        ? `<span class="stat-item bg-indigo-100 text-indigo-800 font-semibold">${currentSessionName}</span>`
        : '';

    const statsHtml = `
        ${sessionLabel}
        <span class="stat-item" title="Total articles in list">Total: ${articles.length}</span>
        <span class="stat-item bg-cyan-100 text-cyan-900" title="Status Y/YM/COOL FINDS">Selected: ${validStatusCount}</span>
        <span class="stat-item bg-blue-100 text-blue-900">MED: ${counts.MED}</span>
        <span class="stat-item bg-green-100 text-green-900">THC: ${counts.THC}</span>
        <span class="stat-item bg-amber-100 text-amber-900">CBD: ${counts.CBD}</span>
        <span class="stat-item bg-purple-100 text-purple-900">INV: ${counts.INV}</span>
    `;
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
        body: JSON.stringify({ key: 'sessions', value: sessions })
    }).catch(() => {});
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
        savedAt: new Date().toISOString()
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

    if (articles.length > 0 && !confirm(`This will replace the current ${articles.length} articles. Continue?`)) return;

    articles = session.articles || [];
    const savedAt = session.savedAt || new Date().toISOString();
    articles.forEach(a => { if (!a.addedAt) a.addedAt = savedAt; });
    archivedArticles = session.archivedArticles || [];
    inspirationalImages = session.inspirationalImages || [];
    const nc = session.newsletterContent || { MED: { intro: '', outro: '' }, THC: { intro: '', outro: '' }, CBD: { intro: '', outro: '' }, INV: { intro: '', outro: '' } };
    newsletterContent = { ...nc, templates: nc.templates || { MED: '', THC: '', CBD: '', INV: '' } };

    document.getElementById('newsletter-name').value = name;
    currentSessionName = name;
    saveState();
    renderArticles();
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
    const dropdown = document.getElementById('saved-sessions-dropdown');
    const dropdownStep3 = document.getElementById('saved-sessions-dropdown-step3');

    const sessions = getSavedSessions();
    const names = Object.keys(sessions).sort();

    const optionsHtml = names.map(name => {
        const s = sessions[name];
        const count = (s.articles || []).length;
        const date = s.savedAt ? new Date(s.savedAt).toLocaleDateString() : '';
        return `<option value="${name}">${name} (${count} articles, ${date})</option>`;
    }).join('');

    if (dropdown) {
        dropdown.innerHTML = '<option value="">-- Select --</option>' + optionsHtml;
    }
    if (dropdownStep3) {
        dropdownStep3.innerHTML = '<option value="">-- Select --</option>' + optionsHtml;
    }

    const hintEl = document.getElementById('state-load-hint');
    const textEl = document.getElementById('state-load-hint-text');
    if (hintEl && names.length === 0) {
        hintEl.classList.remove('hidden');
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
    const state = {
        articles,
        archivedArticles,
        laterCoolArticles,
        inspirationalImages,
        newsletterContent
    };
    try {
        const res = await fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'workspace', value: state })
        });
        if (res.ok) {
            localStorage.setItem('newsletter_articles', JSON.stringify(state));
            alert('Pushed to server: ' + articles.length + ' articles, ' + archivedArticles.length + ' archived, ' + laterCoolArticles.length + ' later cool.');
        } else {
            const err = await res.json().catch(() => ({}));
            alert('Push failed: ' + (err.error || res.status));
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
        toAdd.forEach(a => { a.addedAt = a.addedAt || addedAt; });
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
            fetch('/api/state?key=sessions')
        ]);
        let msg = '';
        if (wrRes.ok) {
            const { value } = await wrRes.json();
            if (value && value.articles) {
                articles.length = 0;
                articles.push(...(value.articles || []));
                archivedArticles = value.archivedArticles || [];
                laterCoolArticles = value.laterCoolArticles || [];
                inspirationalImages = value.inspirationalImages || [];
                const nc = value.newsletterContent || newsletterContent;
                newsletterContent = { ...nc, templates: nc.templates || { MED: '', THC: '', CBD: '', INV: '' } };
                localStorage.setItem('newsletter_articles', JSON.stringify({ articles, archivedArticles, laterCoolArticles, inspirationalImages, newsletterContent }));
                if (typeof renderArticles === 'function') renderArticles();
                msg = (value.articles || []).length + ' articles in workspace. ';
                const nameEl = document.getElementById('newsletter-name');
                if (nameEl && nameEl.value.trim()) {
                    currentSessionName = nameEl.value.trim();
                }
            }
        } else if (wrRes.status === 503) {
            msg = 'Server database not configured. ';
            if (hintEl) hintEl.classList.remove('hidden');
            await window.updateStateHintFromDiagnostic();
        }
        if (sessRes.ok) {
            const { value } = await sessRes.json();
            if (value && typeof value === 'object') {
                const local = JSON.parse(localStorage.getItem('newsletter_saved_sessions') || '{}');
                const merged = { ...value };
                Object.keys(local).forEach(k => { if (!(k in merged)) merged[k] = local[k]; });
                localStorage.setItem('newsletter_saved_sessions', JSON.stringify(merged));
                if (typeof populateSavedDropdown === 'function') populateSavedDropdown();
                const n = Object.keys(merged).length;
                msg += n + ' saved session(s) (server + local).';
                if (hintEl) hintEl.classList.add('hidden');
            }
        } else if (sessRes.status === 503) {
            msg = (msg || '') + 'Sessions: server database not configured.';
            if (hintEl) hintEl.classList.remove('hidden');
            await window.updateStateHintFromDiagnostic();
        }
        alert(msg || 'No data from server. Check the yellow hint above for details.');
    } catch (e) {
        if (hintEl) hintEl.classList.remove('hidden');
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
    status.classList.add('hidden');

    try {
        const response = await fetch('/api/articles/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, newsletterName, model })
        });

        const data = await response.json();

        if (data.success && data.articles) {
            const existingUrls = new Set(articles.map(a => normalizeUrl(a.url)));
            const newArticles = data.articles.filter(a => !existingUrls.has(normalizeUrl(a.url)));

            // Assign IDs continuing from current max; mark when added
            const maxId = articles.reduce((max, a) => Math.max(max, a.id || 0), 0);
            const addedAt = new Date().toISOString();
            newArticles.forEach((a, i) => { a.id = maxId + i + 1; a.addedAt = addedAt; });

            articles = articles.concat(newArticles);
            saveState();
            renderArticles();

            const dupeCount = data.articles.length - newArticles.length;
            let msg = `Added ${newArticles.length} new articles.`;
            if (dupeCount > 0) msg += ` (${dupeCount} duplicates skipped)`;
            status.textContent = msg;
            status.classList.remove('hidden');
        } else {
            alert('Search Error: ' + (data.error || 'Unknown error'));
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
    if (!url) return '';
    return url.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
}

// --- MODIFY EXISTING ARTICLES ---

async function modifyExistingArticles() {
    const prompt = document.getElementById('step2-query').value.trim();
    if (!prompt) return alert('Please enter a modification instruction.');

    const selectedIndices = articles.map((a, i) => a.selected ? i : -1).filter(i => i !== -1);
    if (selectedIndices.length === 0) return alert('No articles selected. Check the boxes on articles you want to modify.');

    const selectedArticles = selectedIndices.map(i => articles[i]);
    const btn = document.getElementById('btn-step2-query');
    const status = document.getElementById('step2-query-status');

    btn.disabled = true;
    btn.textContent = 'Modifying...';
    status.classList.add('hidden');

    try {
        const response = await fetch('/api/articles/modify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                articles: selectedArticles,
                model: document.getElementById('ai-model').value
            })
        });

        const data = await response.json();
        if (data.success) {
            data.articles.forEach((modArticle, i) => {
                const originalIndex = selectedIndices[i];
                if (articles[originalIndex]) {
                    if (modArticle.title) articles[originalIndex].title = modArticle.title;
                    if (modArticle.description) articles[originalIndex].description = modArticle.description;
                    if (modArticle.url) articles[originalIndex].url = modArticle.url;
                    if (modArticle.date) articles[originalIndex].date = modArticle.date;
                }
            });
            saveState();
            renderArticles();
            status.textContent = `Modified ${data.articles.length} articles.`;
            status.classList.remove('hidden');
        } else {
            alert('Error: ' + data.error);
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
        label.className = 'font-semibold';
        container.appendChild(label);

        prompts.forEach(p => {
            const span = document.createElement('span');
            span.textContent = p.length > 50 ? p.substring(0, 50) + '...' : p;
            span.title = p;
            span.className = 'cursor-pointer underline mr-2.5';
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
const searchStatus = document.getElementById('search-status');

if (nextStep2Btn) {
    nextStep2Btn.addEventListener('click', () => switchStep(2));
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
            if (!confirm(`This will replace the ${articles.length} articles currently in the workspace.\n\nMake sure you've saved first if you need them.\n\nContinue?`)) {
                return;
            }
        }

        saveRecentPrompt(prompt);
        currentSessionName = '';

        console.log("Initiating AI Search...", { newsletterName, prompt, model });

        searchBtn.disabled = true;
        searchBtn.textContent = "Searching...";
        if (searchStatus) searchStatus.classList.add('hidden');

        try {
            const response = await fetch('/api/articles/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, newsletterName, model })
            });

            const data = await response.json();

            if (data.success) {
                console.log("AI Search Results:", data.articles);
                articles = data.articles; // Store in state
                renderArticles(); // Render to grid

                // Stay on page, show success message and next button
                if (searchStatus) {
                    searchStatus.textContent = `Found ${data.articles.length} articles!`;
                    searchStatus.classList.remove('hidden');
                }
                if (nextStep2Btn) {
                    nextStep2Btn.classList.remove('hidden');
                }

            } else {
                // Show specific error message from backend (e.g. "Credit balance too low")
                alert("Search Error:\n" + data.error);
                if (data.details) console.error("Error Details:", data.details);
            }
        } catch (err) {
            console.error("Network/Parsing Error:", err);
            alert("Search failed. Please check your connection and try again.\nSee console for details.");
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
        const fileInput = document.getElementById('excel-upload');
        const newsletterName = document.getElementById('newsletter-name').value;

        if (!fileInput.files.length) {
            alert("Please select an Excel file first.");
            return;
        }

        console.log("Initiating File Upload...", { newsletterName, file: fileInput.files[0].name });

        uploadBtn.disabled = true;
        uploadBtn.textContent = "Uploading...";

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('newsletterName', newsletterName);

        try {
            const response = await fetch('/api/articles/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                console.log("Upload Results:", data.articles);
                articles = data.articles || [];
                document.getElementById('newsletter-name').value = data.newsletterName || 'Week 1';
                saveState();
                renderArticles();
                switchStep(2);
                // Persist to Supabase as Week 1
                const sessions = getSavedSessions();
                const week1Data = {
                    articles: JSON.parse(JSON.stringify(articles)),
                    archivedArticles: [],
                    inspirationalImages: [],
                    newsletterContent: newsletterContent,
                    savedAt: new Date().toISOString()
                };
                sessions['Week 1'] = week1Data;
                saveSavedSessions(sessions);
                alert(`Loaded ${articles.length} articles and saved as "Week 1" in the database.`);
            } else {
                alert(data.error || "Upload failed.");
            }
        } catch (err) {
            console.error(err);
            alert("Upload failed. See console.");
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = "Upload & Load";
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
