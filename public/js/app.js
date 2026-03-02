document.addEventListener('DOMContentLoaded', () => {
    // Global State
    let articles = [];
    let archivedArticles = [];
    let inspirationalImages = [];
    let newsletterContent = {
        MED: { intro: '', outro: '' },
        THC: { intro: '', outro: '' },
        CBD: { intro: '', outro: '' },
        INV: { intro: '', outro: '' }
    };
    let currentEditorTab = 'MED';

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
                inspirationalImages = data.inspirationalImages || [];
                newsletterContent = data.newsletterContent || {
                    MED: { intro: '', outro: '' },
                    THC: { intro: '', outro: '' },
                    CBD: { intro: '', outro: '' },
                    INV: { intro: '', outro: '' }
                };
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
                    inspirationalImages = value.inspirationalImages || [];
                    newsletterContent = value.newsletterContent || newsletterContent;
                    localStorage.setItem('newsletter_articles', JSON.stringify({ articles, archivedArticles, inspirationalImages, newsletterContent }));
                    if (typeof renderArticles === 'function') renderArticles();
                }
            }
            if (sessRes.ok) {
                const { value } = await sessRes.json();
                if (value && typeof value === 'object') {
                    localStorage.setItem('newsletter_saved_sessions', JSON.stringify(value));
                    if (typeof populateSavedDropdown === 'function') populateSavedDropdown();
                    if (hintEl) hintEl.style.display = 'none';
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
                     <img src="${article.image}" class="img-fluid" style="max-height: 120px;">
                     <button class="btn-remove-image" onclick="removeImage(${originalIndex})">×</button>
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

            const rowHtml = `
                <div class="img-table-row">
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
        statsEl.innerHTML = `
            ${sessionLabel}
            <span class="stat-item" title="Articles with categories in this view">Total: ${relevantArticles.length}</span>
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
                // Limit to 8 images for the 4x2 grid
                const displayImages = data.images.slice(0, 8);
                
                displayImages.forEach(img => {
                    // Direct img as grid item
                    const imgEl = document.createElement('img');
                    imgEl.src = img.preview;
                    imgEl.className = 'mini-grid-item'; // Use CSS class
                    imgEl.onclick = () => selectImage(index, img.download);
                    
                    grid.appendChild(imgEl);
                });

                // Show pagination (if we had it in UI, but simplified for now)
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
        saveState();
        // Update the "Big Image" box
        const box = document.getElementById(`selected-img-${index}`);
        if (box) {
            box.innerHTML = `
                <div class="selected-image-container">
                     <img src="${url}" class="img-fluid" style="max-height: 150px;">
                     <button class="btn-remove-image" onclick="removeImage(${index})">×</button>
                </div>`;
        }
    };

    // Remove Image
    window.removeImage = (index) => {
        articles[index].image = null;
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

    // Upload local image file for an article
    window.uploadArticleImage = async (index, input) => {
        if (!input.files || !input.files[0]) return;

        const label = document.querySelector(`label[for="img-upload-input-${index}"]`);
        if (label) label.textContent = 'Uploading...';

        const formData = new FormData();
        formData.append('image', input.files[0]);

        try {
            const res = await fetch('/api/images/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                selectImage(index, data.url);
            } else {
                alert('Upload failed: ' + (data.error || 'Unknown error'));
            }
        } catch (e) {
            console.error(e);
            alert('Upload failed. See console for details.');
        } finally {
            if (label) label.textContent = 'Choose File';
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

        const categoryArticles = articles.filter(a =>
            a.categories && a.categories.includes(currentEditorTab)
        ).sort((a, b) => {
            const rankA = parseInt((a.ranks && a.ranks[currentEditorTab]) || 99);
            const rankB = parseInt((b.ranks && b.ranks[currentEditorTab]) || 99);
            return rankA - rankB;
        });

        const articleListHTML = categoryArticles.length > 0
            ? categoryArticles.map((a, i) => {
                const rank = (a.ranks && a.ranks[currentEditorTab]) || '';
                return `<span style="font-size:0.8rem; color:#555;">${i + 1}. [${rank}] ${a.title.substring(0, 50)}${a.title.length > 50 ? '...' : ''}</span>`;
            }).join('<br>')
            : '<span style="font-size:0.8rem; color:#999;">No articles in this category yet.</span>';

        const summaryRulesValue = newsletterContent.summaryRules || '';
        const resultValue = content.result || '';

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 300px; gap: 20px; align-items: start;">
                <div>
                    <div class="form-group">
                        <label style="font-weight: 600;">Prompt</label>
                        <textarea id="editor-prompt" rows="8" class="form-control" style="font-family: monospace; font-size: 0.9rem;" oninput="updateNewsletterContent('${currentEditorTab}', 'prompt', this.value)">${promptValue}</textarea>
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="text" id="bring-articles-input" placeholder="e.g. 1,2,3" style="width: 120px; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem;">
                            <button class="btn btn-secondary btn-sm" onclick="bringArticlesToPrompt('${currentEditorTab}')">Bring Articles</button>
                        </div>
                        <div style="font-size: 0.78rem; color: #888; border-left: 1px solid #ddd; padding-left: 10px;">
                            ${articleListHTML}
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; justify-content: space-between; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 0.9rem;">
                                <input type="radio" name="useRulesGroup-${currentEditorTab}" ${content.useRules !== false ? 'checked' : ''} onchange="updateNewsletterContent('${currentEditorTab}', 'useRules', true)">
                                Use Summary Rules
                            </label>
                            <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 0.9rem;">
                                <input type="radio" name="useRulesGroup-${currentEditorTab}" ${content.useRules === false ? 'checked' : ''} onchange="updateNewsletterContent('${currentEditorTab}', 'useRules', false)">
                                Custom (No Rules)
                            </label>
                        </div>
                        <button class="btn btn-primary" onclick="generateSummary('${currentEditorTab}')">
                            <span id="gen-btn-text-${currentEditorTab}">Generate Summary</span>
                        </button>
                    </div>
                </div>

                <div>
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
                <button class="btn btn-outline btn-sm" onclick="copyEditorContent('${currentEditorTab}')">Copy ${currentEditorTab} Content</button>
            </div>
        `;
    };

    window.bringArticlesToPrompt = (category) => {
        const input = document.getElementById('bring-articles-input');
        if (!input) return;
        const nums = input.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (nums.length === 0) return alert('Enter article numbers separated by commas (e.g. 1,2,3).');

        const categoryArticles = articles.filter(a =>
            a.categories && a.categories.includes(category)
        ).sort((a, b) => {
            const rankA = parseInt((a.ranks && a.ranks[category]) || 99);
            const rankB = parseInt((b.ranks && b.ranks[category]) || 99);
            return rankA - rankB;
        });

        const selected = nums.map(n => categoryArticles[n - 1]).filter(Boolean);
        if (selected.length === 0) return alert('No matching articles for those numbers. Check the list on the right.');

        let text = '';
        selected.forEach(a => {
            text += `Title: ${a.title}\nURL: ${a.url}\n\n`;
        });

        const promptEl = document.getElementById('editor-prompt');
        if (promptEl) {
            promptEl.value = (promptEl.value ? promptEl.value + '\n\n' : '') + text;
            updateNewsletterContent(category, 'prompt', promptEl.value);
        }
    };

    window.updateSummaryRules = (value) => {
        newsletterContent.summaryRules = value;
        saveState();
    };

    window.generateSummary = async (category) => {
        const prompt = document.getElementById('editor-prompt').value;
        const useRules = document.querySelector(`input[name="useRulesGroup-${category}"]:checked`);
        const isUseRules = useRules ? useRules.nextSibling.textContent.trim().startsWith('Use') : true;
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
                const resultText = data.resultText || (data.articles ? JSON.stringify(data.articles, null, 2) : '');
                newsletterContent[category].result = resultText;
                saveState();
                const resultEl = document.getElementById('editor-result');
                if (resultEl) resultEl.value = resultText;
            } else {
                alert('Generation failed: ' + (data.error || 'Unknown error'));
            }
        } catch (e) {
            console.error(e);
            alert('Error generating summary.');
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
    }

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

    // Render Articles Function (Table View)
    function renderArticles() {
        const list = document.getElementById('articles-list');
        list.innerHTML = ''; // Clear existing

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

        list.innerHTML += articles.map((article, index) => {
            // Ensure defaults
            if (!article.status) article.status = 'Y';
            if (!article.categories) {
                // Backward compatibility if single category exists
                article.categories = article.category ? [article.category] : [];
            }
            if (!article.notes) article.notes = article.keyword || ''; // Migration
            if (article.selected === undefined) article.selected = true;

            // Checkbox logic for categories
            const isStatusValid = ['Y', 'YM', 'M', 'COOL FINDS'].includes(article.status);
            const disabledAttr = isStatusValid ? '' : 'disabled';
            const disabledStyle = isStatusValid ? '' : 'opacity: 0.5; cursor: not-allowed;';

            const categoryInputs = ['MED', 'THC', 'CBD', 'INV'].map(cat => {
                let rank = (article.ranks && article.ranks[cat]) || (article.categories && article.categories.includes(cat) ? 'Y' : '');
                if (rank === 1 || rank === '1') rank = 'Y';
                
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
                        <textarea 
                            class="title-edit" 
                            rows="2" 
                            onchange="updateArticleField(${index}, 'title', this.value)"
                            style="font-family: inherit;"
                        >${article.title}</textarea>
                        
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
    }

    // Update Article Field
    window.updateArticleField = (index, field, value) => {
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
        } else {
            // For other fields, just save
            saveState();
        }
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

    // Sort Articles
    window.sortArticles = (sortKey) => {
        if (!articles || articles.length === 0) return;
        
        // Sort by boolean: those having the category come first
        articles.sort((a, b) => {
            const hasA = a.categories && a.categories.includes(sortKey);
            const hasB = b.categories && b.categories.includes(sortKey);
            if (hasA === hasB) return 0;
            return hasA ? -1 : 1;
        });
        saveState(); // Save sorted order
        renderArticles();
    };

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

        statsEl.innerHTML = `
            ${sessionLabel}
            <span class="stat-item" title="Total articles in list">Total: ${articles.length}</span>
            <span class="stat-item" style="background:#e0f7fa; color:#006064;" title="Status Y/YM/COOL FINDS">Selected: ${validStatusCount}</span>
            <span class="stat-item" style="background:#e3f2fd; color:#0d47a1;">MED: ${counts.MED}</span>
            <span class="stat-item" style="background:#e8f5e9; color:#1b5e20;">THC: ${counts.THC}</span>
            <span class="stat-item" style="background:#fff3e0; color:#e65100;">CBD: ${counts.CBD}</span>
            <span class="stat-item" style="background:#f3e5f5; color:#4a148c;">INV: ${counts.INV}</span>
        `;
    }

    // Remove Article
    window.removeArticle = (index) => {
        if (confirm('Remove this article?')) {
            articles.splice(index, 1);
            saveState();
            renderArticles();
            const activeStep = document.querySelector('.step.active');
            if (activeStep && activeStep.getAttribute('data-step') === '3') {
                renderImagesView();
            }
        }
    };

    window.archiveArticle = (index) => {
        if (confirm('Archive this article? It will be moved to the archive.')) {
            const article = articles[index];
            archivedArticles.push(article);
            articles.splice(index, 1);
            saveState();
            renderArticles();
            const activeStep = document.querySelector('.step.active');
            if (activeStep && activeStep.getAttribute('data-step') === '3') {
                renderImagesView();
            }
            alert('Article archived.');
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

        if (sessions[name] && currentSessionName !== name) {
            const existing = sessions[name];
            const existingCount = (existing.articles || []).length;
            const existingDate = existing.savedAt ? new Date(existing.savedAt).toLocaleString() : 'unknown';
            
            const action = prompt(
                `"${name}" already exists (${existingCount} articles, saved ${existingDate}).\n\n` +
                `Type a NEW name to save separately, or type "overwrite" to replace it:`,
                name + ' - ' + new Date().toLocaleDateString()
            );
            
            if (!action) return;
            
            if (action.toLowerCase() === 'overwrite') {
                // Fall through to save with same name
            } else {
                // Save with the new name instead
                const newName = action.trim();
                if (!newName) return;
                if (sessions[newName]) {
                    return alert(`"${newName}" also already exists. Please pick a unique name.`);
                }
                document.getElementById('newsletter-name').value = newName;
                sessions[newName] = {
                    articles: JSON.parse(JSON.stringify(articles)),
                    archivedArticles: JSON.parse(JSON.stringify(archivedArticles)),
                    inspirationalImages: [...inspirationalImages],
                    newsletterContent: JSON.parse(JSON.stringify(newsletterContent)),
                    savedAt: new Date().toISOString()
                };
                saveSavedSessions(sessions);
                currentSessionName = newName;
                populateSavedDropdown();
                alert(`Saved as "${newName}" (${articles.length} articles).`);
                return;
            }
        }

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
        archivedArticles = session.archivedArticles || [];
        inspirationalImages = session.inspirationalImages || [];
        newsletterContent = session.newsletterContent || { MED: { intro: '', outro: '' }, THC: { intro: '', outro: '' }, CBD: { intro: '', outro: '' }, INV: { intro: '', outro: '' } };

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
                    inspirationalImages = value.inspirationalImages || [];
                    newsletterContent = value.newsletterContent || newsletterContent;
                    localStorage.setItem('newsletter_articles', JSON.stringify({ articles, archivedArticles, inspirationalImages, newsletterContent }));
                    if (typeof renderArticles === 'function') renderArticles();
                    msg = (value.articles || []).length + ' articles in workspace. ';
                }
            } else if (wrRes.status === 503) {
                msg = 'Server database not configured. ';
                if (hintEl) hintEl.style.display = 'block';
                await window.updateStateHintFromDiagnostic();
            }
            if (sessRes.ok) {
                const { value } = await sessRes.json();
                if (value && typeof value === 'object') {
                    localStorage.setItem('newsletter_saved_sessions', JSON.stringify(value));
                    if (typeof populateSavedDropdown === 'function') populateSavedDropdown();
                    const n = Object.keys(value).length;
                    msg += n + ' saved session(s) loaded (e.g. Week 1).';
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

                // Assign IDs continuing from current max
                const maxId = articles.reduce((max, a) => Math.max(max, a.id || 0), 0);
                newArticles.forEach((a, i) => { a.id = maxId + i + 1; });

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
});