/**
 * Core unit tests: hash determinism, invariant enforcement, provenance gate.
 */

import { describe, it, expect } from 'vitest';
import {
    computeHash,
    verifyHash,
    isValidSHA256,
    canonicalize,
    validateContract,
    hasAIProvenance,
    Contract,
    ContractState,
    Provenance,
    CURRENT_SCHEMA_VERSION,
    ENGINE_VERSION,
    ClauseType,
    ObligationType,
    ObligationStatus,
    PartyRole,
    ConditionType,
} from '../index';

/** Creates a minimal valid contract for testing. */
function makeValidContract(overrides: Partial<Contract> = {}): Contract {
    const base: Contract = {
        id: 'contract-001',
        name: 'test-contract',
        display_name: 'Test Contract',
        version: { major: 1, minor: 0, patch: 0 },
        description: 'A test contract',
        parties: [
            {
                id: 'party-buyer',
                role: PartyRole.BUYER,
                name: 'Buyer Corp',
                jurisdiction: { country: 'US', subdivision: 'CA' },
                provenance: Provenance.HUMAN_AUTHORED,
                schema_version: CURRENT_SCHEMA_VERSION,
            },
            {
                id: 'party-seller',
                role: PartyRole.SELLER,
                name: 'Seller Inc',
                jurisdiction: { country: 'US', subdivision: 'NY' },
                provenance: Provenance.HUMAN_AUTHORED,
                schema_version: CURRENT_SCHEMA_VERSION,
            },
        ],
        clauses: [
            {
                id: 'clause-payment',
                type: ClauseType.PAYMENT_TERMS,
                title: 'Payment Terms',
                text: 'Buyer shall pay within 30 days.',
                obligations: [
                    {
                        id: 'obl-pay-001',
                        clause_id: 'clause-payment',
                        type: ObligationType.PAYMENT,
                        debtor: 'party-buyer',
                        creditor: 'party-seller',
                        action: 'Pay invoice',
                        deadline: { absolute: '2025-06-15T00:00:00.000Z' },
                        status: ObligationStatus.ACTIVE,
                        conditions: [],
                        monetary_value: { value: '10000.00', currency: 'USD' },
                        penalty: {
                            type: 'INTEREST',
                            rate: '0.05',
                            description: '5% annual interest on overdue amount',
                            cap: { value: '5000.00', currency: 'USD' },
                        },
                        provenance: Provenance.HUMAN_AUTHORED,
                        schema_version: CURRENT_SCHEMA_VERSION,
                    },
                ],
                rights: [],
                conditions: [],
                language: 'en-US',
                provenance: Provenance.HUMAN_AUTHORED,
                schema_version: CURRENT_SCHEMA_VERSION,
            },
        ],
        governing_law: { country: 'US', subdivision: 'CA' },
        effective_date: '2025-01-01T00:00:00.000Z',
        state: ContractState.ACTIVE,
        state_history: [
            {
                from_state: ContractState.DRAFT,
                to_state: ContractState.ACTIVE,
                timestamp: '2025-01-01T00:00:00.000Z',
                reason: 'Contract signed',
                provenance: Provenance.RULE_DERIVED,
            },
        ],
        provenance: Provenance.HUMAN_AUTHORED,
        hash: '',
        schema_version: CURRENT_SCHEMA_VERSION,
        engine_version: ENGINE_VERSION,
        ...overrides,
    };
    const hash = computeHash(base);
    return { ...base, hash, ...overrides };
}

describe('Canonical Serialization', () => {
    it('produces identical output for identical input', () => {
        const obj = { b: 2, a: 1, c: { z: 'hello', y: 'world' } };
        const s1 = canonicalize(obj);
        const s2 = canonicalize(obj);
        expect(s1).toBe(s2);
    });

    it('sorts keys alphabetically', () => {
        const obj = { z: 1, a: 2, m: 3 };
        const result = canonicalize(obj);
        expect(result).toBe('{"a":2,"m":3,"z":1}');
    });

    it('strips null values', () => {
        const obj = { a: 1, b: null, c: 3 };
        const result = canonicalize(obj);
        expect(result).toBe('{"a":1,"c":3}');
    });

    it('removes hash field', () => {
        const obj = { a: 1, hash: 'abc123', b: 2 };
        const result = canonicalize(obj);
        expect(result).toBe('{"a":1,"b":2}');
    });

    it('preserves array order', () => {
        const obj = { items: [3, 1, 2] };
        const result = canonicalize(obj);
        expect(result).toBe('{"items":[3,1,2]}');
    });

    it('preserves empty arrays', () => {
        const obj = { items: [] };
        const result = canonicalize(obj);
        expect(result).toBe('{"items":[]}');
    });
});

describe('SHA-256 Hashing', () => {
    it('produces a 64-character hex string', () => {
        const hash = computeHash({ test: 'data' });
        expect(hash).toHaveLength(64);
        expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
    });

    it('produces deterministic output — same input, same hash', () => {
        const obj = { name: 'contract', value: '100.50' };
        const h1 = computeHash(obj);
        const h2 = computeHash(obj);
        expect(h1).toBe(h2);
    });

    it('produces different hashes for different inputs', () => {
        const h1 = computeHash({ amount: '100.00' });
        const h2 = computeHash({ amount: '100.01' });
        expect(h1).not.toBe(h2);
    });

    it('ignores key order — only content matters', () => {
        const h1 = computeHash({ a: 1, b: 2 });
        const h2 = computeHash({ b: 2, a: 1 });
        expect(h1).toBe(h2);
    });

    it('ignores the hash field in computation', () => {
        const h1 = computeHash({ a: 1, hash: 'old-hash' });
        const h2 = computeHash({ a: 1, hash: 'new-hash' });
        expect(h1).toBe(h2);
    });

    it('verifyHash returns true for correct hash', () => {
        const obj = { test: 'verify' };
        const hash = computeHash(obj);
        expect(verifyHash(obj, hash)).toBe(true);
    });

    it('isValidSHA256 validates correctly', () => {
        expect(isValidSHA256('a'.repeat(64))).toBe(true);
        expect(isValidSHA256('abcdef0123456789'.repeat(4))).toBe(true);
        expect(isValidSHA256('too-short')).toBe(false);
        expect(isValidSHA256('G'.repeat(64))).toBe(false);
    });
});

describe('Contract Invariant Validation', () => {
    it('validates a correct contract', () => {
        const contract = makeValidContract();
        const result = validateContract(contract);
        const nonC10Errors = result.errors.filter((e) => e.invariant !== 'C10');
        expect(nonC10Errors).toHaveLength(0);
    });

    it('C1: rejects contract with fewer than 2 parties', () => {
        const contract = makeValidContract({ parties: [] });
        const result = validateContract(contract);
        expect(result.errors.some((e) => e.invariant === 'C1')).toBe(true);
    });

    it('C2: rejects contract with no clauses', () => {
        const contract = makeValidContract({ clauses: [] });
        const result = validateContract(contract);
        expect(result.errors.some((e) => e.invariant === 'C2')).toBe(true);
    });

    it('C3: rejects duplicate party IDs', () => {
        const contract = makeValidContract();
        const parties = [
            { ...contract.parties[0] },
            { ...contract.parties[0] },
        ];
        const bad = makeValidContract({ parties });
        const result = validateContract(bad);
        expect(result.errors.some((e) => e.invariant === 'C3')).toBe(true);
    });

    it('C12: rejects invalid contract name', () => {
        const contract = makeValidContract({ name: 'Invalid Name!' });
        const result = validateContract(contract);
        expect(result.errors.some((e) => e.invariant === 'C12')).toBe(true);
    });

    it('C13: rejects display_name over 214 characters', () => {
        const contract = makeValidContract({ display_name: 'x'.repeat(215) });
        const result = validateContract(contract);
        expect(result.errors.some((e) => e.invariant === 'C13')).toBe(true);
    });

    it('C15: rejects AI_GENERATED provenance in active contract', () => {
        const contract = makeValidContract({
            state: ContractState.ACTIVE,
            clauses: [
                {
                    id: 'clause-ai',
                    type: ClauseType.PAYMENT_TERMS,
                    title: 'AI Clause',
                    text: 'Auto-generated',
                    obligations: [],
                    rights: [],
                    conditions: [],
                    language: 'en-US',
                    provenance: Provenance.AI_GENERATED,
                    ai_confidence: 0.9,
                    schema_version: CURRENT_SCHEMA_VERSION,
                },
            ],
        });
        const result = validateContract(contract);
        expect(result.errors.some((e) => e.invariant === 'C15')).toBe(true);
    });

    it('C15: allows AI_GENERATED provenance in DRAFT contract', () => {
        const contract = makeValidContract({
            state: ContractState.DRAFT,
            state_history: [
                {
                    from_state: ContractState.DRAFT,
                    to_state: ContractState.DRAFT,
                    timestamp: '2025-01-01T00:00:00.000Z',
                    reason: 'Initial',
                    provenance: Provenance.RULE_DERIVED,
                },
            ],
            clauses: [
                {
                    id: 'clause-ai',
                    type: ClauseType.PAYMENT_TERMS,
                    title: 'AI Clause',
                    text: 'Auto-generated',
                    obligations: [],
                    rights: [],
                    conditions: [],
                    language: 'en-US',
                    provenance: Provenance.AI_GENERATED,
                    ai_confidence: 0.9,
                    schema_version: CURRENT_SCHEMA_VERSION,
                },
            ],
        });
        const result = validateContract(contract);
        expect(result.errors.some((e) => e.invariant === 'C15')).toBe(false);
    });
});

describe('AI Provenance Detection', () => {
    it('detects AI_GENERATED in clause', () => {
        const contract = makeValidContract({
            clauses: [
                {
                    id: 'cl-1',
                    type: ClauseType.PAYMENT_TERMS,
                    title: 'Test',
                    text: 'Test',
                    obligations: [],
                    rights: [],
                    conditions: [],
                    language: 'en-US',
                    provenance: Provenance.AI_GENERATED,
                    schema_version: CURRENT_SCHEMA_VERSION,
                },
            ],
        });
        expect(hasAIProvenance(contract)).toBe(true);
    });

    it('returns false for fully human-authored contract', () => {
        const contract = makeValidContract();
        expect(hasAIProvenance(contract)).toBe(false);
    });
});
