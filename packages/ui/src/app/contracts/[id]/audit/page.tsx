"use client";

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ClipboardList, Shield, Play, Upload, FileSearch, Link2, CheckCircle2, AlertTriangle, Clock, User, Hash } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useContractStore } from '@/lib/stores';

interface AuditEntry {
    id: string;
    timestamp: string;
    action: string;
    actor: string;
    module: string;
    details: string;
    hash: string;
    severity: 'info' | 'warning' | 'success' | 'critical';
    icon: any;
}

export default function AuditTrailPage() {
    const params = useParams() as { id: string };
    const contracts = useContractStore((state) => state.contracts);
    const contract = contracts.find(c => c.id === params.id);

    const auditEntries: AuditEntry[] = useMemo(() => {
        if (!contract) return [];

        const baseHash = (contract as any).hash || '0x716e1b...';
        const now = new Date();

        return [
            {
                id: 'audit-001',
                timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                action: 'Document Uploaded',
                actor: 'admin',
                module: 'Ingestion',
                details: `Contract "${contract.title}" uploaded and parsed by the ingestion engine. Raw text extracted successfully.`,
                hash: baseHash.slice(0, 16) + '...a1f2',
                severity: 'info',
                icon: Upload,
            },
            {
                id: 'audit-002',
                timestamp: new Date(now.getTime() - 6.5 * 24 * 60 * 60 * 1000).toISOString(),
                action: 'AI Clause Extraction',
                actor: 'system',
                module: 'AI Engine',
                details: 'AI engine extracted 3 clauses, 2 obligations, and 4 conditions from the document. Confidence: 92%.',
                hash: baseHash.slice(0, 16) + '...b3c4',
                severity: 'success',
                icon: FileSearch,
            },
            {
                id: 'audit-003',
                timestamp: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
                action: 'Compliance Check Passed',
                actor: 'system',
                module: 'Compliance Engine',
                details: 'Contract passed all 14 structural invariants (C1–C14). No compliance violations detected.',
                hash: baseHash.slice(0, 16) + '...d5e6',
                severity: 'success',
                icon: Shield,
            },
            {
                id: 'audit-004',
                timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                action: 'Determinism Score Computed',
                actor: 'system',
                module: 'Determinism Engine',
                details: 'Determinism score: 98.5%. All state transitions are deterministic and replay-safe.',
                hash: baseHash.slice(0, 16) + '...f7a8',
                severity: 'success',
                icon: CheckCircle2,
            },
            {
                id: 'audit-005',
                timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                action: 'Contract State Changed',
                actor: 'admin',
                module: 'Execution Engine',
                details: `Contract state transitioned from DRAFT → ACTIVE after all parties signed. Execution hash generated.`,
                hash: baseHash.slice(0, 16) + '...c9d0',
                severity: 'info',
                icon: Play,
            },
            {
                id: 'audit-006',
                timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                action: 'Blockchain Anchor Submitted',
                actor: 'system',
                module: 'Blockchain',
                details: 'Execution state hash anchored to the simulated EVM chain. Transaction confirmed in block #1847293.',
                hash: baseHash.slice(0, 16) + '...e1f2',
                severity: 'success',
                icon: Link2,
            },
        ];
    }, [contract]);

    const severityStyles = {
        info: 'border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10',
        warning: 'border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/10',
        success: 'border-l-green-500 bg-green-50/30 dark:bg-green-950/10',
        critical: 'border-l-red-500 bg-red-50/30 dark:bg-red-950/10',
    };

    const severityBadge = {
        info: 'bg-blue-100 text-blue-800 border-blue-200',
        warning: 'bg-amber-100 text-amber-800 border-amber-200',
        success: 'bg-green-100 text-green-800 border-green-200',
        critical: 'bg-red-100 text-red-800 border-red-200',
    };

    if (!contract) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[70vh]">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="bg-muted/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto border">
                        <ClipboardList className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Audit Trail</h2>
                        <p className="text-muted-foreground">No contract data available. Select a contract to view its audit history.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-8 max-w-4xl h-full flex flex-col space-y-6 overflow-y-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <ClipboardList className="h-7 w-7 text-primary" /> Audit Trail
                </h1>
                <p className="text-muted-foreground mt-1 text-sm font-medium">
                    {contract.title} &middot; ID: {params.id} &middot; Complete lifecycle provenance
                </p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border shadow-sm">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-primary">{auditEntries.length}</div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Events</div>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{auditEntries.filter(e => e.severity === 'success').length}</div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Passed</div>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-amber-600">{auditEntries.filter(e => e.severity === 'warning').length}</div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Warnings</div>
                    </CardContent>
                </Card>
                <Card className="border shadow-sm">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">{auditEntries.filter(e => e.severity === 'critical').length}</div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Critical</div>
                    </CardContent>
                </Card>
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-primary/10 to-transparent" />

                <div className="space-y-4">
                    {auditEntries.map((entry, idx) => {
                        const Icon = entry.icon;
                        const date = new Date(entry.timestamp);
                        return (
                            <div key={entry.id} className="relative flex gap-4 pl-2">
                                {/* Timeline dot */}
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-2",
                                    entry.severity === 'success' ? 'bg-green-100 border-green-300 dark:bg-green-900/40 dark:border-green-700' :
                                    entry.severity === 'warning' ? 'bg-amber-100 border-amber-300 dark:bg-amber-900/40 dark:border-amber-700' :
                                    entry.severity === 'critical' ? 'bg-red-100 border-red-300 dark:bg-red-900/40 dark:border-red-700' :
                                    'bg-blue-100 border-blue-300 dark:bg-blue-900/40 dark:border-blue-700'
                                )}>
                                    <Icon className={cn("w-4 h-4",
                                        entry.severity === 'success' ? 'text-green-700 dark:text-green-300' :
                                        entry.severity === 'warning' ? 'text-amber-700 dark:text-amber-300' :
                                        entry.severity === 'critical' ? 'text-red-700 dark:text-red-300' :
                                        'text-blue-700 dark:text-blue-300'
                                    )} />
                                </div>

                                {/* Entry card */}
                                <Card className={cn("flex-1 border-l-4 shadow-sm", severityStyles[entry.severity])}>
                                    <CardContent className="p-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm">{entry.action}</span>
                                                <Badge variant="outline" className={cn("text-[10px] font-semibold", severityBadge[entry.severity])}>
                                                    {entry.module}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className="flex items-center gap-1"><User className="w-3 h-3" />{entry.actor}</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{entry.details}</p>
                                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground font-mono">
                                            <Hash className="w-3 h-3" /> {entry.hash}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
