require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

async function listModels() {
    try {
        // The SDK doesn't have a direct listModels method on the client instance easily accessible in all versions,
        // but let's try a simple generation with 'gemini-pro' which is usually standard.
        // Actually, the error message suggested calling ListModels.
        // We can try to infer from a simple test script if we can't list.

        // Let's try to just hit the API directly for listing if SDK fails, but let's try a known model first.
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("gemini-pro works:", result.response.text());
    } catch (e) {
        console.log("gemini-pro failed:", e.message);
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const result = await model.generateContent("Hello");
        console.log("gemini-1.5-flash-latest works:", result.response.text());
    } catch (e) {
        console.log("gemini-1.5-flash-latest failed:", e.message);
    }
}

listModels();
