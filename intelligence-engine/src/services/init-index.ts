
import { pc } from "./vector";

export async function ensureIndex(indexName: string) {
    try {
        if (!pc) {
            console.warn("Pinecone not initialized, skipping index check.");
            return;
        }
        const indexList = await pc.listIndexes();
        const existingDefault = indexList.indexes?.find(i => i.name === indexName);

        if (!existingDefault) {
            console.log(`Index ${indexName} not found. Creating...`);
            await pc.createIndex({
                name: indexName,
                dimension: 3072, // Gemini models/gemini-embedding-001 output dimension
                metric: 'cosine',
                spec: {
                    serverless: {
                        cloud: 'aws',
                        region: 'us-east-1'
                    }
                }
            });
            console.log(`Index ${indexName} created.`);
            // Wait a bit for initialization
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
            console.log(`Index ${indexName} already exists.`);
        }
    } catch (error) {
        console.error("Error checking/creating index:", error);
        throw error;
    }
}
