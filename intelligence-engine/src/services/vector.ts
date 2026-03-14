import { Pinecone, type PineconeRecord } from "@pinecone-database/pinecone";

export let pc: Pinecone | null = null;
const pineconeKey = process.env.PINECONE_API_KEY;
if (pineconeKey) {
  pc = new Pinecone({ apiKey: pineconeKey });
} else {
  console.warn("WARNING: PINECONE_API_KEY not set. Vector operations will not work.");
}

export type InputVector = PineconeRecord;

// ----------------------- UPSERT -----------------------
export async function upsertVectors(
  indexName: string,
  vectors: InputVector[]
) {
  if (!pc) throw new Error('Pinecone not initialized (missing API key)');
  const index = pc.index(indexName);

  await index.upsert(vectors); // correct for serverless
}

// ----------------------- QUERY -----------------------
export async function queryVectors(
  indexName: string,
  vector: number[],
  topK = 5
) {
  if (!pc) throw new Error('Pinecone not initialized (missing API key)');
  const index = pc.index(indexName);

  const result = await index.query({
    vector,
    topK,
    includeMetadata: true,
  });

  return result.matches ?? [];
}
