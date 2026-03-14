/**
 * Stage 4 — Adapter Hardening Tests
 *
 * 1. Hash-before-persist middleware (recompute, reject mismatch)
 * 2. Idempotency enforcement (cache, return cached)
 * 3. Per-contract execution lock (acquire, reject concurrent)
 * 4. Schema validation (reject malformed JSON)
 * 5. Structured audit logging (fields, query)
 * 6. Tamper simulation test (modify result, detect)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { verifyBeforePersist, HashIntegrityError } from '../../src/hash-before-persist';
import { IdempotencyStore, withIdempotency } from '../../src/idempotency';
import { ContractLock, ContractLockError } from '../../src/contract-lock';
import { validateInboundRequest, SchemaValidationError } from '../../src/schema-validation';
import { AuditLogger } from '../../src/audit-logger';
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
    ExecutionRequest,
    ExecutionResult,
    CURRENT_SCHEMA_VERSION,
    ENGINE_VERSION,
} from '@jurisgenie/core';
import { deepClone, computeHash } from '@jurisgenie/core';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeContract(overrides?: Partial<Contract>): Contract {
    const base: Contract = {
        id: 'contract-adapt-001',
        name: 'adapter-test-contract',
        display_name: 'Adapter Test Contract',
        version: { major: 1, minor: 0, patch: 0 },
        parties: [
            { id: 'party-a', role: PartyRole.BUYER, name: 'Alpha Corp', jurisdiction: { country: 'US', subdivision: 'CA' }, provenance: Provenance.HUMAN_AUTHORED, schema_version: CURRENT_SCHEMA_VERSION },
            { id: 'party-b', role: PartyRole.SELLER, name: 'Beta Inc', jurisdiction: { country: 'US', subdivision: 'CA' }, provenance: Provenance.HUMAN_AUTHORED, schema_version: CURRENT_SCHEMA_VERSION },
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
                debtor: 'party-a',
                creditor: 'party-b',
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
    return { ...base, hash: computeHash(base) };
}

function makeEvent(overrides?: Partial<Event>): Event {
    return {
        id: 'event-adapt-001',
        type: EventType.PAYMENT_RECEIVED,
        timestamp: '2025-03-15T00:00:00.000Z',
        source: EventSource.MANUAL,
        contract_id: 'contract-adapt-001',
        payload: {
            description: 'Payment received',
            amount: { value: '50000.00', currency: 'USD' },
        },
        provenance: Provenance.HUMAN_AUTHORED,
        schema_version: CURRENT_SCHEMA_VERSION,
        ...overrides,
    };
}

function makeRequest(requestId?: string): ExecutionRequest {
    return {
        contract: makeContract(),
        event: makeEvent(),
        context: {
            execution_date: '2025-03-15T00:00:00.000Z',
            engine_version: ENGINE_VERSION,
            request_id: requestId ?? 'req-adapt-001',
            simulation: { enabled: false },
        },
    };
}

function executeRequest(req?: ExecutionRequest): ExecutionResult {
    return execute(req ?? makeRequest());
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 1: Hash-Before-Persist Middleware
// ─────────────────────────────────────────────────────────────────────────────

describe('Hash-Before-Persist Middleware', () => {
    it('passes valid execution result without modification', () => {
        const result = executeRequest();
        const verified = verifyBeforePersist(result);
        expect(verified).toBe(result);
        expect(verified.execution_hash).toBe(result.execution_hash);
    });

    it('rejects result with tampered execution_hash', () => {
        const result = executeRequest();
        const tampered = { ...result, execution_hash: 'deadbeef'.repeat(8) };

        expect(() => verifyBeforePersist(tampered)).toThrow(HashIntegrityError);
    });

    it('rejects result with modified field (state tampered)', () => {
        const result = executeRequest();
        const tampered = { ...result, new_state: ContractState.TERMINATED };

        expect(() => verifyBeforePersist(tampered)).toThrow(HashIntegrityError);
    });

    it('error contains both expected and computed hashes', () => {
        const result = executeRequest();
        const tampered = { ...result, execution_hash: 'aaaa'.repeat(16) };

        try {
            verifyBeforePersist(tampered);
            throw new Error('should have thrown');
        } catch (e) {
            const err = e as HashIntegrityError;
            expect(err.expectedHash).toBe('aaaa'.repeat(16));
            expect(err.computedHash).toMatch(/^[a-f0-9]{64}$/);
            expect(err.computedHash).toBe(result.execution_hash);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 2: Idempotency Enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe('Idempotency Enforcement', () => {
    let store: IdempotencyStore;

    beforeEach(() => {
        store = new IdempotencyStore();
    });

    it('first request executes and caches', () => {
        const req = makeRequest('req-001');
        let callCount = 0;

        const result = withIdempotency(store, req, (r) => {
            callCount++;
            return execute(r);
        });

        expect(callCount).toBe(1);
        expect(store.has('req-001')).toBe(true);
        expect(result.execution_hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('duplicate request_id returns cached result without re-executing', () => {
        const req = makeRequest('req-dup');
        let callCount = 0;
        const executeFn = (r: ExecutionRequest) => {
            callCount++;
            return execute(r);
        };

        const result1 = withIdempotency(store, req, executeFn);
        const result2 = withIdempotency(store, req, executeFn);

        expect(callCount).toBe(1);
        expect(result2).toBe(result1); // Same object reference
        expect(result2.execution_hash).toBe(result1.execution_hash);
    });

    it('different request_ids are independent', () => {
        const req1 = makeRequest('req-unique-1');
        const req2 = makeRequest('req-unique-2');

        const result1 = withIdempotency(store, req1, execute);
        const result2 = withIdempotency(store, req2, execute);

        expect(store.size).toBe(2);
        expect(result1.request_id).toBe('req-unique-1');
        expect(result2.request_id).toBe('req-unique-2');
    });

    it('FIFO eviction when cache is full', () => {
        const smallStore = new IdempotencyStore(3);

        for (let i = 0; i < 4; i++) {
            const req = makeRequest(`req-evict-${i}`);
            withIdempotency(smallStore, req, execute);
        }

        expect(smallStore.size).toBe(3);
        expect(smallStore.has('req-evict-0')).toBe(false); // evicted
        expect(smallStore.has('req-evict-1')).toBe(true);
        expect(smallStore.has('req-evict-3')).toBe(true);
    });

    it('clear removes all cached results', () => {
        withIdempotency(store, makeRequest('req-clear-1'), execute);
        withIdempotency(store, makeRequest('req-clear-2'), execute);
        expect(store.size).toBe(2);

        store.clear();
        expect(store.size).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 3: Per-Contract Execution Lock
// ─────────────────────────────────────────────────────────────────────────────

describe('Per-Contract Execution Lock', () => {
    let lock: ContractLock;

    beforeEach(() => {
        lock = new ContractLock();
    });

    it('acquire and release works', () => {
        lock.acquire('contract-001', 'req-1');
        expect(lock.isLocked('contract-001')).toBe(true);

        lock.release('contract-001');
        expect(lock.isLocked('contract-001')).toBe(false);
    });

    it('concurrent lock on same contract throws', () => {
        lock.acquire('contract-001', 'req-1');

        expect(() => lock.acquire('contract-001', 'req-2')).toThrow(ContractLockError);
    });

    it('different contracts can be locked simultaneously', () => {
        lock.acquire('contract-001', 'req-1');
        lock.acquire('contract-002', 'req-2');

        expect(lock.isLocked('contract-001')).toBe(true);
        expect(lock.isLocked('contract-002')).toBe(true);
    });

    it('withLock guarantees release even on exception', () => {
        expect(() => {
            lock.withLock('contract-001', 'req-1', () => {
                expect(lock.isLocked('contract-001')).toBe(true);
                throw new Error('Execution failed');
            });
        }).toThrow('Execution failed');

        expect(lock.isLocked('contract-001')).toBe(false);
    });

    it('withLock returns function result', () => {
        const result = lock.withLock('contract-001', 'req-1', () => 42);
        expect(result).toBe(42);
        expect(lock.isLocked('contract-001')).toBe(false);
    });

    it('getLockInfo returns lock metadata', () => {
        lock.acquire('contract-001', 'req-1');
        const info = lock.getLockInfo('contract-001');
        expect(info).toBeDefined();
        expect(info!.requestId).toBe('req-1');
        expect(info!.acquiredAt).toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 4: Full Schema Validation
// ─────────────────────────────────────────────────────────────────────────────

describe('Full Schema Validation', () => {
    it('accepts valid ExecutionRequest', () => {
        const req = makeRequest();
        const validated = validateInboundRequest(req);
        expect(validated).toBe(req);
    });

    it('rejects null input', () => {
        expect(() => validateInboundRequest(null)).toThrow(SchemaValidationError);
    });

    it('rejects undefined input', () => {
        expect(() => validateInboundRequest(undefined)).toThrow(SchemaValidationError);
    });

    it('rejects non-object input', () => {
        expect(() => validateInboundRequest('string')).toThrow(SchemaValidationError);
        expect(() => validateInboundRequest(42)).toThrow(SchemaValidationError);
    });

    it('rejects missing contract', () => {
        expect(() => validateInboundRequest({
            event: makeEvent(),
            context: makeRequest().context,
        })).toThrow(SchemaValidationError);
    });

    it('rejects missing event', () => {
        expect(() => validateInboundRequest({
            contract: makeContract(),
            context: makeRequest().context,
        })).toThrow(SchemaValidationError);
    });

    it('rejects missing context', () => {
        expect(() => validateInboundRequest({
            contract: makeContract(),
            event: makeEvent(),
        })).toThrow(SchemaValidationError);
    });

    it('rejects contract without id', () => {
        const req = deepClone(makeRequest()) as unknown as Record<string, unknown>;
        delete (req['contract'] as Record<string, unknown>)['id'];

        try {
            validateInboundRequest(req);
            throw new Error('should have thrown');
        } catch (e) {
            const err = e as SchemaValidationError;
            expect(err.failures.some((f) => f.field === 'contract.id')).toBe(true);
        }
    });

    it('rejects wrong schema_version', () => {
        const req = deepClone(makeRequest()) as unknown as Record<string, unknown>;
        (req['contract'] as Record<string, unknown>)['schema_version'] = '0.0.0';

        try {
            validateInboundRequest(req);
            throw new Error('should have thrown');
        } catch (e) {
            const err = e as SchemaValidationError;
            expect(err.failures.some((f) => f.field === 'contract.schema_version')).toBe(true);
        }
    });

    it('rejects event without type', () => {
        const req = deepClone(makeRequest()) as unknown as Record<string, unknown>;
        delete (req['event'] as Record<string, unknown>)['type'];

        try {
            validateInboundRequest(req);
            throw new Error('should have thrown');
        } catch (e) {
            const err = e as SchemaValidationError;
            expect(err.failures.some((f) => f.field === 'event.type')).toBe(true);
        }
    });

    it('rejects context without request_id', () => {
        const req = deepClone(makeRequest()) as unknown as Record<string, unknown>;
        delete (req['context'] as Record<string, unknown>)['request_id'];

        try {
            validateInboundRequest(req);
            throw new Error('should have thrown');
        } catch (e) {
            const err = e as SchemaValidationError;
            expect(err.failures.some((f) => f.field === 'context.request_id')).toBe(true);
        }
    });

    it('collects multiple failures in one error', () => {
        try {
            validateInboundRequest({ contract: {}, event: {}, context: {} });
            throw new Error('should have thrown');
        } catch (e) {
            const err = e as SchemaValidationError;
            expect(err.failures.length).toBeGreaterThan(3);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 5: Structured Audit Logging
// ─────────────────────────────────────────────────────────────────────────────

describe('Structured Audit Logging', () => {
    let logger: AuditLogger;

    beforeEach(() => {
        logger = new AuditLogger();
    });

    it('logs execution result with all required fields', () => {
        const result = executeRequest();
        const entry = logger.log(result);

        expect(entry.request_id).toBe(result.request_id);
        expect(entry.execution_hash).toBe(result.execution_hash);
        expect(entry.previous_state).toBe(result.previous_state);
        expect(entry.new_state).toBe(result.new_state);
        expect(entry.state_changed).toBe(result.state_changed);
        expect(entry.contract_id).toBe(result.contract_id);
        expect(entry.simulation).toBe(result.simulation);
        expect(entry.timestamp).toBeDefined();
    });

    it('tracks multiple entries', () => {
        const result1 = execute(makeRequest('req-audit-1'));
        const result2 = execute(makeRequest('req-audit-2'));

        logger.log(result1);
        logger.log(result2);

        expect(logger.count).toBe(2);
    });

    it('getByContract returns only matching entries', () => {
        const result = executeRequest();
        logger.log(result);

        const entries = logger.getByContract(result.contract_id);
        expect(entries.length).toBe(1);
        expect(entries[0].contract_id).toBe(result.contract_id);

        const notFound = logger.getByContract('nonexistent');
        expect(notFound.length).toBe(0);
    });

    it('getByRequestId returns matching entry', () => {
        const result = execute(makeRequest('req-find-me'));
        logger.log(result);

        const found = logger.getByRequestId('req-find-me');
        expect(found).toBeDefined();
        expect(found!.execution_hash).toBe(result.execution_hash);
    });

    it('clear removes all entries', () => {
        logger.log(executeRequest());
        logger.log(executeRequest());
        expect(logger.count).toBe(2);

        logger.clear();
        expect(logger.count).toBe(0);
    });

    it('audit entry is a snapshot (immutable)', () => {
        const result = executeRequest();
        const entry = logger.log(result);

        const stored = logger.getEntries();
        expect(stored[0].execution_hash).toBe(entry.execution_hash);
        expect(stored[0].request_id).toBe(entry.request_id);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 6: Tamper Simulation Test
// ─────────────────────────────────────────────────────────────────────────────

describe('Tamper Simulation Test', () => {
    it('detects tampered new_state', () => {
        const result = executeRequest();
        const tampered = { ...result, new_state: ContractState.TERMINATED };

        expect(() => verifyBeforePersist(tampered)).toThrow(HashIntegrityError);
    });

    it('detects tampered contract_id', () => {
        const result = executeRequest();
        const tampered = { ...result, contract_id: 'hacked-contract' };

        expect(() => verifyBeforePersist(tampered)).toThrow(HashIntegrityError);
    });

    it('detects tampered execution_date', () => {
        const result = executeRequest();
        const tampered = { ...result, execution_date: '1999-01-01T00:00:00.000Z' };

        expect(() => verifyBeforePersist(tampered)).toThrow(HashIntegrityError);
    });

    it('detects tampered penalties array', () => {
        const result = executeRequest();
        const tampered = {
            ...result,
            penalties: [
                ...result.penalties,
                { obligation_id: 'fake', penalty_type: 'FIXED_AMOUNT', computation_trace: 'injected', capped: false },
            ],
        };

        expect(() => verifyBeforePersist(tampered)).toThrow(HashIntegrityError);
    });

    it('detects tampered simulation flag', () => {
        const result = executeRequest();
        const tampered = { ...result, simulation: !result.simulation };

        expect(() => verifyBeforePersist(tampered)).toThrow(HashIntegrityError);
    });

    it('detects tampered resulting_contract_hash', () => {
        const result = executeRequest();
        const tampered = { ...result, resulting_contract_hash: 'ffff'.repeat(16) };

        expect(() => verifyBeforePersist(tampered)).toThrow(HashIntegrityError);
    });

    it('unmodified result passes all tampering checks', () => {
        const result = executeRequest();
        expect(() => verifyBeforePersist(result)).not.toThrow();
    });
});
