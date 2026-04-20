async function testMockSearch() {
    console.log('Testing Search with "TEST_MOCK_DATA"...');
    try {
        const response = await fetch('http://localhost:5020/api/articles/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: 'TEST_MOCK_DATA',
                newsletterName: 'Test Newsletter',
                model: 'claude-opus-4-6',
            })
        });

        const data = await response.json();

        if (data.success) {
            console.log('✅ Mock Search Successful!');
            console.log(`Found ${data.count} articles.`);
            console.log('Articles:', JSON.stringify(data.articles, null, 2));
        } else {
            console.error('❌ Search Failed:', data.error);
        }

    } catch (error) {
        console.error('❌ Network Error:', error.message);
    }
}

testMockSearch();
