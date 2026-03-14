/**
 * @jurisgenie/engine — Public API
 *
 * Layer 4: Deterministic Rule Engine
 */

export { evaluate } from './evaluate';
export { evaluateCondition, type ConditionResult } from './condition-evaluator';
export { checkApplicability, type ApplicabilityResult } from './rule-selection';
export { evaluateRequirement } from './requirement-evaluator';
export { detectConflicts, type RuleConflict } from './conflict-detector';
