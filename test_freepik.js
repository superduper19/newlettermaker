require('dotenv').config();

const API_KEY = process.env.FREEPIK_API_KEY;
const QUERY = 'cannabis'; // Use a relevant query

async function testFreepik() {
    console.log('Testing Freepik API...');

    // Check if fetch is available globally
    if (typeof fetch === 'undefined') {
        console.error('Native fetch not found. Using dynamic import...');
        global.fetch = (await import('node-fetch')).default;
    }

    // Test 1: Freepik Vectors
    // The user mentioned "flaticon".
    // Flaticon is mainly for icons.
    // Freepik API has an endpoint for icons: https://api.freepik.com/v1/icons

    console.log('--- Testing Vectors (Freepik) ---');
    const urlVectors = `https://api.freepik.com/v1/resources?locale=en-US&page=1&limit=3&term=${QUERY}&filters[content_type.vector]=1`;
    try {
        const res = await fetch(urlVectors, {
            headers: { 'X-Freepik-API-Key': API_KEY }
        });
        if (!res.ok) console.log('Vector Error:', res.status, await res.text());
        else {
            const data = await res.json();
            console.log(`Found ${data.data.length} vectors.`);
            if (data.data.length > 0) console.log('Sample Vector URL:', data.data[0].image.source.url);
        }
    } catch (e) {
        console.error(e);
    }

    console.log('\n--- Testing Icons (Flaticon) ---');
    const urlIcons = `https://api.freepik.com/v1/icons?locale=en-US&page=1&limit=3&term=${QUERY}`;
    try {
        const res = await fetch(urlIcons, {
            headers: { 'X-Freepik-API-Key': API_KEY }
        });
        if (!res.ok) console.log('Icon Error:', res.status, await res.text());
        else {
            const data = await res.json();
            console.log(`Found ${data.data.length} icons.`);
            // Inspect structure
            if (data.data.length > 0) console.log('Sample Icon:', JSON.stringify(data.data[0].images, null, 2));
        }
    } catch (e) {
        console.error(e);
    }
}

testFreepik();
