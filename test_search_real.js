(async function testSearch() {
    console.log('Testing Search with "claude-opus-4-6"...');
    try {
        const response = await fetch('http://localhost:5020/api/articles/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: 'recent cannabis rescheduling news',
                newsletterName: 'Test Newsletter',
                model: 'gemini-1.5-pro-latest', // Testing Gemini as alternative
            })
        });

        const data = await response.json();
        if (data.success) {
            console.log('✅ Search Successful!');
            console.log(`Found ${data.count} articles.`);
            if (data.articles.length > 0) {
                console.log('First Article:', data.articles[0]);
            }
        } else {
            console.error('❌ Search Failed:', data.error);
            if (data.details) console.error('Details:', data.details);
        }
    } catch (error) {
        console.error('❌ Network Error:', error.message);
    }
})();
