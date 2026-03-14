/**
 * SHA-256 Hashing for JurisGenie
 *
 * Implements the deterministic hashing algorithm specified in Phase B:
 * 1. Canonicalize the object
 * 2. UTF-8 encode the canonical JSON
 * 3. SHA-256 hash the bytes
 * 4. Return lowercase hex string (64 characters)
 *
 * This is used for:
 * - Contract identity (Contract.hash)
 * - Hash chains (Contract.previous_hash)
 * - Result tamper detection (EvaluationResult.result_hash, ExecutionResult.execution_hash)
 * - Blockchain anchor hashes
 */

import { createHash } from 'crypto';
import { canonicalize } from './serialization';

/**
 * Computes the SHA-256 hash of an object using canonical serialization.
 *
 * @param obj - Any JSON-serializable object. The "hash" field is automatically
 *              excluded from computation (to avoid circular dependency).
 * @returns A 64-character lowercase hexadecimal SHA-256 digest.
 */
export function computeHash(obj: unknown): string {
    const canonical = canonicalize(obj);
    const hash = createHash('sha256');
    hash.update(canonical, 'utf8');
    return hash.digest('hex');
}

/**
 * Verifies that a hash matches the canonical serialization of an object.
 *
 * @param obj - The object to verify (must contain a "hash" field)
 * @param expectedHash - The hash to verify against
 * @returns true if the computed hash matches the expected hash
 */
export function verifyHash(obj: unknown, expectedHash: string): boolean {
    const computed = computeHash(obj);
    return computed === expectedHash;
}

/**
 * Validates that a string is a valid SHA-256 hex digest.
 *
 * @param hash - The string to validate
 * @returns true if the string is a 64-character lowercase hex string
 */
export function isValidSHA256(hash: string): boolean {
    return /^[0-9a-f]{64}$/.test(hash);
}
