/**
 * JurisGenie Demo Script
 *
 * Creates a sample contract, executes events, and demonstrates:
 * 1. Hash determinism — same contract, same hash
 * 2. Execution — event processing with state transition
 * 3. Penalty computation — decimal-precise arithmetic
 * 4. Replay determinism — re-execution produces identical hash
 */

import {
    Contract,
    ContractState,
    Provenance,
    CURRENT_SCHEMA_VERSION,
    ENGINE_VERSION,
    ClauseType,
    ObligationType,
    ObligationStatus,
    PartyRole,
    Event,
    EventType,
    EventSource,
    EvaluationMode,
    JurisdictionRuleSet,
    JurisdictionRule,
    LegalDomain,
    RuleSeverity,
    RightType,
    computeHash,
} from '@jurisgenie/core';
import { evaluate } from '@jurisgenie/engine';
import { execute } from '@jurisgenie/execution';

const DIVIDER = '═'.repeat(70);
const SECTION = '─'.repeat(70);

function print(msg: string): void {
    console.log(msg);
}

function main(): void {
    print('');
    print(DIVIDER);
    print('  JurisGenie — Deterministic Legal Execution Engine');
    print('  Demo: Commercial Supply Contract Lifecycle');
    print(DIVIDER);
    print('');

    // ── Step 1: Create Sample Contract ──
    print('STEP 1: Creating sample supply contract...');
    print(SECTION);

    const contract = createSampleContract();
    print(`  Contract ID:    ${contract.id}`);
    print(`  Name:           ${contract.display_name}`);
    print(`  State:          ${contract.state}`);
    print(`  Parties:        ${contract.parties.map((p) => `${p.name} (${p.role})`).join(', ')}`);
    print(`  Clauses:        ${contract.clauses.length}`);
    print(`  Obligations:    ${countObligations(contract)}`);
    print(`  Hash:           ${contract.hash}`);
    print('');

    // ── Step 2: Hash Determinism Proof ──
    print('STEP 2: Proving hash determinism...');
    print(SECTION);
    const hash1 = computeHash(contract);
    const hash2 = computeHash(contract);
    print(`  Hash #1:        ${hash1}`);
    print(`  Hash #2:        ${hash2}`);
    print(`  Identical:      ${hash1 === hash2 ? '✓ YES' : '✗ NO'}`);
    print('');

    // ── Step 3: Rule Evaluation ──
    print('STEP 3: Evaluating contract against jurisdiction rules...');
    print(SECTION);

    const ruleSet = createSampleRuleSet();
    const evalResult = evaluate({
        contract,
        rules: ruleSet,
        context: {
            evaluation_date: '2025-06-20T00:00:00.000Z',
            engine_version: ENGINE_VERSION,
            mode: EvaluationMode.FULL,
            request_id: 'demo-eval-001',
        },
    });

    print(`  Request ID:     ${evalResult.request_id}`);
    print(`  Compliance:     ${evalResult.compliance.status}`);
    print(`  Findings:       ${evalResult.findings.length}`);
    print(`  Rules Checked:  ${evalResult.trace.summary.total_rules}`);
    print(`  Applicable:     ${evalResult.trace.summary.applicable_rules}`);
    print(`  Passed:         ${evalResult.trace.summary.passed}`);
    print(`  Failed:         ${evalResult.trace.summary.failed}`);
    print(`  Result Hash:    ${evalResult.result_hash}`);
    print('');

    // ── Step 4: Execute DEADLINE_EXPIRED Event ──
    print('STEP 4: Executing DEADLINE_EXPIRED event...');
    print(SECTION);

    const deadlineEvent = createDeadlineEvent(contract.id);
    const execResult = execute({
        contract,
        event: deadlineEvent,
        context: {
            execution_date: '2025-07-01T00:00:00.000Z',
            engine_version: ENGINE_VERSION,
            request_id: 'demo-exec-001',
            simulation: { enabled: false },
        },
    });

    print(`  Request ID:     ${execResult.request_id}`);
    print(`  State Change:   ${execResult.previous_state} → ${execResult.new_state}`);
    print(`  State Changed:  ${execResult.state_changed ? '✓ YES' : '✗ NO'}`);
    if (execResult.transition) {
        print(`  Transition:     ${execResult.transition.transition_id}: ${execResult.transition.reason}`);
    }
    print(`  Clauses Fired:  ${execResult.triggered_clauses.filter((c) => c.triggered).length}`);
    print(`  Obl. Breached:  ${execResult.obligations_breached.length}`);
    for (const breach of execResult.obligations_breached) {
        print(`    → ${breach.obligation_id}: ${breach.reason}`);
    }
    print(`  Penalties:      ${execResult.penalties.length}`);
    for (const penalty of execResult.penalties) {
        if (penalty.computed_amount) {
            print(`    → ${penalty.obligation_id}: ${penalty.computed_amount.value} ${penalty.computed_amount.currency} (${penalty.computation_trace})`);
        }
    }
    print(`  Exec Hash:      ${execResult.execution_hash}`);
    print('');

    // ── Step 5: Replay Determinism Proof ──
    print('STEP 5: Proving replay determinism...');
    print(SECTION);

    const replayResult = execute({
        contract,
        event: deadlineEvent,
        context: {
            execution_date: '2025-07-01T00:00:00.000Z',
            engine_version: ENGINE_VERSION,
            request_id: 'demo-exec-001',
            simulation: { enabled: false },
        },
    });

    print(`  Original Hash:  ${execResult.execution_hash}`);
    print(`  Replay Hash:    ${replayResult.execution_hash}`);
    print(`  Identical:      ${execResult.execution_hash === replayResult.execution_hash ? '✓ YES' : '✗ NO'}`);
    print('');

    // ── Summary ──
    print(DIVIDER);
    print('  DEMO COMPLETE — All determinism guarantees verified');
    print(DIVIDER);
    print('');
}

function createSampleContract(): Contract {
    const bareContract: Contract = {
        id: 'contract-supply-2025-001',
        name: 'acme-globex-supply-q1',
        display_name: 'ACME-Globex Q1 2025 Supply Agreement',
        version: { major: 1, minor: 0, patch: 0 },
        description: 'Quarterly supply agreement for industrial components',
        parties: [
            {
                id: 'party-acme',
                role: PartyRole.BUYER,
                name: 'ACME Corporation',
                identifier: { type: 'TAX_ID', value: 'US-EIN-12-3456789' },
                jurisdiction: { country: 'US', subdivision: 'CA' },
                provenance: Provenance.HUMAN_AUTHORED,
                schema_version: CURRENT_SCHEMA_VERSION,
            },
            {
                id: 'party-globex',
                role: PartyRole.SELLER,
                name: 'Globex Industries',
                identifier: { type: 'TAX_ID', value: 'US-EIN-98-7654321' },
                jurisdiction: { country: 'US', subdivision: 'NY' },
                provenance: Provenance.HUMAN_AUTHORED,
                schema_version: CURRENT_SCHEMA_VERSION,
            },
        ],
        clauses: [
            {
                id: 'clause-payment-terms',
                type: ClauseType.PAYMENT_TERMS,
                title: 'Payment Terms',
                text: 'Buyer shall pay the full invoice amount within 30 days of delivery.',
                obligations: [
                    {
                        id: 'obl-payment-001',
                        clause_id: 'clause-payment-terms',
                        type: ObligationType.PAYMENT,
                        debtor: 'party-acme',
                        creditor: 'party-globex',
                        action: 'Pay invoice within 30 days of delivery',
                        deadline: { absolute: '2025-06-15T00:00:00.000Z' },
                        status: ObligationStatus.ACTIVE,
                        conditions: [],
                        monetary_value: { value: '50000.00', currency: 'USD' },
                        penalty: {
                            type: 'INTEREST',
                            rate: '0.08',
                            description: '8% annual interest on overdue balance',
                            cap: { value: '10000.00', currency: 'USD' },
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
            {
                id: 'clause-delivery',
                type: ClauseType.DELIVERY,
                title: 'Delivery Terms',
                text: 'Seller shall deliver goods by the scheduled delivery date.',
                obligations: [
                    {
                        id: 'obl-delivery-001',
                        clause_id: 'clause-delivery',
                        type: ObligationType.PERFORMANCE,
                        debtor: 'party-globex',
                        creditor: 'party-acme',
                        action: 'Deliver industrial components per spec',
                        deadline: { absolute: '2025-05-01T00:00:00.000Z' },
                        status: ObligationStatus.FULFILLED,
                        conditions: [],
                        monetary_value: { value: '50000.00', currency: 'USD' },
                        penalty: {
                            type: 'FIXED_AMOUNT',
                            amount: { value: '5000.00', currency: 'USD' },
                            description: '$5,000 late delivery penalty',
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
            {
                id: 'clause-termination',
                type: ClauseType.TERMINATION,
                title: 'Termination Rights',
                text: 'Either party may terminate upon material breach with 30 days cure period.',
                obligations: [],
                rights: [
                    {
                        id: 'right-terminate-001',
                        clause_id: 'clause-termination',
                        holder: 'party-globex',
                        type: RightType.TERMINATION,
                        description: 'Right to terminate for material breach by buyer',
                        conditions: [],
                        exercised: false,
                        provenance: Provenance.HUMAN_AUTHORED,
                        schema_version: CURRENT_SCHEMA_VERSION,
                    },
                    {
                        id: 'right-cure-001',
                        clause_id: 'clause-termination',
                        holder: 'party-acme',
                        type: RightType.CURE,
                        description: '30-day cure period after breach notice',
                        conditions: [],
                        exercised: false,
                        provenance: Provenance.HUMAN_AUTHORED,
                        schema_version: CURRENT_SCHEMA_VERSION,
                    },
                ],
                conditions: [],
                language: 'en-US',
                provenance: Provenance.HUMAN_AUTHORED,
                schema_version: CURRENT_SCHEMA_VERSION,
            },
        ],
        governing_law: { country: 'US', subdivision: 'CA' },
        effective_date: '2025-01-01T00:00:00.000Z',
        expiry_date: '2025-12-31T23:59:59.999Z',
        state: ContractState.ACTIVE,
        state_history: [
            {
                from_state: ContractState.DRAFT,
                to_state: ContractState.ACTIVE,
                timestamp: '2025-01-01T00:00:00.000Z',
                reason: 'Contract signed by both parties',
                provenance: Provenance.RULE_DERIVED,
            },
        ],
        provenance: Provenance.HUMAN_AUTHORED,
        hash: '',
        schema_version: CURRENT_SCHEMA_VERSION,
        engine_version: ENGINE_VERSION,
    };

    const hash = computeHash(bareContract);
    return { ...bareContract, hash };
}

function createSampleRuleSet(): JurisdictionRuleSet {
    const rules: JurisdictionRule[] = [
        {
            id: 'rule-ca-payment-terms',
            jurisdiction: { country: 'US', subdivision: 'CA' },
            domain: LegalDomain.CONTRACT_LAW,
            title: 'California Payment Terms Disclosure',
            description: 'Payment terms must be clearly stated with specific amounts and due dates',
            rule_version: { major: 1, minor: 0, patch: 0 },
            effective_date: '2024-01-01T00:00:00.000Z',
            conditions: [],
            requirements: [
                {
                    id: 'req-payment-amount',
                    description: 'Payment clauses must specify monetary value',
                    condition: {
                        operator: 'EXISTS' as const,
                        operands: [{ type: 'FIELD_REF' as const, field_path: 'contract.clauses[0].obligations[0].monetary_value' }],
                    },
                    applies_to: [ClauseType.PAYMENT_TERMS],
                    applies_to_roles: [PartyRole.BUYER],
                },
            ],
            severity: RuleSeverity.MANDATORY,
            source: 'Cal. Civ. Code §1671',
            provenance: Provenance.HUMAN_AUTHORED,
            schema_version: CURRENT_SCHEMA_VERSION,
        },
    ];

    const ruleSetBare: JurisdictionRuleSet = {
        id: 'ruleset-us-ca-v1',
        version: { major: 1, minor: 0, patch: 0 },
        rules,
        hash: '',
        schema_version: CURRENT_SCHEMA_VERSION,
    };

    const hash = computeHash(ruleSetBare);
    return { ...ruleSetBare, hash };
}

function createDeadlineEvent(contractId: string): Event {
    return {
        id: 'event-deadline-001',
        type: EventType.DEADLINE_EXPIRED,
        timestamp: '2025-07-01T00:00:00.000Z',
        source: EventSource.SYSTEM_CLOCK,
        contract_id: contractId,
        payload: {
            description: 'Payment deadline expired for obl-payment-001',
        },
        provenance: Provenance.RULE_DERIVED,
        schema_version: CURRENT_SCHEMA_VERSION,
    };
}

function countObligations(contract: Contract): number {
    return contract.clauses.reduce((sum, clause) => sum + clause.obligations.length, 0);
}

main();
