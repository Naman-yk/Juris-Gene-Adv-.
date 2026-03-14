import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateContentWithRetry(model: GenerativeModel, prompt: string, retries = 3, maxDelay: number = 120000): Promise<string | null> {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error: any) {
            console.warn(`Gemini API Attempt ${i + 1} failed:`, error.message);

            if (error.status === 429 || error.message.includes("429")) {
                if (i === retries - 1) throw error; // Throw on last attempt

                // Extract retry delay from error if possible, or use default exponential backoff
                let waitTime = 5000 * Math.pow(2, i); // Exponential backoff: 5s, 10s, 20s...

                // Try to parse wait time from error message
                const match = error.message?.match(/retry in ([0-9.]+)s/);
                if (match && match[1]) {
                    waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 1000; // Add 1s buffer
                }

                if (waitTime > maxDelay) {
                    console.warn(`Rate limit wait time (${waitTime}ms) exceeds maxDelay (${maxDelay}ms). Aborting retry.`);
                    throw error;
                }

                console.log(`[Free Tier] Rate limit hit. Pausing for ${Math.ceil(waitTime / 1000)}s to let quota reset... (Attempt ${i + 1}/${retries})`);
                await delay(waitTime);
                continue;
            }

            // If not a rate limit error, throw immediately (or maybe retry on 503?)
            if (error.status === 503) {
                if (i === retries - 1) throw error;
                await delay(2000 * (i + 1));
                continue;
            }

            throw error;
        }
    }
    return null;
}
