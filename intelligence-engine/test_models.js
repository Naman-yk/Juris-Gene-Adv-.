
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy init
        // Access the model list via the API directly if SDK helper is missing, 
        // but newer SDKs expose it via the client or we can try-catch a request.

        // Actually, let's just use the `listModels` method if available, or infer from error.
        // The previous error message "Call ListModels to see the list" suggests it's an option?
        // Not directly on the instance usually.

        // Let's try to just run a simple prompt on likely candidates.
        const candidates = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-001",
            "gemini-1.5-flash-latest",
            "gemini-pro",
            "gemini-1.0-pro"
        ];

        console.log("Testing Models...");
        for (const modelName of candidates) {
            try {
                const m = genAI.getGenerativeModel({ model: modelName });
                const result = await m.generateContent("Hello");
                console.log(`✅ ${modelName} is AVAILABLE.`);
            } catch (e) {
                console.log(`❌ ${modelName} Failed: ${e.message}`);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
