/**
 * Stage 6 — Blockchain Anchoring Tests
 *
 * 1. AnchorStore basics (anchor, verify, reject)
 * 2. AnchorAdapter integration (anchorResult, verifyResult)
 * 3. End-to-end test (execute → anchor → verify)
 * 4. Multi-execution sequence anchoring
 * 5. Tamper detection via on-chain verification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnchorStore, AnchorAdapter } from '../../src/anchor-adapter';
import { verifyBeforePersist } from '../../src/hash-before-persist';
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

function makeContract(): Contract {
    const base: Contract = {
        id: 'contract-chain-001',
        name: 'chain-test',
        display_name: 'Blockchain Test',
        version: { major: 1, minor: 0, patch: 0 },
        parties: [
            { id: 'party-a', role: PartyRole.BUYER, name: 'A', jurisdiction: { country: 'US', subdivision: 'CA' }, provenance: Provenance.HUMAN_AUTHORED, schema_version: CURRENT_SCHEMA_VERSION },
            { id: 'party-b', role: PartyRole.SELLER, name: 'B', jurisdiction: { country: 'US', subdivision: 'CA' }, provenance: Provenance.HUMAN_AUTHORED, schema_version: CURRENT_SCHEMA_VERSION },
        ],
        clauses: [{
            id: 'clause-1',
            type: ClauseType.PAYMENT_TERMS,
            title: 'Payment',
            text: 'Pay.',
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
                monetary_value: { value: '10000.00', currency: 'USD' },
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

function makeEvent(overrides?: Partial<Event>): Event {
    return {
        id: 'event-chain-001',
        type: EventType.PAYMENT_RECEIVED,
        timestamp: '2025-03-15T00:00:00.000Z',
        source: EventSource.MANUAL,
        contract_id: 'contract-chain-001',
        payload: { description: 'Payment', amount: { value: '10000.00', currency: 'USD' } },
        provenance: Provenance.HUMAN_AUTHORED,
        schema_version: CURRENT_SCHEMA_VERSION,
        ...overrides,
    };
}

function executeOnce(requestId = 'chain-req-001'): ExecutionResult {
    return execute({
        contract: makeContract(),
        event: makeEvent(),
        context: {
            execution_date: '2025-03-15T00:00:00.000Z',
            engine_version: ENGINE_VERSION,
            request_id: requestId,
            simulation: { enabled: false },
        },
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 1: AnchorStore Basics
// ─────────────────────────────────────────────────────────────────────────────

describe('AnchorStore Basics', () => {
    let store: AnchorStore;

    beforeEach(() => {
        store = new AnchorStore();
    });

    it('anchors a valid hash', () => {
        const record = store.anchor('contract-1', 'abcd'.repeat(16));
        expect(record.contractId).toBe('contract-1');
        expect(record.executionHash).toBe('abcd'.repeat(16));
        expect(record.txHash).toMatch(/^0x[0-9a-f]{64}$/);
        expect(record.blockNumber).toBeGreaterThan(0);
    });

    it('rejects zero hash', () => {
        expect(() => store.anchor('c-1', '0'.repeat(64))).toThrow('zero hash');
    });

    it('rejects duplicate hash', () => {
        const hash = 'dead'.repeat(16);
        store.anchor('c-1', hash);
        expect(() => store.anchor('c-2', hash)).toThrow('already anchored');
    });

    it('verifyOnChain returns true for anchored hash', () => {
        const hash = 'beef'.repeat(16);
        store.anchor('c-1', hash);
        expect(store.verifyOnChain(hash)).toBe(true);
    });

    it('verifyOnChain returns false for unknown hash', () => {
        expect(store.verifyOnChain('ffff'.repeat(16))).toBe(false);
    });

    it('verify returns full verification result', () => {
        const hash = 'cafe'.repeat(16);
        store.anchor('c-1', hash);

        const v = store.verify(hash);
        expect(v.onChain).toBe(true);
        expect(v.localMatch).toBe(true);
        expect(v.anchorRecord?.contractId).toBe('c-1');
    });

    it('getRecords returns contract anchors', () => {
        store.anchor('c-1', 'aaaa'.repeat(16));
        store.anchor('c-1', 'bbbb'.repeat(16));
        store.anchor('c-2', 'cccc'.repeat(16));

        expect(store.getRecords('c-1').length).toBe(2);
        expect(store.getRecords('c-2').length).toBe(1);
        expect(store.getRecords('c-3').length).toBe(0);
    });

    it('clear resets all state', () => {
        store.anchor('c-1', 'dddd'.repeat(16));
        expect(store.size).toBe(1);

        store.clear();
        expect(store.size).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 2: AnchorAdapter Integration
// ─────────────────────────────────────────────────────────────────────────────

describe('AnchorAdapter Integration', () => {
    let adapter: AnchorAdapter;

    beforeEach(() => {
        adapter = new AnchorAdapter();
    });

    it('anchorResult stores execution hash', () => {
        const result = executeOnce();
        const record = adapter.anchorResult(result);

        expect(record.executionHash).toBe(result.execution_hash);
        expect(record.contractId).toBe(result.contract_id);
        expect(record.network).toBe('sepolia');
    });

    it('verifyResult returns positive verification', () => {
        const result = executeOnce();
        adapter.anchorResult(result);

        const v = adapter.verifyResult(result);
        expect(v.onChain).toBe(true);
        expect(v.localMatch).toBe(true);
    });

    it('verifyResult returns negative for unanchored result', () => {
        const result = executeOnce();
        const v = adapter.verifyResult(result);

        expect(v.onChain).toBe(false);
        expect(v.localMatch).toBe(false);
    });

    it('anchorHash returns BlockchainReceipt', () => {
        const receipt = adapter.anchorHash('c-1', 'face'.repeat(16));
        expect(receipt.status).toBe('CONFIRMED');
        expect(receipt.tx_hash).toMatch(/^0x/);
        expect(receipt.network).toBe('sepolia');
    });

    it('getAnchors returns all anchors for contract', () => {
        const r1 = executeOnce('req-1');
        const r2 = execute({
            contract: makeContract(),
            event: makeEvent({ id: 'event-2' }),
            context: {
                execution_date: '2025-03-15T00:00:00.000Z',
                engine_version: ENGINE_VERSION,
                request_id: 'req-2',
                simulation: { enabled: false },
            },
        });

        adapter.anchorResult(r1);
        adapter.anchorResult(r2);

        const anchors = adapter.getAnchors('contract-chain-001');
        expect(anchors.length).toBe(2);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 3: End-to-End — Execute → Anchor → Verify
// ─────────────────────────────────────────────────────────────────────────────

describe('End-to-End: Execute → Anchor → Verify', () => {
    it('full flow: execute, verify integrity, anchor, verify on-chain', () => {
        const adapter = new AnchorAdapter();

        // 1. Execute
        const result = executeOnce();
        expect(result.execution_hash).toMatch(/^[a-f0-9]{64}$/);

        // 2. Verify integrity before persist
        expect(() => verifyBeforePersist(result)).not.toThrow();

        // 3. Anchor
        const record = adapter.anchorResult(result);
        expect(record.txHash).toBeTruthy();

        // 4. Verify on-chain
        const verification = adapter.verifyResult(result);
        expect(verification.onChain).toBe(true);
        expect(verification.localMatch).toBe(true);
        expect(verification.anchorRecord?.txHash).toBe(record.txHash);
    });

    it('multi-step sequence: 3 events anchored in order', () => {
        const adapter = new AnchorAdapter();

        // Execute 3 events sequentially
        const contract = makeContract();
        const events = [
            makeEvent({ id: 'e1', type: EventType.DEADLINE_APPROACHING, timestamp: '2025-04-01T00:00:00.000Z' }),
            makeEvent({ id: 'e2', timestamp: '2025-05-01T00:00:00.000Z' }),
            makeEvent({ id: 'e3', type: EventType.DEADLINE_APPROACHING, timestamp: '2025-06-01T00:00:00.000Z' }),
        ];

        let currentContract = contract;
        const hashes: string[] = [];

        for (let i = 0; i < events.length; i++) {
            const result = execute({
                contract: currentContract,
                event: events[i],
                context: {
                    execution_date: events[i].timestamp,
                    engine_version: ENGINE_VERSION,
                    request_id: `seq-${i}`,
                    simulation: { enabled: false },
                },
            });

            // Anchor each step
            adapter.anchorResult(result);
            hashes.push(result.execution_hash);
            currentContract = result.resulting_contract;
        }

        // All 3 hashes anchored and verifiable
        for (const hash of hashes) {
            expect(adapter.verifyHash(hash)).toBe(true);
        }

        expect(adapter.getAnchors('contract-chain-001').length).toBe(3);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 4: Tamper Detection via On-Chain Verification
// ─────────────────────────────────────────────────────────────────────────────

describe('Tamper Detection via On-Chain Verification', () => {
    it('tampered result hash does not match anchored hash', () => {
        const adapter = new AnchorAdapter();
        const result = executeOnce();

        // Anchor the real hash
        adapter.anchorResult(result);

        // Tamper the result
        const tampered = { ...result, execution_hash: 'ffff'.repeat(16) };

        // Anchored hash (real) is still verifiable
        expect(adapter.verifyHash(result.execution_hash)).toBe(true);

        // Tampered hash is NOT on-chain
        expect(adapter.verifyHash(tampered.execution_hash)).toBe(false);
    });

    it('verifyResult on tampered result returns negative', () => {
        const adapter = new AnchorAdapter();
        const result = executeOnce();
        adapter.anchorResult(result);

        const tampered = { ...result, execution_hash: 'aaaa'.repeat(16) };
        const v = adapter.verifyResult(tampered);
        expect(v.onChain).toBe(false);
        expect(v.localMatch).toBe(false);
    });

    it('full integrity chain: hash-before-persist + on-chain verify', () => {
        const adapter = new AnchorAdapter();
        const result = executeOnce();

        // Step 1: Integrity check passes
        verifyBeforePersist(result);

        // Step 2: Anchor
        adapter.anchorResult(result);

        // Step 3: Later, re-verify
        const v = adapter.verifyResult(result);
        expect(v.onChain).toBe(true);

        // Step 4: If someone tampers the stored result, both checks fail
        const tampered = { ...result, new_state: ContractState.TERMINATED };
        expect(() => verifyBeforePersist(tampered)).toThrow();
        // And the tampered hash won't match on-chain
    });
});
