require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const modelsToTest = [
    'claude-opus-4-6',
    'claude-sonnet-4-6',
    'claude-haiku-4-5-20251001',
    'claude-3-opus-20240229', // Control
    'claude-3-5-sonnet-20240620', // Control
];

async function testModel(modelId) {
    console.log(`\nTesting model: ${modelId}`);
    try {
        const message = await anthropic.messages.create({
            model: modelId,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hello' }]
        });
        console.log(`SUCCESS: ${modelId} returned response: ${message.content[0].text.trim()}`);
    } catch (error) {
        console.error(`FAILED: ${modelId} error:`, error.message);
        if (error.status === 404 || (error.error && error.error.type === 'not_found_error')) {
            console.error('>>> DIAGNOSIS: 404 Not Found. API Key may not have access, or model ID is invalid.');
        }
    }
}

async function runTests() {
    console.log('Starting Anthropic Model Access Test (User Provided IDs)...');
    for (const model of modelsToTest) {
        await testModel(model);
    }
    console.log('\nTest Complete.');
}

runTests();
