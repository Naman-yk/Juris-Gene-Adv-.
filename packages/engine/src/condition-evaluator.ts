/**
 * Condition Expression Evaluator
 *
 * Walks the ConditionExpression tree defined in Phase B.
 * This is a PURE FUNCTION — no I/O, no clock reads, no side effects.
 *
 * Supported operators:
 * - Comparison: EQ, NEQ, GT, GTE, LT, LTE
 * - Set: IN, NOT_IN, BETWEEN
 * - Temporal: DATE_BEFORE, DATE_AFTER
 * - Existence: EXISTS, IS_NULL
 * - Logical: AND, OR, NOT
 */

import {
    ConditionExpression,
    ConditionOperand,
    Contract,
    Event,
    DateTime,
    EngineError,
    EngineErrorCode,
} from '@jurisgenie/core';
import Decimal from 'decimal.js';

/** Result of evaluating a single condition expression. */
export interface ConditionResult {
    readonly value: boolean;
    readonly reason: string;
}

/**
 * Evaluates a ConditionExpression tree against the current contract, event, and date.
 *
 * @param expr - The condition expression to evaluate
 * @param contract - The current contract state
 * @param event - The triggering event (may be undefined for static evaluation)
 * @param execDate - The evaluation/execution date (injected, never from clock)
 * @returns ConditionResult with boolean value and human-readable reason
 */
export function evaluateCondition(
    expr: ConditionExpression,
    contract: Contract,
    event: Event | undefined,
    execDate: DateTime,
): ConditionResult {
    switch (expr.operator) {
        // ── Comparison operators ──
        case 'EQ': {
            const left = resolveOperand(expr.operands[0], contract, event, execDate);
            const right = resolveOperand(expr.operands[1], contract, event, execDate);
            const eq = compareValues(left, right) === 0;
            return { value: eq, reason: `${String(left)} == ${String(right)}` };
        }
        case 'NEQ': {
            const left = resolveOperand(expr.operands[0], contract, event, execDate);
            const right = resolveOperand(expr.operands[1], contract, event, execDate);
            const neq = compareValues(left, right) !== 0;
            return { value: neq, reason: `${String(left)} != ${String(right)}` };
        }
        case 'GT': {
            const left = resolveOperand(expr.operands[0], contract, event, execDate);
            const right = resolveOperand(expr.operands[1], contract, event, execDate);
            const gt = compareValues(left, right) > 0;
            return { value: gt, reason: `${String(left)} > ${String(right)}` };
        }
        case 'GTE': {
            const left = resolveOperand(expr.operands[0], contract, event, execDate);
            const right = resolveOperand(expr.operands[1], contract, event, execDate);
            const gte = compareValues(left, right) >= 0;
            return { value: gte, reason: `${String(left)} >= ${String(right)}` };
        }
        case 'LT': {
            const left = resolveOperand(expr.operands[0], contract, event, execDate);
            const right = resolveOperand(expr.operands[1], contract, event, execDate);
            const lt = compareValues(left, right) < 0;
            return { value: lt, reason: `${String(left)} < ${String(right)}` };
        }
        case 'LTE': {
            const left = resolveOperand(expr.operands[0], contract, event, execDate);
            const right = resolveOperand(expr.operands[1], contract, event, execDate);
            const lte = compareValues(left, right) <= 0;
            return { value: lte, reason: `${String(left)} <= ${String(right)}` };
        }

        // ── Set operators ──
        case 'IN': {
            const val = resolveOperand(expr.operands[0], contract, event, execDate);
            const set = resolveOperand(expr.operands[1], contract, event, execDate);
            const arr = Array.isArray(set) ? set : [set];
            const found = arr.some((item) => compareValues(val, item) === 0);
            return { value: found, reason: `${String(val)} in [${arr.map(String).join(', ')}]` };
        }
        case 'NOT_IN': {
            const val = resolveOperand(expr.operands[0], contract, event, execDate);
            const set = resolveOperand(expr.operands[1], contract, event, execDate);
            const arr = Array.isArray(set) ? set : [set];
            const notFound = !arr.some((item) => compareValues(val, item) === 0);
            return { value: notFound, reason: `${String(val)} not in [${arr.map(String).join(', ')}]` };
        }
        case 'BETWEEN': {
            const val = resolveOperand(expr.operands[0], contract, event, execDate);
            const low = resolveOperand(expr.operands[1], contract, event, execDate);
            const high = resolveOperand(expr.operands[2], contract, event, execDate);
            const between = compareValues(low, val) <= 0 && compareValues(val, high) <= 0;
            return { value: between, reason: `${String(low)} <= ${String(val)} <= ${String(high)}` };
        }

        // ── Temporal operators ──
        case 'DATE_BEFORE': {
            const d1 = resolveOperand(expr.operands[0], contract, event, execDate);
            const d2 = resolveOperand(expr.operands[1], contract, event, execDate);
            const before = String(d1) < String(d2);
            return { value: before, reason: `${String(d1)} before ${String(d2)}` };
        }
        case 'DATE_AFTER': {
            const d1 = resolveOperand(expr.operands[0], contract, event, execDate);
            const d2 = resolveOperand(expr.operands[1], contract, event, execDate);
            const after = String(d1) > String(d2);
            return { value: after, reason: `${String(d1)} after ${String(d2)}` };
        }

        // ── Existence operators ──
        case 'EXISTS': {
            const val = resolveOperand(expr.operands[0], contract, event, execDate);
            const exists = val !== null && val !== undefined;
            return { value: exists, reason: `${expr.operands[0].field_path ?? 'value'} exists: ${exists}` };
        }
        case 'IS_NULL': {
            const val = resolveOperand(expr.operands[0], contract, event, execDate);
            const isNull = val === null || val === undefined;
            return { value: isNull, reason: `${expr.operands[0].field_path ?? 'value'} is null: ${isNull}` };
        }

        // ── Logical operators ──
        case 'AND': {
            const results = expr.operands.map((op) => {
                if (op.sub_expression) {
                    return evaluateCondition(op.sub_expression, contract, event, execDate);
                }
                return { value: true, reason: 'no sub_expression' };
            });
            const allTrue = results.every((r) => r.value);
            return {
                value: allTrue,
                reason: `AND(${results.map((r) => r.reason).join(', ')})`,
            };
        }
        case 'OR': {
            const results = expr.operands.map((op) => {
                if (op.sub_expression) {
                    return evaluateCondition(op.sub_expression, contract, event, execDate);
                }
                return { value: false, reason: 'no sub_expression' };
            });
            const anyTrue = results.some((r) => r.value);
            return {
                value: anyTrue,
                reason: `OR(${results.map((r) => r.reason).join(', ')})`,
            };
        }
        case 'NOT': {
            if (expr.operands[0].sub_expression) {
                const inner = evaluateCondition(expr.operands[0].sub_expression, contract, event, execDate);
                return { value: !inner.value, reason: `NOT(${inner.reason})` };
            }
            return { value: true, reason: 'NOT(no sub_expression)' };
        }

        default:
            throw new EngineError(
                EngineErrorCode.INVALID_CONTRACT,
                `Unknown condition operator: ${expr.operator}`,
            );
    }
}

/**
 * Resolves an operand to its concrete value.
 * Handles LITERAL values, FIELD_REF path walking, and nested CONDITION_EXPR.
 */
function resolveOperand(
    operand: ConditionOperand,
    contract: Contract,
    event: Event | undefined,
    execDate: DateTime,
): unknown {
    switch (operand.type) {
        case 'LITERAL':
            return operand.value;

        case 'FIELD_REF': {
            const path = operand.field_path;
            if (!path) return null;

            if (path === 'context.execution_date') return execDate;

            let root: unknown;
            let remainingPath: string;

            if (path.startsWith('contract.')) {
                root = contract;
                remainingPath = path.substring('contract.'.length);
            } else if (path.startsWith('event.')) {
                root = event;
                remainingPath = path.substring('event.'.length);
            } else {
                root = contract;
                remainingPath = path;
            }

            return walkPath(root, remainingPath);
        }

        case 'CONDITION_EXPR': {
            if (operand.sub_expression) {
                const result = evaluateCondition(operand.sub_expression, contract, event, execDate);
                return result.value;
            }
            return null;
        }

        default:
            return null;
    }
}

/**
 * Walks a dot-path on an object, supporting array indexing.
 * Example: "parties[0].name" resolves contract.parties[0].name
 */
function walkPath(root: unknown, path: string): unknown {
    if (root === null || root === undefined) return null;

    const segments = path.split('.');
    let current: unknown = root;

    for (const segment of segments) {
        if (current === null || current === undefined) return null;

        const arrayMatch = segment.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
            const key = arrayMatch[1];
            const index = parseInt(arrayMatch[2], 10);
            const obj = current as Record<string, unknown>;
            const arr = obj[key];
            if (Array.isArray(arr)) {
                current = arr[index];
            } else {
                return null;
            }
        } else {
            const obj = current as Record<string, unknown>;
            current = obj[segment];
        }
    }

    return current;
}

/**
 * Compares two values for ordering.
 * Handles numbers, strings, and decimal strings.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
function compareValues(a: unknown, b: unknown): number {
    if (a === b) return 0;
    if (a === null || a === undefined) return -1;
    if (b === null || b === undefined) return 1;

    if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
    }

    const strA = String(a);
    const strB = String(b);

    if (isDecimalString(strA) && isDecimalString(strB)) {
        return new Decimal(strA).cmp(new Decimal(strB));
    }

    if (strA < strB) return -1;
    if (strA > strB) return 1;
    return 0;
}

/** Checks if a string looks like a decimal number. */
function isDecimalString(s: string): boolean {
    return /^-?\d+(\.\d+)?$/.test(s);
}
