
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
dotenv.config();

async function resetIndex() {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
    const indexName = process.env.PINECONE_INDEX!;

    console.log(`Deleting index: ${indexName}...`);
    try {
        await pc.deleteIndex(indexName);
        console.log(`Index ${indexName} deleted.`);
    } catch (error: any) {
        if (error.message?.includes('not found')) {
            console.log("Index not found, skipping delete.");
        } else {
            console.error("Error deleting index:", error);
        }
    }
}

resetIndex();
