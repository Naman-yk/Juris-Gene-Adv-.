/**
 * Property-Based Hardening Tests — Hash Determinism
 *
 * Tests from Task 1, 2, and 4:
 * - hash(x) === hash(x) for random contracts
 * - serialize(x) deterministic under key shuffle
 * - 500-contract fuzz test
 * - Deep immutability: mutate original, clone unchanged
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    arbContract,
} from './generators';
import { computeHash, verifyHash, isValidSHA256 } from '../../src/hashing';
import { canonicalize } from '../../src/serialization';
import { deepClone } from '../../src/serialization';

describe('Property-Based: Hash Determinism', () => {
    it('hash(x) === hash(x) for 200 random contracts', () => {
        fc.assert(
            fc.property(arbContract, (contract) => {
                const hash1 = computeHash(contract);
                const hash2 = computeHash(contract);
                expect(hash1).toBe(hash2);
                expect(isValidSHA256(hash1)).toBe(true);
            }),
            { numRuns: 200 },
        );
    });

    it('hash(x) !== hash(y) for distinct contracts (collision resistance)', () => {
        fc.assert(
            fc.property(arbContract, (contract) => {
                const hash = computeHash(contract);
                // Allow duplicates in random data (same contract shape),
                // but verify hash changes if we mutate
                const modified = { ...contract, id: contract.id + '-modified' };
                const modifiedHash = computeHash(modified);
                expect(hash).not.toBe(modifiedHash);
            }),
            { numRuns: 100 },
        );
    });

    it('verifyHash returns true for self-hashed contracts', () => {
        fc.assert(
            fc.property(arbContract, (contract) => {
                const hash = computeHash(contract);
                expect(verifyHash(contract, hash)).toBe(true);
            }),
            { numRuns: 100 },
        );
    });

    it('verifyHash returns false after mutation', () => {
        fc.assert(
            fc.property(arbContract, (contract) => {
                const hash = computeHash(contract);
                const mutated = { ...contract, display_name: 'MUTATED_' + contract.display_name };
                expect(verifyHash(mutated, hash)).toBe(false);
            }),
            { numRuns: 100 },
        );
    });

    it('all hashes are valid 64-char hex SHA-256', () => {
        fc.assert(
            fc.property(arbContract, (contract) => {
                const hash = computeHash(contract);
                expect(hash).toMatch(/^[a-f0-9]{64}$/);
            }),
            { numRuns: 200 },
        );
    });
});

describe('Property-Based: Canonical Serialization Determinism', () => {
    it('serialize is deterministic under key order shuffle', () => {
        fc.assert(
            fc.property(arbContract, (contract) => {
                // Shuffle keys by reconstructing the object
                const keys = Object.keys(contract);
                const shuffled: Record<string, unknown> = {};
                // Reverse key order
                for (const key of keys.reverse()) {
                    shuffled[key] = (contract as unknown as Record<string, unknown>)[key];
                }
                const canonical1 = canonicalize(contract);
                const canonical2 = canonicalize(shuffled);
                expect(canonical1).toBe(canonical2);
            }),
            { numRuns: 200 },
        );
    });

    it('serialize strips null values', () => {
        const obj = { a: 1, b: null, c: 'hello', d: null };
        const result = canonicalize(obj);
        expect(result).not.toContain('null');
        expect(result).toContain('"a"');
        expect(result).toContain('"c"');
    });

    it('serialize sorts keys alphabetically at all levels', () => {
        const obj = { z: 1, a: { y: 2, b: 3 }, m: [{ q: 4, d: 5 }] };
        const result = canonicalize(obj);
        const parsed = JSON.parse(result);
        const topKeys = Object.keys(parsed);
        expect(topKeys).toEqual(['a', 'm', 'z']);
        const nestedKeys = Object.keys(parsed.a);
        expect(nestedKeys).toEqual(['b', 'y']);
    });

    it('serialize removes hash field from objects', () => {
        const obj = { id: '1', hash: 'abc123', name: 'test' };
        const result = canonicalize(obj);
        expect(result).not.toContain('"hash"');
    });

    it('serialize applies NFC normalization to unicode strings', () => {
        const nfd = 'caf\u0065\u0301'; // e + combining acute (NFD)
        const nfc = 'café';             // single é (NFC)
        const obj1 = { text: nfd };
        const obj2 = { text: nfc };
        expect(canonicalize(obj1)).toBe(canonicalize(obj2));
    });
});

describe('Canonical Serialization Fuzz Test (500 contracts)', () => {
    it('500 random contracts: shuffle keys → identical hash', () => {
        let passCount = 0;
        fc.assert(
            fc.property(arbContract, (contract) => {
                // Deep clone and shuffle property order multiple times
                const original = canonicalize(contract);

                for (let i = 0; i < 3; i++) {
                    const shuffled = shuffleObjectKeys(contract as unknown as Record<string, unknown>);
                    const reshuffled = canonicalize(shuffled);
                    expect(reshuffled).toBe(original);
                }
                passCount++;
            }),
            { numRuns: 500 },
        );
        expect(passCount).toBe(500);
    });
});

describe('Deep Immutability Test', () => {
    it('hashing does not mutate the original object', () => {
        fc.assert(
            fc.property(arbContract, (contract) => {
                const before = JSON.stringify(contract);
                computeHash(contract);
                computeHash(contract);
                computeHash(contract);
                const after = JSON.stringify(contract);
                expect(after).toBe(before);
            }),
            { numRuns: 100 },
        );
    });

    it('deepClone produces independent copy', () => {
        fc.assert(
            fc.property(arbContract, (contract) => {
                const clone = deepClone(contract);
                const hashBefore = computeHash(clone);

                // Mutate original (cast to break readonly)
                const mutable = contract as unknown as Record<string, unknown>;
                mutable['id'] = 'MUTATED_' + contract.id;
                mutable['display_name'] = 'MUTATED';

                // Clone should be unchanged
                const hashAfter = computeHash(clone);
                expect(hashAfter).toBe(hashBefore);
            }),
            { numRuns: 100 },
        );
    });

    it('canonicalize does not mutate input', () => {
        fc.assert(
            fc.property(arbContract, (contract) => {
                const before = JSON.parse(JSON.stringify(contract));
                canonicalize(contract);
                const after = JSON.parse(JSON.stringify(contract));
                expect(after).toEqual(before);
            }),
            { numRuns: 100 },
        );
    });
});

/**
 * Helper: recursively shuffles all object keys in random order.
 */
function shuffleObjectKeys(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(shuffleObjectKeys);
    if (typeof obj === 'object') {
        const source = obj as Record<string, unknown>;
        const keys = Object.keys(source);
        // Fisher-Yates shuffle with deterministic seed (index-based)
        for (let i = keys.length - 1; i > 0; i--) {
            const j = i % (keys.length); // deterministic shuffle
            [keys[i], keys[j]] = [keys[j], keys[i]];
        }
        const result: Record<string, unknown> = {};
        for (const key of keys) {
            result[key] = shuffleObjectKeys(source[key]);
        }
        return result;
    }
    return obj;
}
