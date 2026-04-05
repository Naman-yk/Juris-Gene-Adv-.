"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, AlertTriangle, ArrowLeft, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DEMO_DETERMINISM_SCORE, DEMO_SCORE_DEDUCTIONS, getDeterminismRiskLabel } from '@/lib/demo-data';
import { useAnalysis } from '@/lib/use-analysis';

export default function DeterminismScorePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { analysis, isDemo, loading } = useAnalysis(params.id);

    const score = isDemo ? DEMO_DETERMINISM_SCORE : (analysis?.determinism?.score ?? 75);
    const deductions = isDemo ? DEMO_SCORE_DEDUCTIONS : (analysis?.determinism?.deductions || []);
    const risk = getDeterminismRiskLabel(score);

    if (loading) {
        return (
            <div className="container py-8 max-w-4xl flex flex-col items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
                <p className="text-muted-foreground font-medium">Calculating determinism score…</p>
            </div>
        );
    }

    return (
        <div className="container py-8 max-w-4xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <BarChart3 className="h-7 w-7 text-primary" /> Determinism Score
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        How predictable are the contract outcomes?
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/contracts/${params.id}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contract
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Card */}
                <Card className="lg:col-span-1 border-2 border-primary/10">
                    <CardContent className="flex flex-col items-center justify-center py-10">
                        <div className="relative w-40 h-40 mb-6">
                            <svg className="w-full h-full" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
                                <circle cx="60" cy="60" r="50" fill="none" strokeWidth="8" strokeLinecap="round"
                                    className={score > 70 ? 'text-green-500' : score > 40 ? 'text-yellow-500' : 'text-red-500'}
                                    strokeDasharray={`${score * 3.14} ${314 - score * 3.14}`}
                                    transform="rotate(-90 60 60)"
                                    style={{ transition: 'stroke-dasharray 1s ease' }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black">{score}</span>
                                <span className="text-xs text-muted-foreground font-medium">/ 100</span>
                            </div>
                        </div>
                        <Badge className={`text-sm px-3 py-1 ${risk.color}`}>{risk.label}</Badge>
                        <div className="w-full mt-6 h-3 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                                style={{
                                    width: `${score}%`,
                                    background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e)',
                                }}
                            />
                        </div>
                        <div className="flex justify-between w-full text-[10px] text-muted-foreground mt-1 px-1">
                            <span>HIGH RISK</span><span>MEDIUM</span><span>LOW RISK</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Deductions */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingDown className="h-5 w-5 text-red-500" /> Score Deductions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {deductions.map(d => {
                            const severityClass = d.severity === 'HIGH' ? 'border-red-500/30 bg-red-500/5' :
                                d.severity === 'MEDIUM' ? 'border-yellow-500/30 bg-yellow-500/5' :
                                'border-blue-500/30 bg-blue-500/5';
                            const severityBadge = d.severity === 'HIGH' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                d.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';

                            return (
                                <div key={d.id} className={`rounded-lg border p-4 ${severityClass}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <AlertTriangle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                <span className="font-mono text-xs text-muted-foreground">{d.category.replace(/_/g, ' ')}</span>
                                                <Badge className={`text-[10px] px-1.5 ${severityBadge}`}>{d.severity}</Badge>
                                            </div>
                                            <p className="text-sm">{d.description}</p>
                                        </div>
                                        <span className="text-red-500 font-bold text-lg whitespace-nowrap">{d.points}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {deductions.length === 0 && (
                            <p className="text-muted-foreground text-sm text-center py-8">No deductions identified.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
