/**
 * Requirement Evaluator
 *
 * Evaluates JurisdictionRule requirements against contract clauses.
 * Each requirement specifies which clause types it applies to and
 * what condition must be satisfied.
 */

import {
    Requirement,
    Contract,
    Event,
    DateTime,
    RequirementResult,
} from '@jurisgenie/core';
import { evaluateCondition } from './condition-evaluator';

/**
 * Evaluates a requirement against all matching clauses in a contract.
 *
 * @param requirement - The requirement to evaluate
 * @param contract - The contract being checked
 * @param event - Optional triggering event
 * @param evaluationDate - Point-in-time for temporal logic
 * @returns RequirementResult with result status and reason
 */
export function evaluateRequirement(
    requirement: Requirement,
    contract: Contract,
    event: Event | undefined,
    evaluationDate: DateTime,
): RequirementResult {
    // Find matching clauses
    const matchingClauses = contract.clauses.filter((clause) =>
        requirement.applies_to.includes(clause.type),
    );

    if (matchingClauses.length === 0) {
        return {
            requirement_id: requirement.id,
            description: requirement.description,
            result: 'NOT_APPLICABLE',
            reason: `No clauses of type ${requirement.applies_to.join(', ')} found in contract`,
        };
    }

    // Evaluate condition against each matching clause
    for (const clause of matchingClauses) {
        const condResult = evaluateCondition(
            requirement.condition,
            contract,
            event,
            evaluationDate,
        );

        if (condResult.value) {
            return {
                requirement_id: requirement.id,
                description: requirement.description,
                matched_clause_id: clause.id,
                condition_result: true,
                result: 'SATISFIED',
                reason: `Clause ${clause.id} satisfies requirement: ${condResult.reason}`,
            };
        }

        // If condition evaluated but returned false, this is a violation
        return {
            requirement_id: requirement.id,
            description: requirement.description,
            matched_clause_id: clause.id,
            condition_result: false,
            result: 'VIOLATED',
            reason: `Clause ${clause.id} violates requirement: ${condResult.reason}`,
        };
    }

    return {
        requirement_id: requirement.id,
        description: requirement.description,
        result: 'INDETERMINATE',
        reason: 'Could not determine compliance',
    };
}
