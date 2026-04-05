"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ChevronDown, ChevronRight, AlertTriangle, Info, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useContractStore } from '@/lib/stores';
import { DEMO_COMPLIANCE_RULES, DEMO_ADDITIONAL_FINDINGS, type ComplianceRule } from '@/lib/demo-data';
import { useAnalysis } from '@/lib/use-analysis';

function StatusIcon({ status }: { status: string }) {
    switch (status) {
        case 'PASS': return <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />;
        case 'FAIL': return <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />;
        case 'REVIEW': return <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />;
        default: return <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />;
    }
}

function statusColor(status: string): string {
    switch (status) {
        case 'PASS': return 'border-green-500/30 bg-green-500/5';
        case 'FAIL': return 'border-red-500/30 bg-red-500/5';
        case 'REVIEW': return 'border-yellow-500/30 bg-yellow-500/5';
        default: return 'border-border';
    }
}

function statusBadge(status: string): string {
    switch (status) {
        case 'PASS': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        case 'FAIL': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        case 'REVIEW': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
        default: return 'bg-muted text-muted-foreground';
    }
}

function RuleCard({ rule, index }: { rule: ComplianceRule; index: number }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className={`rounded-lg border p-4 transition-all ${statusColor(rule.status)}`}>
            <div className="flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <StatusIcon status={rule.status} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                            <span className="text-muted-foreground font-mono text-xs">#{index + 1}</span>
                            {rule.rule.replace(/_/g, ' ')}
                        </h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${statusBadge(rule.status)}`}>{rule.status}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
                {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />}
            </div>
            {expanded && (
                <div className="mt-3 ml-8 p-3 bg-muted/30 rounded border text-sm text-muted-foreground">{rule.explanation}</div>
            )}
        </div>
    );
}

export default function ComplianceDashboardPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { analysis, isDemo, loading } = useAnalysis(params.id);

    const rules: ComplianceRule[] = isDemo ? DEMO_COMPLIANCE_RULES : (analysis?.compliance?.rules || []) as ComplianceRule[];
    const findings: ComplianceRule[] = isDemo ? DEMO_ADDITIONAL_FINDINGS : (analysis?.compliance?.additionalFindings || []) as ComplianceRule[];
    const sectionLabel = isDemo ? 'Section 138 NI Act — 6 Ingredients' : (analysis?.metadata?.section || 'Legal Compliance Rules');

    const passCount = rules.filter(r => r.status === 'PASS').length;
    const totalCount = rules.length;
    const allPassed = totalCount > 0 && passCount === totalCount;

    if (loading) {
        return (
            <div className="container py-8 max-w-5xl flex flex-col items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
                <p className="text-muted-foreground font-medium">Analyzing document for compliance…</p>
            </div>
        );
    }

    return (
        <div className="container py-8 max-w-5xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Compliance Engine</h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">{sectionLabel}</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.push(`/contracts/${params.id}/core`)}>Back to Core</Button>
                    <Button onClick={() => router.push(`/contracts/${params.id}/execution`)}>Go to Execution <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className={`lg:col-span-1 ${allPassed ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Overall Status</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                        <Shield className={`h-24 w-24 mb-6 drop-shadow-md ${allPassed ? 'text-green-500' : 'text-yellow-500'}`} />
                        <h2 className={`text-3xl font-bold ${allPassed ? 'text-green-600 dark:text-green-500' : 'text-yellow-600 dark:text-yellow-500'}`}>
                            {allPassed ? 'ALL PASSED' : 'REVIEW NEEDED'}
                        </h2>
                        <p className="text-center text-sm text-muted-foreground mt-4 max-w-[280px]">{passCount}/{totalCount} compliance checks verified.</p>
                        <div className="mt-6 w-full max-w-[200px]">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Progress</span><span>{passCount}/{totalCount}</span></div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${totalCount > 0 ? (passCount / totalCount) * 100 : 0}%` }} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> {sectionLabel}</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {rules.map((rule, i) => <RuleCard key={rule.id} rule={rule} index={i} />)}
                            {rules.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No compliance rules extracted.</p>}
                        </CardContent>
                    </Card>
                    {findings.length > 0 && (
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" /> Additional Findings</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                {findings.map((rule, i) => <RuleCard key={rule.id} rule={rule} index={i} />)}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
