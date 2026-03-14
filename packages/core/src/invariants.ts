/**
 * Contract Invariant Validation (C1–C15)
 *
 * Validates all structural invariants that a Contract must satisfy.
 * These are enforced at construction time — an invalid contract
 * cannot enter the rule engine or execution engine.
 *
 * See Phase B specification for the complete invariant definitions.
 */

import {
    Contract,
    ContractState,
    Provenance,
} from './types';
import { computeHash } from './hashing';
import { isValidSHA256 } from './hashing';

/** Result of invariant validation. */
export interface ValidationResult {
    readonly valid: boolean;
    readonly errors: ValidationError[];
}

/** A single invariant violation. */
export interface ValidationError {
    readonly invariant: string;
    readonly message: string;
    readonly field?: string;
}

/**
 * Validates all 15 contract invariants (C1–C15).
 *
 * @param contract - The contract to validate
 * @returns ValidationResult indicating whether the contract is valid
 */
export function validateContract(contract: Contract): ValidationResult {
    const errors: ValidationError[] = [];

    validateC1(contract, errors);
    validateC2(contract, errors);
    validateC3(contract, errors);
    validateC4(contract, errors);
    validateC5(contract, errors);
    validateC6(contract, errors);
    validateC7(contract, errors);
    validateC8(contract, errors);
    validateC9(contract, errors);
    validateC10(contract, errors);
    validateC11(contract, errors);
    validateC12(contract, errors);
    validateC13(contract, errors);
    validateC14(contract, errors);
    validateC15(contract, errors);

    return { valid: errors.length === 0, errors };
}

/**
 * Validates invariants C1–C14 (everything except the AI provenance gate).
 * Used internally when C15 is checked separately.
 */
export function validateContractStructure(contract: Contract): ValidationResult {
    const errors: ValidationError[] = [];

    validateC1(contract, errors);
    validateC2(contract, errors);
    validateC3(contract, errors);
    validateC4(contract, errors);
    validateC5(contract, errors);
    validateC6(contract, errors);
    validateC7(contract, errors);
    validateC8(contract, errors);
    validateC9(contract, errors);
    validateC10(contract, errors);
    validateC11(contract, errors);
    validateC12(contract, errors);
    validateC13(contract, errors);
    validateC14(contract, errors);

    return { valid: errors.length === 0, errors };
}

/** C1: parties.length >= 2 */
function validateC1(contract: Contract, errors: ValidationError[]): void {
    if (!contract.parties || contract.parties.length < 2) {
        errors.push({
            invariant: 'C1',
            message: `Contract must have at least 2 parties, got ${contract.parties?.length ?? 0}`,
            field: 'parties',
        });
    }
}

/** C2: clauses.length >= 1 */
function validateC2(contract: Contract, errors: ValidationError[]): void {
    if (!contract.clauses || contract.clauses.length < 1) {
        errors.push({
            invariant: 'C2',
            message: `Contract must have at least 1 clause, got ${contract.clauses?.length ?? 0}`,
            field: 'clauses',
        });
    }
}

/** C3: All Party.id values are unique */
function validateC3(contract: Contract, errors: ValidationError[]): void {
    const ids = new Set<string>();
    for (const party of contract.parties) {
        if (ids.has(party.id)) {
            errors.push({
                invariant: 'C3',
                message: `Duplicate party id: ${party.id}`,
                field: 'parties',
            });
        }
        ids.add(party.id);
    }
}

/** C4: All Clause.id values are unique */
function validateC4(contract: Contract, errors: ValidationError[]): void {
    const ids = new Set<string>();
    for (const clause of contract.clauses) {
        if (ids.has(clause.id)) {
            errors.push({
                invariant: 'C4',
                message: `Duplicate clause id: ${clause.id}`,
                field: 'clauses',
            });
        }
        ids.add(clause.id);
    }
}

/** C5: All Obligation.debtor and Obligation.creditor reference valid Party.id */
function validateC5(contract: Contract, errors: ValidationError[]): void {
    const partyIds = new Set(contract.parties.map((p) => p.id));
    for (const clause of contract.clauses) {
        for (const obligation of clause.obligations) {
            if (!partyIds.has(obligation.debtor)) {
                errors.push({
                    invariant: 'C5',
                    message: `Obligation ${obligation.id} references unknown debtor: ${obligation.debtor}`,
                    field: `clauses.${clause.id}.obligations.${obligation.id}.debtor`,
                });
            }
            if (!partyIds.has(obligation.creditor)) {
                errors.push({
                    invariant: 'C5',
                    message: `Obligation ${obligation.id} references unknown creditor: ${obligation.creditor}`,
                    field: `clauses.${clause.id}.obligations.${obligation.id}.creditor`,
                });
            }
        }
    }
}

/** C6: All Right.holder references a valid Party.id */
function validateC6(contract: Contract, errors: ValidationError[]): void {
    const partyIds = new Set(contract.parties.map((p) => p.id));
    for (const clause of contract.clauses) {
        for (const right of clause.rights) {
            if (!partyIds.has(right.holder)) {
                errors.push({
                    invariant: 'C6',
                    message: `Right ${right.id} references unknown holder: ${right.holder}`,
                    field: `clauses.${clause.id}.rights.${right.id}.holder`,
                });
            }
        }
    }
}

/** C7: effective_date <= expiry_date (if expiry exists) */
function validateC7(contract: Contract, errors: ValidationError[]): void {
    if (contract.expiry_date) {
        if (contract.effective_date > contract.expiry_date) {
            errors.push({
                invariant: 'C7',
                message: `effective_date (${contract.effective_date}) must be <= expiry_date (${contract.expiry_date})`,
                field: 'effective_date',
            });
        }
    }
}

/** C8: state_history is append-only and chronologically ordered */
function validateC8(contract: Contract, errors: ValidationError[]): void {
    for (let i = 1; i < contract.state_history.length; i++) {
        const prev = contract.state_history[i - 1];
        const curr = contract.state_history[i];
        if (curr.timestamp < prev.timestamp) {
            errors.push({
                invariant: 'C8',
                message: `State history not chronological at index ${i}: ${prev.timestamp} > ${curr.timestamp}`,
                field: 'state_history',
            });
        }
    }
}

/** C9: state_history[last].to_state == state */
function validateC9(contract: Contract, errors: ValidationError[]): void {
    if (contract.state_history.length > 0) {
        const lastTransition = contract.state_history[contract.state_history.length - 1];
        if (lastTransition.to_state !== contract.state) {
            errors.push({
                invariant: 'C9',
                message: `Last state_history entry to_state (${lastTransition.to_state}) != contract.state (${contract.state})`,
                field: 'state',
            });
        }
    }
}

/** C10: hash matches canonical serialization */
function validateC10(contract: Contract, errors: ValidationError[]): void {
    if (contract.hash) {
        const computed = computeHash(contract);
        if (computed !== contract.hash) {
            errors.push({
                invariant: 'C10',
                message: `Hash mismatch: expected ${contract.hash}, computed ${computed}`,
                field: 'hash',
            });
        }
    }
}

/** C11: If previous_hash exists, it is a valid SHA-256 hex string */
function validateC11(contract: Contract, errors: ValidationError[]): void {
    if (contract.previous_hash !== undefined && contract.previous_hash !== null) {
        if (!isValidSHA256(contract.previous_hash)) {
            errors.push({
                invariant: 'C11',
                message: `previous_hash is not a valid SHA-256 hex string: ${contract.previous_hash}`,
                field: 'previous_hash',
            });
        }
    }
}

/** C12: name matches /^[a-z0-9_-]+$/ */
function validateC12(contract: Contract, errors: ValidationError[]): void {
    if (!/^[a-z0-9_-]+$/.test(contract.name)) {
        errors.push({
            invariant: 'C12',
            message: `Contract name must match /^[a-z0-9_-]+$/, got: ${contract.name}`,
            field: 'name',
        });
    }
}

/** C13: display_name.length <= 214 */
function validateC13(contract: Contract, errors: ValidationError[]): void {
    if (contract.display_name.length > 214) {
        errors.push({
            invariant: 'C13',
            message: `display_name length ${contract.display_name.length} exceeds 214 characters`,
            field: 'display_name',
        });
    }
}

/** C14: version is valid semver */
function validateC14(contract: Contract, errors: ValidationError[]): void {
    const v = contract.version;
    if (
        typeof v.major !== 'number' || v.major < 0 ||
        typeof v.minor !== 'number' || v.minor < 0 ||
        typeof v.patch !== 'number' || v.patch < 0
    ) {
        errors.push({
            invariant: 'C14',
            message: `Invalid version: ${JSON.stringify(v)}`,
            field: 'version',
        });
    }
}

/**
 * C15: No AI_GENERATED provenance in any nested obligation, right, or condition
 * if contract state >= ACTIVE.
 *
 * This is the structural enforcement of the Human Review Gate.
 */
function validateC15(contract: Contract, errors: ValidationError[]): void {
    const activeStates: ContractState[] = [
        ContractState.ACTIVE,
        ContractState.SUSPENDED,
        ContractState.TERMINATED,
        ContractState.EXPIRED,
        ContractState.BREACHED,
        ContractState.DISPUTED,
    ];

    if (!activeStates.includes(contract.state)) {
        return;
    }

    for (const clause of contract.clauses) {
        checkProvenanceAI(clause, `clause ${clause.id}`, errors);
        for (const obligation of clause.obligations) {
            checkProvenanceAI(obligation, `obligation ${obligation.id}`, errors);
            for (const condition of obligation.conditions) {
                checkProvenanceAI(condition, `condition ${condition.id}`, errors);
            }
        }
        for (const right of clause.rights) {
            checkProvenanceAI(right, `right ${right.id}`, errors);
            for (const condition of right.conditions) {
                checkProvenanceAI(condition, `condition ${condition.id}`, errors);
            }
        }
        for (const condition of clause.conditions) {
            checkProvenanceAI(condition, `condition ${condition.id}`, errors);
        }
    }
}

/** Helper: checks if a provenanced object has AI_GENERATED provenance. */
function checkProvenanceAI(
    obj: { provenance: Provenance },
    label: string,
    errors: ValidationError[],
): void {
    if (obj.provenance === Provenance.AI_GENERATED) {
        errors.push({
            invariant: 'C15',
            message: `AI_GENERATED provenance found in ${label} — must be HUMAN_CONFIRMED before contract can be ACTIVE`,
            field: label,
        });
    }
}

/**
 * Checks if a contract contains any AI_GENERATED provenance in its tree.
 * Used by the execution engine (D3.1 step 1.3) independently of invariant C15.
 *
 * @param contract - The contract to scan
 * @returns true if any sub-object has AI_GENERATED provenance
 */
export function hasAIProvenance(contract: Contract): boolean {
    for (const clause of contract.clauses) {
        if (clause.provenance === Provenance.AI_GENERATED) return true;
        for (const obligation of clause.obligations) {
            if (obligation.provenance === Provenance.AI_GENERATED) return true;
            for (const condition of obligation.conditions) {
                if (condition.provenance === Provenance.AI_GENERATED) return true;
            }
        }
        for (const right of clause.rights) {
            if (right.provenance === Provenance.AI_GENERATED) return true;
            for (const condition of right.conditions) {
                if (condition.provenance === Provenance.AI_GENERATED) return true;
            }
        }
        for (const condition of clause.conditions) {
            if (condition.provenance === Provenance.AI_GENERATED) return true;
        }
    }
    return false;
}
