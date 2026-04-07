async function testSearch() {
    console.log('Starting search test...');
    try {
        const response = await fetch('http://localhost:5020/api/articles/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: 'Find 3 recent articles about marijuana rescheduling. Return real URLs.',
                model: 'claude-opus-4-6',
                newsletterName: 'Test Newsletter',
            })
        });

        console.log('Search Status:', response.status);
        const data = await response.json();

        if (data.articles && data.articles.length === 0) {
            console.log('WARNING: Zero articles returned.');
        } else {
            console.log(`SUCCESS: Found ${data.articles.length} articles.`);
            data.articles.forEach((a, i) => {
                console.log(`[${i + 1}] ${a.title} (${a.url}) - Status: ${a.isValid ? 'Valid' : 'Invalid'}`);
                if (a.paywall) console.log('   -> Paywall detected');
                if (a.categories) console.log('   -> Categories:', a.categories.join(', '));
            });
        }

    } catch (error) {
        console.error('Search Failed:', error.message);
    }
}

testSearch();
