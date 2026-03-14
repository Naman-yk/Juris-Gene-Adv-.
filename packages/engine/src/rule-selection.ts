/**
 * Rule Selection & Applicability
 *
 * Filters and orders JurisdictionRules based on:
 * 1. Jurisdiction match (contract.governing_law)
 * 2. Temporal applicability (rule effective_date / expiry_date vs evaluation_date)
 * 3. Domain relevance
 *
 * Rules are evaluated in the order they appear in the JurisdictionRuleSet
 * (preserving the frozen snapshot order for determinism).
 */

import {
    JurisdictionRule,
    JurisdictionCode,
    Contract,
    DateTime,
} from '@jurisgenie/core';

/** Result of checking a single rule's applicability. */
export interface ApplicabilityResult {
    readonly applicable: boolean;
    readonly reason: string;
}

/**
 * Checks whether a rule applies to the given contract at the given evaluation date.
 *
 * @param rule - The jurisdiction rule to check
 * @param contract - The contract being evaluated
 * @param evaluationDate - Point-in-time for temporal filtering
 * @returns ApplicabilityResult with boolean and human-readable reason
 */
export function checkApplicability(
    rule: JurisdictionRule,
    contract: Contract,
    evaluationDate: DateTime,
): ApplicabilityResult {
    // Check 1: Temporal — is the rule in effect at evaluation_date?
    if (evaluationDate < rule.effective_date) {
        return {
            applicable: false,
            reason: `Rule not yet effective: effective_date ${rule.effective_date} > evaluation_date ${evaluationDate}`,
        };
    }

    if (rule.expiry_date && evaluationDate >= rule.expiry_date) {
        return {
            applicable: false,
            reason: `Rule expired: expiry_date ${rule.expiry_date} <= evaluation_date ${evaluationDate}`,
        };
    }

    // Check 2: Jurisdiction match
    if (!jurisdictionMatches(rule.jurisdiction, contract.governing_law)) {
        return {
            applicable: false,
            reason: `Jurisdiction mismatch: rule ${formatJurisdiction(rule.jurisdiction)} does not match contract ${formatJurisdiction(contract.governing_law)}`,
        };
    }

    // Check 3: Domain — check if any clause types in the contract match the rule's requirements
    const hasMatchingClause = rule.requirements.some((req) =>
        req.applies_to.some((clauseType) =>
            contract.clauses.some((clause) => clause.type === clauseType),
        ),
    );

    if (!hasMatchingClause && rule.requirements.length > 0) {
        return {
            applicable: false,
            reason: `No matching clause types: rule requires ${rule.requirements.map((r) => r.applies_to.join(',')).join('; ')} but contract has ${contract.clauses.map((c) => c.type).join(', ')}`,
        };
    }

    return {
        applicable: true,
        reason: `Rule applicable: jurisdiction ${formatJurisdiction(rule.jurisdiction)} matches, effective at ${evaluationDate}`,
    };
}

/**
 * Checks if a rule's jurisdiction matches a contract's governing law.
 * Supports hierarchical matching:
 * - { country: "US", subdivision: "CA" } matches { country: "US", subdivision: "CA" }
 * - { country: "US" } matches { country: "US", subdivision: "CA" } (broader rule)
 * - { country: "*" } matches everything (global rule)
 */
function jurisdictionMatches(
    ruleJurisdiction: JurisdictionCode,
    contractJurisdiction: JurisdictionCode,
): boolean {
    if (ruleJurisdiction.country === '*') return true;

    if (ruleJurisdiction.country !== contractJurisdiction.country) return false;

    if (ruleJurisdiction.subdivision) {
        if (ruleJurisdiction.subdivision !== contractJurisdiction.subdivision) return false;
    }

    if (ruleJurisdiction.municipality) {
        if (ruleJurisdiction.municipality !== contractJurisdiction.municipality) return false;
    }

    return true;
}

/** Formats a JurisdictionCode for human-readable output. */
function formatJurisdiction(j: JurisdictionCode): string {
    let result = j.country;
    if (j.subdivision) result += `-${j.subdivision}`;
    if (j.municipality) result += `/${j.municipality}`;
    return result;
}
