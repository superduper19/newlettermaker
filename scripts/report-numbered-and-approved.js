/**
 * From a backup JSON, show:
 * 1. All "numbered" ranks (1, 2, 3, etc.) per newsletter (MED, THC, CBD, INV)
 * 2. How many articles are approved for each newsletter (have that category/rank)
 * Run: node scripts/report-numbered-and-approved.js [path-to-backup.json]
 */

const fs = require('fs');
const path = require('path');

const filepath = process.argv[2] || path.join(__dirname, '..', 'backups', 'state-backup-2026-03-09-0242.json');
if (!fs.existsSync(filepath)) {
    console.error('File not found:', filepath);
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
const categories = ['MED', 'THC', 'CBD', 'INV'];

function getRank(article, cat) {
    if (!article.ranks) return article.categories && article.categories.includes(cat) ? 'Y' : '';
    const r = article.ranks[cat] ?? article.ranks[cat.toLowerCase()] ?? '';
    if (!r && article.categories && article.categories.includes(cat)) return 'Y';
    return r;
}

function isNumericRank(val) {
    if (val === undefined || val === null) return false;
    const s = String(val).trim();
    if (s === '') return false;
    const n = parseInt(s, 10);
    return !isNaN(n) && n > 0;
}

const validStatus = ['Y', 'YM', 'M', 'COOL FINDS', 'LATER COOL'];

function report(label, articles) {
    console.log('\n' + '='.repeat(60));
    console.log(label + ' (' + articles.length + ' articles)');
    console.log('='.repeat(60));

    for (const cat of categories) {
        const numbered = [];
        const approved = [];
        articles.forEach(a => {
            const rank = getRank(a, cat);
            const hasRank = rank !== '' && rank !== undefined;
            if (hasRank && validStatus.includes(a.status)) approved.push(a);
            if (isNumericRank(rank)) numbered.push({
                rank: String(rank).trim(),
                title: a.title || 'Untitled',
                url: a.url,
            });
        });
        numbered.sort((a, b) => parseInt(a.rank, 10) - parseInt(b.rank, 10));

        console.log('\n--- ' + cat + ' ---');
        console.log('Approved for newsletter:', approved.length, 'articles');
        console.log('Numbered (1, 2, 3, ...):');
        if (numbered.length === 0) {
            console.log('  (none)');
        } else {
            numbered.forEach(({
                                  rank,
                                  title,
                              }) => console.log('  ' + rank + '. ' + (title.length > 72 ? title.slice(0, 69) + '...' : title)));
        }
    }
}

// Workspace
const workspaceArticles = data.workspace && data.workspace.articles ? data.workspace.articles : [];
report('WORKSPACE (current)', workspaceArticles);

// Sessions
const sessions = data.sessions || {};
for (const sessionName of Object.keys(sessions).sort()) {
    const session = sessions[sessionName];
    const arts = session && session.articles ? session.articles : [];
    report('SESSION: ' + sessionName, arts);
}

console.log('\nDone.');
