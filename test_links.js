// Remove require since Node 22 has global fetch
// const fetch = require('node-fetch');

async function testLinks() {
    console.log('Testing Article Search and Verification...');
    const url = 'http://localhost:5020/api/articles/search';
    const body = {
        prompt: 'marijuana rescheduling DEA',
        newsletterName: 'Test Newsletter',
        model: 'claude-3-haiku-20240307', // Using a fast model for testing
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        console.log(`Success! Found ${data.count} articles.`);

        if (data.articles && data.articles.length > 0) {
            console.log('First article:');
            const first = data.articles[0];
            console.log(`- Title: ${first.title}`);
            console.log(`- URL: ${first.url}`);
            console.log(`- Content Length: ${first.content ? first.content.length : 'N/A'}`);
            console.log(`- Categories: ${first.categories.join(', ')}`);

            // Verify URL manually again just to be sure
            console.log(`Verifying URL ${first.url}...`);
            const verifyRes = await fetch(first.url, { method: 'HEAD' });
            console.log(`URL Status: ${verifyRes.status}`);
        } else {
            console.log('No articles found.');
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testLinks();
