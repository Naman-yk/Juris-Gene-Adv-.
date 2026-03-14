/**
 * Engine Test Fixtures
 *
 * Shared helpers for building valid EvaluationRequests and components
 * used across all Stage 2 test suites.
 */

import {
    Contract,
    ContractState,
    PartyRole,
    Provenance,
    ClauseType,
    ObligationType,
    ObligationStatus,
    EvaluationMode,
    EvaluationRequest,
    EvaluationContext,
    JurisdictionRule,
    JurisdictionRuleSet,
    LegalDomain,
    RuleSeverity,
    Requirement,
    ConditionExpression,
    Event,
    EventType,
    EventSource,
    CURRENT_SCHEMA_VERSION,
    ENGINE_VERSION,
} from '@jurisgenie/core';

export function makeContract(overrides?: Partial<Contract>): Contract {
    return {
        id: 'contract-test-001',
        name: 'test-contract',
        display_name: 'Test Supply Contract',
        version: { major: 1, minor: 0, patch: 0 },
        parties: [
            { id: 'party-a', role: PartyRole.BUYER, name: 'Alice Corp', jurisdiction: { country: 'US', subdivision: 'CA' }, provenance: Provenance.HUMAN_AUTHORED, schema_version: CURRENT_SCHEMA_VERSION },
            { id: 'party-b', role: PartyRole.SELLER, name: 'Bob Inc', jurisdiction: { country: 'US', subdivision: 'CA' }, provenance: Provenance.HUMAN_AUTHORED, schema_version: CURRENT_SCHEMA_VERSION },
        ],
        clauses: [{
            id: 'clause-pay-1',
            type: ClauseType.PAYMENT_TERMS,
            title: 'Payment Terms',
            text: 'Payment due within 30 calendar days of invoice receipt.',
            obligations: [{
                id: 'obl-pay-1',
                clause_id: 'clause-pay-1',
                type: ObligationType.PAYMENT,
                debtor: 'party-a',
                creditor: 'party-b',
                action: 'Pay invoice amount',
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
        hash: 'abc123',
        schema_version: CURRENT_SCHEMA_VERSION,
        engine_version: ENGINE_VERSION,
        ...overrides,
    };
}

export function makeRequirement(overrides?: Partial<Requirement>): Requirement {
    return {
        id: 'req-payment-terms-1',
        description: 'Payment terms must not exceed 60 days',
        condition: {
            operator: 'EXISTS' as const,
            operands: [{ type: 'FIELD_REF' as const, field_path: 'contract.clauses[0].obligations[0].monetary_value' }],
        },
        applies_to: [ClauseType.PAYMENT_TERMS],
        applies_to_roles: [PartyRole.BUYER],
        ...overrides,
    };
}

export function makeRule(overrides?: Partial<JurisdictionRule>): JurisdictionRule {
    return {
        id: 'rule-ca-payment-001',
        jurisdiction: { country: 'US', subdivision: 'CA' },
        domain: LegalDomain.CONTRACT_LAW,
        title: 'CA Payment Terms Rule',
        description: 'California requires payment terms within 60 days',
        rule_version: { major: 1, minor: 0, patch: 0 },
        effective_date: '2020-01-01T00:00:00.000Z',
        conditions: [],
        requirements: [makeRequirement()],
        severity: RuleSeverity.MANDATORY,
        source: 'California Civil Code §1945',
        provenance: Provenance.HUMAN_AUTHORED,
        schema_version: CURRENT_SCHEMA_VERSION,
        ...overrides,
    };
}

export function makeRuleSet(rules?: JurisdictionRule[]): JurisdictionRuleSet {
    return {
        id: 'ruleset-ca-2025',
        version: { major: 1, minor: 0, patch: 0 },
        rules: rules ?? [makeRule()],
        hash: 'ruleset-hash-001',
        schema_version: CURRENT_SCHEMA_VERSION,
    };
}

export function makeContext(overrides?: Partial<EvaluationContext>): EvaluationContext {
    return {
        evaluation_date: '2025-03-15T00:00:00.000Z',
        engine_version: ENGINE_VERSION,
        mode: EvaluationMode.FULL,
        request_id: 'test-req-001',
        ...overrides,
    };
}

export function makeRequest(overrides?: {
    contract?: Partial<Contract>;
    rules?: JurisdictionRule[];
    context?: Partial<EvaluationContext>;
    event?: Event;
}): EvaluationRequest {
    return {
        contract: makeContract(overrides?.contract),
        rules: makeRuleSet(overrides?.rules),
        context: makeContext(overrides?.context),
        event: overrides?.event,
    };
}

export function makeEvent(overrides?: Partial<Event>): Event {
    return {
        id: 'event-test-001',
        type: EventType.PAYMENT_RECEIVED,
        timestamp: '2025-03-15T00:00:00.000Z',
        source: EventSource.MANUAL,
        contract_id: 'contract-test-001',
        payload: { description: 'Test payment' },
        provenance: Provenance.HUMAN_AUTHORED,
        schema_version: CURRENT_SCHEMA_VERSION,
        ...overrides,
    };
}

/** Expression shorthand helpers */
export const expr = {
    eq: (left: ConditionExpression['operands'][0], right: ConditionExpression['operands'][0]): ConditionExpression => ({
        operator: 'EQ', operands: [left, right],
    }),
    gt: (left: ConditionExpression['operands'][0], right: ConditionExpression['operands'][0]): ConditionExpression => ({
        operator: 'GT', operands: [left, right],
    }),
    and: (...subs: ConditionExpression[]): ConditionExpression => ({
        operator: 'AND',
        operands: subs.map((s) => ({ type: 'CONDITION_EXPR' as const, sub_expression: s })),
    }),
    or: (...subs: ConditionExpression[]): ConditionExpression => ({
        operator: 'OR',
        operands: subs.map((s) => ({ type: 'CONDITION_EXPR' as const, sub_expression: s })),
    }),
    not: (sub: ConditionExpression): ConditionExpression => ({
        operator: 'NOT',
        operands: [{ type: 'CONDITION_EXPR' as const, sub_expression: sub }],
    }),
    exists: (fieldPath: string): ConditionExpression => ({
        operator: 'EXISTS',
        operands: [{ type: 'FIELD_REF' as const, field_path: fieldPath }],
    }),
    literal: (value: string | number | boolean): ConditionExpression['operands'][0] => ({
        type: 'LITERAL' as const, value,
    }),
    field: (path: string): ConditionExpression['operands'][0] => ({
        type: 'FIELD_REF' as const, field_path: path,
    }),
};
