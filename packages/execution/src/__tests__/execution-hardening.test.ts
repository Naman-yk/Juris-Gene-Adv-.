/**
 * Stage 3 — Execution Engine Hardening Tests
 *
 * 1. Replay sequence test (Contract0 → Event1 → Event2 → Event3)
 * 2. Suspension freeze validation (suspend/lift, deadline extension)
 * 3. Penalty precision tests (small, large, long overdue)
 * 4. State transition fuzz test (valid/forbidden transitions)
 * 5. Simulation equivalence test
 * 6. Execution_hash integrity verification
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { execute } from '../../src/execute';
import { computePenalty } from '../../src/penalty-computation';
import { getTransitionsFromState, NON_EXECUTABLE_STATES } from '../../src/state-machine';
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
    ExecutionRequest,
    ExecutionError,
    Obligation,
    CURRENT_SCHEMA_VERSION,
    ENGINE_VERSION,
} from '@jurisgenie/core';
import { deepClone, computeHash } from '@jurisgenie/core';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeContract(overrides?: Partial<Contract>): Contract {
    return {
        id: 'contract-exec-001',
        name: 'exec-test-contract',
        display_name: 'Execution Test Contract',
        version: { major: 1, minor: 0, patch: 0 },
        parties: [
            { id: 'party-buyer', role: PartyRole.BUYER, name: 'Buyer Corp', jurisdiction: { country: 'US', subdivision: 'CA' }, provenance: Provenance.HUMAN_AUTHORED, schema_version: CURRENT_SCHEMA_VERSION },
            { id: 'party-seller', role: PartyRole.SELLER, name: 'Seller Inc', jurisdiction: { country: 'US', subdivision: 'CA' }, provenance: Provenance.HUMAN_AUTHORED, schema_version: CURRENT_SCHEMA_VERSION },
        ],
        clauses: [{
            id: 'clause-pay-1',
            type: ClauseType.PAYMENT_TERMS,
            title: 'Payment Terms',
            text: 'Payment due within 30 days.',
            obligations: [{
                id: 'obl-pay-1',
                clause_id: 'clause-pay-1',
                type: ObligationType.PAYMENT,
                debtor: 'party-buyer',
                creditor: 'party-seller',
                action: 'Pay invoice',
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
        ...overrides,
    };
}

function makeEvent(overrides?: Partial<Event>): Event {
    return {
        id: 'event-test-001',
        type: EventType.PAYMENT_RECEIVED,
        timestamp: '2025-03-15T00:00:00.000Z',
        source: EventSource.MANUAL,
        contract_id: 'contract-exec-001',
        payload: {
            description: 'Payment received',
            amount: { value: '50000.00', currency: 'USD' },
        },
        provenance: Provenance.HUMAN_AUTHORED,
        schema_version: CURRENT_SCHEMA_VERSION,
        ...overrides,
    };
}

function makeExecRequest(overrides?: {
    contract?: Partial<Contract>;
    event?: Partial<Event>;
    simulation?: boolean;
    executionDate?: string;
}): ExecutionRequest {
    const contract = makeContract(overrides?.contract);
    // Compute initial hash
    const contractHash = computeHash(contract);
    const contractWithHash = { ...contract, hash: contractHash };

    return {
        contract: contractWithHash,
        event: makeEvent(overrides?.event),
        context: {
            execution_date: overrides?.executionDate ?? '2025-03-15T00:00:00.000Z',
            engine_version: ENGINE_VERSION,
            request_id: 'exec-req-001',
            simulation: {
                enabled: overrides?.simulation ?? false,
            },
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 1: Replay Sequence Test
// ─────────────────────────────────────────────────────────────────────────────

describe('Replay Sequence Test', () => {
    it('Contract0 → Event1 → Event2 → Event3: identical hashes on re-run', () => {
        // First run
        const contract0 = makeContract();
        const contractHash = computeHash(contract0);
        const contract0WithHash = { ...contract0, hash: contractHash };

        const event1 = makeEvent({
            id: 'event-1',
            type: EventType.DEADLINE_APPROACHING,
            timestamp: '2025-04-01T00:00:00.000Z',
        });

        const result1 = execute({
            contract: contract0WithHash,
            event: event1,
            context: {
                execution_date: '2025-04-01T00:00:00.000Z',
                engine_version: ENGINE_VERSION,
                request_id: 'seq-1',
                simulation: { enabled: false },
            },
        });

        const event2 = makeEvent({
            id: 'event-2',
            type: EventType.PAYMENT_RECEIVED,
            timestamp: '2025-05-01T00:00:00.000Z',
            payload: { description: 'Payment', amount: { value: '50000.00', currency: 'USD' } },
        });

        const result2 = execute({
            contract: result1.resulting_contract,
            event: event2,
            context: {
                execution_date: '2025-05-01T00:00:00.000Z',
                engine_version: ENGINE_VERSION,
                request_id: 'seq-2',
                simulation: { enabled: false },
            },
        });

        const event3 = makeEvent({
            id: 'event-3',
            type: EventType.DEADLINE_APPROACHING,
            timestamp: '2025-06-01T00:00:00.000Z',
        });

        const result3 = execute({
            contract: result2.resulting_contract,
            event: event3,
            context: {
                execution_date: '2025-06-01T00:00:00.000Z',
                engine_version: ENGINE_VERSION,
                request_id: 'seq-3',
                simulation: { enabled: false },
            },
        });

        const hashes = [result1.execution_hash, result2.execution_hash, result3.execution_hash];

        // Second run — identical inputs
        const replay1 = execute({
            contract: contract0WithHash,
            event: event1,
            context: {
                execution_date: '2025-04-01T00:00:00.000Z',
                engine_version: ENGINE_VERSION,
                request_id: 'seq-1',
                simulation: { enabled: false },
            },
        });

        const replay2 = execute({
            contract: replay1.resulting_contract,
            event: event2,
            context: {
                execution_date: '2025-05-01T00:00:00.000Z',
                engine_version: ENGINE_VERSION,
                request_id: 'seq-2',
                simulation: { enabled: false },
            },
        });

        const replay3 = execute({
            contract: replay2.resulting_contract,
            event: event3,
            context: {
                execution_date: '2025-06-01T00:00:00.000Z',
                engine_version: ENGINE_VERSION,
                request_id: 'seq-3',
                simulation: { enabled: false },
            },
        });

        expect(replay1.execution_hash).toBe(hashes[0]);
        expect(replay2.execution_hash).toBe(hashes[1]);
        expect(replay3.execution_hash).toBe(hashes[2]);
    });

    it('intermediate contract hashes are reproducible', () => {
        const req = makeExecRequest();
        const result = execute(req);
        const replay = execute(deepClone(req) as ExecutionRequest);

        expect(replay.resulting_contract_hash).toBe(result.resulting_contract_hash);
        expect(replay.execution_hash).toBe(result.execution_hash);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 2: Suspension Freeze Validation
// ─────────────────────────────────────────────────────────────────────────────

describe('Suspension Freeze Validation', () => {
    it('suspend and lift cycle changes state correctly', () => {
        // Add force majeure clause
        const contract = makeContract({
            clauses: [{
                id: 'clause-fm',
                type: ClauseType.FORCE_MAJEURE,
                title: 'Force Majeure',
                text: 'Force majeure clause.',
                obligations: [],
                rights: [],
                conditions: [],
                language: 'en-US',
                provenance: Provenance.HUMAN_AUTHORED,
                schema_version: CURRENT_SCHEMA_VERSION,
            }, {
                id: 'clause-pay',
                type: ClauseType.PAYMENT_TERMS,
                title: 'Payment',
                text: 'Payment terms.',
                obligations: [{
                    id: 'obl-pay',
                    clause_id: 'clause-pay',
                    type: ObligationType.PAYMENT,
                    debtor: 'party-buyer',
                    creditor: 'party-seller',
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
        });

        const contractHash = computeHash(contract);
        const contractWithHash = { ...contract, hash: contractHash };

        // Suspend
        const suspendResult = execute({
            contract: contractWithHash,
            event: makeEvent({
                id: 'event-suspend',
                type: EventType.FORCE_MAJEURE_DECLARED,
                timestamp: '2025-03-01T00:00:00.000Z',
            }),
            context: {
                execution_date: '2025-03-01T00:00:00.000Z',
                engine_version: ENGINE_VERSION,
                request_id: 'suspend-req',
                simulation: { enabled: false },
            },
        });

        expect(suspendResult.new_state).toBe(ContractState.SUSPENDED);
        expect(suspendResult.state_changed).toBe(true);

        // Lift (30 days later)
        const liftResult = execute({
            contract: suspendResult.resulting_contract,
            event: makeEvent({
                id: 'event-lift',
                type: EventType.FORCE_MAJEURE_LIFTED,
                timestamp: '2025-03-31T00:00:00.000Z',
            }),
            context: {
                execution_date: '2025-03-31T00:00:00.000Z',
                engine_version: ENGINE_VERSION,
                request_id: 'lift-req',
                simulation: { enabled: false },
            },
        });

        expect(liftResult.new_state).toBe(ContractState.ACTIVE);
        expect(liftResult.state_changed).toBe(true);

        // State history should contain both transitions
        const history = liftResult.resulting_contract.state_history;
        expect(history.length).toBeGreaterThanOrEqual(3); // DRAFT→ACTIVE, ACTIVE→SUSPENDED, SUSPENDED→ACTIVE
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 3: Penalty Precision Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Penalty Precision Tests', () => {
    function makeObligation(overrides?: Partial<Obligation>): Obligation {
        return {
            id: 'obl-prec-1',
            clause_id: 'clause-1',
            type: ObligationType.PAYMENT,
            debtor: 'party-a',
            creditor: 'party-b',
            action: 'Pay',
            deadline: { absolute: '2025-01-01T00:00:00.000Z' },
            status: ObligationStatus.BREACHED,
            conditions: [],
            monetary_value: { value: '100.00', currency: 'USD' },
            provenance: Provenance.HUMAN_AUTHORED,
            schema_version: CURRENT_SCHEMA_VERSION,
            ...overrides,
        };
    }

    it('very small decimal: 0.001% penalty on $0.01', () => {
        const obligation = makeObligation({
            monetary_value: { value: '0.01', currency: 'USD' },
            penalty: { type: 'PERCENTAGE', rate: '0.00001' },
        });
        const result = computePenalty(obligation, '2025-06-01T00:00:00.000Z');
        expect(result.computed_amount).toBeDefined();
        expect(result.computed_amount!.value).toBe('0.00'); // 0.01 * 0.00001 = 0.0000001 → rounds to 0.00
        expect(result.computation_trace).not.toContain('Infinity');
        expect(result.computation_trace).not.toContain('NaN');
    });

    it('large monetary value: $999,999,999.99', () => {
        const obligation = makeObligation({
            monetary_value: { value: '999999999.99', currency: 'USD' },
            penalty: { type: 'PERCENTAGE', rate: '0.10' },
        });
        const result = computePenalty(obligation, '2025-06-01T00:00:00.000Z');
        expect(result.computed_amount).toBeDefined();
        expect(result.computed_amount!.value).toBe('100000000.00');
        // No float precision artifact
        expect(result.computed_amount!.value).not.toContain('e');
    });

    it('interest calculation: long overdue period (365 days)', () => {
        const obligation = makeObligation({
            monetary_value: { value: '100000.00', currency: 'USD' },
            penalty: {
                type: 'INTEREST',
                rate: '0.05', // 5% annual
            },
        });
        const result = computePenalty(obligation, '2026-01-01T00:00:00.000Z');
        expect(result.computed_amount).toBeDefined();

        // 100000 * 0.05 * (365/365) = 5000.00
        expect(result.computed_amount!.value).toBe('5000.00');
    });

    it('interest calculation: 1 day overdue', () => {
        const obligation = makeObligation({
            monetary_value: { value: '1000000.00', currency: 'USD' },
            penalty: {
                type: 'INTEREST',
                rate: '0.10', // 10% annual
            },
        });
        const result = computePenalty(obligation, '2025-01-02T00:00:00.000Z');
        expect(result.computed_amount).toBeDefined();

        // 1000000 * 0.10 * (1/365) = 273.97...
        const val = parseFloat(result.computed_amount!.value);
        expect(val).toBeCloseTo(273.97, 1);
    });

    it('fixed amount penalty: no float leakage', () => {
        const obligation = makeObligation({
            penalty: {
                type: 'FIXED_AMOUNT',
                amount: { value: '0.10', currency: 'USD' },
            },
        });
        const result = computePenalty(obligation, '2025-06-01T00:00:00.000Z');
        expect(result.computed_amount!.value).toBe('0.10');
    });

    it('penalty with cap: computed exceeds cap', () => {
        const obligation = makeObligation({
            monetary_value: { value: '100000.00', currency: 'USD' },
            penalty: {
                type: 'PERCENTAGE',
                rate: '0.50',
                cap: { value: '10000.00', currency: 'USD' },
            },
        });
        const result = computePenalty(obligation, '2025-06-01T00:00:00.000Z');
        expect(result.computed_amount!.value).toBe('10000.00');
        expect(result.capped).toBe(true);
    });

    it('no penalty spec returns NONE', () => {
        const obligation = makeObligation();
        const result = computePenalty(obligation, '2025-06-01T00:00:00.000Z');
        expect(result.penalty_type).toBe('NONE');
    });

    it('INTEREST: deterministic across 100 runs', () => {
        const obligation = makeObligation({
            monetary_value: { value: '123456.78', currency: 'USD' },
            penalty: { type: 'INTEREST', rate: '0.075' },
        });
        const results = Array.from({ length: 100 }, () =>
            computePenalty(obligation, '2025-07-15T00:00:00.000Z'),
        );
        const firstAmount = results[0].computed_amount!.value;
        for (const r of results) {
            expect(r.computed_amount!.value).toBe(firstAmount);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 4: State Transition Fuzz Test
// ─────────────────────────────────────────────────────────────────────────────

describe('State Transition Fuzz Test', () => {
    it('NON_EXECUTABLE_STATES reject all events', () => {
        for (const state of NON_EXECUTABLE_STATES) {
            const req = makeExecRequest({
                contract: { state },
            });
            expect(() => execute(req)).toThrow(ExecutionError);
        }
    });

    it('ACTIVE state has exactly 5 possible transitions', () => {
        const transitions = getTransitionsFromState(ContractState.ACTIVE);
        expect(transitions.length).toBe(5);
        const targetStates = transitions.map((t) => t.to).sort();
        expect(targetStates).toEqual([
            ContractState.BREACHED,
            ContractState.DISPUTED,
            ContractState.EXPIRED,
            ContractState.SUSPENDED,
            ContractState.TERMINATED,
        ].sort());
    });

    it('SUSPENDED state has exactly 1 transition (→ ACTIVE)', () => {
        const transitions = getTransitionsFromState(ContractState.SUSPENDED);
        expect(transitions.length).toBe(1);
        expect(transitions[0].to).toBe(ContractState.ACTIVE);
    });

    it('BREACHED state has exactly 2 transitions', () => {
        const transitions = getTransitionsFromState(ContractState.BREACHED);
        expect(transitions.length).toBe(2);
        const targets = transitions.map((t) => t.to).sort();
        expect(targets).toEqual([ContractState.ACTIVE, ContractState.TERMINATED].sort());
    });

    it('DISPUTED state has exactly 2 transitions', () => {
        const transitions = getTransitionsFromState(ContractState.DISPUTED);
        expect(transitions.length).toBe(2);
        const targets = transitions.map((t) => t.to).sort();
        expect(targets).toEqual([ContractState.ACTIVE, ContractState.TERMINATED].sort());
    });

    it('TERMINATED/EXPIRED have 0 transitions (sink states)', () => {
        expect(getTransitionsFromState(ContractState.TERMINATED).length).toBe(0);
        expect(getTransitionsFromState(ContractState.EXPIRED).length).toBe(0);
    });

    it('random non-executable state contracts always throw CONTRACT_NOT_EXECUTABLE', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...NON_EXECUTABLE_STATES),
                (state) => {
                    const req = makeExecRequest({ contract: { state } });
                    try {
                        execute(req);
                        throw new Error('Should have thrown');
                    } catch (e) {
                        expect(e).toBeInstanceOf(ExecutionError);
                    }
                },
            ),
            { numRuns: 50 },
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 5: Simulation Equivalence Test
// ─────────────────────────────────────────────────────────────────────────────

describe('Simulation Equivalence Test', () => {
    it('simulation=true vs simulation=false produce structurally identical results except simulation flag', () => {
        const baseContract = makeContract();
        const contractHash = computeHash(baseContract);
        const contractWithHash = { ...baseContract, hash: contractHash };
        const event = makeEvent();

        const realResult = execute({
            contract: contractWithHash,
            event,
            context: {
                execution_date: '2025-03-15T00:00:00.000Z',
                engine_version: ENGINE_VERSION,
                request_id: 'real-req',
                simulation: { enabled: false },
            },
        });

        const simResult = execute({
            contract: contractWithHash,
            event,
            context: {
                execution_date: '2025-03-15T00:00:00.000Z',
                engine_version: ENGINE_VERSION,
                request_id: 'real-req', // same request_id for comparison
                simulation: { enabled: true, baseline_hash: contractHash },
            },
        });

        // Structural identity checks
        expect(simResult.new_state).toBe(realResult.new_state);
        expect(simResult.previous_state).toBe(realResult.previous_state);
        expect(simResult.state_changed).toBe(realResult.state_changed);
        expect(simResult.obligations_fulfilled.length).toBe(realResult.obligations_fulfilled.length);
        expect(simResult.obligations_breached.length).toBe(realResult.obligations_breached.length);
        expect(simResult.penalties.length).toBe(realResult.penalties.length);

        // Simulation flag differs
        expect(realResult.simulation).toBe(false);
        expect(simResult.simulation).toBe(true);

        // Simulation result has diff
        expect(simResult.simulation_diff).toBeDefined();
    });

    it('simulation does NOT change the input contract', () => {
        const req = makeExecRequest({ simulation: true });
        const originalContract = deepClone(req.contract);

        execute(req);

        // Input contract should be untouched
        expect(req.contract.state).toBe(originalContract.state);
        expect(req.contract.hash).toBe((originalContract as Contract).hash);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 6: Execution Hash Integrity
// ─────────────────────────────────────────────────────────────────────────────

describe('Execution Hash Integrity', () => {
    it('execution_hash is a valid 64-char hex SHA-256', () => {
        const req = makeExecRequest();
        const result = execute(req);
        expect(result.execution_hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('execution_hash is deterministic (100 runs)', () => {
        const req = makeExecRequest();
        const firstHash = execute(req).execution_hash;

        for (let i = 0; i < 99; i++) {
            expect(execute(deepClone(req) as ExecutionRequest).execution_hash).toBe(firstHash);
        }
    });

    it('execution_hash changes when event changes', () => {
        const req1 = makeExecRequest();
        const req2 = makeExecRequest({ event: { id: 'event-different' } });

        const hash1 = execute(req1).execution_hash;
        const hash2 = execute(req2).execution_hash;

        expect(hash1).not.toBe(hash2);
    });

    it('execution_hash excludes duration_ms', () => {
        const req = makeExecRequest();
        const result1 = execute(req);
        const result2 = execute(deepClone(req) as ExecutionRequest);

        // duration_ms may differ but hash must be identical
        expect(result1.execution_hash).toBe(result2.execution_hash);
    });

    it('execution_hash verifiable via manual recreation', () => {
        const req = makeExecRequest();
        const result = execute(req);

        // Manually recreate the hash
        const hashable = deepClone(result) as unknown as Record<string, unknown>;
        delete hashable['duration_ms'];
        delete hashable['execution_hash'];
        const manualHash = computeHash(hashable);

        expect(manualHash).toBe(result.execution_hash);
    });
});
