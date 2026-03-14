/**
 * SimulationDiff computation (Phase D1)
 *
 * Computes the difference between a simulated execution result
 * and a baseline contract state (identified by hash).
 */

import {
    SimulationDiff,
    DiffEntry,
    ExecutionResult,
} from '@jurisgenie/core';

/**
 * Computes a simulation diff between the execution result and a baseline.
 *
 * @param baselineHash - The hash of the baseline contract state
 * @param result - The execution result to compare
 * @returns SimulationDiff showing what changed
 */
export function computeSimulationDiff(
    baselineHash: string,
    result: Omit<ExecutionResult, 'simulation_diff' | 'execution_hash'>,
): SimulationDiff {
    const obligationsDiff: DiffEntry[] = [];
    const penaltiesDiff: DiffEntry[] = [];

    // Track obligation changes
    for (const mutation of result.obligations_breached) {
        obligationsDiff.push({
            field_path: `obligations.${mutation.obligation_id}.status`,
            baseline_value: mutation.previous_status,
            simulated_value: mutation.new_status,
        });
    }

    for (const mutation of result.obligations_fulfilled) {
        obligationsDiff.push({
            field_path: `obligations.${mutation.obligation_id}.status`,
            baseline_value: mutation.previous_status,
            simulated_value: mutation.new_status,
        });
    }

    for (const mutation of result.obligations_activated) {
        obligationsDiff.push({
            field_path: `obligations.${mutation.obligation_id}.status`,
            baseline_value: mutation.previous_status,
            simulated_value: mutation.new_status,
        });
    }

    // Track penalty changes
    for (const penalty of result.penalties) {
        if (penalty.computed_amount) {
            penaltiesDiff.push({
                field_path: `penalties.${penalty.obligation_id}`,
                baseline_value: '0.00',
                simulated_value: `${penalty.computed_amount.value} ${penalty.computed_amount.currency}`,
            });
        }
    }

    return {
        baseline_hash: baselineHash,
        state_changed: result.state_changed,
        obligations_diff: obligationsDiff,
        penalties_diff: penaltiesDiff,
    };
}
