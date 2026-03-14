import { Redis } from "@upstash/redis";

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "https://example.com",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "example",
});

export async function getCachedAnswer(query: string) {
    if (!process.env.UPSTASH_REDIS_REST_URL) return null;
    try {
        const cached = await redis.get(query);
        if (!cached) return null;
        return typeof cached === 'string' ? JSON.parse(cached) : cached;
    } catch (e) {
        console.warn("Cache error:", e);
        return null;
    }
}

export async function cacheAnswer(query: string, data: any) {
    if (!process.env.UPSTASH_REDIS_REST_URL) return;
    try {
        await redis.set(query, JSON.stringify(data), { ex: 60 * 60 * 24 });
    } catch (e) {
        console.warn("Cache set error:", e);
    }
}