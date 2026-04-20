const http = require('http');

// Simple HTTP Post function
function post(urlStr, data) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(data)),
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        // Reject with the parsed body so we can see the error message
                        const err = new Error(`Status ${res.statusCode}: ${parsed.error || body}`);
                        err.details = parsed;
                        reject(err);
                    }
                } catch (e) {
                    reject(new Error(`Status ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(data));
        req.end();
    });
}

async function test() {
    console.log("Starting API Tests...");

    const models = [
        'claude-opus-4-6',
        'claude-sonnet-4-6',
        'claude-haiku-4-5', // Maps to 20251001 in backend
        'gemini-flash-3-0',
        'gemini-flash-3-1-pro',
    ];

    for (const model of models) {
        console.log(`\nTesting Model: ${model}`);
        try {
            const res = await post('http://localhost:5020/api/articles/search', {
                prompt: "Cannabis news",
                newsletterName: "Test",
                model: model,
                startDate: "2024-01-01",
                endDate: "2024-12-31",
            });
            console.log(`SUCCESS [${model}]: Found ${res.count} articles`);
        } catch (e) {
            console.error(`FAILED [${model}]:`, e.message);
            if (e.details) {
                console.error("Error Details:", JSON.stringify(e.details, null, 2));
            }
        }
    }
}

test();
