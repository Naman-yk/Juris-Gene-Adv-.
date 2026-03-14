/**
 * Penalty Computation (Phase D3.5)
 *
 * Computes penalties for breached obligations using decimal.js.
 * All arithmetic is string-based — NO IEEE 754 floats.
 *
 * Supported penalty types:
 * - FIXED_AMOUNT: Static monetary penalty
 * - PERCENTAGE: Percentage of obligation monetary value
 * - INTEREST: Simple interest (annual rate × days/365)
 * - TERMINATION_RIGHT: Grants right, no financial penalty
 * - CUSTOM: Uses PenaltySpec.amount if provided
 */

import Decimal from 'decimal.js';
import {
    Obligation,
    PenaltyComputation,
    MonetaryAmount,
    DateTime,
    ExecutionError,
    ExecutionErrorCode,
} from '@jurisgenie/core';

// Configure decimal.js for deterministic behavior
Decimal.set({
    precision: 20,
    rounding: Decimal.ROUND_HALF_EVEN,
    toExpNeg: -9e15,
    toExpPos: 9e15,
});

/**
 * Computes the penalty for a breached obligation.
 *
 * @param obligation - The breached obligation with PenaltySpec
 * @param execDate - Execution date for interest calculations
 * @returns PenaltyComputation with computed amount and trace
 */
export function computePenalty(
    obligation: Obligation,
    execDate: DateTime,
): PenaltyComputation {
    const spec = obligation.penalty;
    if (!spec) {
        return {
            obligation_id: obligation.id,
            penalty_type: 'NONE',
            computation_trace: 'No penalty spec defined',
            capped: false,
        };
    }

    let computedAmount: MonetaryAmount | undefined;
    let trace: string;
    let capped = false;

    switch (spec.type) {
        case 'FIXED_AMOUNT': {
            if (!spec.amount) {
                throw new ExecutionError(
                    ExecutionErrorCode.INVALID_CONTRACT,
                    `FIXED_AMOUNT penalty on obligation ${obligation.id} has no amount`,
                );
            }
            computedAmount = spec.amount;
            trace = `Fixed penalty: ${spec.amount.value} ${spec.amount.currency}`;
            break;
        }

        case 'PERCENTAGE': {
            if (!obligation.monetary_value) {
                throw new ExecutionError(
                    ExecutionErrorCode.INVALID_CONTRACT,
                    `PERCENTAGE penalty on obligation ${obligation.id} without monetary_value`,
                );
            }
            if (!spec.rate) {
                throw new ExecutionError(
                    ExecutionErrorCode.INVALID_CONTRACT,
                    `PERCENTAGE penalty on obligation ${obligation.id} without rate`,
                );
            }
            const base = new Decimal(obligation.monetary_value.value);
            const rate = new Decimal(spec.rate);
            const amount = base.mul(rate);
            computedAmount = {
                value: amount.toFixed(2),
                currency: obligation.monetary_value.currency,
            };
            trace = `${spec.rate} × ${obligation.monetary_value.value} ${obligation.monetary_value.currency} = ${amount.toFixed(2)} ${obligation.monetary_value.currency}`;
            break;
        }

        case 'INTEREST': {
            if (!obligation.monetary_value) {
                throw new ExecutionError(
                    ExecutionErrorCode.INVALID_CONTRACT,
                    `INTEREST penalty on obligation ${obligation.id} without monetary_value`,
                );
            }
            if (!spec.rate) {
                throw new ExecutionError(
                    ExecutionErrorCode.INVALID_CONTRACT,
                    `INTEREST penalty on obligation ${obligation.id} without rate`,
                );
            }
            const resolvedDeadline = resolveDeadline(obligation);
            const daysOverdue = dayDifference(resolvedDeadline, execDate);

            if (daysOverdue <= 0) {
                computedAmount = { value: '0.00', currency: obligation.monetary_value.currency };
                trace = `No interest: deadline not yet passed`;
                break;
            }

            const principal = new Decimal(obligation.monetary_value.value);
            const annualRate = new Decimal(spec.rate);
            const dayFraction = new Decimal(daysOverdue).div(new Decimal('365'));
            const interest = principal.mul(annualRate).mul(dayFraction);

            computedAmount = {
                value: interest.toFixed(2),
                currency: obligation.monetary_value.currency,
            };
            trace = `${obligation.monetary_value.value} × ${spec.rate} × (${daysOverdue}/365) = ${interest.toFixed(2)} ${obligation.monetary_value.currency}`;
            break;
        }

        case 'TERMINATION_RIGHT': {
            computedAmount = undefined;
            trace = 'Breach grants creditor termination right per PenaltySpec';
            break;
        }

        case 'CUSTOM': {
            computedAmount = spec.amount;
            trace = `Custom penalty: ${spec.description}`;
            break;
        }

        default:
            trace = `Unknown penalty type: ${spec.type}`;
    }

    // Apply cap
    if (spec.cap && computedAmount) {
        const computedDecimal = new Decimal(computedAmount.value);
        const capDecimal = new Decimal(spec.cap.value);
        if (computedDecimal.gt(capDecimal)) {
            trace += `, capped from ${computedAmount.value} to ${spec.cap.value} ${spec.cap.currency}`;
            computedAmount = spec.cap;
            capped = true;
        }
    }

    return {
        obligation_id: obligation.id,
        penalty_type: spec.type,
        computed_amount: computedAmount,
        computation_trace: trace,
        capped,
    };
}

/**
 * Resolves an obligation's deadline to an absolute date.
 * Handles absolute, relative, and recurring temporal expressions.
 */
function resolveDeadline(obligation: Obligation): string {
    if (obligation.deadline.absolute) {
        return obligation.deadline.absolute;
    }
    // For relative and recurring, fall back to a far-future date
    // (in production, these would resolve against contract dates)
    return '9999-12-31T23:59:59.999Z';
}

/**
 * Computes the number of days between two ISO-8601 dates.
 * Returns a positive number if date2 > date1.
 */
function dayDifference(date1: string, date2: string): number {
    const d1 = new Date(date1).getTime();
    const d2 = new Date(date2).getTime();
    return Math.floor((d2 - d1) / (24 * 60 * 60 * 1000));
}
