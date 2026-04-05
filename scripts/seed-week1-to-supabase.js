/**
 * Seed Week 1 articles (with images) into Supabase.
 * Run: node scripts/seed-week1-to-supabase.js
 * Requires: .env with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Create table first: run the SQL in supabase/schema.sql in Supabase SQL Editor.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Must be the key/value table (see supabase/schema.sql), not newsletter_articles
const TABLE = 'newsletter_state';

const ARTICLES = [
  {
    id: 1,
    title: 'Hemp THC Ban Delay Hits Roadblock in Congress',
    url: 'https://www.marijuanamoment.net/amendment-to-delay-hemp-thc-ban-wont-get-a-vote-at-farm-bill-hearing-key-gop-congressional-committee-chair-signals/',
    description: "House Agriculture Committee Chairman Glenn Thompson said an amendment to delay the federal recriminalization of hemp THC products is not germane to the Farm Bill. Missouri advanced psychedelics bills, and Pennsylvania's cannabis legalization proposal is projected to generate nearly half a billion in annual revenue by 2028.",
    date: '02/27/26',
    categories: ['CBD', 'INV', 'THC'],
    ranks: { CBD: 'Y', INV: 'Y', THC: 'Y' },
    notes: '',
    paywall: false,
    image: 'https://cdn-icons-png.freepik.com/128/16661/16661914.png',
    isValid: true,
    status: 'Y',
    selected: true,
    imageSearchQuery: 'Hemp Delay'
  },
  {
    id: 2,
    title: 'ACLU Previews Cannabis & Guns Arguments for Supreme Court',
    url: 'https://www.marijuanamoment.net/aclu-previews-cannabis-guns-arguments-for-supreme-court-newsletter-february-26-2026/',
    description: "Trump's surgeon general nominee Casey Means discussed her personal psilocybin use and support for psychedelic research. The ACLU previewed arguments for an upcoming Supreme Court case involving cannabis and firearms rights.",
    date: '02/26/26',
    categories: ['INV', 'MED'],
    ranks: { INV: 'Y', MED: 'Y' },
    notes: '',
    paywall: false,
    image: '/uploads/upload-1772320410170.jpg',
    isValid: true,
    status: 'Y',
    selected: true,
    imageSearchQuery: 'ACLU'
  },
  {
    id: 3,
    title: 'Congress Will Consider Hemp THC Product Ban Delay Next Week',
    url: 'https://www.marijuanamoment.net/congress-will-consider-hemp-thc-product-ban-delay-next-week-newsletter-february-25-2026',
    description: 'The House Agriculture Committee is set to consider an amendment to delay the federal recriminalization of hemp THC products by one year during a Farm Bill markup. Virginia advanced its recreational cannabis sales bill and Florida approved reduced medical cannabis fees for veterans.',
    date: '02/25/26',
    categories: [],
    ranks: {},
    notes: '',
    paywall: false,
    image: 'https://cdn-icons-png.freepik.com/128/1364/1364040.png',
    isValid: true,
    status: 'NO',
    selected: true,
    imageSearchQuery: 'Congress flat'
  },
  {
    id: 4,
    title: 'Many Hemp Intoxicants Contain THC, Synthetic Cannabinoids',
    url: 'https://norml.org/news/2026/02/26/analysis-many-unregulated-hemp-derived-intoxicants-contain-thc-synthetic-cannabinoids',
    description: 'A Milwaukee Journal Sentinel analysis of 30 unregulated hemp products found most contained THC levels exceeding federal limits, half tested positive for lab-produced cannabinoids, and over a third contained mold and pesticides.',
    date: '02/26/26',
    categories: ['THC', 'CBD', 'MED'],
    ranks: { THC: 'Y', CBD: 'Y', MED: 'Y' },
    notes: '',
    paywall: false,
    image: 'https://cdn-icons-png.freepik.com/128/13697/13697155.png',
    isValid: true,
    status: 'Y',
    selected: true,
    imageSearchQuery: 'question'
  },
  {
    id: 8,
    title: 'Outside/In: Reefer Madness and the Future of Hemp',
    url: 'https://www.nhpr.org/environment/2026-02-28/outside-in-reefer-madness-and-the-future-of-hemp',
    description: 'New Hampshire Public Radio explores the history and future of hemp in America, from its colonial-era roots to its modern 25,000 potential uses and current regulatory challenges.',
    date: '02/28/26',
    categories: ['THC', 'CBD', 'INV', 'MED'],
    ranks: { THC: 'YM', CBD: 'YM', INV: 'YM', MED: 'Y' },
    notes: '',
    paywall: false,
    image: null,
    isValid: true,
    status: 'COOL FINDS',
    selected: true,
    imageSearchQuery: 'Reefer madness flatness'
  },
  {
    id: 9,
    title: 'February 2026 Hemp Spot Price Index Report',
    url: 'https://www.hempbenchmarks.com/hemp-market-insider/february-2026-hemp-spot-price-index-report/',
    description: 'February brought minimal wholesale hemp price movement, with THCa smokable flower rebounding 4.2% per pound. A major shift in transport costs saw shipping rates drop 30-60% for most major lanes.',
    date: '02/25/26',
    categories: ['CBD'],
    ranks: { CBD: 'Y' },
    notes: '',
    paywall: false,
    image: null,
    isValid: true,
    status: 'Y',
    selected: true,
    imageSearchQuery: 'February 2026'
  }
];

const defaultContent = { MED: { intro: '', outro: '' }, THC: { intro: '', outro: '' }, CBD: { intro: '', outro: '' }, INV: { intro: '', outro: '' } };

async function seedWeek1() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL and one of SUPABASE_SECRET_KEY, SUPABASE_PUBLISHABLE_KEY, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY in .env');
  }

  const supabase = createClient(url, key);
  let articles = [...ARTICLES];

  // If local upload file exists, optionally upload to Supabase Storage and replace URL
  const uploadsDir = path.join(__dirname, '/tmp/uploads');
  const localPath = path.join(uploadsDir, 'upload-1772320410170.jpg');
  if (fs.existsSync(localPath)) {
    try {
      const bucket = 'newsletter-images';
      const fileName = `week1-article-2-${Date.now()}.jpg`;
      const buf = fs.readFileSync(localPath);
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(fileName, buf, { contentType: 'image/jpeg', upsert: true });
      if (!uploadErr && uploadData) {
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
        const publicUrl = urlData?.publicUrl;
        if (publicUrl) {
          const art = articles.find(a => a.id === 2);
          if (art) art.image = publicUrl;
          console.log('Uploaded local image to Supabase Storage:', publicUrl);
        }
      } else {
        console.warn('Storage upload skipped (bucket may not exist):', uploadErr?.message || '');
      }
    } catch (e) {
      console.warn('Storage upload skipped:', e.message);
    }
  } else {
    console.log('Local file upload-1772320410170.jpg not found; keeping /uploads/ URL.');
  }

  const workspace = {
    articles,
    archivedArticles: [],
    inspirationalImages: [],
    newsletterContent: defaultContent
  };

  const sessions = {
    'Week 1': {
      articles: [...articles],
      archivedArticles: [],
      inspirationalImages: [],
      newsletterContent: defaultContent,
      savedAt: new Date().toISOString()
    }
  };

  const now = new Date().toISOString();

  try {
    const { error: e1 } = await supabase.from(TABLE).upsert(
      [{ key: 'workspace', value: workspace, updated_at: now }],
      { onConflict: 'key' }
    );
    if (e1) {
      throw new Error('Table may not exist. Run the SQL in supabase/schema.sql in Supabase → SQL Editor. ' + e1.message);
    }
    console.log('Upserted workspace (' + articles.length + ' articles).');

    const { error: e2 } = await supabase.from(TABLE).upsert(
      [{ key: 'sessions', value: sessions, updated_at: now }],
      { onConflict: 'key' }
    );
    if (e2) throw new Error('Error upserting sessions: ' + e2.message);
    console.log('Upserted sessions (Week 1).');
    console.log('Done. Reload the app or load "Week 1" from the dropdown to see the data.');
  } catch (e) {
    throw e;
  }
}

module.exports = { seedWeek1 };

if (require.main === module) {
  seedWeek1().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}
