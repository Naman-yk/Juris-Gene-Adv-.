/**
 * Local Search Engine (BM25-style keyword matching)
 * 
 * This replaces the Gemini Embedding API + Pinecone vector search.
 * It stores chunks locally and uses keyword overlap scoring for retrieval.
 * 
 * Benefits:
 * - ZERO API calls during upload (instant indexing)
 * - ZERO rate limits
 * - Still proper RAG (Retrieval Augmented Generation)
 */

import fs from 'fs';
import path from 'path';

interface StoredChunk {
    id: string;
    text: string;
    keywords: string[];
}

const STORE_PATH = path.join(__dirname, '../../uploads/chunks_store.json');

// Tokenize text into keywords (lowercase, remove punctuation, filter short words)
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2);
}

// Save chunks to local JSON file
export function saveChunks(chunks: string[]): void {
    const storedChunks: StoredChunk[] = chunks.map((text, i) => ({
        id: `chunk-${i}`,
        text: text,
        keywords: tokenize(text),
    }));

    fs.writeFileSync(STORE_PATH, JSON.stringify(storedChunks));
    console.log(`Saved ${storedChunks.length} chunks to local store.`);
}

// Search chunks by keyword overlap (BM25-inspired scoring)
export function searchChunks(query: string, topK: number = 5): string[] {
    if (!fs.existsSync(STORE_PATH)) {
        console.warn("No chunk store found.");
        return [];
    }

    const storedChunks: StoredChunk[] = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
    const queryKeywords = tokenize(query);

    // Score each chunk by keyword overlap
    const scored = storedChunks.map(chunk => {
        let score = 0;
        const chunkKeywordSet = new Set(chunk.keywords);

        for (const qWord of queryKeywords) {
            if (chunkKeywordSet.has(qWord)) {
                score += 1;
            }
        }

        // Bonus for keyword density (shorter chunks with more matches rank higher)
        if (chunk.keywords.length > 0) {
            score = score / Math.sqrt(chunk.keywords.length);
        }

        return { text: chunk.text, score };
    });

    // Sort by score descending, return top K
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).filter(s => s.score > 0).map(s => s.text);
}
