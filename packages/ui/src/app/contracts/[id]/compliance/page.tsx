"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ChevronDown, ChevronRight, AlertTriangle, Info, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useContractStore } from '@/lib/stores';
import { WhyCompliancePanel, RiskSummaryPanel } from '@/components/ui/explainability';

// Mock Data
const COMPLIANCE_STATUS = "COMPLIANT"; // COMPLIANT, NON_COMPLIANT, AMBIGUOUS
const FINDINGS = [
    { id: 1, severity: 'LOW', clauseRef: 'c2', rule: 'GDPR_DATA_MINIMIZATION', reason: 'Confidentiality provision lacks explicit data retention timelines, potentially conflicting with GDPR Article 5(1)(e) storage limitation principles.', status: 'AMBIGUOUS' },
    { id: 2, severity: 'INFO', clauseRef: 'c1', rule: 'LICENSE_GRANT_EXPLICIT', reason: 'License grant clearly demarcates non-exclusive rights, though absence of territorial limitations may require future sub-licensing amendments.', status: 'PASS' },
];

const TRACE_TREE = {
    id: "EVAL_ROOT",
    rule: "SOFTWARE_COMPLIANCE_SUITE",
    result: "PASS",
    children: [
        {
            id: "EVAL_1",
            rule: "GDPR_CHECK",
            result: "AMBIGUOUS",
            children: [
                { id: "EVAL_1_A", rule: "DATA_MINIMIZATION", result: "AMBIGUOUS", detail: "Clause c2 missing duration" }
            ]
        },
        {
            id: "EVAL_2",
            rule: "LICENSE_INTEGRITY",
            result: "PASS",
            children: [
                { id: "EVAL_2_A", rule: "GRANT_EXPLICIT", result: "PASS", detail: "Clause c1 satisfies requirement" }
            ]
        }
    ]
};

const TraceNode = ({ node }: { node: any }) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    const getIcon = (result: string) => {
        switch (result) {
            case 'PASS': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'FAIL': return <AlertTriangle className="h-4 w-4 text-destructive" />;
            case 'AMBIGUOUS': return <Info className="h-4 w-4 text-yellow-500" />;
            default: return null;
        }
    };

    return (
        <div className="ml-4 mt-2">
            <div
                className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 ${hasChildren ? 'cursor-pointer' : ''}`}
                onClick={() => hasChildren && setExpanded(!expanded)}
            >
                {hasChildren ? (expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />) : <span className="w-4 inline-block" />}
                {getIcon(node.result)}
                <span className="font-mono text-sm font-semibold">{node.rule}</span>
                {node.detail && <span className="text-sm text-muted-foreground ml-2">- {node.detail}</span>}
            </div>
            {expanded && hasChildren && (
                <div className="border-l border-muted-foreground/20 ml-2 pl-2">
                    {node.children.map((child: any) => (
                        <TraceNode key={child.id} node={child} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function ComplianceDashboardPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const contracts = useContractStore((state) => state.contracts);
    const contract = contracts.find(c => c.id === params.id) || { title: "Unknown Contract", hash: "0xabc123456789def0123456789abcdeffedcba9876543210" };

    return (
        <div className="container py-8 max-w-5xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Compliance Dashboard</h1>
                    <p className="text-muted-foreground flex flex-wrap items-center gap-2 mt-1 font-medium">
                        {contract.title} <span className="text-border">|</span>
                        ID: {params.id} <span className="text-border">|</span>
                        Current Hash: <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{contract.hash.substring(0, 8)}...</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.push(`/contracts/${params.id}/core`)}>
                        Back to Core
                    </Button>
                    <Button onClick={() => router.push(`/contracts/${params.id}/execution`)}>
                        Go to Execution <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>

            <RiskSummaryPanel findings={FINDINGS} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 border-primary/20 bg-primary/5">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Overall Status</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                        <Shield className="h-24 w-24 text-green-500 mb-6 drop-shadow-md" />
                        <h2 className="text-3xl font-bold text-green-600 dark:text-green-500">{COMPLIANCE_STATUS}</h2>
                        <p className="text-center text-sm text-muted-foreground mt-4 max-w-[250px]">
                            Document achieves 95% alignment with institutional compliance heuristics. Residual risk identified in minor ambiguity regarding data lifecycle management.
                        </p>
                    </CardContent>
                </Card>

                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Identified Findings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {FINDINGS.map(finding => (
                                    <div key={finding.id} className="flex gap-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                                        <div className="mt-0.5">
                                            {finding.severity === 'LOW' && <Info className="h-5 w-5 text-yellow-500" />}
                                            {finding.severity === 'INFO' && <CheckCircle className="h-5 w-5 text-blue-500" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-mono text-sm font-semibold">{finding.rule}</span>
                                                <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">Ref: {finding.clauseRef}</span>
                                            </div>
                                            <p className="text-sm">{finding.reason}</p>
                                            <WhyCompliancePanel finding={finding} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Evaluation Trace Tree</CardTitle>
                        </CardHeader>
                        <CardContent className="bg-muted/30 rounded-md p-4 min-h-[200px] overflow-auto border font-mono text-sm">
                            <TraceNode node={TRACE_TREE} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
