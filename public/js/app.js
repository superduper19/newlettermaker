document.addEventListener('DOMContentLoaded', () => {
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
        templates: { MED: '', THC: '', CBD: '', INV: '' }
    };
    let currentEditorTab = 'MED';
    let currentConfirmationTab = 'MED';
    let lastGeneratedNewsletter = null;
    const confirmationTemplateCache = {};
    const confirmationRenderedHtml = { MED: '', THC: '', CBD: '', INV: '' };
    let confirmationInspirationalImage = '';
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
                articles = data.articles || [];
                archivedArticles = data.archivedArticles || [];
                laterCoolArticles = data.laterCoolArticles || [];
                inspirationalImages = data.inspirationalImages || [];
                const nc = data.newsletterContent || { MED: { intro: '', outro: '' }, THC: { intro: '', outro: '' }, CBD: { intro: '', outro: '' }, INV: { intro: '', outro: '' } };
                newsletterContent = { ...nc, templates: nc.templates || { MED: '', THC: '', CBD: '', INV: '' } };
            }
        }
        const savedLibrary = localStorage.getItem(INSPIRATIONAL_LIBRARY_CACHE_KEY);
        if (savedLibrary) {
            inspirationalLibraryImages = JSON.parse(savedLibrary);
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
                hintEl.style.display = 'none';
                return;
            }
            hintEl.style.display = 'block';
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
            hintEl.style.display = 'block';
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
                if (hintEl) hintEl.style.display = 'block';
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
                    if (hintEl) hintEl.style.display = 'none';
                    const nameEl = document.getElementById('newsletter-name');
                    if (nameEl && nameEl.value.trim()) {
                        currentSessionName = nameEl.value.trim();
                    }
                }
            } else if (hintEl && hintEl.style.display !== 'none') {
                await window.updateStateHintFromDiagnostic();
            }
        } catch (e) {
            const hintEl = document.getElementById('state-load-hint');
            if (hintEl) hintEl.style.display = 'block';
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
            loadInspirationalLibrary();
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
            list.innerHTML = '<div style="padding: 30px; text-align: center; color: #777;">No articles with categories. Go back to Article View and assign categories first.</div>';
            return;
        }

        // Table header
        list.innerHTML = `
            <div class="img-table-header">
                <div class="img-col-select" style="display:flex;flex-direction:column;align-items:center;gap:2px;">
                    <span style="font-size:0.75rem;">Publish</span>
                    <span style="font-size:0.65rem;cursor:pointer;text-decoration:underline;" onclick="toggleAllImagePublish(true)">All</span>
                    <span style="font-size:0.65rem;cursor:pointer;text-decoration:underline;" onclick="toggleAllImagePublish(false)">None</span>
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
                     <img src="${article.image}" class="img-fluid" style="max-height: 120px;" onerror="this.onerror=null;this.src='${article.originalImageUrl || ''}';this.parentElement.classList.add('img-fallback');">
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
                        style="width: 100%; text-align: center; padding: 4px 1px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.8rem; box-sizing: border-box;">
                </div>`;
            }).join('');

            if (article.publishImage === undefined) article.publishImage = !!article.image;

            const rowHtml = `
                <div class="img-table-row">
                    <div class="img-col-select" style="display:flex;align-items:center;justify-content:center;padding-top:8px;">
                        <input type="checkbox" ${article.publishImage ? 'checked' : ''} onchange="updateArticleField(${originalIndex}, 'publishImage', this.checked)">
                    </div>
                    <div class="img-col-article">
                        <textarea class="title-edit" rows="2"
                            onchange="updateArticleField(${originalIndex}, 'title', this.value)"
                            style="font-family: inherit; font-size: 0.9rem;"
                        >${article.title}</textarea>
                        <a href="${article.url}" target="_blank" class="article-link-sm">${article.url}</a>
                    </div>
                    ${catInputs}
                    <div class="img-col-search">
                        <div style="display: flex; gap: 5px; margin-bottom: 8px;">
                            <input type="text" class="form-control" 
                                id="img-search-input-${originalIndex}"
                                value="${article.imageSearchQuery}" 
                                placeholder="Keyword..."
                                style="padding: 5px 8px; font-size: 0.85rem;">
                            <button class="btn btn-sm btn-primary" onclick="searchArticleImages(${originalIndex})" style="white-space: nowrap;">Search</button>
                        </div>
                        <div style="border-top: 1px solid #eee; padding-top: 6px;">
                            <input type="file" accept="image/*" id="img-upload-input-${originalIndex}" style="display: none;" onchange="uploadArticleImage(${originalIndex}, this)">
                            <label for="img-upload-input-${originalIndex}" class="btn btn-sm btn-secondary" style="cursor: pointer; margin: 0; font-size: 0.78rem; padding: 4px 10px;">Upload File</label>
                        </div>
                    </div>
                    <div class="img-col-selected" id="selected-img-${originalIndex}">
                        ${selectedImageHtml}
                    </div>
                    <div class="img-col-results">
                        <div id="${gridId}" class="mini-grid">
                            <span class="text-muted" style="font-size: 0.8rem;">Click Search</span>
                        </div>
                    </div>
                    <div class="img-col-actions">
                        <button class="btn btn-sm btn-outline" style="color: #f57c00; border-color: #f57c00; margin-bottom: 5px; width: 100%;" onclick="archiveArticle(${originalIndex})">Archive</button>
                        <button class="btn btn-sm btn-outline" style="color: #d32f2f; border-color: #d32f2f; width: 100%;" onclick="removeArticle(${originalIndex})">Remove</button>
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
            ? `<span class="stat-item" style="background:#e8eaf6; color:#283593; font-weight:600;">${currentSessionName}</span>`
            : '';
            
        const count = relevantArticles.length;
        const countStyle = count === 25 
            ? 'background:#e8f5e9; color:#1b5e20; font-weight: bold; border: 2px solid #4caf50;' 
            : 'background:#ffebee; color:#c62828; font-weight: bold; border: 2px solid #e57373;';
            
        statsEl.innerHTML = `
            ${sessionLabel}
            <span class="stat-item" style="${countStyle}" title="Target is 25 articles">Total: ${count} / 25</span>
            <span class="stat-item" style="background:#e0f7fa; color:#006064;">Selected: ${validStatusCount}</span>
            <span class="stat-item" style="background:#e3f2fd; color:#0d47a1;">MED: ${counts.MED}</span>
            <span class="stat-item" style="background:#e8f5e9; color:#1b5e20;">THC: ${counts.THC}</span>
            <span class="stat-item" style="background:#fff3e0; color:#e65100;">CBD: ${counts.CBD}</span>
            <span class="stat-item" style="background:#f3e5f5; color:#4a148c;">INV: ${counts.INV}</span>
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
                    <span style="font-size:0.8rem; color:#555;">Page ${currentPage}</span>
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

    window.searchAllArticleImages = async () => {
        const relevantIndexes = articles
            .map((article, index) => ({ article, index }))
            .filter(({ article }) => (article.categories && article.categories.length > 0) || article.status === 'COOL FINDS' || article.status === 'M')
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
            box.innerHTML = `
                <div class="selected-image-container">
                     <img src="${url}" class="img-fluid" style="max-height: 150px;" onerror="this.onerror=null;this.src='${articles[index].originalImageUrl || ''}';this.parentElement.classList.add('img-fallback');">
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
                await loadInspirationalLibrary();
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

    window.selectInspirationalImage = (url) => {
        if (!inspirationalImages.includes(url)) {
            inspirationalImages.push(url);
        }
        saveState();
        renderInspirationalView();
    };

    window.removeInspirationalImage = (index) => {
        inspirationalImages.splice(index, 1);
        saveState();
        renderInspirationalView();
    };

    window.deleteInspirationalLibraryImage = async (url) => {
        if (!confirm('Delete this uploaded inspirational image from the server library?')) return;

        try {
            const res = await fetch('/api/images/inspirational-library', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
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
            inspirationalLibraryImages.forEach(({ url, name }) => {
                const div = document.createElement('div');
                div.style.position = 'relative';

                const imgEl = document.createElement('img');
                imgEl.src = url;
                imgEl.className = 'thumbnail-img';
                imgEl.title = name || 'Uploaded image';
                imgEl.onclick = () => selectInspirationalImage(url);

                const actions = document.createElement('div');
                actions.style.position = 'absolute';
                actions.style.left = '5px';
                actions.style.right = '5px';
                actions.style.bottom = '5px';
                actions.style.display = 'flex';
                actions.style.gap = '6px';

                const selectBtn = document.createElement('button');
                selectBtn.textContent = 'Select';
                selectBtn.className = 'btn btn-primary btn-sm';
                selectBtn.style.flex = '1';
                selectBtn.onclick = (e) => {
                    e.stopPropagation();
                    selectInspirationalImage(url);
                };

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'btn btn-sm';
                deleteBtn.style.flex = '1';
                deleteBtn.style.background = 'rgba(211, 47, 47, 0.92)';
                deleteBtn.style.color = '#fff';
                deleteBtn.style.border = 'none';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteInspirationalLibraryImage(url);
                };

                actions.appendChild(selectBtn);
                actions.appendChild(deleteBtn);
                div.appendChild(imgEl);
                div.appendChild(actions);
                galleryGrid.appendChild(div);
            });
        }
        
        selectedGrid.innerHTML = '';
        if (inspirationalImages.length === 0) {
            selectedGrid.innerHTML = '<div class="grid-placeholder">No images selected.</div>';
        } else {
            inspirationalImages.forEach((url, index) => {
                const div = document.createElement('div');
                div.style.position = 'relative';

                const imgEl = document.createElement('img');
                imgEl.src = url;
                imgEl.className = 'thumbnail-img';
                
                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '&times;';
                removeBtn.style.position = 'absolute';
                removeBtn.style.top = '5px';
                removeBtn.style.right = '5px';
                removeBtn.style.background = 'rgba(255,0,0,0.8)';
                removeBtn.style.color = '#fff';
                removeBtn.style.border = 'none';
                removeBtn.style.borderRadius = '50%';
                removeBtn.style.width = '20px';
                removeBtn.style.height = '20px';
                removeBtn.style.cursor = 'pointer';
                removeBtn.onclick = () => removeInspirationalImage(index);

                div.appendChild(imgEl);
                div.appendChild(removeBtn);
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
        const categoryArticles = getArticlesForCategory(category);
        if (categoryArticles.length === 0) {
            return `CATEGORY: ${category}\nNo articles currently ranked for this category.`;
        }

        const articleLines = categoryArticles.map((article, index) => {
            const title = article.title || 'Untitled';
            const url = article.url || '';
            return `${index + 1}. ${title}\n${url}`;
        }).join('\n\n');

        return [
            `CATEGORY: ${category}`,
            'Use the article links below as the only source set for this category summary.',
            'Create a strong 6-7 line newsletter-ready summary for this category.',
            '',
            articleLines
        ].join('\n');
    }

    function mergePromptWithCategoryLinks(existingPrompt, category) {
        const promptBlock = buildCategoryPrompt(category);
        const startMarker = `[[AUTO_CATEGORY_LINKS_${category}_START]]`;
        const endMarker = `[[AUTO_CATEGORY_LINKS_${category}_END]]`;
        const wrappedBlock = `${startMarker}\n${promptBlock}\n${endMarker}`;
        const current = (existingPrompt || '').trim();
        const markerPattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, 'm');

        if (!current) {
            return wrappedBlock;
        }
        if (markerPattern.test(current)) {
            return current.replace(markerPattern, wrappedBlock);
        }
        return `${wrappedBlock}\n\n${current}`;
    }

    function syncCategoryPrompt(category) {
        const content = newsletterContent[category] || (newsletterContent[category] = { intro: '', outro: '' });
        const mergedPrompt = mergePromptWithCategoryLinks(content.prompt || '', category);
        content.prompt = mergedPrompt;

        const promptEl = document.getElementById('editor-prompt');
        if (promptEl && currentEditorTab === category) {
            promptEl.value = mergedPrompt;
        }
        saveState();
    }

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

        const summaryRulesValue = newsletterContent.summaryRules || '';
        const resultValue = content.result || '';
        const templateValue = (newsletterContent.templates && newsletterContent.templates[currentEditorTab]) || '';
        const selectedResults = getSelectedCategoryResults();
        const selectedSummaryHtml = ['MED', 'THC', 'CBD', 'INV'].map(cat => {
            const selectedText = selectedResults[cat] || '';
            return `
                <div style="padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa;">
                    <div style="font-weight: 700; margin-bottom: 8px;">${cat}</div>
                    <textarea rows="5" class="form-control" style="font-size: 0.85rem; background: #fff;" oninput="updateSelectedCategoryResult('${cat}', this.value)" placeholder="No selected ${cat} content yet...">${selectedText}</textarea>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="form-group" style="padding: 12px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; margin-bottom: 20px;">
                <label style="font-weight: 600;">Template for ${currentEditorTab}</label>
                <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 10px;">HTML template for this newsletter. Use {{SUMMARY}}, {{ARTICLES_HTML}}, {{INSPIRATIONAL_IMAGE}}, {{NEWSLETTER_NAME}} as placeholders.</p>
                <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 10px;">
                    <input type="file" id="template-single-input" accept=".html,.htm" style="font-size: 0.85rem;">
                    <button class="btn btn-secondary btn-sm" onclick="uploadSingleTemplate()">Upload 1 (for ${currentEditorTab})</button>
                    <span style="color: #999;">or</span>
                    <input type="file" id="template-batch-input" accept=".html,.htm" multiple style="font-size: 0.85rem;">
                    <button class="btn btn-secondary btn-sm" onclick="uploadAllTemplates()">Upload all 4</button>
                </div>
                <div id="template-status" style="font-size: 0.8rem; color: #666; margin-bottom: 8px;"></div>
                <textarea id="editor-template" rows="6" class="form-control" style="font-family: monospace; font-size: 0.8rem; background: #fff;" oninput="updateTemplate('${currentEditorTab}', this.value)" placeholder="Paste or edit HTML template here..."></textarea>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 300px; gap: 20px; align-items: start;">
                <div>
                    <div class="form-group">
                        <label style="font-weight: 600;">Prompt</label>
                        <textarea id="editor-prompt" rows="8" class="form-control" style="font-family: monospace; font-size: 0.9rem;" oninput="updateNewsletterContent('${currentEditorTab}', 'prompt', this.value)">${promptValue}</textarea>
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                        <button class="btn btn-secondary btn-sm" onclick="syncCategoryPrompt('${currentEditorTab}')">Refresh Category Links</button>
                        <span style="font-size: 0.8rem; color: #777;">The prompt auto-loads all article links for ${currentEditorTab}.</span>
                    </div>

                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; justify-content: space-between; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 0.9rem;">
                                <input type="radio" id="rules-on-${currentEditorTab}" name="useRulesGroup-${currentEditorTab}" ${content.useRules !== false ? 'checked' : ''} onchange="updateNewsletterContent('${currentEditorTab}', 'useRules', true)">
                                Use Summary Rules
                            </label>
                            <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 0.9rem;">
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
                    <div id="editor-articles-list" style="margin-bottom: 15px; font-size: 0.85rem;"></div>
                    <div class="form-group">
                        <label style="font-weight: 600;">Summary Rules</label>
                        <textarea id="editor-summary-rules" rows="14" class="form-control" style="font-size: 0.85rem; background: #fffde7; border-color: #fbc02d;" oninput="updateSummaryRules(this.value)" placeholder="Persistent rules sent as system instructions to the AI...">${summaryRulesValue}</textarea>
                        <div style="font-size: 0.7rem; color: #999; margin-top: 4px;">These rules persist across saves and categories.</div>
                    </div>
                </div>
            </div>

            <div class="form-group" style="margin-top: 10px;">
                <label style="font-weight: 600;">Created Result</label>
                <textarea id="editor-result" rows="10" class="form-control" style="font-size: 0.9rem; background: #f5f5f5;" oninput="updateNewsletterContent('${currentEditorTab}', 'result', this.value)" placeholder="The AI-generated result will appear here...">${resultValue}</textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;">
                <button class="btn btn-primary btn-sm" onclick="selectGeneratedContent('${currentEditorTab}')">Select ${currentEditorTab}</button>
                <button class="btn btn-outline btn-sm" onclick="copyEditorContent('${currentEditorTab}')">Copy ${currentEditorTab} Content</button>
            </div>

            <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid #e5e7eb;">
                <label style="font-weight: 700; display: block; margin-bottom: 12px;">Selected Content</label>
                <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px;">
                    ${selectedSummaryHtml}
                </div>
            </div>
        `;
        const templateEl = document.getElementById('editor-template');
        if (templateEl) templateEl.value = templateValue || '';
        const listEl = document.getElementById('editor-articles-list');
        if (listEl && typeof getArticlesForCategory === 'function') {
            const catArticles = getArticlesForCategory(currentEditorTab);
            const listHtml = catArticles.length
                ? catArticles.map((a, i) => {
                    const title = escapeHtml(a.title || 'Untitled');
                    const url = escapeHtml(a.url || '');
                    const date = escapeHtml(a.date || '');
                    return `<div style="padding: 8px 0; border-bottom: 1px solid #eee;">
                        <div style="font-weight: 600;">${i + 1}. ${title}</div>
                        ${date ? `<div style="font-size: 0.75rem; color: #777;">${date}</div>` : ''}
                        ${url ? `<a href="${url}" target="_blank" style="font-size: 0.78rem; word-break: break-all;">${url}</a>` : '<span class="text-muted">No URL</span>'}
                    </div>`;
                }).join('')
                : '<span class="text-muted">No articles with ' + currentEditorTab + ' rank.</span>';
            listEl.innerHTML = '<label style="font-weight: 600;">Articles for ' + currentEditorTab + '</label><div style="max-height: 280px; overflow-y: auto; margin-top: 6px; line-height: 1.4;">' + listHtml + '</div><div style="font-size: 0.7rem; color: #999; margin-top: 4px;">This list is pulled from the ranked articles in Article View for ' + currentEditorTab + '.</div>';
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
        const categoryArticles = getArticlesForCategory(category);
        const btnText = document.getElementById(`gen-btn-text-${category}`);

        if (!prompt) return alert('Please enter a prompt.');
        if (categoryArticles.length === 0) return alert(`No ranked articles found for ${category}.`);

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
                    model: document.getElementById('ai-model') ? document.getElementById('ai-model').value : ''
                })
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

    window.selectGeneratedContent = (category) => {
        const resultEl = document.getElementById('editor-result');
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
            COOL_FINDS: articles.filter(a => a.status === 'COOL FINDS').length
        };

        summary.innerHTML = `
            <h3>Newsletter Summary</h3>
            <p><strong>Newsletter Name:</strong> ${activeNewsletterName}</p>
            <p><strong>Inspirational Images:</strong> ${inspirationalImages.length} selected</p>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 15px;">
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; text-align: center;">
                    <strong style="display:block; font-size: 1.2rem; color: #0d47a1;">MED</strong>
                    <span>${stats.MED} Articles</span>
                </div>
                <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; text-align: center;">
                    <strong style="display:block; font-size: 1.2rem; color: #1b5e20;">THC</strong>
                    <span>${stats.THC} Articles</span>
                </div>
                <div style="background: #fff3e0; padding: 15px; border-radius: 8px; text-align: center;">
                    <strong style="display:block; font-size: 1.2rem; color: #e65100;">CBD</strong>
                    <span>${stats.CBD} Articles</span>
                </div>
                <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; text-align: center;">
                    <strong style="display:block; font-size: 1.2rem; color: #4a148c;">INV</strong>
                    <span>${stats.INV} Articles</span>
                </div>
                <div style="background: #e0f7fa; padding: 15px; border-radius: 8px; text-align: center;">
                    <strong style="display:block; font-size: 1.2rem; color: #006064;">COOL</strong>
                    <span>${stats.COOL_FINDS} Finds</span>
                </div>
            </div>
        `;
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

    const TEMPLATE_FIXED_CONTENT = {
        logoHref: 'http://www.purablis.com',
        logoSrc: 'https://purablis.com/Newsletter%20images/Purablis-newsletter-logo.png',
        youtubeHref: 'https://www.youtube.com/Purablis',
        youtubeIconSrc: 'https://cdn-images.mailchimp.com/icons/social-block-v2/outline-color-youtube-96.png',
        unsubscribeHref: 'https://ap.lovethelist.com/index.php/lists/qk5307z6w1e34/unsubscribe/unsubscribe-direct',
        contactEmail: 'news@lovethelist.com',
        footerAddress: 'Purablis Media · 177 Arana Dr. Martinez · CA, 94553 · USA',
        footerLegal: 'Copyright and image use not authorized. Please contact news@purabici.com for disputes or removal.'
    };

    function getMainArticlesForCategory(category) {
        return getArticlesForCategory(category).filter(a => ['Y', 'YM'].includes(a.status));
    }

    function getInterestingFindsArticles() {
        return articles
            .filter(a => a.status === 'COOL FINDS')
            .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    function getArticleImageUrl(article) {
        return article.publishedImageUrl || article.image || article.originalImageUrl || article.uploadedImageUrl || '';
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
        const available = inspirationalImages.filter(Boolean);
        if (!available.length) {
            confirmationInspirationalImage = '';
            return '';
        }
        if (confirmationInspirationalImage && available.includes(confirmationInspirationalImage)) {
            return confirmationInspirationalImage;
        }
        confirmationInspirationalImage = available[Math.floor(Math.random() * available.length)];
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
            return `
                <div style="display:flex; gap:12px; padding:12px 0; border-bottom:1px solid #eee;">
                    ${image ? `<img src="${image}" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:6px;">` : ''}
                    <div>
                        <a href="${url}" target="_blank" style="color:#111; font-weight:700; text-decoration:none;">${title}</a>
                        <div><a href="${url}" target="_blank" style="color:#2a6edc; font-size:0.85rem;">${source}</a></div>
                    </div>
                </div>
            `;
        }).join('');
        const findsHtml = getInterestingFindsArticles().slice(0, 4).map(article => {
            const title = escapeHtml(article.title || 'Untitled');
            const url = article.url || '#';
            return `<li style="margin-bottom:8px;"><a href="${url}" target="_blank">${title}</a></li>`;
        }).join('');
        const inspiration = chooseConfirmationInspirationalImage();
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${newsletterName} - ${category}</title></head><body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;">
            <h1>${newsletterName} - ${category}</h1>
            <p>${summary || 'No summary selected yet.'}</p>
            <h2>Weekly News</h2>
            ${weeklyHtml || '<p>No weekly news articles selected yet.</p>'}
            <h2>Interesting Finds</h2>
            <ul>${findsHtml || '<li>No interesting finds selected yet.</li>'}</ul>
            <h2>Inspiration</h2>
            ${inspiration ? `<img src="${inspiration}" alt="Inspiration" style="max-width:100%;">` : '<p>No inspirational image selected yet.</p>'}
        </body></html>`;
    }

    function applySummaryToTemplate(doc, category) {
        const summaryText = getSelectedOrGeneratedSummary(category);
        const introCell = Array.from(doc.querySelectorAll('td, div, p')).find(el => (el.textContent || '').includes('Hi [FNAME],'));
        if (!introCell || !summaryText) return;

        const lines = summaryText
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => escapeHtml(line));

        introCell.innerHTML = `<span style="font-size:14px;line-height: 150%;color: #000000;">Hi [FNAME],<br><br>${lines.join('<br>')}<br><br>Have a fantastic week and stay safe,<br>Jessica<br><br>If this newsletter&#8217;s not for you, just <a href="${TEMPLATE_FIXED_CONTENT.unsubscribeHref}" style="color:#2baadf;text-decoration:underline;">unsubscribe</a> and you won&#8217;t hear from us again. :) </span><br />&nbsp;`;
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
            footerBlocks[0].innerHTML = `
                <div><em>Copyright &copy; 2026 Purablis, All rights reserved.</em></div>
                <div>Email Contact:</div>
                <div><a href="mailto:${TEMPLATE_FIXED_CONTENT.contactEmail}" style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;color: #0000f1;font-weight: normal;text-decoration: underline;" target="_blank">${TEMPLATE_FIXED_CONTENT.contactEmail}</a><br />
                <a href="${TEMPLATE_FIXED_CONTENT.unsubscribeHref}" style="color:#2baadf;text-decoration:underline;">Unsubscribe</a></div>
                <div>${escapeHtml(TEMPLATE_FIXED_CONTENT.footerAddress).replace(/·/g, '&middot;')}</div>
            `;
        }
        if (footerBlocks[1]) {
            footerBlocks[1].innerHTML = `<span style="font-size:11px;line-height: 150%;color: #989898;">${escapeHtml(TEMPLATE_FIXED_CONTENT.footerLegal)}</span>`;
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
        const lines = summaryText
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => escapeHtml(line));
        return `<div style="text-align: justify;"><span style="font-size:14px;line-height: 150%;color: #000000;">Hi [FNAME],<br />
									<br />
									${lines.join('<br />\n\t\t\t\t\t\t\t\t\t')}<br />
									<br />
									Have a fantastic week and stay safe,<br />
									Jessica<br />
									<br />
									If this newsletter&#8217;s not for you, just <a href="${TEMPLATE_FIXED_CONTENT.unsubscribeHref}" style="color:#2baadf;text-decoration:underline;">unsubscribe</a> and you won&#8217;t hear from us again. :) </span><br />
									&nbsp;</div>`;
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
            html = html.replace(/<div style="text-align: justify;"><span style="font-size:14px;line-height: 150%;color: #000000;">[\s\S]*?<\/span><br \/>\s*&nbsp;<\/div>/i, summaryHtml);
        }

        html = replaceArticleSection(html, 'Weekly News', 'Interesting Finds', mainArticles);
        html = replaceArticleSection(html, 'Interesting Finds', 'Inspiration', findsArticles);

        const inspirationImage = chooseConfirmationInspirationalImage();
        if (inspirationImage) {
            html = html.replace(/(<a[^>]*target="_blank"[^>]*title="">\s*<img alt="Inspiration" class="mcnImage2" src=")([^"]*)(")/i, `$1${inspirationImage}$3`);
        }

        html = html.replace(/<a href="http:\/\/www\.purablis\.com" target="_blank"><img alt="" class="puralogsize" src="[^"]*" \/><\/a>/i, `<a href="${TEMPLATE_FIXED_CONTENT.logoHref}" target="_blank"><img alt="" class="puralogsize" src="${TEMPLATE_FIXED_CONTENT.logoSrc}" /></a>`);
        html = html.replace(/<a href="https:\/\/www\.youtube\.com\/Purablis"[\s\S]*?<img alt="YouTube" class="mcnFollowBlockIcon" src="[^"]*"[\s\S]*?<\/a>/i, `<a href="${TEMPLATE_FIXED_CONTENT.youtubeHref}" style="mso-line-height-rule: exactly;-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;" target="_blank"><img alt="YouTube" class="mcnFollowBlockIcon" src="${TEMPLATE_FIXED_CONTENT.youtubeIconSrc}" style="width: 30px;max-width: 30px;display: block;border: 0;height: auto;outline: none;text-decoration: none;-ms-interpolation-mode: bicubic;" width="30" /></a>`);
        html = html.replace(/<a href="https:\/\/ap\.lovethelist\.com\/index\.php\/lists\/qk5307z6w1e34\/unsubscribe\/unsubscribe-direct" style="color:#2baadf;text-decoration:underline;">unsubscribe<\/a>/i, `<a href="${TEMPLATE_FIXED_CONTENT.unsubscribeHref}" style="color:#2baadf;text-decoration:underline;">unsubscribe</a>`);
        html = html.replace(/<a href="https:\/\/ap\.lovethelist\.com\/index\.php\/lists\/qk5307z6w1e34\/unsubscribe\/unsubscribe-direct" style="color:#2baadf;text-decoration:underline;">Unsubscribe<\/a>/i, `<a href="${TEMPLATE_FIXED_CONTENT.unsubscribeHref}" style="color:#2baadf;text-decoration:underline;">Unsubscribe</a>`);

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
            const errorHtml = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:24px;color:#111;"><h2>Template Error</h2><p>Confirmation preview could not load the required example template for ${category}.</p><p>Restart the local server so the new <code>/api/newsletters/template/${category}</code> route is available, then reload the page.</p></body></html>`;
            confirmationRenderedHtml[category] = errorHtml;
            return errorHtml;
        }
    }

    window.switchConfirmationTab = (category) => {
        currentConfirmationTab = category;
        renderConfirmationPreviews();
    };

    window.downloadConfirmationHtml = async (category) => {
        const html = confirmationRenderedHtml[category] || await buildConfirmationHtml(category);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${getActiveNewsletterName().replace(/[^\w\-]+/g, '-') || 'newsletter'}-${category}.html`;
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

        const selectedSummary = getSelectedOrGeneratedSummary(currentConfirmationTab);
        container.innerHTML = `
            <div class="tabs-container" style="margin-bottom: 18px; border-bottom: 1px solid #ddd;">
                <button class="tab-btn ${currentConfirmationTab === 'MED' ? 'active' : ''}" onclick="switchConfirmationTab('MED')">MED</button>
                <button class="tab-btn ${currentConfirmationTab === 'THC' ? 'active' : ''}" onclick="switchConfirmationTab('THC')">THC</button>
                <button class="tab-btn ${currentConfirmationTab === 'CBD' ? 'active' : ''}" onclick="switchConfirmationTab('CBD')">CBD</button>
                <button class="tab-btn ${currentConfirmationTab === 'INV' ? 'active' : ''}" onclick="switchConfirmationTab('INV')">INV</button>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom:14px;">
                <div>
                    <div style="font-size: 1rem; font-weight: 700; margin-bottom: 4px;">${currentConfirmationTab} Preview</div>
                    <div style="font-size: 0.85rem; color:#666;">Uses the example email template itself, then fills in the current summary, ranked articles, interesting finds, and one inspirational image.</div>
                </div>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button class="btn btn-success btn-sm" onclick="downloadConfirmationHtml('${currentConfirmationTab}')">Download HTML</button>
                    <button class="btn btn-outline btn-sm" onclick="downloadConfirmationDoc('${currentConfirmationTab}')">Download DOC</button>
                </div>
            </div>
            <div id="confirmation-preview-frame-wrap" style="border:1px solid #ddd; border-radius: 10px; overflow:auto; background:#fff;">
                <div style="padding: 24px; text-align:center; color:#666;">Loading ${currentConfirmationTab} template preview...</div>
            </div>
        `;

        const html = await buildConfirmationHtml(currentConfirmationTab);
        const frameWrap = document.getElementById('confirmation-preview-frame-wrap');
        if (!frameWrap) return;

        frameWrap.innerHTML = `<iframe title="${currentConfirmationTab} newsletter preview" style="width:900px; min-width:900px; min-height:1100px; border:0; background:#fff; display:block; margin:0 auto;"></iframe>`;
        const iframe = frameWrap.querySelector('iframe');
        if (iframe) iframe.srcdoc = html;
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
                ${a.image ? `<img src="${a.image}" alt="" style="max-width:90px;height:90px;object-fit:cover;" onerror="this.onerror=null;this.src='${a.originalImageUrl || ''}';">` : ''}
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
                    ${inspirationalImg ? `<img src="${inspirationalImg.replace(/"/g, '&quot;')}" alt="Header" style="max-width:100%;">` : ''}
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
                            box.innerHTML = `<div class="selected-image-container"><img src="${data.url}" class="img-fluid" style="max-height: 120px;" onerror="this.onerror=null;this.src='${articles[idx].originalImageUrl || ''}';this.parentElement.classList.add('img-fallback');"><button class="btn-remove-image" onclick="removeImage(${idx})">×</button><span class="badge-published" title="Published">P</span></div>`;
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
        controls.className = 'controls-row';
        controls.style.justifyContent = 'space-between';
        controls.style.marginBottom = '20px';
        controls.innerHTML = `
            <button class="btn btn-secondary" onclick="switchStep(1)">Back: Search</button>
            <button class="btn btn-primary" onclick="switchStep(3)">Next: Image View</button>
        `;
        list.appendChild(controls);

        if (articles.length === 0) {
            list.innerHTML += '<div style="padding: 20px; text-align: center; color: #777;">No articles found. Please try searching again.</div>';
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
            const disabledStyle = isStatusValid ? '' : 'opacity: 0.5; cursor: not-allowed;';

            const categoryInputs = ['MED', 'THC', 'CBD', 'INV'].map(cat => {
                let rank = (article.ranks && (article.ranks[cat] ?? article.ranks[cat.toLowerCase()])) ?? (article.categories && article.categories.includes(cat) ? 'Y' : '');
                // Same resolution as getRankForSort so display and sort match (incl. lowercase keys)
                
                return `
                    <div class="col-cat">
                        <input type="text" 
                            value="${rank}" 
                            oninput="updateCategoryRank(${index}, '${cat}', this.value)"
                            style="${disabledStyle}" 
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
                        <div style="display: flex; align-items: flex-start; gap: 8px;">
                            <textarea 
                                class="title-edit" 
                                rows="2" 
                                onchange="updateArticleField(${index}, 'title', this.value)"
                                style="font-family: inherit; flex: 1; min-width: 120px;"
                            >${article.title}</textarea>
                            <span class="article-added-at" title="${article.addedAt ? 'Added ' + article.addedAt : 'No add date'}">${article.addedAt ? 'added ' + formatAddedAt(article.addedAt) : '—'}</span>
                        </div>
                        <p style="margin: 5px 0; font-size: 0.85rem; color: #666;">
                            ${article.description ? article.description.substring(0, 120) + '...' : 'No description'}
                        </p>
                        
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <input 
                                type="text" 
                                class="url-edit" 
                                value="${article.url}"
                                onchange="updateArticleField(${index}, 'url', this.value)"
                                style="font-size: 0.8rem; padding: 2px 5px; width: 100%; color: #0066cc;"
                            >
                            <a href="${article.url}" target="_blank" title="Open Link" style="text-decoration: none;">🔗</a>
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
                            class="form-control"
                            onchange="updateArticleField(${index}, 'notes', this.value)"
                            placeholder="Notes..."
                            style="width: 100%; height: 60px; font-size: 0.85rem; resize: vertical;"
                        >${article.notes || ''}</textarea>
                    </div>
                    
                    <div class="col-actions">
                        <button class="btn btn-sm btn-outline" style="color: #f57c00; border-color: #f57c00; margin-bottom: 5px; width: 100%;" onclick="archiveArticle(${index})">Archive</button>
                        <button class="btn btn-sm btn-outline" style="color: #d32f2f; border-color: #d32f2f; width: 100%;" onclick="removeArticle(${index})">Remove</button>
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
        modal.style.display = 'flex';
    };

    window.closeAddArticleModal = () => {
        const modal = document.getElementById('add-article-modal');
        if (modal) modal.style.display = 'none';
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
            ? `<span class="stat-item" style="background:#e8eaf6; color:#283593; font-weight:600;">${currentSessionName}</span>` 
            : '';

        const statsHtml = `
            ${sessionLabel}
            <span class="stat-item" title="Total articles in list">Total: ${articles.length}</span>
            <span class="stat-item" style="background:#e0f7fa; color:#006064;" title="Status Y/YM/COOL FINDS">Selected: ${validStatusCount}</span>
            <span class="stat-item" style="background:#e3f2fd; color:#0d47a1;">MED: ${counts.MED}</span>
            <span class="stat-item" style="background:#e8f5e9; color:#1b5e20;">THC: ${counts.THC}</span>
            <span class="stat-item" style="background:#fff3e0; color:#e65100;">CBD: ${counts.CBD}</span>
            <span class="stat-item" style="background:#f3e5f5; color:#4a148c;">INV: ${counts.INV}</span>
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
        const dropdownStep1 = document.getElementById('saved-sessions-dropdown-step1');
        const dropdown = document.getElementById('saved-sessions-dropdown');
        const dropdownStep3 = document.getElementById('saved-sessions-dropdown-step3');
        const nameInput = document.getElementById('newsletter-name');

        const sessions = getSavedSessions();
        const names = Object.keys(sessions).sort();

        const optionsHtml = names.map(name => {
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
            hintEl.style.display = 'block';
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
                if (hintEl) hintEl.style.display = 'block';
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
                    if (hintEl) hintEl.style.display = 'none';
                }
            } else if (sessRes.status === 503) {
                msg = (msg || '') + 'Sessions: server database not configured.';
                if (hintEl) hintEl.style.display = 'block';
                await window.updateStateHintFromDiagnostic();
            }
            alert(msg || 'No data from server. Check the yellow hint above for details.');
        } catch (e) {
            if (hintEl) hintEl.style.display = 'block';
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
        status.style.display = 'none';

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
                status.style.display = 'block';
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
        status.style.display = 'none';

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
                status.style.display = 'block';
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
            if (searchStatus) searchStatus.style.display = 'none';

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
                        searchStatus.style.display = 'inline';
                    }
                    if (nextStep2Btn) {
                        nextStep2Btn.style.display = 'inline-block';
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
});
