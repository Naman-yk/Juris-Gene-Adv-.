"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GitCompare, FileCode2, Scale, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DEMO_DIFF } from '@/lib/demo-data';

const statusStyles: Record<string, { border: string; bg: string; badge: string; badgeText: string }> = {
    added:    { border: 'border-l-green-500',  bg: 'bg-green-50/50 dark:bg-green-950/20', badge: 'bg-green-100 text-green-800 border-green-200', badgeText: 'ADDED' },
    removed:  { border: 'border-l-red-500',    bg: 'bg-red-50/50 dark:bg-red-950/20',     badge: 'bg-red-100 text-red-800 border-red-200',     badgeText: 'REMOVED' },
    modified: { border: 'border-l-yellow-500', bg: 'bg-yellow-50/50 dark:bg-yellow-950/20', badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', badgeText: 'MODIFIED' },
    original: { border: 'border-l-gray-300',   bg: 'bg-muted/10',                          badge: '',                                           badgeText: '' },
};

export default function ContractDiffPage() {
    const params = useParams() as { id: string };
    const router = useRouter();

    const { versionA, versionB, summary } = DEMO_DIFF;

    return (
        <div className="container py-8 max-w-6xl space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <GitCompare className="h-7 w-7 text-primary" /> Contract Diff
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        Settlement 2016 vs Settlement 2022
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/contracts/${params.id}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contract
                </Button>
            </div>

            {/* Version Headers */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch bg-muted/30 p-4 rounded-xl border">
                <div className="flex-1 space-y-2">
                    <div className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                        <FileCode2 className="h-4 w-4" /> Version A (Original)
                    </div>
                    <h3 className="font-bold text-base">{versionA.title}</h3>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{versionA.date}</Badge>
                </div>

                <div className="hidden md:flex flex-col items-center justify-center px-6 border-x">
                    <GitCompare className="h-6 w-6 text-muted-foreground mb-2" />
                    <Badge variant="destructive">DIVERGENT</Badge>
                </div>

                <div className="flex-1 space-y-2 md:text-right">
                    <div className="text-sm font-semibold uppercase text-muted-foreground flex items-center md:justify-end gap-2">
                        <FileCode2 className="h-4 w-4 text-blue-500" /> Version B (Updated)
                    </div>
                    <h3 className="font-bold text-base text-blue-600 dark:text-blue-400">{versionB.title}</h3>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{versionB.date}</Badge>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border bg-green-50/30 dark:bg-green-950/10 text-center">
                    <div className="text-2xl font-bold text-green-600">{summary.added}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase">Added</div>
                </div>
                <div className="p-3 rounded-lg border bg-red-50/30 dark:bg-red-950/10 text-center">
                    <div className="text-2xl font-bold text-red-600">{summary.removed}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase">Removed</div>
                </div>
                <div className="p-3 rounded-lg border bg-yellow-50/30 dark:bg-yellow-950/10 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{summary.modified}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase">Modified</div>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30 text-center">
                    <div className="text-2xl font-bold text-muted-foreground">{summary.unchanged}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase">Unchanged</div>
                </div>
            </div>

            {/* Side-by-Side Diff */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Version A */}
                <div>
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
                        <Scale className="h-5 w-5 text-primary" /> Settlement 2016
                    </h2>
                    <div className="space-y-3">
                        {versionA.clauses.map(clause => {
                            const style = statusStyles[clause.status] || statusStyles.original;
                            return (
                                <Card key={clause.id} className={cn("border-l-4 overflow-hidden", style.border)}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <span className="font-mono text-xs text-muted-foreground">{clause.id}</span>
                                            {style.badgeText && (
                                                <Badge className={cn("text-xs", style.badge)}>{style.badgeText}</Badge>
                                            )}
                                        </div>
                                        <p className={cn("text-sm leading-relaxed", clause.status === 'removed' ? 'line-through opacity-60 text-red-700 dark:text-red-400' : '')}>
                                            {clause.text}
                                        </p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* Version B */}
                <div>
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
                        <Scale className="h-5 w-5 text-blue-500" /> Settlement 2022
                    </h2>
                    <div className="space-y-3">
                        {versionB.clauses.map(clause => {
                            const style = statusStyles[clause.status] || statusStyles.original;
                            return (
                                <Card key={clause.id} className={cn("border-l-4 overflow-hidden", style.border)}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <span className="font-mono text-xs text-muted-foreground">{clause.id}</span>
                                            {style.badgeText && (
                                                <Badge className={cn("text-xs", style.badge)}>{style.badgeText}</Badge>
                                            )}
                                        </div>
                                        <p className={cn("text-sm leading-relaxed", clause.status === 'added' ? 'text-green-700 dark:text-green-400 font-medium' : clause.status === 'modified' ? 'text-yellow-700 dark:text-yellow-400' : '')}>
                                            {clause.text}
                                        </p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 p-4 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900/50">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                    <h4 className="font-semibold text-orange-700 dark:text-orange-400 text-sm">Authenticity Warning</h4>
                    <p className="text-sm text-orange-600/80 dark:text-orange-300/80 mt-1">
                        Settlement documents Ex.DW1/1 (2016) and Mark A (2022) were never put to the complainant during cross-examination. 
                        Per Section 145 CrPC, these are inadmissible as evidence.
                    </p>
                </div>
            </div>
        </div>
    );
}
