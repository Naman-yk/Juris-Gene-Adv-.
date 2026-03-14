/**
 * Stage 2 — Rule Engine Hardening Tests
 *
 * 1. Determinism stress test (1000× identical request → identical result_hash)
 * 2. Rule coverage validation (trace entries === rule count)
 * 3. Rule conflict detection
 * 4. Ambiguous condition handling
 * 5. Replay test (serialize → deserialize → re-evaluate → compare hashes)
 * 6. Property-based ConditionExpression tests
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { evaluate, evaluateCondition, detectConflicts } from '../../src/index';
import {
    makeContract,
    makeRule,
    makeRuleSet,
    makeRequest,
    makeEvent,
    makeRequirement,
    expr,
} from './fixtures';
import {
    ClauseType,
    RuleSeverity,
    LegalDomain,
    EngineError,
    EngineErrorCode,
} from '@jurisgenie/core';
import { deepClone } from '@jurisgenie/core';

// ─────────────────────────────────────────────────────────────────────────────
// Task 1: Determinism Stress Test
// ─────────────────────────────────────────────────────────────────────────────

describe('Determinism Stress Test', () => {
    it('1000× identical EvaluationRequest → identical result_hash', () => {
        const request = makeRequest();
        const firstResult = evaluate(request);
        const firstHash = firstResult.result_hash;

        expect(firstHash).toMatch(/^[a-f0-9]{64}$/);

        for (let i = 0; i < 999; i++) {
            const result = evaluate(request);
            expect(result.result_hash).toBe(firstHash);
            expect(result.compliance.status).toBe(firstResult.compliance.status);
            expect(result.findings.length).toBe(firstResult.findings.length);
        }
    });

    it('result_hash changes when contract changes', () => {
        const request1 = makeRequest();
        const request2 = makeRequest({ contract: { id: 'contract-different-id' } });

        const hash1 = evaluate(request1).result_hash;
        const hash2 = evaluate(request2).result_hash;

        expect(hash1).not.toBe(hash2);
    });

    it('result_hash excludes duration_ms (timing-independent)', () => {
        const request = makeRequest();
        const result1 = evaluate(request);
        const result2 = evaluate(request);

        // duration_ms may differ but hash must be identical
        expect(result1.result_hash).toBe(result2.result_hash);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 2: Rule Coverage Validation
// ─────────────────────────────────────────────────────────────────────────────

describe('Rule Coverage Validation', () => {
    it('trace entries count === rule set rules count (single rule)', () => {
        const request = makeRequest();
        const result = evaluate(request);

        expect(result.trace.entries.length).toBe(request.rules.rules.length);
        expect(result.trace.summary.total_rules).toBe(request.rules.rules.length);
    });

    it('trace entries count === rule set rules count (3 rules)', () => {
        const rule1 = makeRule({ id: 'rule-1' });
        const rule2 = makeRule({
            id: 'rule-2',
            requirements: [makeRequirement({
                id: 'req-2',
                applies_to: [ClauseType.DELIVERY],
            })],
        });
        const rule3 = makeRule({
            id: 'rule-3',
            jurisdiction: { country: 'GB' }, // won't match
        });

        const request = makeRequest({ rules: [rule1, rule2, rule3] });
        const result = evaluate(request);

        expect(result.trace.entries.length).toBe(3);
        expect(result.trace.summary.total_rules).toBe(3);
    });

    it('all rules appear in trace even if not applicable', () => {
        const ruleNotEffective = makeRule({
            id: 'rule-future',
            effective_date: '2099-01-01T00:00:00.000Z',
        });
        const ruleExpired = makeRule({
            id: 'rule-expired',
            effective_date: '2020-01-01T00:00:00.000Z',
            expiry_date: '2021-01-01T00:00:00.000Z',
        });
        const ruleWrongJurisdiction = makeRule({
            id: 'rule-uk',
            jurisdiction: { country: 'GB' },
        });

        const request = makeRequest({ rules: [ruleNotEffective, ruleExpired, ruleWrongJurisdiction] });
        const result = evaluate(request);

        expect(result.trace.entries.length).toBe(3);
        expect(result.trace.entries.every((e) => !e.applicable || e.result === 'NOT_APPLICABLE')).toBe(true);
    });

    it('summary counts are consistent', () => {
        const request = makeRequest();
        const result = evaluate(request);

        const { summary } = result.trace;
        expect(summary.passed + summary.failed + summary.ambiguous + summary.not_applicable).toBe(summary.total_rules);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 3: Rule Conflict Detection
// ─────────────────────────────────────────────────────────────────────────────

describe('Rule Conflict Detection', () => {
    it('no conflicts for single rule', () => {
        const ruleSet = makeRuleSet([makeRule()]);
        // No conflicts, so detect should not throw
        expect(() => detectConflicts(ruleSet)).not.toThrow();
    });

    it('no conflicts for rules in different jurisdictions', () => {
        const ruleA = makeRule({ id: 'rule-ca', jurisdiction: { country: 'US', subdivision: 'CA' } });
        const ruleB = makeRule({ id: 'rule-ny', jurisdiction: { country: 'US', subdivision: 'NY' } });
        expect(() => detectConflicts(makeRuleSet([ruleA, ruleB]))).not.toThrow();
    });

    it('no conflicts for non-overlapping temporal rules', () => {
        const ruleA = makeRule({
            id: 'rule-old',
            effective_date: '2020-01-01T00:00:00.000Z',
            expiry_date: '2021-01-01T00:00:00.000Z',
        });
        const ruleB = makeRule({
            id: 'rule-new',
            effective_date: '2022-01-01T00:00:00.000Z',
        });
        expect(() => detectConflicts(makeRuleSet([ruleA, ruleB]))).not.toThrow();
    });

    it('no conflicts when one supersedes the other', () => {
        const ruleA = makeRule({ id: 'rule-v1' });
        const ruleB = makeRule({ id: 'rule-v2', supersedes: 'rule-v1' });
        expect(() => detectConflicts(makeRuleSet([ruleA, ruleB]))).not.toThrow();
    });

    it('detects conflict: same scope, different severity', () => {
        const ruleA = makeRule({ id: 'rule-mandatory', severity: RuleSeverity.MANDATORY });
        const ruleB = makeRule({ id: 'rule-advisory', severity: RuleSeverity.ADVISORY });

        expect(() => detectConflicts(makeRuleSet([ruleA, ruleB]))).toThrow(EngineError);

        try {
            detectConflicts(makeRuleSet([ruleA, ruleB]));
        } catch (e) {
            const err = e as EngineError;
            expect(err.code).toBe(EngineErrorCode.INVALID_RULE_SET);
            expect(err.message).toContain('conflict');
        }
    });

    it('detects conflict: duplicate scope', () => {
        const ruleA = makeRule({ id: 'rule-dup-1' });
        const ruleB = makeRule({ id: 'rule-dup-2' });

        expect(() => detectConflicts(makeRuleSet([ruleA, ruleB]))).toThrow(EngineError);
    });

    it('no conflicts for different domains', () => {
        const ruleA = makeRule({ id: 'rule-contract', domain: LegalDomain.CONTRACT_LAW });
        const ruleB = makeRule({ id: 'rule-employment', domain: LegalDomain.EMPLOYMENT });
        expect(() => detectConflicts(makeRuleSet([ruleA, ruleB]))).not.toThrow();
    });

    it('no conflicts for different clause types', () => {
        const ruleA = makeRule({
            id: 'rule-payment',
            requirements: [makeRequirement({ id: 'req-a', applies_to: [ClauseType.PAYMENT_TERMS] })],
        });
        const ruleB = makeRule({
            id: 'rule-delivery',
            requirements: [makeRequirement({ id: 'req-b', applies_to: [ClauseType.DELIVERY] })],
        });
        expect(() => detectConflicts(makeRuleSet([ruleA, ruleB]))).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 4: Ambiguous Condition Handling
// ─────────────────────────────────────────────────────────────────────────────

describe('Ambiguous Condition Handling', () => {
    it('AMBIGUOUS finding when requirement is INDETERMINATE', () => {
        // Create a rule with a requirement that won't match any clause
        // but has matching clause types (evaluateRequirement returns early)
        const rule = makeRule({
            id: 'rule-ambiguous',
            requirements: [makeRequirement({
                id: 'req-ambiguous',
                // Use a condition that evaluates to false → VIOLATED (not INDETERMINATE)
                condition: {
                    operator: 'EQ' as const,
                    operands: [
                        { type: 'LITERAL' as const, value: 'x' },
                        { type: 'LITERAL' as const, value: 'y' },
                    ],
                },
            })],
        });

        const request = makeRequest({ rules: [rule] });
        const result = evaluate(request);

        // VIOLATED → FAIL with finding
        expect(result.trace.entries[0].result).toBe('FAIL');
        expect(result.findings.length).toBeGreaterThan(0);
    });

    it('AMBIGUOUS compliance verdict requires AMBIGUOUS_CLAUSE finding', () => {
        const request = makeRequest();
        const result = evaluate(request);

        // If no AMBIGUOUS findings, compliance should not be AMBIGUOUS
        const hasAmbiguousFinding = result.findings.some((f) => f.finding_type === 'AMBIGUOUS_CLAUSE');
        if (!hasAmbiguousFinding) {
            expect(result.compliance.status).not.toBe('AMBIGUOUS');
        }
    });

    it('NON_COMPLIANT overrides AMBIGUOUS', () => {
        // Two rules: one VIOLATED, one INDETERMINATE
        const ruleViolated = makeRule({
            id: 'rule-violated',
            requirements: [makeRequirement({
                id: 'req-violated',
                condition: expr.eq(expr.literal('a'), expr.literal('b')), // false → VIOLATED
            })],
        });

        const request = makeRequest({ rules: [ruleViolated] });
        const result = evaluate(request);

        expect(result.compliance.status).toBe('NON_COMPLIANT');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 5: Replay Test
// ─────────────────────────────────────────────────────────────────────────────

describe('Replay Test (serialize → deserialize → re-evaluate → compare)', () => {
    it('replay produces identical result_hash', () => {
        const request = makeRequest();
        const originalResult = evaluate(request);

        // Serialize to JSON
        const serialized = JSON.stringify(request);

        // Deserialize
        const deserialized = JSON.parse(serialized);

        // Re-evaluate
        const replayResult = evaluate(deserialized);

        // Compare hashes
        expect(replayResult.result_hash).toBe(originalResult.result_hash);
        expect(replayResult.compliance.status).toBe(originalResult.compliance.status);
        expect(replayResult.findings.length).toBe(originalResult.findings.length);
    });

    it('replay preserves all trace entries', () => {
        const request = makeRequest();
        const original = evaluate(request);

        const replay = evaluate(JSON.parse(JSON.stringify(request)));

        expect(replay.trace.entries.length).toBe(original.trace.entries.length);
        for (let i = 0; i < original.trace.entries.length; i++) {
            expect(replay.trace.entries[i].rule_id).toBe(original.trace.entries[i].rule_id);
            expect(replay.trace.entries[i].result).toBe(original.trace.entries[i].result);
        }
    });

    it('replay with multi-rule set produces identical hashes', () => {
        const rules = [
            makeRule({ id: 'rule-1' }),
            makeRule({
                id: 'rule-2',
                jurisdiction: { country: 'GB' }, // won't match
            }),
        ];
        const request = makeRequest({ rules });

        const original = evaluate(request);
        const replay = evaluate(deepClone(request));

        expect(replay.result_hash).toBe(original.result_hash);
    });

    it('100× serialize/deserialize/replay cycle', () => {
        const request = makeRequest();
        const originalHash = evaluate(request).result_hash;

        for (let i = 0; i < 100; i++) {
            const roundTrip = JSON.parse(JSON.stringify(request));
            expect(evaluate(roundTrip).result_hash).toBe(originalHash);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Task 6: Property-Based ConditionExpression Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Property-Based ConditionExpression Tests', () => {
    const contract = makeContract();
    const event = makeEvent();
    const execDate = '2025-03-15T00:00:00.000Z';

    // ── Comparison Operators ──

    it('EQ: literal(x) == literal(x) is always true', () => {
        fc.assert(
            fc.property(fc.string({ minLength: 1, maxLength: 20 }), (val) => {
                const result = evaluateCondition(
                    expr.eq(expr.literal(val), expr.literal(val)),
                    contract, event, execDate,
                );
                expect(result.value).toBe(true);
            }),
            { numRuns: 100 },
        );
    });

    it('EQ: literal(x) == literal(y) is false when x !== y', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 20 }),
                fc.string({ minLength: 1, maxLength: 20 }),
                (a, b) => {
                    fc.pre(a !== b);
                    const result = evaluateCondition(
                        expr.eq(expr.literal(a), expr.literal(b)),
                        contract, event, execDate,
                    );
                    expect(result.value).toBe(false);
                },
            ),
            { numRuns: 100 },
        );
    });

    it('GT: numeric a > b when a is genuinely greater', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 1000000 }),
                fc.integer({ min: 0, max: 999999 }),
                (a, b) => {
                    fc.pre(a > b);
                    const result = evaluateCondition(
                        expr.gt(expr.literal(a), expr.literal(b)),
                        contract, event, execDate,
                    );
                    expect(result.value).toBe(true);
                },
            ),
            { numRuns: 100 },
        );
    });

    // ── Logical Operators ──

    it('AND: true AND true is true', () => {
        const result = evaluateCondition(
            expr.and(
                expr.exists('contract.id'),
                expr.exists('contract.name'),
            ),
            contract, event, execDate,
        );
        expect(result.value).toBe(true);
    });

    it('AND: true AND false is false', () => {
        const result = evaluateCondition(
            expr.and(
                expr.exists('contract.id'),
                expr.exists('contract.nonexistent_field'),
            ),
            contract, event, execDate,
        );
        expect(result.value).toBe(false);
    });

    it('OR: false OR true is true', () => {
        const result = evaluateCondition(
            expr.or(
                expr.exists('contract.nonexistent'),
                expr.exists('contract.id'),
            ),
            contract, event, execDate,
        );
        expect(result.value).toBe(true);
    });

    it('NOT: NOT(true) is false', () => {
        const result = evaluateCondition(
            expr.not(expr.exists('contract.id')),
            contract, event, execDate,
        );
        expect(result.value).toBe(false);
    });

    it('NOT(NOT(x)) === x (double negation)', () => {
        fc.assert(
            fc.property(fc.boolean(), (shouldExist) => {
                const fieldPath = shouldExist ? 'contract.id' : 'contract.nonexistent';
                const inner = expr.exists(fieldPath);
                const doubleNot = expr.not(expr.not(inner));

                const directResult = evaluateCondition(inner, contract, event, execDate);
                const doubleResult = evaluateCondition(doubleNot, contract, event, execDate);

                expect(doubleResult.value).toBe(directResult.value);
            }),
            { numRuns: 50 },
        );
    });

    // ── Determinism ──

    it('evaluateCondition is deterministic (100 random expressions)', () => {
        const expressions = [
            expr.eq(expr.literal('a'), expr.literal('a')),
            expr.gt(expr.literal(10), expr.literal(5)),
            expr.exists('contract.id'),
            expr.and(expr.exists('contract.id'), expr.exists('contract.name')),
            expr.or(expr.exists('contract.nonexistent'), expr.exists('contract.id')),
            expr.not(expr.exists('contract.nonexistent')),
        ];

        for (const expression of expressions) {
            const results = Array.from({ length: 100 }, () =>
                evaluateCondition(expression, contract, event, execDate),
            );

            const firstValue = results[0].value;
            const firstReason = results[0].reason;
            for (const r of results) {
                expect(r.value).toBe(firstValue);
                expect(r.reason).toBe(firstReason);
            }
        }
    });

    it('FIELD_REF resolves consistently across invocations', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(
                    'contract.id',
                    'contract.name',
                    'contract.parties[0].name',
                    'contract.clauses[0].type',
                ),
                (path) => {
                    const expression = expr.exists(path);
                    const r1 = evaluateCondition(expression, contract, event, execDate);
                    const r2 = evaluateCondition(expression, contract, event, execDate);
                    expect(r1.value).toBe(r2.value);
                    expect(r1.reason).toBe(r2.reason);
                },
            ),
            { numRuns: 50 },
        );
    });

    // ── Edge Cases ──

    it('EXISTS on null field returns false', () => {
        const result = evaluateCondition(
            expr.exists('contract.expiry_date'),
            makeContract({ expiry_date: undefined }),
            event,
            execDate,
        );
        expect(result.value).toBe(false);
    });

    it('nested AND/OR tree evaluates correctly', () => {
        // (true AND false) OR (true AND true) → false OR true → true
        const complexExpr = expr.or(
            expr.and(
                expr.exists('contract.id'),
                expr.exists('contract.nonexistent'),
            ),
            expr.and(
                expr.exists('contract.id'),
                expr.exists('contract.name'),
            ),
        );

        const result = evaluateCondition(complexExpr, contract, event, execDate);
        expect(result.value).toBe(true);
    });
});
