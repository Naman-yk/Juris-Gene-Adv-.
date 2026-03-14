/**
 * Contract State Machine (Phase D2)
 *
 * Defines all 15 allowed state transitions, their guards, and priority ordering.
 * The state machine is deterministic: given the same contract state, event,
 * and execution date, the same transition (or no transition) is always selected.
 *
 * TRANSITION PRIORITY (highest first):
 * 1. BREACH (T7)
 * 2. TERMINATION (T9)
 * 3. DISPUTE (T8)
 * 4. SUSPENSION (T6)
 * 5. EXPIRY (T15)
 * 6. CURE (T14)
 * 7. RESUMPTION (T10)
 * 8. RULING (T11, T12, T13)
 */

import {
    Contract,
    ContractState,
    Event,
    EventType,
    DateTime,
    ObligationStatus,
    RightType,
    ClauseType,
    ObligationMutation,
    RightExercise,
} from '@jurisgenie/core';

/** A transition candidate with its guard evaluation result. */
export interface TransitionCandidate {
    readonly id: string;
    readonly from: ContractState;
    readonly to: ContractState;
    readonly priority: number;
}

/** Result of evaluating a transition guard. */
export interface GuardResult {
    readonly satisfied: boolean;
    readonly reason: string;
}

/**
 * Non-executable states — the engine rejects events targeting contracts in these states.
 */
export const NON_EXECUTABLE_STATES: readonly ContractState[] = [
    ContractState.DRAFT,
    ContractState.PENDING_REVIEW,
    ContractState.PENDING_SIGNATURE,
    ContractState.TERMINATED,
    ContractState.EXPIRED,
];

/**
 * All allowed transitions sorted by priority.
 */
const TRANSITIONS: TransitionCandidate[] = [
    { id: 'T7', from: ContractState.ACTIVE, to: ContractState.BREACHED, priority: 1 },
    { id: 'T9', from: ContractState.ACTIVE, to: ContractState.TERMINATED, priority: 2 },
    { id: 'T8', from: ContractState.ACTIVE, to: ContractState.DISPUTED, priority: 3 },
    { id: 'T6', from: ContractState.ACTIVE, to: ContractState.SUSPENDED, priority: 4 },
    { id: 'T15', from: ContractState.ACTIVE, to: ContractState.EXPIRED, priority: 5 },
    { id: 'T14', from: ContractState.BREACHED, to: ContractState.ACTIVE, priority: 6 },
    { id: 'T10', from: ContractState.SUSPENDED, to: ContractState.ACTIVE, priority: 7 },
    { id: 'T11', from: ContractState.BREACHED, to: ContractState.TERMINATED, priority: 8 },
    { id: 'T12', from: ContractState.DISPUTED, to: ContractState.TERMINATED, priority: 9 },
    { id: 'T13', from: ContractState.DISPUTED, to: ContractState.ACTIVE, priority: 10 },
];

/**
 * Gets all valid transition candidates from the current state, sorted by priority.
 *
 * @param currentState - The current contract state
 * @returns Array of transition candidates, sorted by priority (highest first)
 */
export function getTransitionsFromState(currentState: ContractState): TransitionCandidate[] {
    return TRANSITIONS
        .filter((t) => t.from === currentState)
        .sort((a, b) => a.priority - b.priority);
}

/**
 * Evaluates a transition guard deterministically.
 *
 * @param transition - The transition to evaluate
 * @param contract - The current contract state
 * @param event - The triggering event
 * @param execDate - Execution date (injected, never from clock)
 * @param breachedObligations - Obligations breached in this execution step
 * @param exercisedRights - Rights exercised in this execution step
 * @returns GuardResult indicating if the transition should fire
 */
export function evaluateGuard(
    transition: TransitionCandidate,
    contract: Contract,
    event: Event,
    execDate: DateTime,
    breachedObligations: ObligationMutation[],
    _exercisedRights: RightExercise[],
): GuardResult {
    switch (transition.id) {
        case 'T6': return guardT6(contract, event);
        case 'T7': return guardT7(contract, breachedObligations);
        case 'T8': return guardT8(contract, event);
        case 'T9': return guardT9(contract, event);
        case 'T10': return guardT10(event);
        case 'T11': return guardT11(contract, event, execDate);
        case 'T12': return guardT12(event);
        case 'T13': return guardT13(event);
        case 'T14': return guardT14(contract, event, execDate, breachedObligations);
        case 'T15': return guardT15(contract, execDate);
        default: return { satisfied: false, reason: `Unknown transition: ${transition.id}` };
    }
}

/** T6: ACTIVE → SUSPENDED (Force majeure declared) */
function guardT6(contract: Contract, event: Event): GuardResult {
    if (event.type !== EventType.FORCE_MAJEURE_DECLARED && event.type !== EventType.AMENDMENT_ACCEPTED) {
        return { satisfied: false, reason: 'Event is not FORCE_MAJEURE_DECLARED or AMENDMENT_ACCEPTED' };
    }
    if (event.type === EventType.FORCE_MAJEURE_DECLARED) {
        const hasFmClause = contract.clauses.some((c) => c.type === ClauseType.FORCE_MAJEURE);
        if (!hasFmClause) {
            return { satisfied: false, reason: 'No force majeure clause in contract' };
        }
    }
    return { satisfied: true, reason: `Force majeure declared by event ${event.id}` };
}

/** T7: ACTIVE → BREACHED (Material breach detected) */
function guardT7(contract: Contract, breachedObligations: ObligationMutation[]): GuardResult {
    if (breachedObligations.length === 0) {
        return { satisfied: false, reason: 'No obligations breached' };
    }

    // Check materiality — TERMINATION_RIGHT penalty implies material breach
    for (const breach of breachedObligations) {
        for (const clause of contract.clauses) {
            for (const obligation of clause.obligations) {
                if (obligation.id === breach.obligation_id && obligation.penalty) {
                    if (obligation.penalty.type === 'TERMINATION_RIGHT') {
                        return {
                            satisfied: true,
                            reason: `Obligation ${breach.obligation_id} breached (material: TERMINATION_RIGHT penalty)`,
                        };
                    }
                }
            }
        }
    }

    // Any breach is material by default for now
    return {
        satisfied: true,
        reason: `Obligation ${breachedObligations[0].obligation_id} breached`,
    };
}

/** T8: ACTIVE → DISPUTED (Dispute filed) */
function guardT8(contract: Contract, event: Event): GuardResult {
    if (event.type !== EventType.DISPUTE_FILED) {
        return { satisfied: false, reason: 'Event is not DISPUTE_FILED' };
    }
    if (event.party_id) {
        const partyExists = contract.parties.some((p) => p.id === event.party_id);
        if (!partyExists) {
            return { satisfied: false, reason: `Unknown party filing dispute: ${event.party_id}` };
        }
    }
    return { satisfied: true, reason: `Dispute filed by party ${event.party_id ?? 'unknown'}` };
}

/** T9: ACTIVE → TERMINATED (Termination notice) */
function guardT9(contract: Contract, event: Event): GuardResult {
    if (event.type !== EventType.TERMINATION_NOTICE) {
        return { satisfied: false, reason: 'Event is not TERMINATION_NOTICE' };
    }

    // Find termination right for the issuing party
    for (const clause of contract.clauses) {
        for (const right of clause.rights) {
            if (
                right.type === RightType.TERMINATION &&
                right.holder === event.party_id &&
                !right.exercised
            ) {
                return {
                    satisfied: true,
                    reason: `Party ${event.party_id} exercised termination right ${right.id}`,
                };
            }
        }
    }

    return { satisfied: false, reason: `Party ${event.party_id ?? 'unknown'} holds no valid termination right` };
}

/** T10: SUSPENDED → ACTIVE (Force majeure lifted) */
function guardT10(event: Event): GuardResult {
    if (event.type !== EventType.FORCE_MAJEURE_LIFTED && event.type !== EventType.AMENDMENT_ACCEPTED) {
        return { satisfied: false, reason: 'Event is not FORCE_MAJEURE_LIFTED or AMENDMENT_ACCEPTED' };
    }
    return { satisfied: true, reason: 'Force majeure lifted' };
}

/** T11: BREACHED → TERMINATED (Cure period expired or no cure right) */
function guardT11(_contract: Contract, event: Event, _execDate: DateTime): GuardResult {
    if (event.type !== EventType.DEADLINE_EXPIRED && event.type !== EventType.TERMINATION_NOTICE) {
        return { satisfied: false, reason: 'Event is not DEADLINE_EXPIRED or TERMINATION_NOTICE' };
    }
    return { satisfied: true, reason: 'Breach not cured, contract terminates' };
}

/** T12: DISPUTED → TERMINATED (External ruling with termination) */
function guardT12(event: Event): GuardResult {
    if (event.type !== EventType.EXTERNAL_RULING) {
        return { satisfied: false, reason: 'Event is not EXTERNAL_RULING' };
    }
    if (event.payload.description?.toLowerCase().includes('terminat')) {
        return { satisfied: true, reason: 'Ruling specifies termination' };
    }
    return { satisfied: false, reason: 'Ruling does not specify termination' };
}

/** T13: DISPUTED → ACTIVE (External ruling with continuation) */
function guardT13(event: Event): GuardResult {
    if (event.type !== EventType.EXTERNAL_RULING) {
        return { satisfied: false, reason: 'Event is not EXTERNAL_RULING' };
    }
    if (event.payload.description?.toLowerCase().includes('continu')) {
        return { satisfied: true, reason: 'Ruling specifies continuation' };
    }
    return { satisfied: false, reason: 'Ruling does not specify continuation' };
}

/** T14: BREACHED → ACTIVE (Breach cured) */
function guardT14(
    contract: Contract,
    event: Event,
    _execDate: DateTime,
    _breachedObligations: ObligationMutation[],
): GuardResult {
    const cureEvents = [EventType.PAYMENT_RECEIVED, EventType.DELIVERY_COMPLETED];
    if (!cureEvents.includes(event.type)) {
        return { satisfied: false, reason: 'Event does not demonstrate cure' };
    }

    // Check if cure right exists
    for (const clause of contract.clauses) {
        for (const right of clause.rights) {
            if (right.type === RightType.CURE && !right.exercised) {
                return { satisfied: true, reason: `Cure demonstrated via event ${event.id}` };
            }
        }
    }

    return { satisfied: false, reason: 'No cure right exists' };
}

/** T15: ACTIVE → EXPIRED (Contract past expiry with no active obligations) */
function guardT15(contract: Contract, execDate: DateTime): GuardResult {
    if (!contract.expiry_date) {
        return { satisfied: false, reason: 'No expiry date set' };
    }

    if (execDate < contract.expiry_date) {
        return { satisfied: false, reason: `Expiry date ${contract.expiry_date} not reached` };
    }

    // Check for active obligations
    let activeCount = 0;
    for (const clause of contract.clauses) {
        for (const obligation of clause.obligations) {
            if (obligation.status === ObligationStatus.ACTIVE) {
                activeCount++;
            }
        }
    }

    if (activeCount > 0) {
        return { satisfied: false, reason: `Cannot expire with ${activeCount} active obligations` };
    }

    return { satisfied: true, reason: 'Expiry date reached, no active obligations' };
}
