/**
 * @jurisgenie/core — Public API
 *
 * Layer 3: Typed Legal Core
 * Re-exports all types, serialization, hashing, and invariant validation.
 */

export * from './types';
export { canonicalize, deepClone } from './serialization';
export { computeHash, verifyHash, isValidSHA256 } from './hashing';
export {
    validateContract,
    validateContractStructure,
    hasAIProvenance,
    type ValidationResult,
    type ValidationError,
} from './invariants';
