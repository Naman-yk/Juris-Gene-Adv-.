import React from 'react';

// FEATURE 1A — WHY THIS HAPPENED PANELS: Compliance Screen Explanation Panel
export const WhyCompliancePanel = ({ finding }: { finding: any }) => {
    // Render ONLY if there's trace data/finding
    if (!finding || !finding.rule) return null;

    // Use trace data already produced by the engine
    const rule_id = finding.rule || "UNKNOWN_RULE";
    const clause_id = finding.clauseRef || "UNKNOWN_CLAUSE";
    const requirement_id = finding.id || "REQ_ID";
    const evaluation_date = new Date().toISOString(); // Mock as trace date

    return (
        <div className="mt-4 p-4 bg-muted/30 border-l-4 border-l-primary rounded-r-md font-mono text-sm break-words">
            <div className="font-bold mb-2 uppercase tracking-wider text-xs text-muted-foreground">Why This Result Occurred</div>
            <div>Rule {rule_id} evaluated Clause {clause_id}.</div>
            <div>Requirement {requirement_id} failed because:</div>
            <div className="mt-2 text-foreground font-medium whitespace-pre-wrap">{finding.reason}</div>
        </div>
    );
};

// FEATURE 1B — Execution Screen: State Transition Explanation
export const WhyStateChangedPanel = ({ executionResult }: { executionResult: any }) => {
    // Render ONLY if: ExecutionResult.state_changed === true
    if (!executionResult || !executionResult.state_changed) return null;

    return (
        <div className="mt-4 p-4 bg-muted/30 border-l-4 border-l-primary rounded-r-md font-mono text-sm break-words">
            <div className="font-bold mb-2 uppercase tracking-wider text-xs text-muted-foreground">Why State Changed</div>
            <div>Contract moved from {executionResult.previous_state} → {executionResult.new_state}</div>
            <div>Transition: {executionResult.transition?.transition_id || "UNKNOWN"}</div>
            <div>Trigger: {executionResult.triggering_event?.type || "UNKNOWN"}</div>
            {executionResult.obligations_breached && executionResult.obligations_breached.length > 0 && (
                <div className="mt-2">
                    <div>Breached Obligations:</div>
                    <ul className="list-disc list-inside ml-2">
                        {executionResult.obligations_breached.map((obsId: string, idx: number) => (
                            <li key={idx}>{obsId}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// FEATURE 1C — Penalty Explanation Panel
export const PenaltyExplanation = ({ penalty }: { penalty: any }) => {
    if (!penalty) return null;

    return (
        <div className="mt-4 p-4 bg-muted/30 border-l-4 border-l-destructive rounded-r-md font-mono text-sm break-words">
            <div className="font-bold mb-2 uppercase tracking-wider text-xs text-destructive">Penalty Explanation</div>
            <div>Obligation {penalty.obligation_id} breached.</div>
            <div>Penalty Type: {penalty.penalty_type}</div>
            <div className="mt-2 text-xs text-muted-foreground uppercase">Computation:</div>
            <div className="bg-background/50 p-2 rounded mt-1 mb-2 whitespace-pre-wrap">
                {penalty.computation_trace}
            </div>
            <div className="font-bold">Final Amount: {penalty.computed_amount} {penalty.capped ? "(CAPPED)" : ""}</div>
        </div>
    );
}

// FEATURE 2 — RISK HEATMAP (UI-ONLY)
export const RiskSummaryPanel = ({ executionState, findings, activeObligations }: { executionState?: any, findings?: any[], activeObligations?: any[] }) => {
    // UI-only risk classification based strictly on existing enums
    let riskLevel = 'LOW';
    let riskReasons: string[] = [];

    // Check HIGH risks based on executionState/findings/obligations
    if (executionState?.penalties?.some((p: any) => p.penalty_type === 'TERMINATION_RIGHT')) {
        riskLevel = 'HIGH';
        riskReasons.push("TERMINATION_RIGHT penalty exists");
    }
    if (activeObligations?.some((o: any) => o.status === 'BREACHED')) {
        riskLevel = 'HIGH';
        riskReasons.push("ACTIVE obligation is BREACHED");
    }
    if (findings?.some((f: any) => f.severity === 'CRITICAL')) {
        riskLevel = 'HIGH';
        riskReasons.push("CRITICAL RiskFinding exists");
    }

    // Check MEDIUM risks if not already HIGH
    if (riskLevel !== 'HIGH') {
        if (executionState?.penalties?.some((p: any) => p.penalty_type === 'FINANCIAL')) {
            riskLevel = 'MEDIUM';
            riskReasons.push("Financial penalty exists");
        }
        if (findings?.some((f: any) => f.severity === 'WARNING' || f.severity === 'HIGH')) { // 'HIGH' severity in findings might also trigger MEDIUM if not CRITICAL
            riskLevel = 'MEDIUM';
            riskReasons.push("WARNING RiskFinding exists");
        }
    }

    const badgeColors = {
        HIGH: 'bg-red-500/10 text-red-600 border-red-500/20',
        MEDIUM: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
        LOW: 'bg-green-500/10 text-green-600 border-green-500/20'
    };

    return (
        <div className="mb-6 p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h3 className="font-semibold text-lg">Overall Risk Assessment</h3>
                <p className="text-sm text-muted-foreground">Comprehensive heuristic-based evaluation derived from contractual obligations, structural rights, and deterministic engine outputs.</p>
            </div>
            <div className={`px-4 py-2 border rounded-md font-bold text-center ${badgeColors[riskLevel as keyof typeof badgeColors]}`}>
                {riskLevel} RISK
                {riskReasons.length > 0 && (
                    <div className="text-xs font-normal mt-1 opacity-80 text-left">
                        {riskReasons.map((r, i) => <div key={i}>• {r}</div>)}
                    </div>
                )}
            </div>
        </div>
    );
};

export const ClauseRiskBadge = ({ riskLevel }: { riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' }) => {
    const format = {
        HIGH: { icon: '🔴', label: 'High' },
        MEDIUM: { icon: '🟡', label: 'Medium' },
        LOW: { icon: '🟢', label: 'Low' },
    }[riskLevel] || { icon: '🟢', label: 'Low' };

    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
            {format.icon} {format.label}
        </span>
    );
};

// FEATURE 4 — AI IS REPLACEABLE BANNER
export const AIOptionalBanner = () => {
    return (
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-3 flex items-center justify-center gap-2 text-blue-700 dark:text-blue-400 text-sm font-medium">
            AI is optional in JurisGenie. AI is used only for extraction assistance. All compliance and execution logic is deterministic. The AI layer can be replaced or removed without affecting legality.
        </div>
    );
};
