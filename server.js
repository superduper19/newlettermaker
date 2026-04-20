import express, { json, static as static2, urlencoded } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { join } from 'node:path';
import articlesRoutes from './routes/articles.js';
import imagesRoutes from './routes/images.js';
import stateRoutes from './routes/state.js';
import newslettersRoutes from './routes/newsletters.js';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 5020;

// Middleware
app.use(cors());
app.use(json({ limit: '50mb' }));
app.use(urlencoded({ extended: true, limit: '50mb' }));
app.use(static2(join(import.meta.dirname, 'public')));

// Use Routes
app.use('/api/articles', articlesRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/state', stateRoutes);
app.use('/api/newsletters', newslettersRoutes);

// Basic Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


// Temporary migration endpoint — remove old articles and mark unverified as Maybe
app.get('/api/migrate-weeks', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>Week Migration</title>
<style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:20px}
.removed{color:#c00}.kept{color:#080}.maybe{color:#e90}.info{color:#555}
h2{margin-top:30px}</style></head><body>
<h1>Article Cleanup</h1>
<div id="log"></div>
<script>
const log = document.getElementById('log');
function addLog(msg, cls) {
    const p = document.createElement('p');
    p.className = cls || 'info';
    p.innerHTML = msg;
    log.appendChild(p);
}

const oldArticleUrls = [
    'https://www.camp-sci.com/post/psilocybin-news',
    'https://norml.org/',
    'https://www.spotlightpa.org/news/2026/02/cannabis-marijuana-recreational-legalization-pennsylvania-shapiro-legislature-capitol/',
    'https://www.sciencefriday.com/segments/psilocybin-therapy-industry-clinical-trials/'
];

const correctedDates = {
    'https://www.camp-sci.com/post/psilocybin-news': '02/12/26',
    'https://norml.org/': '02/20/26',
    'https://www.spotlightpa.org/news/2026/02/cannabis-marijuana-recreational-legalization-pennsylvania-shapiro-legislature-capitol/': '02/09/26',
    'https://www.sciencefriday.com/segments/psilocybin-therapy-industry-clinical-trials/': '02/17/26',
    'https://arizonadailyindependent.com/2026/02/27/arizona-confronts-a-new-reality-in-the-opioid-crisis/': '02/28/26',
    'https://www.pharmavoice.com/news/fda-rfk-makary-compass-psilocybin-drug-approval/812697/': '02/23/26'
};

const unverifiableUrls = [
    'https://myhealthyusa.org/blogs/news/ahaa-weekly-policy-report-february-25-2026',
    'https://www.youtube.com/watch?v=wk7DQom821s&t=5727s',
    'https://www.cannabisbusinesstimes.com/hemp/news/15817315/2026-farm-bill-strives-to-reduce-regulatory-burdens-for-industrial-hemp-producers',
    'https://www.psychiatrictimes.com/view/february-2026-in-review-updates-on-the-psychiatric-treatment-pipeline',
    'https://www.unodc.org/LSS/Announcement/Details/e69b2ff5-5b91-4eea-8e1f-802ca7ad5080',
    'https://www.psychiatrictimes.com/view/research-identifies-key-differences-between-lsd-and-psilocybin',
    'https://www.ksn.com/news/capitol-bureau/kansas-democrats-introduce-new-round-of-marijuana-legalization-bills-but-face-an-uphill-battle/',
    'https://foleyhoag.com/news-and-insights/blogs/cannabis-and-the-law/2026/february/virginia-legislature-advances-competing-bills-to-launch-adult-use-marijuana-sales/',
    'https://prestodoctor.com/content/cannabis-news/supreme-court-marijuana-guns-u-s-v-hemani-2026-guide'
];

function processArticles(articleList, label) {
    const kept = [];
    let removedCount = 0;
    let maybeCount = 0;

    articleList.forEach(a => {
        if (oldArticleUrls.includes(a.url)) {
            removedCount++;
            addLog(
                'REMOVED: <b>' +
                a.title +
                '</b> (actual: ' +
                (correctedDates[a.url] || a.date) +
                ')',
                'removed',
            );
        } else {
            if (correctedDates[a.url]) a.date = correctedDates[a.url];
            if (unverifiableUrls.includes(a.url)) {
                a.status = 'M';
                maybeCount++;
                addLog(
                    'MAYBE: <b>' + a.title + '</b> (date unverifiable, kept for review)',
                    'maybe',
                );
            } else {
                addLog(
                    'VERIFIED: <b>' + a.title + '</b> (' + a.date + ')',
                    'kept',
                );
            }
            kept.push(a);
        }
    });

    addLog(
        label +
        ': removed ' +
        removedCount +
        ', kept ' +
        kept.length +
        ' (' +
        maybeCount +
        ' marked Maybe)',
        'info',
    );
    return kept;
}

try {
    // 1. Update saved sessions
    const sessions = JSON.parse(localStorage.getItem('newsletter_saved_sessions') || '{}');

    // Remove Week 0 if the previous migration created it
    if (sessions['Week 0']) {
        delete sessions['Week 0'];
        addLog('Removed previous "Week 0" session.', 'info');
    }

    if (sessions['Week 1']) {
        addLog(
            '<h2>Saved Session: Week 1 (' + sessions['Week 1'].articles.length + ' articles)</h2>',
            'info',
        );
        sessions['Week 1'].articles =
            processArticles(sessions['Week 1'].articles, 'Week 1 session');
        sessions['Week 1'].savedAt = new Date().toISOString();
        localStorage.setItem('newsletter_saved_sessions', JSON.stringify(sessions));
    } else {
        addLog(
            'No "Week 1" saved session found. Available: ' + Object.keys(sessions).join(', '),
            'info',
        );
    }

    // 2. Update current working articles
    const currentState = JSON.parse(localStorage.getItem('newsletter_articles') || '{}');
    if (currentState.articles && currentState.articles.length > 0) {
        addLog(
            '<h2>Current Workspace (' + currentState.articles.length + ' articles)</h2>',
            'info',
        );
        currentState.articles = processArticles(currentState.articles, 'Workspace');
        localStorage.setItem('newsletter_articles', JSON.stringify(currentState));
    }

    addLog('<h2>Done! Redirecting to app in 5 seconds...</h2>', 'kept');
    setTimeout(() => { window.location.href = '/'; }, 5000);
} catch(e) {
    addLog('ERROR: ' + e.message, 'removed');
}
</script></body></html>`);
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(join(import.meta.dirname, 'public', 'index.html'));
});

// Fallback for SPA routing (if needed later)
// app.get('*', (req, res) => {
//     res.sendFile(join(import.meta.dirname, 'public', 'index.html'));
// });

// For Vercel: export the app so it runs as a serverless function. Do not call listen.
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

export default app;
