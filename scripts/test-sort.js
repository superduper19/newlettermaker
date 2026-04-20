/**
 * Test sort logic: MED, THC, CBD, INV. Run: node scripts/test-sort.js
 */

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
    if (!isNaN(n)) return n;
    const u = s.toUpperCase();
    if (RANK_SORT_ORDER[u] !== undefined) return RANK_SORT_ORDER[u];
    if (u.startsWith('COOL')) return RANK_SORT_ORDER['COOL FINDS'];
    if (u.startsWith('LATER')) return RANK_SORT_ORDER['LATER COOL'];
    return 999;
}

function getRankForSort(article, cat) {
    if (!article.ranks) {
        if (article.categories && article.categories.includes(cat)) return 'Y';
        return '';
    }
    let r = article.ranks[cat] ?? article.ranks[cat.toLowerCase()] ?? '';
    if (!r && article.categories && article.categories.includes(cat)) r = 'Y';
    return r;
}

const ORDER = ['MED', 'THC', 'CBD', 'INV'];

function sortCompare(a, b) {
    for (const cat of ORDER) {
        const rA = rankToSortValue(getRankForSort(a, cat));
        const rB = rankToSortValue(getRankForSort(b, cat));
        if (rA !== rB) return rA - rB;
    }
    return (a.title || '').localeCompare(b.title || '');
}

// Test 1: CBD must determine order when MED and THC are equal
const byCbd = [
    { title: 'First', ranks: { MED: 'Y', THC: 'Y', CBD: '3', INV: 'Y' } },
    { title: 'Second', ranks: { MED: 'Y', THC: 'Y', CBD: '1', INV: 'Y' } },
    { title: 'Third', ranks: { MED: 'Y', THC: 'Y', CBD: 'Y', INV: 'Y' } },
];
byCbd.sort(sortCompare);
const cbdOrder = byCbd.map(a => a.title + '(CBD=' + (a.ranks && a.ranks.CBD) + ')').join(', ');
console.log('Test CBD (same MED,THC; different CBD 3,1,Y):', cbdOrder);
const cbdOk =
    byCbd[0].ranks.CBD === '1' && byCbd[1].ranks.CBD === '3' && byCbd[2].ranks.CBD === 'Y';
console.log(cbdOk ? '  PASS' : '  FAIL');

// Test 2: INV must determine order when MED, THC, CBD equal
const byInv = [
    { title: 'A', ranks: { MED: 'Y', THC: 'Y', CBD: 'Y', INV: '2' } },
    { title: 'B', ranks: { MED: 'Y', THC: 'Y', CBD: 'Y', INV: '' } },
    { title: 'C', ranks: { MED: 'Y', THC: 'Y', CBD: 'Y', INV: '1' } },
];
byInv.sort(sortCompare);
const invOrder =
    byInv.map(a => a.title + '(INV=' + (a.ranks && a.ranks.INV || '') + ')').join(', ');
console.log('Test INV (same MED,THC,CBD; different INV 2,empty,1):', invOrder);
const invOk =
    (byInv[0].ranks.INV === '1') && (byInv[1].ranks.INV === '2') && (byInv[2].ranks.INV === '');
console.log(invOk ? '  PASS' : '  FAIL');

// Test 3: Full multi-key
const full = [
    { title: 'Z', ranks: { MED: 'Y', THC: 'Y', CBD: 'Y', INV: 'Y' } },
    { title: 'A', ranks: { MED: '1', THC: '1', CBD: '1', INV: '1' } },
    { title: 'M', ranks: { MED: 'Y', THC: 'Y', CBD: '2', INV: 'Y' } },
];
full.sort(sortCompare);
console.log(
    'Test full order:',
    full.map(a => `${a.title}(MED=${a.ranks.MED} CBD=${a.ranks.CBD})`).join(', '),
);
const fullOk = full[0].title === 'A' && full[1].ranks.CBD === '2' && full[2].ranks.CBD === 'Y';
console.log(fullOk ? '  PASS' : '  FAIL');

// Test 4: THC sorts like MED/CBD/INV (numbers first, then Y)
const byThc = [
    { title: 'T1', ranks: { THC: 'Y' } },
    { title: 'T2', ranks: { THC: '2' } },
    { title: 'T3', ranks: { THC: '1' } },
];
byThc.sort((a, b) =>
    rankToSortValue(getRankForSort(a, 'THC')) - rankToSortValue(getRankForSort(b, 'THC'))
        || (a.title || '').localeCompare(b.title || ''),
);
const thcOrder = byThc.map(a => 'THC=' + (a.ranks && a.ranks.THC)).join(', ');
console.log('Test THC (2, 1, Y):', thcOrder);
const thcOk =
    (byThc[0].ranks.THC === '1') && (byThc[1].ranks.THC === '2') && (byThc[2].ranks.THC === 'Y');
console.log(thcOk ? '  PASS' : '  FAIL');

console.log('\nDone.');
