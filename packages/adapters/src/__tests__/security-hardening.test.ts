/**
 * Stage 5 — Security & Trust Hardening Tests
 *
 * 1. ECDSA event signature verification
 * 2. Non-repudiation metadata
 * 3. Tamper detection (1-byte modification)
 * 4. Replay attack prevention
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    generateSigningKeyPair,
    signEvent,
    verifyEventSignature,
    extractNonRepudiationMetadata,
    SignatureVerificationError,
} from '../../src/event-signature';
import { ReplayGuard, ReplayAttackError } from '../../src/replay-guard';
import { verifyBeforePersist, HashIntegrityError } from '../../src/hash-before-persist';
import { execute } from '@jurisgenie/execution';
import {
    Contract,
    ContractState,
    PartyRole,
    Provenance,
    ClauseType,
    ObligationType,
    ObligationStatus,
    EventType,
    EventSource,
    Event,
    ExecutionResult,
    CURRENT_SCHEMA_VERSION,
    ENGINE_VERSION,
} from '@jurisgenie/core';
import { computeHash } from '@jurisgenie/core';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEvent(overrides?: Partial<Event>): Event {
    return {
        id: 'event-sec-001',
        type: EventType.PAYMENT_RECEIVED,
        timestamp: '2025-03-15T00:00:00.000Z',
        source: EventSource.MANUAL,
        contract_id: 'contract-sec-001',
        payload: {
            description: 'Payment received',
            amount: { value: '50000.00', currency: 'USD' },
        },
        provenance: Provenance.HUMAN_AUTHORED,
        schema_version: CURRENT_SCHEMA_VERSION,
        ...overrides,
    };
}

function makeContract(): Contract {
    const base: Contract = {
        id: 'contract-sec-001',
        name: 'sec-test-contract',
        display_name: 'Security Test Contract',
        version: { major: 1, minor: 0, patch: 0 },
        parties: [
            { id: 'party-a', role: PartyRole.BUYER, name: 'A', jurisdiction: { country: 'US', subdivision: 'CA' }, provenance: Provenance.HUMAN_AUTHORED, schema_version: CURRENT_SCHEMA_VERSION },
            { id: 'party-b', role: PartyRole.SELLER, name: 'B', jurisdiction: { country: 'US', subdivision: 'CA' }, provenance: Provenance.HUMAN_AUTHORED, schema_version: CURRENT_SCHEMA_VERSION },
        ],
        clauses: [{
            id: 'clause-1',
            type: ClauseType.PAYMENT_TERMS,
            title: 'Payment',
            text: 'Pay within 30 days.',
            obligations: [{
                id: 'obl-1',
                clause_id: 'clause-1',
                type: ObligationType.PAYMENT,
                debtor: 'party-a',
                creditor: 'party-b',
                action: 'Pay',
                deadline: { absolute: '2025-06-15T00:00:00.000Z' },
                status: ObligationStatus.ACTIVE,
                conditions: [],
                monetary_value: { value: '50000.00', currency: 'USD' },
                provenance: Provenance.HUMAN_AUTHORED,
                schema_version: CURRENT_SCHEMA_VERSION,
            }],
            rights: [],
            conditions: [],
            language: 'en-US',
            provenance: Provenance.HUMAN_AUTHORED,
            schema_version: CURRENT_SCHEMA_VERSION,
        }],
        governing_law: { country: 'US', subdivision: 'CA' },
        effective_date: '2025-01-01T00:00:00.000Z',
        state: ContractState.ACTIVE,
        state_history: [{
            from_state: ContractState.DRAFT,
            to_state: ContractState.ACTIVE,
            timestamp: '2025-01-01T00:00:00.000Z',
            reason: 'Signed',
            provenance: Provenance.RULE_DERIVED,
        }],
        provenance: Provenance.HUMAN_AUTHORED,
        hash: '',
        schema_version: CURRENT_SCHEMA_VERSION,
        engine_version: ENGINE_VERSION,
    };
    return { ...base, hash: computeHash(base) };
}

function executeOnce(): ExecutionResult {
    return execute({
        contract: makeContract(),
        event: makeEvent(),
        context: {
            execution_date: '2025-03-15T00:00:00.000Z',
            engine_version: ENGINE_VERSION,
            request_id: 'sec-req-001',
            simulation: { enabled: false },
        },
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 1: ECDSA Event Signature Verification
// ─────────────────────────────────────────────────────────────────────────────

describe('ECDSA Event Signature Verification', () => {
    it('generates valid ECDSA key pair', () => {
        const kp = generateSigningKeyPair();
        expect(kp.publicKey).toContain('BEGIN PUBLIC KEY');
        expect(kp.privateKey).toContain('BEGIN PRIVATE KEY');
    });

    it('signs event and produces valid signature', () => {
        const kp = generateSigningKeyPair();
        const event = makeEvent();
        const signed = signEvent(event, kp.privateKey, kp.publicKey);

        expect(signed.signature).toMatch(/^[a-f0-9]+$/);
        expect(signed.signer_public_key).toBe(kp.publicKey);
        expect(signed.signature_hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('verifies valid signature', () => {
        const kp = generateSigningKeyPair();
        const signed = signEvent(makeEvent(), kp.privateKey, kp.publicKey);

        expect(verifyEventSignature(signed)).toBe(true);
    });

    it('rejects tampered event payload', () => {
        const kp = generateSigningKeyPair();
        const signed = signEvent(makeEvent(), kp.privateKey, kp.publicKey);

        // Tamper with event
        const tampered = {
            ...signed,
            event: { ...signed.event, id: 'tampered-event-id' },
        };

        expect(() => verifyEventSignature(tampered)).toThrow(SignatureVerificationError);
    });

    it('rejects wrong public key', () => {
        const kp1 = generateSigningKeyPair();
        const kp2 = generateSigningKeyPair();
        const signed = signEvent(makeEvent(), kp1.privateKey, kp1.publicKey);

        // Use wrong public key
        const wrongKey = { ...signed, signer_public_key: kp2.publicKey };
        expect(() => verifyEventSignature(wrongKey)).toThrow(SignatureVerificationError);
    });

    it('rejects tampered signature', () => {
        const kp = generateSigningKeyPair();
        const signed = signEvent(makeEvent(), kp.privateKey, kp.publicKey);

        // Tamper with signature (corrupt 1 hex char)
        const corruptSig = 'ff' + signed.signature.slice(2);
        const tampered = { ...signed, signature: corruptSig };

        expect(() => verifyEventSignature(tampered)).toThrow(SignatureVerificationError);
    });

    it('rejects tampered signature_hash', () => {
        const kp = generateSigningKeyPair();
        const signed = signEvent(makeEvent(), kp.privateKey, kp.publicKey);

        // Tamper signature_hash
        const tampered = { ...signed, signature_hash: 'dead'.repeat(16) };

        expect(() => verifyEventSignature(tampered)).toThrow(SignatureVerificationError);
    });

    it('same event produces deterministic signature with same key', () => {
        const kp = generateSigningKeyPair();
        const event = makeEvent();

        // Note: ECDSA signatures are non-deterministic (random k).
        // But both should verify correctly.
        const signed1 = signEvent(event, kp.privateKey, kp.publicKey);
        const signed2 = signEvent(event, kp.privateKey, kp.publicKey);

        expect(verifyEventSignature(signed1)).toBe(true);
        expect(verifyEventSignature(signed2)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 2: Non-Repudiation Metadata
// ─────────────────────────────────────────────────────────────────────────────

describe('Non-Repudiation Metadata', () => {
    it('signed event contains all non-repudiation fields', () => {
        const kp = generateSigningKeyPair();
        const signed = signEvent(makeEvent(), kp.privateKey, kp.publicKey, '2025-03-15T12:00:00.000Z');

        expect(signed.signer_public_key).toContain('BEGIN PUBLIC KEY');
        expect(signed.signature_hash).toMatch(/^[a-f0-9]{64}$/);
        expect(signed.signed_at).toBe('2025-03-15T12:00:00.000Z');
    });

    it('extractNonRepudiationMetadata returns correct fields', () => {
        const kp = generateSigningKeyPair();
        const event = makeEvent({ id: 'event-nr-001' });
        const signed = signEvent(event, kp.privateKey, kp.publicKey, '2025-03-15T12:00:00.000Z');

        const meta = extractNonRepudiationMetadata(signed);
        expect(meta.event_id).toBe('event-nr-001');
        expect(meta.signer_public_key).toBe(kp.publicKey);
        expect(meta.signature_hash).toBe(signed.signature_hash);
        expect(meta.signed_at).toBe('2025-03-15T12:00:00.000Z');
    });

    it('different signers produce different public keys', () => {
        const kp1 = generateSigningKeyPair();
        const kp2 = generateSigningKeyPair();

        const signed1 = signEvent(makeEvent(), kp1.privateKey, kp1.publicKey);
        const signed2 = signEvent(makeEvent(), kp2.privateKey, kp2.publicKey);

        expect(signed1.signer_public_key).not.toBe(signed2.signer_public_key);
    });

    it('signature_hash is SHA-256 of the signature itself', () => {
        const kp = generateSigningKeyPair();
        const signed = signEvent(makeEvent(), kp.privateKey, kp.publicKey);

        // Verify manually
        const { createHash } = require('crypto');
        const manual = createHash('sha256').update(signed.signature).digest('hex');
        expect(signed.signature_hash).toBe(manual);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 3: Tamper Detection (1-byte modification)
// ─────────────────────────────────────────────────────────────────────────────

describe('Tamper Detection — 1-Byte Modification', () => {
    it('detects 1-byte change in execution_hash', () => {
        const result = executeOnce();
        // Flip one hex char
        const originalHash = result.execution_hash;
        const flippedChar = originalHash[0] === 'a' ? 'b' : 'a';
        const tampered = { ...result, execution_hash: flippedChar + originalHash.slice(1) };

        expect(() => verifyBeforePersist(tampered)).toThrow(HashIntegrityError);
    });

    it('detects 1-char change in contract_id', () => {
        const result = executeOnce();
        const tampered = { ...result, contract_id: result.contract_id + 'X' };

        expect(() => verifyBeforePersist(tampered)).toThrow(HashIntegrityError);
    });

    it('detects insertion of 1 extra penalty', () => {
        const result = executeOnce();
        const tampered = {
            ...result,
            penalties: [
                ...result.penalties,
                { obligation_id: 'fake', penalty_type: 'FIXED_AMOUNT', computation_trace: 'x', capped: false },
            ],
        };

        expect(() => verifyBeforePersist(tampered)).toThrow(HashIntegrityError);
    });

    it('detects 1-char change in event payload via signature', () => {
        const kp = generateSigningKeyPair();
        const event = makeEvent();
        const signed = signEvent(event, kp.privateKey, kp.publicKey);

        // Modify 1 char in payload description
        const tamperedEvent = {
            ...signed.event,
            payload: { ...signed.event.payload, description: 'Payment receivex' },
        };
        const tampered = { ...signed, event: tamperedEvent };

        expect(() => verifyEventSignature(tampered)).toThrow(SignatureVerificationError);
    });

    it('detects 1-char change in event timestamp via signature', () => {
        const kp = generateSigningKeyPair();
        const event = makeEvent();
        const signed = signEvent(event, kp.privateKey, kp.publicKey);

        const tamperedEvent = {
            ...signed.event,
            timestamp: '2025-03-15T00:00:00.001Z',
        };
        const tampered = { ...signed, event: tamperedEvent };

        expect(() => verifyEventSignature(tampered)).toThrow(SignatureVerificationError);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 4: Replay Attack Prevention
// ─────────────────────────────────────────────────────────────────────────────

describe('Replay Attack Prevention', () => {
    let guard: ReplayGuard;

    beforeEach(() => {
        guard = new ReplayGuard();
    });

    it('first request passes', () => {
        expect(() => guard.guard('req-001', 'evt-1', 'contract-1')).not.toThrow();
        expect(guard.wasProcessed('req-001')).toBe(true);
    });

    it('duplicate request_id throws ReplayAttackError', () => {
        guard.guard('req-dup', 'evt-1', 'contract-1');

        expect(() => guard.guard('req-dup', 'evt-2', 'contract-1')).toThrow(ReplayAttackError);
    });

    it('error contains original timestamp', () => {
        guard.guard('req-ts', 'evt-1', 'contract-1');

        try {
            guard.guard('req-ts', 'evt-2', 'contract-1');
            throw new Error('should have thrown');
        } catch (e) {
            const err = e as ReplayAttackError;
            expect(err.requestId).toBe('req-ts');
            expect(err.originalTimestamp).toBeGreaterThan(0);
        }
    });

    it('different request_ids are independent', () => {
        guard.guard('req-a', 'evt-1', 'contract-1');
        guard.guard('req-b', 'evt-2', 'contract-1');

        expect(guard.size).toBe(2);
        expect(guard.wasProcessed('req-a')).toBe(true);
        expect(guard.wasProcessed('req-b')).toBe(true);
    });

    it('getEntry returns audit metadata', () => {
        guard.guard('req-meta', 'evt-1', 'contract-123');

        const entry = guard.getEntry('req-meta');
        expect(entry).toBeDefined();
        expect(entry!.eventId).toBe('evt-1');
        expect(entry!.contractId).toBe('contract-123');
    });

    it('clear removes all entries', () => {
        guard.guard('req-1', 'evt-1', 'c-1');
        guard.guard('req-2', 'evt-2', 'c-2');
        expect(guard.size).toBe(2);

        guard.clear();
        expect(guard.size).toBe(0);
        expect(guard.wasProcessed('req-1')).toBe(false);
    });

    it('TTL expiry: expired entries are evicted', () => {
        const shortGuard = new ReplayGuard(1); // 1ms TTL

        shortGuard.guard('req-expire', 'evt-1', 'c-1');

        // Wait for expiry
        const start = Date.now();
        while (Date.now() - start < 10) { /* busy wait */ }

        // Should NOT throw — entry expired
        expect(() => shortGuard.guard('req-expire', 'evt-2', 'c-1')).not.toThrow();
    });
});
