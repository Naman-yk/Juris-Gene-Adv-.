/**
 * Replay Attack Prevention
 *
 * Prevents replay attacks by tracking processed request_ids with timestamps.
 * Provides configurable TTL-based expiry for the prevention window.
 *
 * This works alongside the IdempotencyStore (which caches results)
 * but serves a different purpose: security (reject replayed requests)
 * vs. correctness (return cached results).
 */

export interface ReplayEntry {
    readonly requestId: string;
    readonly processedAt: number;  // epoch ms
    readonly eventId: string;
    readonly contractId: string;
}

export class ReplayAttackError extends Error {
    constructor(
        public readonly requestId: string,
        public readonly originalTimestamp: number,
    ) {
        super(`Replay attack detected: request_id "${requestId}" was already processed at ${new Date(originalTimestamp).toISOString()}`);
        this.name = 'ReplayAttackError';
    }
}

export class ReplayGuard {
    private readonly processed = new Map<string, ReplayEntry>();
    private readonly ttlMs: number;

    /**
     * @param ttlMs - Time-to-live for entries in milliseconds (default: 24 hours)
     */
    constructor(ttlMs = 86_400_000) {
        this.ttlMs = ttlMs;
    }

    /**
     * Checks if a request_id has already been processed.
     * If yes, throws ReplayAttackError.
     * If no, records it.
     *
     * @param requestId - The request ID to check
     * @param eventId - The event ID for audit
     * @param contractId - The contract ID for audit
     * @throws ReplayAttackError if request was already processed
     */
    guard(requestId: string, eventId: string, contractId: string): void {
        this.evictExpired();

        const existing = this.processed.get(requestId);
        if (existing) {
            throw new ReplayAttackError(requestId, existing.processedAt);
        }

        this.processed.set(requestId, {
            requestId,
            processedAt: Date.now(),
            eventId,
            contractId,
        });
    }

    /**
     * Checks if a request_id has been processed (without blocking).
     */
    wasProcessed(requestId: string): boolean {
        this.evictExpired();
        return this.processed.has(requestId);
    }

    /**
     * Gets the entry for a processed request.
     */
    getEntry(requestId: string): ReplayEntry | undefined {
        return this.processed.get(requestId);
    }

    /**
     * Returns the number of tracked entries.
     */
    get size(): number {
        return this.processed.size;
    }

    /**
     * Clears all tracked entries.
     */
    clear(): void {
        this.processed.clear();
    }

    /**
     * Evicts expired entries (older than TTL).
     */
    private evictExpired(): void {
        const cutoff = Date.now() - this.ttlMs;
        for (const [key, entry] of this.processed) {
            if (entry.processedAt < cutoff) {
                this.processed.delete(key);
            }
        }
    }
}
