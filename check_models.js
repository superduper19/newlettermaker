import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';

config();

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

(async function checkModels() {
    console.log('Fetching available models for your API key...');
    try {
        const models = await anthropic.models.list();
        console.log('\n--- AVAILABLE MODELS ---');
        models.data.forEach(m => console.log(`- ${m.id} (${m.display_name})`));
        console.log('------------------------\n');

        // Specifically check if 'claude-3-opus-20240229' is in the list
        const opus = models.data.find(m => m.id === 'claude-3-opus-20240229');
        if (opus) {
            console.log('✅ Claude 3 Opus IS available.');
        } else {
            console.log('❌ Claude 3 Opus is NOT in your available models list.');
            console.log('This usually means your API key tier does not support it yet.');
        }
    } catch (error) {
        console.error('Error fetching models:', error.message);
        if (error.status === 404) {
            console.log('Note: models.list() might not be available on all keys/endpoints.');
        }
    }
})();
