/**
 * Obligation Lifecycle Processing (Phase D3.4)
 *
 * Processes obligation status transitions:
 * - PENDING → ACTIVE (activation conditions met)
 * - ACTIVE → FULFILLED (fulfillment event received)
 * - ACTIVE → BREACHED (deadline passed)
 * - ACTIVE → WAIVED (waiver event received)
 *
 * Obligations are processed in LEXICOGRAPHIC ORDER of obligation.id
 * for deterministic cross-platform behavior.
 */

import {
    Contract,
    Event,
    EventType,
    Obligation,
    ObligationStatus,
    ObligationType,
    ObligationMutation,
    DateTime,
    Clause,
} from '@jurisgenie/core';

/**
 * Event-to-ObligationType fulfillment mapping.
 * Defines which events can fulfill which obligation types.
 */
const FULFILLMENT_MAP: Record<string, ObligationType[]> = {
    [EventType.PAYMENT_RECEIVED]: [ObligationType.PAYMENT],
    [EventType.DELIVERY_COMPLETED]: [ObligationType.PERFORMANCE],
};

/**
 * Processes all obligation lifecycle transitions for triggered clauses.
 *
 * @param contract - The working contract clone (will be mutated)
 * @param event - The triggering event
 * @param execDate - Execution date for deadline checks
 * @param triggeredClauseIds - IDs of clauses triggered by this event
 * @returns Arrays of obligation mutations grouped by type
 */
export function processObligations(
    contract: Contract,
    event: Event,
    execDate: DateTime,
    triggeredClauseIds: Set<string>,
): {
    activated: ObligationMutation[];
    fulfilled: ObligationMutation[];
    breached: ObligationMutation[];
    waived: ObligationMutation[];
    updatedClauses: Clause[];
} {
    const activated: ObligationMutation[] = [];
    const fulfilled: ObligationMutation[] = [];
    const breached: ObligationMutation[] = [];
    const waived: ObligationMutation[] = [];

    // Collect obligations to process
    const obligationsToProcess: Array<{ clause: Clause; obligation: Obligation; clauseIndex: number }> = [];

    for (let ci = 0; ci < contract.clauses.length; ci++) {
        const clause = contract.clauses[ci];
        const isTriggered = triggeredClauseIds.has(clause.id);

        for (const obligation of clause.obligations) {
            // Process if clause is triggered OR if it's a deadline event (affects all obligations)
            if (isTriggered || event.type === EventType.DEADLINE_EXPIRED || event.type === EventType.DEADLINE_APPROACHING) {
                obligationsToProcess.push({ clause, obligation, clauseIndex: ci });
            }
        }
    }

    // Sort by obligation.id for deterministic processing
    obligationsToProcess.sort((a, b) => a.obligation.id.localeCompare(b.obligation.id));

    // Process each obligation and collect updated clauses
    const updatedClauses = [...contract.clauses.map((c) => ({
        ...c,
        obligations: [...c.obligations],
        rights: [...c.rights],
        conditions: [...c.conditions],
    }))];

    for (const { obligation, clauseIndex } of obligationsToProcess) {
        const clause = updatedClauses[clauseIndex];
        const oblIndex = clause.obligations.findIndex((o) => o.id === obligation.id);
        if (oblIndex === -1) continue;

        const currentObl = clause.obligations[oblIndex];

        // 4.1 ACTIVATION: PENDING → ACTIVE
        if (currentObl.status === ObligationStatus.PENDING) {
            // Check activation conditions — for simplicity, activate if no conditions or all empty
            const hasConditions = currentObl.conditions.length > 0;
            if (!hasConditions) {
                const updated = { ...currentObl, status: ObligationStatus.ACTIVE };
                clause.obligations[oblIndex] = updated;
                activated.push({
                    obligation_id: currentObl.id,
                    previous_status: ObligationStatus.PENDING,
                    new_status: ObligationStatus.ACTIVE,
                    reason: 'All activation conditions met',
                    triggered_by: event.id,
                });
            }
        }
        // 4.2 FULFILLMENT: ACTIVE → FULFILLED
        else if (currentObl.status === ObligationStatus.ACTIVE) {
            if (eventFulfillsObligation(event, currentObl)) {
                const updated = { ...currentObl, status: ObligationStatus.FULFILLED };
                clause.obligations[oblIndex] = updated;
                fulfilled.push({
                    obligation_id: currentObl.id,
                    previous_status: ObligationStatus.ACTIVE,
                    new_status: ObligationStatus.FULFILLED,
                    reason: `Event ${event.type} satisfies obligation action`,
                    triggered_by: event.id,
                });
            }
            // 4.3 BREACH: ACTIVE → BREACHED (deadline passed)
            else if (deadlinePassed(currentObl, execDate)) {
                const resolved = resolveDeadline(currentObl);
                const updated = { ...currentObl, status: ObligationStatus.BREACHED };
                clause.obligations[oblIndex] = updated;
                breached.push({
                    obligation_id: currentObl.id,
                    previous_status: ObligationStatus.ACTIVE,
                    new_status: ObligationStatus.BREACHED,
                    reason: `Deadline ${resolved} passed at execution_date ${execDate}`,
                    triggered_by: event.id,
                });
            }
        }

        // 4.4 WAIVER
        if (
            currentObl.status === ObligationStatus.ACTIVE &&
            event.type === EventType.AMENDMENT_ACCEPTED &&
            eventWaivesObligation(event, currentObl)
        ) {
            const updated = { ...currentObl, status: ObligationStatus.WAIVED };
            clause.obligations[oblIndex] = updated;
            waived.push({
                obligation_id: currentObl.id,
                previous_status: ObligationStatus.ACTIVE,
                new_status: ObligationStatus.WAIVED,
                reason: `Waived by amendment event ${event.id}`,
                triggered_by: event.id,
            });
        }
    }

    return { activated, fulfilled, breached, waived, updatedClauses };
}

/**
 * Checks if an event fulfills an obligation.
 * Matches event type to obligation type, and checks monetary amounts.
 */
function eventFulfillsObligation(event: Event, obligation: Obligation): boolean {
    const fulfillableTypes = FULFILLMENT_MAP[event.type];
    if (!fulfillableTypes || !fulfillableTypes.includes(obligation.type)) {
        return false;
    }

    // For payment obligations, check amount
    if (obligation.type === ObligationType.PAYMENT && event.payload.amount && obligation.monetary_value) {
        const eventAmount = parseFloat(event.payload.amount.value);
        const oblAmount = parseFloat(obligation.monetary_value.value);
        return eventAmount >= oblAmount &&
            event.payload.amount.currency === obligation.monetary_value.currency;
    }

    return true;
}

/**
 * Checks if an obligation's deadline has passed.
 */
function deadlinePassed(obligation: Obligation, execDate: DateTime): boolean {
    const resolved = resolveDeadline(obligation);
    return execDate > resolved;
}

/**
 * Resolves an obligation's deadline to an absolute datetime string.
 */
function resolveDeadline(obligation: Obligation): string {
    if (obligation.deadline.absolute) {
        return obligation.deadline.absolute;
    }
    return '9999-12-31T23:59:59.999Z';
}

/**
 * Checks if an amendment event waives a specific obligation.
 */
function eventWaivesObligation(event: Event, obligation: Obligation): boolean {
    if (event.payload.description) {
        return event.payload.description.toLowerCase().includes(obligation.id.toLowerCase());
    }
    return false;
}
