/**
 * @jurisgenie/execution — Public API
 *
 * Layer 5: Execution Engine
 */

export { execute } from './execute';
export { getTransitionsFromState, evaluateGuard, NON_EXECUTABLE_STATES } from './state-machine';
export { processObligations } from './obligation-lifecycle';
export { computePenalty } from './penalty-computation';
export { computeSimulationDiff } from './simulation-diff';
