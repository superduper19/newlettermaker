/**
 * Test script for publish-to-purablis endpoint.
 * Run: node scripts/test-publish-image.js [url]
 * Example: node scripts/test-publish-image.js https://cdn-icons-png.flaticon.com/128/1234/1234567.png
 * Or: node scripts/test-publish-image.js /uploads/upload-1234567890.png (if file exists)
 */
require('dotenv').config();
const http = require('http');

const url = process.argv[2] || 'https://cdn-icons-png.flaticon.com/128/1/1234.png';
const port = process.env.PORT || 5020;

const body = JSON.stringify({ url });
const req = http.request({
    hostname: 'localhost',
    port,
    path: '/api/images/publish-to-purablis',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
    },
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Status:', res.statusCode);
            console.log('Response:', JSON.stringify(json, null, 2));
            if (json.success && json.url) {
                console.log('\n✓ Published successfully. URL:', json.url);
            } else if (json.error) {
                console.log('\n✗ Error:', json.error);
            }
        } catch (e) {
            console.log('Raw:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('Request failed:', e.message);
    console.log('Make sure the server is running: node server.js');
});

req.write(body);
req.end();
