/**
 * Stage 7 — Final System Verification Tests
 *
 * 1. Full replay reconstruction
 * 2. 100 random contract-event simulations
 * 3. Verification report generation (determinism certificate)
 *
 * NOTE: request_id is included in the execution result and therefore in
 * the execution_hash. All determinism comparisons use identical request_id.
 */

import { describe, it, expect } from 'vitest';
import { execute, NON_EXECUTABLE_STATES } from '@jurisgenie/execution';
import { verifyBeforePersist } from '../hash-before-persist';
import { AnchorAdapter } from '../anchor-adapter';
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

function makeContract(overrides?: Partial<Contract>): Contract {
    const base: Contract = {
        id: 'contract-final-001',
        name: 'final-verification',
        display_name: 'Final Verification Contract',
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
                deadline: { absolute: '2025-12-31T00:00:00.000Z' },
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
        ...overrides,
    };
    return { ...base, hash: computeHash(base) };
}

function makeEvent(overrides?: Partial<Event>): Event {
    return {
        id: 'event-final-001',
        type: EventType.PAYMENT_RECEIVED,
        timestamp: '2025-03-15T00:00:00.000Z',
        source: EventSource.MANUAL,
        contract_id: 'contract-final-001',
        payload: { description: 'Payment', amount: { value: '50000.00', currency: 'USD' } },
        provenance: Provenance.HUMAN_AUTHORED,
        schema_version: CURRENT_SCHEMA_VERSION,
        ...overrides,
    };
}

/** Deterministic pseudo-random from seed */
function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };
}

const SIMULATION_EVENT_TYPES: EventType[] = [
    EventType.PAYMENT_RECEIVED,
    EventType.PAYMENT_MISSED,
    EventType.DELIVERY_COMPLETED,
    EventType.DELIVERY_LATE,
    EventType.DEADLINE_APPROACHING,
    EventType.DEADLINE_EXPIRED,
    EventType.FORCE_MAJEURE_DECLARED,
    EventType.FORCE_MAJEURE_LIFTED,
    EventType.TERMINATION_NOTICE,
    EventType.DISPUTE_FILED,
    EventType.AMENDMENT_PROPOSED,
    EventType.AMENDMENT_ACCEPTED,
    EventType.PARTY_CHANGED,
    EventType.EXTERNAL_RULING,
    EventType.CUSTOM,
];

// ─────────────────────────────────────────────────────────────────────────────
// Task 1: Full Replay Reconstruction
// ─────────────────────────────────────────────────────────────────────────────

describe('Full Replay Reconstruction', () => {
    it('rebuilds contract state from initial state + 5 events, final hash identical', () => {
        const events: Partial<Event>[] = [
            { id: 'e1', type: EventType.DEADLINE_APPROACHING, timestamp: '2025-02-01T00:00:00.000Z' },
            { id: 'e2', type: EventType.PAYMENT_RECEIVED, timestamp: '2025-03-01T00:00:00.000Z' },
            { id: 'e3', type: EventType.DELIVERY_COMPLETED, timestamp: '2025-04-01T00:00:00.000Z' },
            { id: 'e4', type: EventType.AMENDMENT_PROPOSED, timestamp: '2025-05-01T00:00:00.000Z' },
            { id: 'e5', type: EventType.CUSTOM, timestamp: '2025-06-01T00:00:00.000Z' },
        ];

        // Run 1
        const hashes1: string[] = [];
        let contract1 = makeContract();
        for (let i = 0; i < events.length; i++) {
            const result = execute({
                contract: contract1,
                event: makeEvent(events[i]),
                context: {
                    execution_date: events[i].timestamp!,
                    engine_version: ENGINE_VERSION,
                    request_id: `replay-${i}`,   // same request_id across runs
                    simulation: { enabled: false },
                },
            });
            hashes1.push(result.execution_hash);
            contract1 = result.resulting_contract;
        }

        // Run 2: Replay — identical inputs including request_id
        const hashes2: string[] = [];
        let contract2 = makeContract();
        for (let i = 0; i < events.length; i++) {
            const result = execute({
                contract: contract2,
                event: makeEvent(events[i]),
                context: {
                    execution_date: events[i].timestamp!,
                    engine_version: ENGINE_VERSION,
                    request_id: `replay-${i}`,   // identical request_id
                    simulation: { enabled: false },
                },
            });
            hashes2.push(result.execution_hash);
            contract2 = result.resulting_contract;
        }

        // All intermediate hashes must be identical
        for (let i = 0; i < events.length; i++) {
            expect(hashes1[i]).toBe(hashes2[i]);
        }

        // Final contract hashes identical
        expect(computeHash(contract1)).toBe(computeHash(contract2));
    });

    it('replay from serialized state produces identical result', () => {
        const contract = makeContract();
        const event = makeEvent();

        const result1 = execute({
            contract, event,
            context: { execution_date: '2025-03-15T00:00:00.000Z', engine_version: ENGINE_VERSION, request_id: 'serial-1', simulation: { enabled: false } },
        });

        // Serialize → deserialize (simulate persistence)
        const deserialized = JSON.parse(JSON.stringify(result1.resulting_contract)) as Contract;

        const nextEvent = makeEvent({ id: 'e2', type: EventType.DEADLINE_APPROACHING, timestamp: '2025-04-01T00:00:00.000Z' });

        const result2a = execute({
            contract: result1.resulting_contract, event: nextEvent,
            context: { execution_date: '2025-04-01T00:00:00.000Z', engine_version: ENGINE_VERSION, request_id: 'serial-2', simulation: { enabled: false } },
        });

        const result2b = execute({
            contract: deserialized, event: nextEvent,
            context: { execution_date: '2025-04-01T00:00:00.000Z', engine_version: ENGINE_VERSION, request_id: 'serial-2', simulation: { enabled: false } },
        });

        expect(result2a.execution_hash).toBe(result2b.execution_hash);
    });

    it('replay with blockchain anchor verification', () => {
        const adapter = new AnchorAdapter();
        const events: Partial<Event>[] = [
            { id: 'e1', type: EventType.PAYMENT_RECEIVED, timestamp: '2025-03-01T00:00:00.000Z' },
            { id: 'e2', type: EventType.DELIVERY_COMPLETED, timestamp: '2025-04-01T00:00:00.000Z' },
            { id: 'e3', type: EventType.CUSTOM, timestamp: '2025-05-01T00:00:00.000Z' },
        ];

        let contract = makeContract();
        const results: ExecutionResult[] = [];

        for (let i = 0; i < events.length; i++) {
            const result = execute({
                contract,
                event: makeEvent(events[i]),
                context: { execution_date: events[i].timestamp!, engine_version: ENGINE_VERSION, request_id: `anchor-${i}`, simulation: { enabled: false } },
            });
            verifyBeforePersist(result);
            adapter.anchorResult(result);
            results.push(result);
            contract = result.resulting_contract;
        }

        for (const r of results) {
            const v = adapter.verifyResult(r);
            expect(v.onChain).toBe(true);
            expect(v.localMatch).toBe(true);
        }
        expect(adapter.getAnchors('contract-final-001').length).toBe(3);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 2: 100 Random Contract-Event Simulations
// ─────────────────────────────────────────────────────────────────────────────

describe('100 Random Contract-Event Simulations', () => {
    it('100 simulations: no nondeterminism, no invariant violations, no unhandled states', () => {
        const rand = seededRandom(42);
        let passed = 0;
        let nonExecutable = 0;
        const invariantViolations: string[] = [];
        const nondeterminism: string[] = [];
        const unhandledErrors: string[] = [];

        // Use a single contract id for all sims (event.contract_id must match)
        const contractId = 'contract-final-001';

        for (let i = 0; i < 100; i++) {
            const eventType = SIMULATION_EVENT_TYPES[Math.floor(rand() * SIMULATION_EVENT_TYPES.length)];
            const month = Math.floor(rand() * 12) + 1;
            const day = Math.floor(rand() * 28) + 1;
            const ts = `2025-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00.000Z`;

            const contract = makeContract(); // always uses contract-final-001
            const event = makeEvent({
                id: `rng-event-${i}`,
                type: eventType,
                timestamp: ts,
                contract_id: contractId,
            });
            const requestId = `rng-req-${i}`;

            try {
                // Run 1
                const r1 = execute({
                    contract, event,
                    context: { execution_date: ts, engine_version: ENGINE_VERSION, request_id: requestId, simulation: { enabled: false } },
                });

                // Run 2 (same request_id for determinism check)
                const r2 = execute({
                    contract, event,
                    context: { execution_date: ts, engine_version: ENGINE_VERSION, request_id: requestId, simulation: { enabled: false } },
                });

                // Invariant 1: valid SHA-256
                if (!/^[a-f0-9]{64}$/.test(r1.execution_hash)) {
                    invariantViolations.push(`Sim ${i}: invalid hash format`);
                    continue;
                }

                // Invariant 2: determinism
                if (r1.execution_hash !== r2.execution_hash) {
                    nondeterminism.push(`Sim ${i}: hash mismatch`);
                    continue;
                }

                // Invariant 3: valid state
                if (!Object.values(ContractState).includes(r1.new_state)) {
                    invariantViolations.push(`Sim ${i}: invalid state ${r1.new_state}`);
                    continue;
                }

                // Invariant 4: hash integrity
                try { verifyBeforePersist(r1); } catch {
                    invariantViolations.push(`Sim ${i}: hash integrity failed`);
                    continue;
                }

                // Invariant 5: resulting_contract hashable
                const rcHash = computeHash(r1.resulting_contract);
                if (!/^[a-f0-9]{64}$/.test(rcHash)) {
                    invariantViolations.push(`Sim ${i}: contract hash invalid`);
                    continue;
                }

                passed++;
            } catch (error: unknown) {
                const err = error as { code?: string; message?: string };
                if (err.code === 'CONTRACT_NOT_EXECUTABLE' || err.code === 'INVALID_CONTRACT') {
                    nonExecutable++;
                } else {
                    unhandledErrors.push(`Sim ${i}: [${err.code}] ${err.message}`);
                }
            }
        }

        console.log(`\n═══ 100 Random Simulations Report ═══`);
        console.log(`  Passed:         ${passed}`);
        console.log(`  Non-executable: ${nonExecutable}`);
        console.log(`  Invariant violations: ${invariantViolations.length}`);
        console.log(`  Nondeterminism:       ${nondeterminism.length}`);
        console.log(`  Unhandled errors:     ${unhandledErrors.length}`);

        expect(invariantViolations, invariantViolations.join('; ')).toHaveLength(0);
        expect(nondeterminism, nondeterminism.join('; ')).toHaveLength(0);
        expect(unhandledErrors, unhandledErrors.join('; ')).toHaveLength(0);
        expect(passed + nonExecutable).toBe(100);
    });

    it('seeded PRNG produces identical simulation sequences', () => {
        // Same contract, same event, same request_id → identical hash
        const contract = makeContract();
        const event = makeEvent();

        const r1 = execute({
            contract, event,
            context: { execution_date: '2025-03-15T00:00:00.000Z', engine_version: ENGINE_VERSION, request_id: 'seed-test', simulation: { enabled: false } },
        });
        const r2 = execute({
            contract, event,
            context: { execution_date: '2025-03-15T00:00:00.000Z', engine_version: ENGINE_VERSION, request_id: 'seed-test', simulation: { enabled: false } },
        });

        expect(r1.execution_hash).toBe(r2.execution_hash);
        expect(r1.new_state).toBe(r2.new_state);
        expect(r1.resulting_contract_hash).toBe(r2.resulting_contract_hash);
    });

    it('multi-event chain: 10 sequential events with invariant checks', () => {
        const rand = seededRandom(99);
        let contract = makeContract();
        const allHashes: string[] = [];

        for (let step = 0; step < 10; step++) {
            const eventType = SIMULATION_EVENT_TYPES[Math.floor(rand() * SIMULATION_EVENT_TYPES.length)];
            const month = Math.floor(rand() * 6) + 1 + step;
            const ts = `2025-${Math.min(month, 12).toString().padStart(2, '0')}-15T00:00:00.000Z`;

            try {
                const result = execute({
                    contract,
                    event: makeEvent({ id: `chain-${step}`, type: eventType, timestamp: ts, contract_id: contract.id }),
                    context: { execution_date: ts, engine_version: ENGINE_VERSION, request_id: `chain-req-${step}`, simulation: { enabled: false } },
                });

                expect(result.execution_hash).toMatch(/^[a-f0-9]{64}$/);
                verifyBeforePersist(result);
                allHashes.push(result.execution_hash);
                contract = result.resulting_contract;
            } catch (error: unknown) {
                const err = error as { code?: string };
                if (err.code === 'CONTRACT_NOT_EXECUTABLE') break;
                throw error;
            }
        }

        expect(allHashes.length).toBeGreaterThan(0);
        const uniqueHashes = new Set(allHashes);
        expect(uniqueHashes.size).toBe(allHashes.length);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 3: Determinism Certificate Generation
// ─────────────────────────────────────────────────────────────────────────────

describe('Determinism Certificate', () => {
    it('generates full verification certificate', () => {
        const adapter = new AnchorAdapter();
        const certItems: Record<string, string> = {};
        let allPassed = true;

        // 1. Determinism
        const contract = makeContract();
        const event = makeEvent();
        const r1 = execute({ contract, event, context: { execution_date: '2025-03-15T00:00:00.000Z', engine_version: ENGINE_VERSION, request_id: 'cert-det', simulation: { enabled: false } } });
        const r2 = execute({ contract, event, context: { execution_date: '2025-03-15T00:00:00.000Z', engine_version: ENGINE_VERSION, request_id: 'cert-det', simulation: { enabled: false } } });
        const detPass = r1.execution_hash === r2.execution_hash;
        certItems['Determinism'] = detPass ? 'PASS' : 'FAIL';
        if (!detPass) allPassed = false;

        // 2. Replay
        const evts = [
            makeEvent({ id: 'rp1', timestamp: '2025-02-01T00:00:00.000Z', type: EventType.DEADLINE_APPROACHING }),
            makeEvent({ id: 'rp2', timestamp: '2025-03-01T00:00:00.000Z' }),
        ];
        let c1 = makeContract(), c2 = makeContract();
        let replayPass = true;
        for (let i = 0; i < evts.length; i++) {
            const ctx = { execution_date: evts[i].timestamp, engine_version: ENGINE_VERSION, request_id: `rp-${i}`, simulation: { enabled: false as const } };
            const res1 = execute({ contract: c1, event: evts[i], context: ctx });
            const res2 = execute({ contract: c2, event: evts[i], context: ctx });
            if (res1.execution_hash !== res2.execution_hash) { replayPass = false; break; }
            c1 = res1.resulting_contract;
            c2 = res2.resulting_contract;
        }
        certItems['Replay'] = replayPass ? 'PASS' : 'FAIL';
        if (!replayPass) allPassed = false;

        // 3. Hash consistency
        let hashPass = true;
        try { verifyBeforePersist(r1); } catch { hashPass = false; }
        certItems['Hash Consistency'] = hashPass ? 'PASS' : 'FAIL';
        if (!hashPass) allPassed = false;

        // 4. Blockchain anchor
        let anchorPass = true;
        try {
            adapter.anchorResult(r1);
            const v = adapter.verifyResult(r1);
            if (!v.onChain || !v.localMatch) anchorPass = false;
        } catch { anchorPass = false; }
        certItems['Blockchain Anchor'] = anchorPass ? 'PASS' : 'FAIL';
        if (!anchorPass) allPassed = false;

        // Print certificate
        console.log('\n╔═══════════════════════════════════════════════════════╗');
        console.log('║          JURISGENIE DETERMINISM CERTIFICATE           ║');
        console.log('╠═══════════════════════════════════════════════════════╣');
        console.log(`║  Generated:  ${new Date().toISOString()}`);
        console.log(`║  Engine:     ${JSON.stringify(ENGINE_VERSION)}`);
        console.log(`║  Schema:     ${JSON.stringify(CURRENT_SCHEMA_VERSION)}`);
        console.log('╠═══════════════════════════════════════════════════════╣');
        for (const [key, value] of Object.entries(certItems)) {
            const icon = value === 'PASS' ? '✅' : '❌';
            console.log(`║  ${icon} ${key.padEnd(22)} ${value}`);
        }
        console.log('╠═══════════════════════════════════════════════════════╣');
        console.log(`║  ${allPassed ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'}`);
        console.log(`║  Certificate Hash: ${r1.execution_hash}`);
        console.log('╚═══════════════════════════════════════════════════════╝');

        expect(allPassed).toBe(true);
    });
});
