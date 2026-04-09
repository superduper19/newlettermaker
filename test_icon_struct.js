require('dotenv').config();
const API_KEY = process.env.FREEPIK_API_KEY;

async function test() {
    if (typeof fetch === 'undefined') global.fetch = (await import('node-fetch')).default;

    console.log('--- Inspecting Icon Structure ---');
    const url = `https://api.freepik.com/v1/icons?locale=en-US&limit=1&term=cannabis`;
    const res = await fetch(url, { headers: { 'X-Freepik-API-Key': API_KEY } });
    const data = await res.json();
    console.log(JSON.stringify(data.data[0], null, 2));
}

test();
