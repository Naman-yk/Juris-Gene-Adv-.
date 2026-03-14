"use client";

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Activity, ShieldAlert, BadgeCheck, FileWarning, SearchX, Coins } from 'lucide-react';
import { useContractStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const AMBIGUOUS_WORDS = ['reasonable', 'best efforts', 'promptly', 'materially', 'approximate', 'satisfactory'];

interface Deduction {
    id: string;
    points: number;
    clauseId?: string;
    clauseTitle?: string;
    reason: string;
    type: 'AMBIGUITY' | 'MISSING_OBLIGATION' | 'UNDEFINED_EVENT' | 'INCOMPLETE_PENALTY';
}

function RadialGauge({ score }: { score: number }) {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    let color = 'text-green-500';
    let bgStroke = 'text-green-500/20';
    if (score < 90 && score >= 70) {
        color = 'text-yellow-500';
        bgStroke = 'text-yellow-500/20';
    } else if (score < 70) {
        color = 'text-red-500';
        bgStroke = 'text-red-500/20';
    }

    return (
        <div className="relative flex items-center justify-center w-48 h-48">
            {/* Background Circle */}
            <svg className="absolute w-full h-full transform -rotate-90">
                <circle
                    cx="96"
                    cy="96"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className={bgStroke}
                />
                {/* Foreground Circle */}
                <circle
                    cx="96"
                    cy="96"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className={cn(color, "transition-all duration-1000 ease-in-out")}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{score}</span>
                <span className="text-xs uppercase text-muted-foreground font-semibold">Score</span>
            </div>
        </div>
    );
}

export default function DeterminismPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const contracts = useContractStore((state) => state.contracts);
    const contract = contracts.find(c => c.id === params.id);

    // Provide mocked deeply nested valid structure if contract data is shallow
    const activeContract = {
        id: params.id,
        title: contract?.title || "Sample Commercial Lease",
        state: contract?.state || contract?.status || 'ACTIVE',
        clauses: (contract as any)?.clauses || [
            { id: "clause-rent", title: "Monthly Rent", content: "The tenant shall pay $5000 promptly each month.", type: "PAYMENT", obligations: [{ id: "obl-pay-rent", status: "ACTIVE", penalty: { type: "FINANCIAL" } }] }, // Deduct: "promptly", incomplete penalty (no amount)
            { id: "clause-term", title: "Early Termination", content: "Tenant may terminate with reasonable notice.", type: "TERMINATION", obligations: [] }, // Deduct: "reasonable", missing obligation
            { id: "clause-maint", title: "Maintenance", content: "Landlord handles maintenance.", type: "OBLIGATION", obligations: [{ id: "obl-maint", status: "ACTIVE", penalty: { type: "FINANCIAL", amount: 100 } }], events: [] } // Deduct: Missing event trigger
        ]
    };

    const determinismSpec = useMemo(() => {
        let score = 100;
        const deductions: Deduction[] = [];

        activeContract.clauses.forEach((clause: any) => {
            // Check for Ambiguity
            AMBIGUOUS_WORDS.forEach(word => {
                if (clause.content?.toLowerCase().includes(word)) {
                    deductions.push({
                        id: `amb-${clause.id}-${word}`,
                        points: 5,
                        clauseId: clause.id,
                        clauseTitle: clause.title,
                        reason: `Ambiguous language detected: "${word}"`,
                        type: 'AMBIGUITY'
                    });
                    score -= 5;
                }
            });

            // Check for Missing Obligations (on non-definitions)
            if (!clause.obligations || clause.obligations.length === 0) {
                if (clause.type !== 'DEFINITION') {
                    deductions.push({
                        id: `no-obl-${clause.id}`,
                        points: 10,
                        clauseId: clause.id,
                        clauseTitle: clause.title,
                        reason: `Clause defines no actionable obligations.`,
                        type: 'MISSING_OBLIGATION'
                    });
                    score -= 10;
                }
            } else {
                clause.obligations.forEach((obl: any) => {
                    // Check incomplete penalties
                    if (obl.penalty && obl.penalty.type === 'FINANCIAL' && !obl.penalty.amount) {
                        deductions.push({
                            id: `no-pen-${obl.id}`,
                            points: 8,
                            clauseId: clause.id,
                            clauseTitle: clause.title,
                            reason: `Actionable obligation missing defined penalty amount natively.`,
                            type: 'INCOMPLETE_PENALTY'
                        });
                        score -= 8;
                    }

                    // Check undefined events (if we assume a standard obligation requires triggering events associated somewhere in the clause. we check clause.events for simplicity)
                    if (!clause.events || clause.events.length === 0) {
                        deductions.push({
                            id: `no-evt-${obl.id}`,
                            points: 5,
                            clauseId: clause.id,
                            clauseTitle: clause.title,
                            reason: `Obligation lacks clear triggering events in state definitions.`,
                            type: 'UNDEFINED_EVENT'
                        });
                        score -= 5;
                    }
                });
            }
        });

        // Ensure score ceiling/floor
        score = Math.max(0, Math.min(100, score));

        let badge = { text: 'Highly Deterministic', color: 'bg-green-500' };
        if (score < 90 && score >= 70) badge = { text: 'Acceptable', color: 'bg-yellow-500' };
        else if (score < 70) badge = { text: 'Risky', color: 'bg-red-500' };

        return { score, deductions, badge };
    }, [activeContract]);

    const getIconForType = (type: string) => {
        switch (type) {
            case 'AMBIGUITY': return <FileWarning className="w-5 h-5 text-yellow-500" />;
            case 'MISSING_OBLIGATION': return <SearchX className="w-5 h-5 text-orange-500" />;
            case 'UNDEFINED_EVENT': return <Activity className="w-5 h-5 text-red-400" />;
            case 'INCOMPLETE_PENALTY': return <Coins className="w-5 h-5 text-red-600" />;
            default: return <ShieldAlert className="w-5 h-5 text-muted-foreground" />;
        }
    };

    return (
        <div className="container py-8 max-w-[1200px] space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Determinism Score</h1>
                    <p className="text-muted-foreground">Algorithmic risk assessment identifying latent contractual ambiguity and logical gaps.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/contracts/${params.id}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contract
                </Button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Score Panel */}
                <Card className="md:col-span-1 border-2 flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-900/50 shadow-sm">
                    <h3 className="font-semibold text-lg text-center w-full border-b pb-4 mb-4">Overall Score</h3>
                    <RadialGauge score={determinismSpec.score} />

                    <div className="mt-6 flex flex-col items-center gap-3">
                        <Badge className={cn("text-sm px-4 py-1.5 shadow-sm text-white", determinismSpec.badge.color)}>
                            {determinismSpec.badge.text}
                        </Badge>
                        <p className="text-xs text-center text-muted-foreground mt-2 px-4 leading-relaxed">
                            Scores above 90 are considered machine-executable. Scores below 70 require manual semantic review prior to deployment.
                        </p>
                    </div>
                </Card>

                {/* Deductions Panel */}
                <Card className="md:col-span-2 shadow-sm flex flex-col">
                    <CardHeader className="border-b bg-muted/20">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-primary" /> Risk Factors & Deductions
                            </CardTitle>
                            <Badge variant="secondary" className="font-mono">
                                -{100 - determinismSpec.score} Pts Total
                            </Badge>
                        </div>
                        <CardDescription>Line-by-line breakdown of non-deterministic elements found during extraction.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto max-h-[500px]">
                        {determinismSpec.deductions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-12 text-center text-muted-foreground">
                                <BadgeCheck className="w-16 h-16 text-green-500/50 mb-4" />
                                <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">No Deductions Identified</h3>
                                <p className="text-sm mt-1">This contract is perfectly structured strictly for algorithmic determinism.</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {determinismSpec.deductions.map((deduction) => (
                                    <div key={deduction.id} className="p-4 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                                        <div className="mt-1 bg-background p-2 rounded-lg border shadow-sm">
                                            {getIconForType(deduction.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="font-semibold text-sm capitalize">{deduction.type.replace('_', ' ')}</h4>
                                                <span className="text-red-500 dark:text-red-400 font-bold font-mono text-sm leading-none flex items-center bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded">
                                                    -{deduction.points}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{deduction.reason}</p>
                                            {deduction.clauseTitle && (
                                                <div className="mt-2 text-xs font-medium text-muted-foreground bg-muted/40 inline-flex items-center px-2 py-1 rounded-md border border-muted/50">
                                                    Clause: {deduction.clauseTitle}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
