/**
 * Rule Conflict Detector
 *
 * Detects contradictory rules in a JurisdictionRuleSet.
 * Two rules conflict when:
 * 1. Same jurisdiction
 * 2. Same domain
 * 3. Overlapping temporal validity
 * 4. Same applies_to clause types in requirements
 * 5. Contradictory conditions (one requires, the other forbids)
 *
 * This is a PURE FUNCTION — no I/O, no clock reads.
 */

import {
    JurisdictionRuleSet,
    JurisdictionRule,
    EngineError,
    EngineErrorCode,
} from '@jurisgenie/core';

export interface RuleConflict {
    readonly rule_a_id: string;
    readonly rule_b_id: string;
    readonly reason: string;
}

/**
 * Detects conflicts between rules in a rule set.
 * Throws INVALID_RULE_SET if contradictions are found.
 *
 * @param ruleSet - The rule set to validate
 * @returns Array of detected conflicts (empty if none)
 * @throws EngineError with INVALID_RULE_SET if blocking conflicts exist
 */
export function detectConflicts(ruleSet: JurisdictionRuleSet): RuleConflict[] {
    const conflicts: RuleConflict[] = [];
    const rules = ruleSet.rules;

    for (let i = 0; i < rules.length; i++) {
        for (let j = i + 1; j < rules.length; j++) {
            const conflict = checkPairConflict(rules[i], rules[j]);
            if (conflict) {
                conflicts.push(conflict);
            }
        }
    }

    if (conflicts.length > 0) {
        throw new EngineError(
            EngineErrorCode.INVALID_RULE_SET,
            `Rule set contains ${conflicts.length} conflict(s): ${conflicts.map((c) => `${c.rule_a_id} <-> ${c.rule_b_id}: ${c.reason}`).join('; ')}`,
        );
    }

    return conflicts;
}

/**
 * Checks if two rules conflict.
 * Rules conflict when they cover the same jurisdiction, domain,
 * and clause types but one supersedes the other without proper versioning.
 */
function checkPairConflict(
    ruleA: JurisdictionRule,
    ruleB: JurisdictionRule,
): RuleConflict | null {
    // Same jurisdiction?
    if (!sameJurisdiction(ruleA, ruleB)) return null;

    // Same domain?
    if (ruleA.domain !== ruleB.domain) return null;

    // Overlapping temporal validity?
    if (!temporalOverlap(ruleA, ruleB)) return null;

    // Overlapping clause types?
    const sharedClauseTypes = findSharedClauseTypes(ruleA, ruleB);
    if (sharedClauseTypes.length === 0) return null;

    // If one supersedes the other, no conflict
    if (ruleA.supersedes === ruleB.id || ruleB.supersedes === ruleA.id) return null;

    // Contradictory severity (one MANDATORY, other ADVISORY on same thing)?
    if (ruleA.severity !== ruleB.severity) {
        return {
            rule_a_id: ruleA.id,
            rule_b_id: ruleB.id,
            reason: `Conflicting severity on shared clause types [${sharedClauseTypes.join(', ')}]: ${ruleA.id} is ${ruleA.severity}, ${ruleB.id} is ${ruleB.severity}`,
        };
    }

    // Same severity, same scope — potential duplication conflict
    if (ruleA.id !== ruleB.id) {
        return {
            rule_a_id: ruleA.id,
            rule_b_id: ruleB.id,
            reason: `Duplicate rules covering same scope: jurisdiction=${ruleA.jurisdiction.country}, domain=${ruleA.domain}, clause_types=[${sharedClauseTypes.join(', ')}]`,
        };
    }

    return null;
}

function sameJurisdiction(a: JurisdictionRule, b: JurisdictionRule): boolean {
    return a.jurisdiction.country === b.jurisdiction.country
        && a.jurisdiction.subdivision === b.jurisdiction.subdivision;
}

function temporalOverlap(a: JurisdictionRule, b: JurisdictionRule): boolean {
    // If either has no expiry, they overlap from effective_date onward
    const aEnd = a.expiry_date ?? '9999-12-31T23:59:59.999Z';
    const bEnd = b.expiry_date ?? '9999-12-31T23:59:59.999Z';
    return a.effective_date < bEnd && b.effective_date < aEnd;
}

function findSharedClauseTypes(a: JurisdictionRule, b: JurisdictionRule): string[] {
    const aTypes = new Set(a.requirements.flatMap((r) => r.applies_to));
    const bTypes = new Set(b.requirements.flatMap((r) => r.applies_to));
    return [...aTypes].filter((t) => bTypes.has(t));
}
