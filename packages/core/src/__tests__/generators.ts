/**
 * fast-check Arbitrary Generators for JurisGenie Core Types
 *
 * Generates structurally valid random instances of all core types
 * for property-based testing. Every generator produces objects that
 * are type-correct and satisfy at least the structural invariants.
 */

import * as fc from 'fast-check';
import {
    Provenance,
    SchemaVersion,
    SemanticVersion,
    MonetaryAmount,
    JurisdictionCode,
    TemporalExpression,
    PartyRole,
    Party,
    ConditionType,
    ConditionOperator,
    ConditionExpression,
    Condition,
    ObligationType,
    ObligationStatus,
    Obligation,
    RightType,
    Right,
    ClauseType,
    Clause,
    ContractState,
    StateTransition,
    Contract,
    EventType,
    EventSource,
    EventPayload,
    Event,
    CURRENT_SCHEMA_VERSION,
    ENGINE_VERSION,
} from '../../src/types';

// ─────────────────────────────────────────────────────────────────────────────
// Foundation Arbitraries
// ─────────────────────────────────────────────────────────────────────────────

export const arbProvenance: fc.Arbitrary<Provenance> = fc.constantFrom(
    Provenance.HUMAN_AUTHORED,
    Provenance.HUMAN_CONFIRMED,
    Provenance.RULE_DERIVED,
    Provenance.IMPORTED,
);

/** Provenance that includes AI_GENERATED — used for C15 tests. */
export const arbProvenanceWithAI: fc.Arbitrary<Provenance> = fc.constantFrom(
    ...Object.values(Provenance),
);

export const arbSchemaVersion: fc.Arbitrary<SchemaVersion> = fc.record({
    major: fc.constant(1),
    minor: fc.nat({ max: 9 }),
    patch: fc.nat({ max: 99 }),
});

export const arbSemanticVersion: fc.Arbitrary<SemanticVersion> = fc.record({
    major: fc.nat({ max: 5 }),
    minor: fc.nat({ max: 20 }),
    patch: fc.nat({ max: 100 }),
});

export const arbDateTime: fc.Arbitrary<string> = fc.integer({
    min: 1577836800000, // 2020-01-01
    max: 1924991999999, // 2030-12-31
}).map((ms) => new Date(ms).toISOString());

export const arbCurrencyCode: fc.Arbitrary<string> = fc.constantFrom('USD', 'EUR', 'GBP', 'JPY', 'CHF');

export const arbMonetaryAmount: fc.Arbitrary<MonetaryAmount> = fc.record({
    value: fc.nat({ max: 999999999 }).map((n) => (n / 100).toFixed(2)),
    currency: arbCurrencyCode,
});

export const arbJurisdictionCode: fc.Arbitrary<JurisdictionCode> = fc.record({
    country: fc.constantFrom('US', 'GB', 'DE', 'FR', 'JP', 'CA', 'AU'),
    subdivision: fc.option(fc.constantFrom('CA', 'NY', 'TX', 'ON', 'QC', 'NSW'), { nil: undefined }),
});

export const arbTemporalExpression: fc.Arbitrary<TemporalExpression> = fc.record({
    absolute: fc.option(arbDateTime, { nil: undefined }),
});

export const arbLanguageCode: fc.Arbitrary<string> = fc.constantFrom('en-US', 'en-GB', 'de-DE', 'fr-FR', 'ja-JP');

// ─────────────────────────────────────────────────────────────────────────────
// Party
// ─────────────────────────────────────────────────────────────────────────────

export const arbPartyRole: fc.Arbitrary<PartyRole> = fc.constantFrom(...Object.values(PartyRole));

export const arbParty = (id: string): fc.Arbitrary<Party> =>
    fc.record({
        id: fc.constant(id),
        role: arbPartyRole,
        name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        jurisdiction: arbJurisdictionCode,
        provenance: arbProvenance,
        schema_version: fc.constant(CURRENT_SCHEMA_VERSION),
    });

// ─────────────────────────────────────────────────────────────────────────────
// Condition
// ─────────────────────────────────────────────────────────────────────────────

export const arbConditionOperator: fc.Arbitrary<ConditionOperator> = fc.constantFrom(
    'EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE', 'EXISTS', 'IS_NULL',
);

export const arbConditionExpression: fc.Arbitrary<ConditionExpression> = fc.record({
    operator: arbConditionOperator,
    operands: fc.constant([
        { type: 'FIELD_REF' as const, field_path: 'contract.clauses[0].obligations[0].monetary_value' },
    ]),
});

export const arbCondition = (id: string): fc.Arbitrary<Condition> =>
    fc.record({
        id: fc.constant(id),
        type: fc.constantFrom(...Object.values(ConditionType)),
        expression: arbConditionExpression,
        description: fc.string({ minLength: 1, maxLength: 100 }),
        provenance: arbProvenance,
        schema_version: fc.constant(CURRENT_SCHEMA_VERSION),
    });

// ─────────────────────────────────────────────────────────────────────────────
// Obligation
// ─────────────────────────────────────────────────────────────────────────────

export const arbObligation = (
    id: string,
    clauseId: string,
    partyIds: [string, string],
): fc.Arbitrary<Obligation> =>
    fc.record({
        id: fc.constant(id),
        clause_id: fc.constant(clauseId),
        type: fc.constantFrom(...Object.values(ObligationType)),
        debtor: fc.constant(partyIds[0]),
        creditor: fc.constant(partyIds[1]),
        action: fc.string({ minLength: 1, maxLength: 100 }),
        deadline: arbTemporalExpression,
        status: fc.constantFrom(...Object.values(ObligationStatus)),
        conditions: fc.constant([]),
        monetary_value: fc.option(arbMonetaryAmount, { nil: undefined }),
        provenance: arbProvenance,
        schema_version: fc.constant(CURRENT_SCHEMA_VERSION),
    });

// ─────────────────────────────────────────────────────────────────────────────
// Right
// ─────────────────────────────────────────────────────────────────────────────

export const arbRight = (
    id: string,
    clauseId: string,
    holderId: string,
): fc.Arbitrary<Right> =>
    fc.record({
        id: fc.constant(id),
        clause_id: fc.constant(clauseId),
        holder: fc.constant(holderId),
        type: fc.constantFrom(...Object.values(RightType)),
        description: fc.string({ minLength: 1, maxLength: 100 }),
        conditions: fc.constant([]),
        exercised: fc.boolean(),
        provenance: arbProvenance,
        schema_version: fc.constant(CURRENT_SCHEMA_VERSION),
    });

// ─────────────────────────────────────────────────────────────────────────────
// Clause
// ─────────────────────────────────────────────────────────────────────────────

export const arbClause = (
    id: string,
    partyIds: [string, string],
): fc.Arbitrary<Clause> =>
    fc.tuple(
        fc.constantFrom(...Object.values(ClauseType)),
        fc.string({ minLength: 1, maxLength: 80 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        arbObligation(`obl-${id}-1`, id, partyIds),
        arbRight(`right-${id}-1`, id, partyIds[0]),
        arbProvenance,
        arbLanguageCode,
    ).map(([type, title, text, obligation, right, prov, lang]) => ({
        id,
        type,
        title,
        text,
        obligations: [obligation],
        rights: [right],
        conditions: [],
        language: lang,
        provenance: prov,
        schema_version: CURRENT_SCHEMA_VERSION,
    }));

// ─────────────────────────────────────────────────────────────────────────────
// Contract
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a valid Contract that passes invariants C1–C14.
 * AI_GENERATED provenance is EXCLUDED by default.
 */
export const arbContract: fc.Arbitrary<Contract> =
    fc.tuple(
        fc.string({ minLength: 1, maxLength: 20 }).map((s) =>
            s.replace(/[^a-z0-9_-]/g, '').padEnd(1, 'x'),
        ),
        fc.string({ minLength: 1, maxLength: 80 }),
        arbParty('party-a'),
        arbParty('party-b'),
        arbClause('clause-1', ['party-a', 'party-b']),
        arbDateTime,
        fc.option(arbDateTime, { nil: undefined }),
        fc.constantFrom(
            ContractState.DRAFT,
            ContractState.PENDING_REVIEW,
            ContractState.ACTIVE,
        ),
        arbProvenance,
    ).map(([name, displayName, partyA, partyB, clause, effective, expiry, state, prov]) => {
        const resolvedExpiry = expiry && expiry > effective ? expiry : undefined;
        const stateHistory: StateTransition[] = state !== ContractState.DRAFT
            ? [{
                from_state: ContractState.DRAFT,
                to_state: state,
                timestamp: effective,
                reason: 'Generated for testing',
                provenance: Provenance.RULE_DERIVED,
            }]
            : [];

        return {
            id: `contract-${name}`,
            name: name || 'test-contract',
            display_name: displayName || 'Test Contract',
            version: { major: 1, minor: 0, patch: 0 },
            parties: [partyA, partyB],
            clauses: [clause],
            governing_law: partyA.jurisdiction,
            effective_date: effective,
            expiry_date: resolvedExpiry,
            state,
            state_history: stateHistory,
            provenance: prov,
            hash: '',
            schema_version: CURRENT_SCHEMA_VERSION,
            engine_version: ENGINE_VERSION,
        };
    });

// ─────────────────────────────────────────────────────────────────────────────
// Event
// ─────────────────────────────────────────────────────────────────────────────

export const arbEventPayload: fc.Arbitrary<EventPayload> = fc.record({
    description: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
    amount: fc.option(arbMonetaryAmount, { nil: undefined }),
});

export const arbEvent = (contractId: string): fc.Arbitrary<Event> =>
    fc.record({
        id: fc.string({ minLength: 5, maxLength: 20 }).map((s) => `event-${s.replace(/[^a-z0-9-]/g, '')}`),
        type: fc.constantFrom(...Object.values(EventType)),
        timestamp: arbDateTime,
        source: fc.constantFrom(...Object.values(EventSource)),
        contract_id: fc.constant(contractId),
        payload: arbEventPayload,
        provenance: arbProvenance,
        schema_version: fc.constant(CURRENT_SCHEMA_VERSION),
    });
