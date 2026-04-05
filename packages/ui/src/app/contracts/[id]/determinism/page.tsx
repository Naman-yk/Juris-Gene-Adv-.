"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldAlert, BadgeCheck, FileWarning, SearchX, Activity } from 'lucide-react';
import { useContractStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DEMO_DETERMINISM_SCORE, DEMO_SCORE_DEDUCTIONS, getDeterminismRiskLabel } from '@/lib/demo-data';

function RadialGauge({ score }: { score: number }) {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const risk = getDeterminismRiskLabel(score);

    let color = 'text-green-500';
    let bgStroke = 'text-green-500/20';
    if (score <= 70 && score > 40) {
        color = 'text-yellow-500';
        bgStroke = 'text-yellow-500/20';
    } else if (score <= 40) {
        color = 'text-red-500';
        bgStroke = 'text-red-500/20';
    }

    return (
        <div className="relative flex items-center justify-center w-48 h-48">
            <svg className="absolute w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className={bgStroke} />
                <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={cn(color, "transition-all duration-1000 ease-in-out")} strokeLinecap="round" />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{score}</span>
                <span className="text-xs uppercase text-muted-foreground font-semibold">/ 100</span>
            </div>
        </div>
    );
}

function ScoreBar({ score }: { score: number }) {
    return (
        <div className="w-full space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 — HIGH RISK</span>
                <span>40</span>
                <span>70</span>
                <span>100 — LOW RISK</span>
            </div>
            <div className="relative w-full h-4 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-yellow-500 to-green-500">
                <div
                    className="absolute top-0 h-full w-1 bg-white shadow-lg border border-black/20 rounded-full transform -translate-x-1/2 transition-all duration-700"
                    style={{ left: `${score}%` }}
                />
            </div>
        </div>
    );
}

export default function DeterminismPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const contracts = useContractStore((state) => state.contracts);
    const contract = contracts.find(c => c.id === params.id);

    const score = DEMO_DETERMINISM_SCORE;
    const deductions = DEMO_SCORE_DEDUCTIONS;
    const risk = getDeterminismRiskLabel(score);
    const totalDeducted = deductions.reduce((sum, d) => sum + Math.abs(d.points), 0);

    const getIconForSeverity = (severity: string) => {
        switch (severity) {
            case 'HIGH': return <FileWarning className="w-5 h-5 text-red-500" />;
            case 'MEDIUM': return <ShieldAlert className="w-5 h-5 text-yellow-500" />;
            case 'LOW': return <Activity className="w-5 h-5 text-green-500" />;
            default: return <SearchX className="w-5 h-5 text-muted-foreground" />;
        }
    };

    const severityBadge = (severity: string) => {
        switch (severity) {
            case 'HIGH': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'LOW': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <div className="container py-8 max-w-[1200px] space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Determinism Score</h1>
                    <p className="text-muted-foreground">Risk assessment identifying ambiguous terms, missing proofs, and contradictions.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/contracts/${params.id}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contract
                </Button>
            </div>

            {/* Score Bar */}
            <Card className="p-6">
                <ScoreBar score={score} />
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Score Panel */}
                <Card className="md:col-span-1 border-2 flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-900/50 shadow-sm">
                    <h3 className="font-semibold text-lg text-center w-full border-b pb-4 mb-4">Overall Score</h3>
                    <RadialGauge score={score} />

                    <div className="mt-6 flex flex-col items-center gap-3">
                        <Badge className={cn("text-sm px-4 py-1.5 shadow-sm text-white", score <= 40 ? 'bg-red-500' : score <= 70 ? 'bg-yellow-500' : 'bg-green-500')}>
                            {risk.label}
                        </Badge>
                        <p className="text-xs text-center text-muted-foreground mt-2 px-4 leading-relaxed">
                            0–40 = HIGH RISK • 40–70 = MEDIUM • 70–100 = LOW RISK<br />
                            This document scores {score}/100 due to {deductions.length} risk factors.
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
                                -{totalDeducted} Pts Total
                            </Badge>
                        </div>
                        <CardDescription>Breakdown of deductions from the maximum score of 100.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto max-h-[500px]">
                        <div className="divide-y">
                            {deductions.map((d) => (
                                <div key={d.id} className="p-4 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                                    <div className="mt-1 bg-background p-2 rounded-lg border shadow-sm">
                                        {getIconForSeverity(d.severity)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1 gap-2">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-sm">{d.category.replace(/_/g, ' ')}</h4>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${severityBadge(d.severity)}`}>
                                                    {d.severity}
                                                </span>
                                            </div>
                                            <span className="text-red-500 dark:text-red-400 font-bold font-mono text-sm leading-none flex items-center bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded flex-shrink-0">
                                                {d.points}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{d.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
