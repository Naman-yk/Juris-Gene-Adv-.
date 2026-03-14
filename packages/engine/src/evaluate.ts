/**
 * Deterministic Legal Rule Engine — evaluate()
 *
 * Layer 4: The core pure function.
 * evaluate: (Contract, JurisdictionRuleSet, Event?, EvaluationContext) → EvaluationResult | EngineError
 *
 * Guarantees:
 * G1: Input immutability — inputs are never modified
 * G2: Output determinism — identical inputs produce identical outputs
 * G3: No side effects — no I/O, no logging, no network
 * G4: No clock reads — all temporal logic uses evaluation_date
 * G5: No randomness
 * G6: Total function — always returns result or throws typed error
 * G7: Trace completeness — every rule gets a trace entry
 * G8: Result self-hashing
 */

import {
    EvaluationRequest,
    EvaluationResult,
    EvaluationMode,
    EngineError,
    EngineErrorCode,
    ComplianceStatus,
    ComplianceVerdict,
    RuleResult,
    RiskFinding,
    FindingType,
    FindingSeverity,
    TraceEntry,
    TraceSummary,
    ExplanationTrace,
    RequirementResult,
    Provenance,
    CURRENT_SCHEMA_VERSION,
    ENGINE_SUPPORTED_SCHEMA_MAJOR,
} from '@jurisgenie/core';
import { computeHash, validateContract, hasAIProvenance, deepClone } from '@jurisgenie/core';
import { checkApplicability } from './rule-selection';
import { evaluateRequirement } from './requirement-evaluator';
import { evaluateCondition } from './condition-evaluator';

/**
 * Evaluates a contract against jurisdiction rules.
 * This is a PURE FUNCTION — no side effects, no I/O, no clock reads.
 *
 * @param request - The complete evaluation request
 * @returns EvaluationResult with findings, compliance verdict, and complete trace
 * @throws EngineError for invalid inputs
 */
export function evaluate(request: EvaluationRequest): EvaluationResult {
    const startTime = performance.now();

    // ── Input Validation ──
    validateInputs(request);

    const { contract, rules, event, context } = request;

    // ── Evaluate Rules ──
    const findings: RiskFinding[] = [];
    const entries: TraceEntry[] = [];
    let step = 0;

    for (const rule of rules.rules) {
        step++;
        const ruleStartTime = performance.now();

        // Check applicability
        const applicability = checkApplicability(rule, contract, context.evaluation_date);

        if (!applicability.applicable) {
            entries.push({
                step,
                rule_id: rule.id,
                rule_version: rule.rule_version,
                rule_title: rule.title,
                applicable: false,
                applicability_reason: applicability.reason,
                clauses_checked: [],
                requirements_evaluated: [],
                result: RuleResult.NOT_APPLICABLE,
                duration_us: Math.round((performance.now() - ruleStartTime) * 1000),
            });
            continue;
        }

        // Evaluate rule conditions
        let ruleConditionsMet = true;
        for (const condition of rule.conditions) {
            const condResult = evaluateCondition(
                condition.expression,
                contract,
                event,
                context.evaluation_date,
            );
            if (!condResult.value) {
                ruleConditionsMet = false;
                break;
            }
        }

        if (!ruleConditionsMet) {
            entries.push({
                step,
                rule_id: rule.id,
                rule_version: rule.rule_version,
                rule_title: rule.title,
                applicable: true,
                applicability_reason: applicability.reason,
                clauses_checked: [],
                requirements_evaluated: [],
                result: RuleResult.NOT_APPLICABLE,
                duration_us: Math.round((performance.now() - ruleStartTime) * 1000),
            });
            continue;
        }

        // Evaluate requirements
        const reqResults: RequirementResult[] = [];
        const clausesChecked = new Set<string>();
        let ruleResult = RuleResult.PASS;
        let finding: RiskFinding | undefined;

        for (const requirement of rule.requirements) {
            const reqResult = evaluateRequirement(
                requirement,
                contract,
                event,
                context.evaluation_date,
            );
            reqResults.push(reqResult);

            if (reqResult.matched_clause_id) {
                clausesChecked.add(reqResult.matched_clause_id);
            }

            if (reqResult.result === 'VIOLATED') {
                ruleResult = RuleResult.FAIL;

                const severity = rule.severity === 'MANDATORY'
                    ? FindingSeverity.CRITICAL
                    : rule.severity === 'REGULATORY'
                        ? FindingSeverity.HIGH
                        : FindingSeverity.MEDIUM;

                finding = {
                    id: `finding-${rule.id}-${requirement.id}`,
                    contract_id: contract.id,
                    clause_id: reqResult.matched_clause_id,
                    rule_id: rule.id,
                    rule_version: rule.rule_version,
                    finding_type: FindingType.NON_COMPLIANT_CLAUSE,
                    severity,
                    title: `${rule.title}: ${requirement.description}`,
                    description: reqResult.reason,
                    recommendation: `Review clause ${reqResult.matched_clause_id ?? 'N/A'} for compliance with ${rule.title}`,
                    evaluation_date: context.evaluation_date,
                    provenance: Provenance.RULE_DERIVED,
                    schema_version: CURRENT_SCHEMA_VERSION,
                };
                findings.push(finding);
            } else if (reqResult.result === 'INDETERMINATE') {
                if (ruleResult !== RuleResult.FAIL) {
                    ruleResult = RuleResult.AMBIGUOUS;
                }

                finding = {
                    id: `finding-${rule.id}-${requirement.id}`,
                    contract_id: contract.id,
                    clause_id: reqResult.matched_clause_id,
                    rule_id: rule.id,
                    rule_version: rule.rule_version,
                    finding_type: FindingType.AMBIGUOUS_CLAUSE,
                    severity: FindingSeverity.MEDIUM,
                    title: `${rule.title}: Cannot determine compliance`,
                    description: reqResult.reason,
                    evaluation_date: context.evaluation_date,
                    provenance: Provenance.RULE_DERIVED,
                    schema_version: CURRENT_SCHEMA_VERSION,
                };
                findings.push(finding);
            }
        }

        entries.push({
            step,
            rule_id: rule.id,
            rule_version: rule.rule_version,
            rule_title: rule.title,
            applicable: true,
            applicability_reason: applicability.reason,
            clauses_checked: Array.from(clausesChecked).sort(),
            requirements_evaluated: reqResults,
            result: ruleResult,
            finding,
            duration_us: Math.round((performance.now() - ruleStartTime) * 1000),
        });
    }

    // ── Build Compliance Verdict ──
    const compliance = buildComplianceVerdict(findings);

    // ── Build Trace Summary ──
    const summary: TraceSummary = {
        total_rules: rules.rules.length,
        applicable_rules: entries.filter((e) => e.applicable).length,
        passed: entries.filter((e) => e.result === RuleResult.PASS).length,
        failed: entries.filter((e) => e.result === RuleResult.FAIL).length,
        ambiguous: entries.filter((e) => e.result === RuleResult.AMBIGUOUS).length,
        not_applicable: entries.filter((e) => e.result === RuleResult.NOT_APPLICABLE).length,
    };

    const trace: ExplanationTrace = { entries, summary };

    // ── Assemble Result ──
    const durationMs = Math.round(performance.now() - startTime);

    const result: EvaluationResult = {
        request_id: context.request_id,
        contract_id: contract.id,
        contract_hash: contract.hash,
        findings,
        compliance,
        trace,
        evaluation_date: context.evaluation_date,
        engine_version: context.engine_version,
        rules_version: rules.version,
        rules_hash: rules.hash,
        mode: context.mode,
        duration_ms: durationMs,
        result_hash: '',
        schema_version: CURRENT_SCHEMA_VERSION,
    };

    // Compute result hash (excluding timing fields: duration_ms, duration_us, result_hash)
    const hashable = deepClone(result) as unknown as Record<string, unknown>;
    delete hashable['duration_ms'];
    delete hashable['result_hash'];
    // Strip duration_us from trace entries (timing varies between calls)
    const trace_obj = hashable['trace'] as Record<string, unknown> | undefined;
    if (trace_obj && Array.isArray(trace_obj['entries'])) {
        for (const entry of trace_obj['entries'] as Record<string, unknown>[]) {
            delete entry['duration_us'];
        }
    }
    const resultHash = computeHash(hashable);

    return { ...result, result_hash: resultHash };
}

/**
 * Validates all inputs before evaluation begins.
 * Throws EngineError for any invalid input.
 */
function validateInputs(request: EvaluationRequest): void {
    const { contract, rules, event, context } = request;

    // Validate contract
    if (!contract) {
        throw new EngineError(EngineErrorCode.INVALID_CONTRACT, 'Contract is required');
    }

    const validation = validateContract(contract);
    const structuralErrors = validation.errors.filter((e) => e.invariant !== 'C10');
    if (structuralErrors.length > 0) {
        throw new EngineError(
            EngineErrorCode.INVALID_CONTRACT,
            `Contract invariant violations: ${structuralErrors.map((e) => `${e.invariant}: ${e.message}`).join('; ')}`,
        );
    }

    // Check AI provenance
    if (hasAIProvenance(contract)) {
        throw new EngineError(
            EngineErrorCode.AI_PROVENANCE_VIOLATION,
            'Contract contains unconfirmed AI annotations',
        );
    }

    // Validate rule set
    if (!rules || !rules.rules || rules.rules.length === 0) {
        throw new EngineError(EngineErrorCode.INVALID_RULE_SET, 'Rule set is required and must not be empty');
    }

    if (rules.schema_version.major > ENGINE_SUPPORTED_SCHEMA_MAJOR) {
        throw new EngineError(
            EngineErrorCode.SCHEMA_MISMATCH,
            `Rule set schema v${rules.schema_version.major} not supported by engine`,
        );
    }

    // Validate context
    if (!context) {
        throw new EngineError(EngineErrorCode.EVALUATION_CONTEXT_INVALID, 'EvaluationContext is required');
    }

    if (!context.evaluation_date) {
        throw new EngineError(EngineErrorCode.EVALUATION_CONTEXT_INVALID, 'evaluation_date is required');
    }

    if (!context.request_id) {
        throw new EngineError(EngineErrorCode.EVALUATION_CONTEXT_INVALID, 'request_id is required');
    }

    // INCREMENTAL mode requires an event
    if (context.mode === EvaluationMode.INCREMENTAL && !event) {
        throw new EngineError(
            EngineErrorCode.MISSING_EVENT_FOR_INCREMENTAL,
            'INCREMENTAL mode requires an Event',
        );
    }

    // Event must target correct contract
    if (event && event.contract_id !== contract.id) {
        throw new EngineError(
            EngineErrorCode.EVENT_CONTRACT_MISMATCH,
            `Event targets contract ${event.contract_id}, got ${contract.id}`,
        );
    }

    // Schema version check
    if (contract.schema_version.major > ENGINE_SUPPORTED_SCHEMA_MAJOR) {
        throw new EngineError(
            EngineErrorCode.SCHEMA_MISMATCH,
            `Contract schema v${contract.schema_version.major} not supported by engine`,
        );
    }
}

/**
 * Builds the compliance verdict from findings.
 * Deterministic classification per Phase C spec:
 * - Any CRITICAL or HIGH → NON_COMPLIANT
 * - Any AMBIGUOUS_CLAUSE → AMBIGUOUS
 * - Otherwise → COMPLIANT
 */
function buildComplianceVerdict(findings: RiskFinding[]): ComplianceVerdict {
    const criticalCount = findings.filter((f) => f.severity === FindingSeverity.CRITICAL).length;
    const highCount = findings.filter((f) => f.severity === FindingSeverity.HIGH).length;
    const mediumCount = findings.filter((f) => f.severity === FindingSeverity.MEDIUM).length;
    const lowCount = findings.filter((f) => f.severity === FindingSeverity.LOW).length;
    const infoCount = findings.filter((f) => f.severity === FindingSeverity.INFO).length;

    let status: ComplianceStatus;
    if (criticalCount > 0 || highCount > 0) {
        status = ComplianceStatus.NON_COMPLIANT;
    } else if (findings.some((f) => f.finding_type === FindingType.AMBIGUOUS_CLAUSE)) {
        status = ComplianceStatus.AMBIGUOUS;
    } else {
        status = ComplianceStatus.COMPLIANT;
    }

    const summary = `${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low, ${infoCount} info findings`;

    return {
        status,
        summary,
        critical_count: criticalCount,
        high_count: highCount,
        medium_count: mediumCount,
        low_count: lowCount,
        info_count: infoCount,
    };
}
