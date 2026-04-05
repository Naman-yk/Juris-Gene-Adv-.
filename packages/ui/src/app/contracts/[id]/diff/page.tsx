"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ArrowLeft, AlertTriangle, Plus, Minus, Edit3, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DEMO_DIFF } from '@/lib/demo-data';
import { useAnalysis } from '@/lib/use-analysis';

const statusConfig: Record<string, { icon: any; label: string; bg: string; text: string; border: string }> = {
    original:  { icon: Check,  label: 'UNCHANGED', bg: 'bg-slate-50 dark:bg-slate-800/30', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700' },
    added:     { icon: Plus,   label: 'ADDED',     bg: 'bg-green-50 dark:bg-green-900/10', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
    removed:   { icon: Minus,  label: 'REMOVED',   bg: 'bg-red-50 dark:bg-red-900/10',     text: 'text-red-700 dark:text-red-400',   border: 'border-red-200 dark:border-red-800' },
    modified:  { icon: Edit3,  label: 'MODIFIED',  bg: 'bg-yellow-50 dark:bg-yellow-900/10', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800' },
};

export default function ContractDiffPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { analysis, isDemo, loading, error } = useAnalysis(params.id);

    const diff = isDemo ? DEMO_DIFF : analysis?.diff;
    const versionA = diff?.versionA;
    const versionB = diff?.versionB;
    const summary = diff?.summary;

    if (loading) {
        return (
            <div className="container py-8 max-w-6xl flex flex-col items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
                <p className="text-muted-foreground font-medium">Analyzing document structure…</p>
            </div>
        );
    }

    if (error && !isDemo) {
        return (
            <div className="container py-8 max-w-6xl flex flex-col items-center justify-center min-h-[60vh] text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-xl font-bold mb-2">Analysis Failed</h3>
                <p className="text-muted-foreground mb-4 max-w-md">{error}</p>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
        );
    }

    if (!diff || !versionA || !versionB) {
        return (
            <div className="container py-8 max-w-6xl text-center">
                <p className="text-muted-foreground">No diff data available for this document.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push(`/contracts/${params.id}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contract
                </Button>
            </div>
        );
    }

    return (
        <div className="container py-8 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <FileText className="h-7 w-7 text-primary" /> Contract Diff
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">Side-by-side comparison of document versions</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/contracts/${params.id}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contract
                </Button>
            </div>

            {/* Summary Banner */}
            {summary && (
                <Card className="mb-6 border-yellow-400/30 bg-yellow-50/50 dark:bg-yellow-900/10">
                    <CardContent className="flex flex-wrap items-center gap-4 py-4">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <span className="font-medium text-sm">Diff Summary:</span>
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300">+{summary.added} Added</Badge>
                        <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300">-{summary.removed} Removed</Badge>
                        <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-300">~{summary.modified} Modified</Badge>
                        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800/20 text-slate-600 dark:text-slate-400 border-slate-300">={summary.unchanged} Unchanged</Badge>
                        <Badge className="ml-auto bg-yellow-500 text-white">{summary.status}</Badge>
                    </CardContent>
                </Card>
            )}

            {/* Side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Version A */}
                <Card>
                    <CardHeader className="bg-muted/20 border-b">
                        <CardTitle className="text-base">{versionA.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">{versionA.date}</p>
                    </CardHeader>
                    <CardContent className="space-y-3 py-4">
                        {versionA.clauses.map((clause: any) => {
                            const config = statusConfig[clause.status] || statusConfig.original;
                            const Icon = config.icon;
                            return (
                                <div key={clause.id} className={`p-3 rounded-lg border ${config.bg} ${config.border}`}>
                                    <div className="flex items-start gap-2">
                                        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${config.text}`} />
                                        <div className="flex-1">
                                            <p className="text-sm leading-relaxed">{clause.text}</p>
                                            <Badge variant="outline" className={`mt-2 text-[10px] ${config.text} ${config.border}`}>{config.label}</Badge>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Version B */}
                <Card>
                    <CardHeader className="bg-muted/20 border-b">
                        <CardTitle className="text-base">{versionB.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">{versionB.date}</p>
                    </CardHeader>
                    <CardContent className="space-y-3 py-4">
                        {versionB.clauses.map((clause: any) => {
                            const config = statusConfig[clause.status] || statusConfig.original;
                            const Icon = config.icon;
                            return (
                                <div key={clause.id} className={`p-3 rounded-lg border ${config.bg} ${config.border}`}>
                                    <div className="flex items-start gap-2">
                                        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${config.text}`} />
                                        <div className="flex-1">
                                            <p className="text-sm leading-relaxed">{clause.text}</p>
                                            <Badge variant="outline" className={`mt-2 text-[10px] ${config.text} ${config.border}`}>{config.label}</Badge>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
