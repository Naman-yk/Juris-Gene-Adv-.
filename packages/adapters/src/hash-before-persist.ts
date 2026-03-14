/**
 * Hash-Before-Persist Middleware
 *
 * Recomputes execution_hash before any persistence/anchoring step.
 * Rejects if the recomputed hash does not match the result's declared hash.
 * This prevents silent corruption between execute() and persist().
 *
 * PURE FUNCTION — no I/O.
 */

import { ExecutionResult } from '@jurisgenie/core';
import { deepClone, computeHash } from '@jurisgenie/core';

export class HashIntegrityError extends Error {
    constructor(
        public readonly expectedHash: string,
        public readonly computedHash: string,
    ) {
        super(`Hash integrity violation: expected ${expectedHash}, computed ${computedHash}`);
        this.name = 'HashIntegrityError';
    }
}

/**
 * Verifies the integrity of an ExecutionResult by recomputing its hash.
 *
 * @param result - The execution result to verify
 * @returns The verified result (unchanged)
 * @throws HashIntegrityError if hash mismatch detected
 */
export function verifyBeforePersist(result: ExecutionResult): ExecutionResult {
    const hashable = deepClone(result) as unknown as Record<string, unknown>;
    delete hashable['duration_ms'];
    delete hashable['execution_hash'];
    const recomputed = computeHash(hashable);

    if (recomputed !== result.execution_hash) {
        throw new HashIntegrityError(result.execution_hash, recomputed);
    }

    return result;
}
