const https = require('https');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
    console.error("No API Key found!");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        try {
            const data = JSON.parse(body);
            if (data.models) {
                console.log("Available Models:");
                data.models.forEach(m => console.log(`- ${m.name} (${m.displayName})`));
            } else {
                console.log("No models found or error:", data);
            }
        } catch (e) {
            console.error("Error parsing JSON:", e);
            console.log("Body:", body);
        }
    });
}).on('error', (e) => {
    console.error("Request error:", e);
});
