import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" });

// Queue for batch processing
let pendingEmbeddings: { text: string; resolve: (value: number[]) => void; reject: (reason?: any) => void }[] = [];
let batchProcessing = false;

// Optimization for "Very Very Fast" Speed:
// 1. Aggressive Batch (25 items) -> Only ~4 requests for a large file.
// 2. Minimal Throttle (1s) -> Fast processing as long as total requests < 15.
const BATCH_SIZE = 25;
const RATE_LIMIT_DELAY = 1000;

export function generateEmbedding(text: string): Promise<number[]> {
    return new Promise((resolve, reject) => {
        pendingEmbeddings.push({ text, resolve, reject });
        processBatchQueue();
    });
}

async function processBatchQueue() {
    if (batchProcessing || pendingEmbeddings.length === 0) return;

    batchProcessing = true;

    // Wait for rate limit delay
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

    // Peek at the batch without removing yet, in case we need to retry
    const batch = pendingEmbeddings.slice(0, BATCH_SIZE);

    try {
        const remaining = pendingEmbeddings.length - batch.length + 1;
        console.log(`[Embedding] Processing batch of ${batch.length} items... (~${Math.ceil(remaining / BATCH_SIZE) * (RATE_LIMIT_DELAY / 1000)}s remaining)`);

        const requests = batch.map(item => ({
            content: { role: "user", parts: [{ text: item.text }] },
            taskType: TaskType.RETRIEVAL_DOCUMENT
        }));

        const result = await model.batchEmbedContents({ requests });

        if (result.embeddings) {
            // Success! Remove from queue and resolve
            pendingEmbeddings.splice(0, BATCH_SIZE);
            result.embeddings.forEach((emb, index) => {
                if (batch[index]) {
                    batch[index].resolve(emb.values);
                }
            });
        } else {
            throw new Error("No embeddings returned in batch response");
        }

    } catch (error: any) {
        if (error.status === 429 || error.message?.includes("429")) {
            console.warn(`[Rate Limit] Hit 429. Pausing for 10s (Adaptive) before retrying...`);
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s (Shorter pause)
            // Retry same batch
        } else {
            console.error("Batch embedding error:", error.message);
            // Fatal error, fail this batch
            pendingEmbeddings.splice(0, BATCH_SIZE);
            batch.forEach(item => item.reject(error));
        }
    } finally {
        batchProcessing = false;
        if (pendingEmbeddings.length > 0) {
            processBatchQueue();
        }
    }
}