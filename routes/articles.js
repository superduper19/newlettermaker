const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configure Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Anthropic Client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Google Generative AI Client
// Assumes GEMINI_API_KEY or GOOGLE_API_KEY is in env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

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
        selected: true
    };
};

// Helper to verify URL and fetch content
const verifyAndAnalyzeUrl = async (url) => {
    if (!url) return { isValid: false, content: '' };
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
        
        const response = await fetch(url, { 
            method: 'GET',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            signal: controller.signal
        });
        clearTimeout(timeout);

        // 404/410 are definitely dead. 
        if (response.status === 404 || response.status === 410) {
            console.log(`URL ${url} returned ${response.status}. Invalid.`);
            return { isValid: false, content: '' };
        }

        // 403/401/429/5xx might be valid URLs blocking bots. 
        // We'll mark them valid but content-less so we don't discard real news.
        if (!response.ok) {
            console.log(`URL ${url} returned ${response.status}. Treating as valid but unreadable.`);
            return { isValid: true, isReadable: false, content: '' };
        }
        
        const text = await response.text();
        // Simple extraction of body text (stripping tags)
        const content = text.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '')
                            .replace(/<style[^>]*>([\S\s]*?)<\/style>/gmi, '')
                            .replace(/<[^>]+>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim()
                            .substring(0, 15000); // Limit to 15k chars for LLM

        return { isValid: true, isReadable: true, content };
    } catch (error) {
        console.error(`Verification failed for ${url}:`, error.message);
        // If it's a timeout, maybe we should be lenient? For now, treat as invalid if we can't reach it.
        return { isValid: false, isReadable: false, content: '' };
    }
};

// Helper to categorize article based on content (implements newsletter_categorization_brief.md)
const categorizeArticle = (article, content) => {
    if (!content) return article;

    const text = content.toLowerCase();
    const title = article.title.toLowerCase();
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
                error: 'No articles found. Ensure the sheet has a header row and columns like Title, URL (or Article, Link). Download the template for the expected format.'
            });
        }

        console.log(`Processed ${articles.length} articles from Excel for "${newsletterName}"`);
        res.json({
            success: true,
            newsletterName,
            source: 'excel',
            count: articles.length,
            articles
        });
    } catch (error) {
        console.error('Error processing Excel:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to process Excel file' });
    }
});

// Helper to extract JSON from AI response
const extractJSON = (text) => {
    // Remove markdown code blocks if present
    text = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    
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
        const objects = [];
        const objRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
        let m;
        while ((m = objRegex.exec(match[0])) !== null) {
            try { objects.push(JSON.parse(m[0])); } catch (e5) { /* skip */ }
        }
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
                date: dates[i] || ''
            });
        }
        return articles;
    }

    throw new Error('Could not extract JSON or structured data from AI response');
};

// Shared Model Mapping
const MODEL_MAPPING = {
    'claude-opus-4-6': 'claude-opus-4-6',
    'claude-opus-4-6-extended': 'claude-opus-4-6', // Maps to same base model
    'claude-sonnet-4-6': 'claude-sonnet-4-6',
    'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
    'gemini-flash-3-0': 'gemini-3-flash-preview',
    'gemini-flash-3-1-pro': 'gemini-3.1-pro-preview' // Updated based on earlier fix, verifying...
};

// Helper to get API Model ID
const getApiModelId = (userModel) => MODEL_MAPPING[userModel] || userModel || 'claude-opus-4-6';

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

// POST /api/articles/search - AI Search & Filtering
router.post('/search', async (req, res) => {
    try {
        const { prompt, newsletterName, model } = req.body;
        console.log(`Received search request: "${prompt}" for ${newsletterName} using model ${model}`);
        
        // Use mock data if requested (for testing without burning credits)
        if (prompt.toLowerCase().includes('mock data')) {
             console.log("Mock data requested.");
             return res.json({
                 success: true,
                 articles: [
                     { title: "Mock Article 1", description: "This is a test article.", url: "https://example.com/1", category: "MED" },
                     { title: "Mock Article 2", description: "Another test article.", url: "https://example.com/2", category: "THC" }
                 ]
             });
        }

        console.log(`Searching articles with model ${model} for "${newsletterName}"`);

        const apiModel = getApiModelId(model);
        
        console.log(`Using model mapping: ${model} -> ${apiModel}`);

        let content = '';

        const systemPrompt = `You are a research assistant. Search the web for articles matching the user's request. Your ENTIRE response must be a single valid JSON array — nothing else. No markdown, no headers, no commentary, no explanation before or after.

Each object in the array must have exactly these keys:
- "title": article headline
- "url": full article URL
- "description": 1-2 sentence summary
- "date": publication date in MM/DD/YY format

Example format:
[{"title":"...","url":"https://...","description":"...","date":"02/25/26"}]`;

        if (apiModel.toLowerCase().includes('gemini')) {
            try {
                const geminiModel = genAI.getGenerativeModel({ 
                    model: apiModel, 
                    tools: [{ googleSearch: {} }]
                });

                const geminiPrompt = `${systemPrompt}\n\nUser request: ${prompt}`;

                const result = await geminiModel.generateContent(geminiPrompt);
                const response = await result.response;
                content = response.text();
            } catch (geminiError) {
                console.error("Gemini API Error:", geminiError);
                return res.status(500).json({ error: parseAIError(geminiError), details: geminiError.message });
            }

        } else {
            const message = await anthropic.messages.create({
                model: apiModel,
                max_tokens: 8000,
                system: systemPrompt,
                messages: [
                    { role: "user", content: prompt } 
                ],
                tools: [
                    {
                        type: "web_search_20250305",
                        name: "web_search",
                        max_uses: 10
                    }
                ]
            });

            // Combine all text blocks
            content = message.content
                .filter(block => block.type === 'text')
                .map(block => block.text)
                .join('\n');
        }

        let rawArticles = [];
        try {
            rawArticles = extractJSON(content);
        } catch (e) {
            const logId = Date.now();
            console.error(`[${logId}] Failed to parse AI JSON response:`, content.substring(0, 500) + "...");
            // Write full content to file for debugging
            try {
                require('fs').writeFileSync(`error_json_${logId}.log`, content);
                console.error(`Full error content written to error_json_${logId}.log`);
            } catch (fsErr) {
                console.error("Failed to write error log file", fsErr);
            }
            
            return res.status(500).json({ error: "AI returned invalid JSON format. Log ID: " + logId });
        }

        console.log(`AI found ${rawArticles.length} articles. Starting Stage 2: Verification & Categorization...`);

        // Stage 2: Verification & Categorization
        const processArticle = async (article) => {
            // Clean first
            let cleaned = cleanArticleData(article, 0); 
            
            // 1. Verify URL
            if (!cleaned.url || cleaned.url.includes('example.com') || cleaned.url === '#') {
                return null; 
            }

            const { isValid, isReadable, content } = await verifyAndAnalyzeUrl(cleaned.url);
            
            if (!isValid) {
                console.log(`Skipping invalid URL (failed verification): ${cleaned.url}`);
                return null;
            }

            // Simple check: does content length > 300 chars?
            if (isReadable && content.length < 300) {
                 console.log(`Skipping thin content (${content.length} chars): ${cleaned.url}`);
                 return null;
            }

            // 2. Categorize (and apply rejection rules from brief)
            if (isReadable) {
                // categorizeArticle now implements the brief's logic
                cleaned = categorizeArticle(cleaned, content);
                
                if (!cleaned) {
                    console.log(`Skipping rejected article (rule violation): ${article.url}`);
                    return null;
                }
            } else {
                // If not readable, keep it but warn
                console.log(`Content unreadable for ${cleaned.url}, skipping auto-categorization but keeping.`);
            }

            return cleaned;
        };

        const results = await Promise.all(rawArticles.map(a => processArticle(a)));
        
        // Filter out nulls (rejected articles)
        const validArticles = results.filter(a => a !== null);

        // Re-index
        const finalArticles = validArticles.map((a, i) => ({ ...a, id: i + 1 }));

        console.log(`Returning ${finalArticles.length} valid articles after categorization.`);

        res.json({
            success: true,
            newsletterName,
            source: 'ai',
            count: finalArticles.length,
            articles: finalArticles
        });

    } catch (error) {
        console.error('Error with AI Search:', error);
        // Propagate specific API errors (like credit balance)
        const errorMessage = parseAIError(error);
        res.status(500).json({ error: errorMessage, details: error });
    }
});

// POST /api/articles/modify - Handle AI Article Modification
router.post('/modify', async (req, res) => {
    try {
        const { prompt, articles, model } = req.body;

        if (!prompt || !articles || articles.length === 0) {
            return res.status(400).json({ error: 'Prompt and articles are required' });
        }

        console.log(`Modifying ${articles.length} articles with instruction: "${prompt}" using model: ${model}`);

        const apiModel = getApiModelId(model);
        console.log(`Using model mapping: ${model} -> ${apiModel}`);

        const systemPrompt = `You are a professional editor for a newsletter. Modify the provided articles based on the user's instructions. Return the modified list as a JSON array. Each object must have: "title", "description", "url", "date". Maintain original order. Output only the JSON array — no markdown, no explanation.`;

        const userMessage = `Instruction: ${prompt}\n\nArticles:\n${JSON.stringify(articles.map(a => ({ title: a.title, description: a.description, url: a.url, date: a.date || '' })), null, 2)}`;

        let content = '';

        if (apiModel.toLowerCase().includes('gemini')) {
             try {
                const geminiModel = genAI.getGenerativeModel({ model: apiModel });
                const result = await geminiModel.generateContent(`${systemPrompt}\n\n${userMessage}`);
                const response = await result.response;
                content = response.text();
            } catch (geminiError) {
                console.error("Gemini API Error:", geminiError);
                return res.status(500).json({ error: "Gemini Modify failed", details: geminiError.message });
            }
        } else {
            const message = await anthropic.messages.create({
                model: apiModel,
                max_tokens: 8000,
                system: systemPrompt,
                messages: [
                    { role: "user", content: userMessage }
                ]
            });
            content = message.content[0].text;
        }

        let modifiedArticles = [];
        try {
            modifiedArticles = extractJSON(content);
        } catch (e) {
            console.error("Failed to parse AI JSON response:", content);
            return res.status(500).json({ error: "Failed to parse AI response" });
        }

        console.log(`Successfully modified ${modifiedArticles.length} articles.`);

        res.json({
            success: true,
            articles: modifiedArticles
        });

    } catch (error) {
        console.error('Error modifying articles:', error);
        res.status(500).json({ error: 'Failed to modify articles' });
    }
});

// POST /api/articles/summarize - Generate Summaries (supports Anthropic or Gemini)
router.post('/summarize', async (req, res) => {
    try {
        const { prompt, useRules, summaryRules, category, model, articles } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }
        if (!Array.isArray(articles) || articles.length === 0) {
            return res.status(400).json({ error: 'Articles are required for category summary generation' });
        }

        const useGemini = (model && String(model).toLowerCase().includes('gemini')) || (!process.env.ANTHROPIC_API_KEY && (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY));
        const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
        const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

        if (useGemini && !hasGemini) {
            return res.status(503).json({ error: 'GEMINI_API_KEY not configured. Add it in .env or use Claude (ANTHROPIC_API_KEY).' });
        }
        if (!useGemini && !hasAnthropic) {
            return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured. Add it in .env or use Gemini (GEMINI_API_KEY).' });
        }

        console.log(`Generating summaries for ${category} with rules: ${useRules} (${useGemini ? 'Gemini' : 'Claude'})`);

        let systemPrompt = `You are a professional newsletter editor. Create a newsletter-ready summary for the provided category articles only.

Write exactly 6 to 7 short lines total.
Each line should be concise, natural, and publication-ready.
Only use the fetched article content and article metadata provided by the user.
Do not use outside knowledge.
Do not mention URLs in the output.
Focus on the most important developments across the provided articles for the selected category.
If some links could not be accessed, briefly note that in one short line.`;

        if (useRules && summaryRules && summaryRules.trim()) {
            systemPrompt += `\n\nHere are the specific rules you MUST follow:\n${summaryRules}`;
        } else if (useRules) {
            try {
                const fs = require('fs');
                const path = require('path');
                const rulesPath = path.join(__dirname, '../newsletter_summary_rules.md');
                if (fs.existsSync(rulesPath)) {
                    const rules = fs.readFileSync(rulesPath, 'utf8');
                    systemPrompt += `\n\nHere are the specific rules you MUST follow:\n${rules}`;
                }
            } catch (err) {
                console.error('Failed to read rules file:', err);
            }
        }

        const articleInputs = articles.map(a => ({
            title: a.title || '',
            url: a.url || '',
            date: a.date || '',
            description: a.description || ''
        }));

        const fetchedArticles = await Promise.all(articleInputs.map(async (article) => {
            const inspected = await verifyAndAnalyzeUrl(article.url);
            return {
                ...article,
                accessible: !!inspected.isValid,
                readable: !!inspected.isReadable,
                content: inspected.content || ''
            };
        }));

        const articlePayload = fetchedArticles.map((article, index) => ({
            index: index + 1,
            title: article.title,
            url: article.url,
            date: article.date,
            description: article.description,
            accessible: article.accessible,
            readable: article.readable,
            content: article.content ? article.content.substring(0, 6000) : ''
        }));

        const userMessage = [
            `Category: ${category}`,
            'User prompt:',
            prompt,
            '',
            'Fetched articles:',
            JSON.stringify(articlePayload, null, 2)
        ].join('\n');

        let content = '';
        if (useGemini) {
            const geminiModel = genAI.getGenerativeModel({ model: getApiModelId(model || 'gemini-flash-3-0') });
            const fullPrompt = `${systemPrompt}\n\nUser content to summarize:\n\n${userMessage}`;
            const result = await geminiModel.generateContent(fullPrompt);
            content = result.response.text();
        } else {
            const message = await anthropic.messages.create({
                model: getApiModelId(model || 'claude-opus-4-6'),
                max_tokens: 4000,
                system: systemPrompt,
                messages: [
                    { role: "user", content: userMessage }
                ]
            });
            content = message.content[0].text;
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
            normalized[category] = items.slice(0, 3).map((article, index) => ({
                index: index + 1,
                title: article.title || '',
                url: article.url || '',
                date: article.date || '',
                description: article.description || ''
            }));
        });

        const systemPrompt = `You are an expert email copywriter for newsletter subject lines.

Generate one short, highly clickable email subject for each category: MED, THC, CBD, INV.
Use only the provided articles.
Use suitable emojis as separators between the main hooks.
Keep each subject on a single line.
Make each subject concise and compelling.
If the same article or same core story appears in multiple categories, use the same wording and emoji treatment for that repeated idea.
Return only valid JSON with keys MED, THC, CBD, INV.`;

        const userMessage = [
            'User instructions:',
            String(prompt).trim(),
            '',
            'Category articles:',
            JSON.stringify(normalized, null, 2)
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
                INV: String(subjects.INV || '').trim()
            }
        });
    } catch (error) {
        console.error('Error generating subjects:', error);
        res.status(500).json({ error: 'Failed to generate subjects', details: error.message });
    }
});

module.exports = router;
