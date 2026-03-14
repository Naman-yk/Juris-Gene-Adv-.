/**
 * Idempotency Enforcement Middleware
 *
 * Maintains an in-memory request_id → ExecutionResult cache.
 * If the same request_id is seen again, returns the cached result
 * without re-executing. This prevents double-execution from retries.
 *
 * Thread-safe via synchronous Map operations (single-threaded JS).
 */

import { ExecutionResult, ExecutionRequest } from '@jurisgenie/core';

export class IdempotencyStore {
    private readonly cache = new Map<string, ExecutionResult>();
    private readonly maxSize: number;

    constructor(maxSize = 10_000) {
        this.maxSize = maxSize;
    }

    /**
     * Checks if a request_id has already been processed.
     *
     * @param requestId - The request ID to check
     * @returns The cached result, or undefined if not seen before
     */
    get(requestId: string): ExecutionResult | undefined {
        return this.cache.get(requestId);
    }

    /**
     * Stores a result for a request_id.
     * Evicts oldest entry if cache is full (FIFO).
     *
     * @param requestId - The request ID
     * @param result - The execution result to cache
     */
    set(requestId: string, result: ExecutionResult): void {
        if (this.cache.size >= this.maxSize) {
            // Evict oldest (first inserted)
            const oldest = this.cache.keys().next().value;
            if (oldest !== undefined) {
                this.cache.delete(oldest);
            }
        }
        this.cache.set(requestId, result);
    }

    /**
     * Checks if a request_id exists in the cache.
     */
    has(requestId: string): boolean {
        return this.cache.has(requestId);
    }

    /**
     * Returns the number of cached results.
     */
    get size(): number {
        return this.cache.size;
    }

    /**
     * Clears all cached results.
     */
    clear(): void {
        this.cache.clear();
    }
}

/**
 * Wraps an execution function with idempotency enforcement.
 * If the request_id was already processed, returns the cached result.
 *
 * @param store - The idempotency store
 * @param request - The execution request
 * @param executeFn - The actual execution function
 * @returns The execution result (cached or fresh)
 */
export function withIdempotency(
    store: IdempotencyStore,
    request: ExecutionRequest,
    executeFn: (req: ExecutionRequest) => ExecutionResult,
): ExecutionResult {
    const requestId = request.context.request_id;

    // Check cache
    const cached = store.get(requestId);
    if (cached) {
        return cached;
    }

    // Execute and cache
    const result = executeFn(request);
    store.set(requestId, result);
    return result;
}
