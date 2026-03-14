
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

// Load .env from project root
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API KEY found in .env");
        process.exit(1);
    }

    console.log("Using API Key ending in:", apiKey.slice(-4));

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // There isn't a direct "response.models" property usually exposed this easily in some SDK versions,
        // but the `getGenerativeModel` is the main entry. 
        // However, the error message clearly said: "Call ListModels to see the list of available models".
        // This implies using the `GoogleGenerativeAI` instance or a manager.
        // In the Node SDK, it's often under the `palyground` or manager, but actually 
        // the current SDK might not expose a simple `listModels` on the main class in all versions.
        // Let's try a direct REST call if SDK fails, but let's try to 'guess' via code first?
        // Actually, checking standard `gemini-pro` might be safer.

        // START DIRECT FETCH IMPLEMENTATION to match what the SDK does internally but allow us to see the list.
        // The SDK wraps this but for debugging a raw fetch is often clearer.
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        console.log("Fetching models from:", url.replace(apiKey, "HIDDEN_KEY"));

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        console.log("Available Models:");
        if (data.models) {
            data.models.forEach((m: any) => {
                console.log(`- ${m.name} (Supported: ${m.supportedGenerationMethods?.join(", ")})`);
            });
        } else {
            console.log("No models found in response:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
