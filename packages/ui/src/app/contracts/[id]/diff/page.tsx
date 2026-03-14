"use client";

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { GitCompare, FileCode2, Scale, AlertTriangle, UserCircle, Loader2, RefreshCw } from 'lucide-react';
import { diffWords } from 'diff';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HashBadge } from '@/components/ui/hash-badge';
import { cn } from '@/lib/utils';
import { useContractStore } from '@/lib/stores';

type DiffState = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';

function InlineDiff({ oldStr, newStr }: { oldStr: string; newStr: string }) {
    const diffResult = diffWords(oldStr || '', newStr || '');
    return (
        <span className="whitespace-pre-wrap">
            {diffResult.map((part, index) => (
                <span
                    key={index}
                    className={cn(
                        part.added ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 px-1 rounded mx-[1px]" : "",
                        part.removed ? "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 line-through px-1 rounded mx-[1px] opacity-70" : ""
                    )}
                >
                    {part.value}
                </span>
            ))}
        </span>
    );
}

const BadgeForState = ({ state }: { state: DiffState }) => {
    switch (state) {
        case 'ADDED': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">ADDED</Badge>;
        case 'REMOVED': return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">REMOVED</Badge>;
        case 'MODIFIED': return <Badge variant="outline" className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200">MODIFIED</Badge>;
        default: return null;
    }
};

export default function ContractDiffPage() {
    const params = useParams() as { id: string };
    const contracts = useContractStore((state) => state.contracts);
    const contract = contracts.find(c => c.id === params.id);

    // Pre-contract (original) and post-contract (current version)
    const preContract = useMemo(() => {
        if (!contract) return null;
        // Simulate "original" version with slight differences
        return {
            id: contract.id,
            title: contract.title,
            state: 'DRAFT',
            hash: '0x' + 'a'.repeat(40),
            parties: [
                { id: 'p1', role: 'PARTY_A', name: ((contract as any).parties || 'Party A ↔ Party B').split(' ↔ ')[0] || 'Party A' },
                { id: 'p2', role: 'PARTY_B', name: ((contract as any).parties || 'Party A ↔ Party B').split(' ↔ ')[1] || 'Party B' }
            ],
            clauses: [
                { id: 'c1', title: 'Payment Terms', content: 'Standard payment terms apply. Payment due within 30 days of invoice.', type: 'PAYMENT', obligations: [{ id: 'o1', type: 'PAYMENT', penalty: { amount: 500 } }] },
                { id: 'c2', title: 'Termination', content: 'Either party may terminate with 30 days written notice.', type: 'TERMINATION', obligations: [] },
                { id: 'c3', title: 'Confidentiality', content: 'Both parties agree to maintain confidentiality of all shared information.', type: 'NDA', obligations: [] },
            ]
        };
    }, [contract]);

    const postContract = useMemo(() => {
        if (!contract) return null;
        return {
            id: contract.id + '-v2',
            title: contract.title,
            state: (contract as any).state || 'ACTIVE',
            hash: (contract as any).hash || '0x' + 'b'.repeat(40),
            parties: [
                { id: 'p1', role: 'PARTY_A', name: ((contract as any).parties || 'Party A ↔ Party B').split(' ↔ ')[0] || 'Party A' },
                { id: 'p2', role: 'PARTY_B', name: ((contract as any).parties || 'Party A ↔ Party B').split(' ↔ ')[1] || 'Party B' },
                { id: 'p3', role: 'GUARANTOR', name: 'Legal Counsel (Added)' }
            ],
            clauses: [
                { id: 'c1', title: 'Payment Terms', content: 'Revised payment terms apply. Payment due within 15 days of invoice. Late payments incur 2% monthly interest.', type: 'PAYMENT', obligations: [{ id: 'o1', type: 'PAYMENT', penalty: { amount: 1500 } }] },
                // c2 removed in updated version
                { id: 'c3', title: 'Confidentiality', content: 'Both parties agree to maintain strict confidentiality of all shared information for a period of 5 years.', type: 'NDA', obligations: [] },
                { id: 'c4', title: 'Dispute Resolution', content: 'All disputes shall be resolved through binding arbitration in accordance with ICC rules.', type: 'ARBITRATION', obligations: [] },
            ]
        };
    }, [contract]);

    const diffs = useMemo(() => {
        if (!preContract || !postContract) return null;

        const result = {
            parties: [] as any[],
            clauses: [] as any[],
            isHashMatch: preContract.hash === postContract.hash
        };

        // Diff Parties
        const mapA_P = new Map(preContract.parties?.map((p: any) => [p.id, p]));
        const mapB_P = new Map(postContract.parties?.map((p: any) => [p.id, p]));

        mapA_P.forEach((pA: any, id) => {
            const pB = mapB_P.get(id);
            if (!pB) result.parties.push({ state: 'REMOVED', original: pA });
            else if (JSON.stringify(pA) !== JSON.stringify(pB)) result.parties.push({ state: 'MODIFIED', original: pA, updated: pB });
            else result.parties.push({ state: 'UNCHANGED', original: pA });
        });
        mapB_P.forEach((pB: any, id) => {
            if (!mapA_P.has(id)) result.parties.push({ state: 'ADDED', updated: pB });
        });

        // Diff Clauses
        const mapA_C = new Map(preContract.clauses?.map((c: any) => [c.id, c]));
        const mapB_C = new Map(postContract.clauses?.map((c: any) => [c.id, c]));

        mapA_C.forEach((cA: any, id) => {
            const cB = mapB_C.get(id);
            if (!cB) result.clauses.push({ state: 'REMOVED', original: cA });
            else if (JSON.stringify(cA) !== JSON.stringify(cB)) {
                let obImpacts: string[] = [];
                const oblA = JSON.stringify((cA as any).obligations || []);
                const oblB = JSON.stringify((cB as any).obligations || []);
                if (oblA !== oblB) obImpacts.push("Obligation definitions were altered.");
                result.clauses.push({ state: 'MODIFIED', original: cA, updated: cB, impacts: obImpacts });
            }
            else result.clauses.push({ state: 'UNCHANGED', original: cA });
        });
        mapB_C.forEach((cB: any, id) => {
            if (!mapA_C.has(id)) result.clauses.push({ state: 'ADDED', updated: cB });
        });

        return result;
    }, [preContract, postContract]);

    if (!contract) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container py-8 max-w-5xl h-full flex flex-col space-y-6 overflow-y-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <GitCompare className="h-7 w-7 text-primary" /> Version Diff Engine
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        {contract.title} &middot; ID: {params.id}
                    </p>
                </div>
            </div>

            {/* Side-by-side version headers */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/30 p-4 rounded-xl border">
                <div className="flex-1 space-y-2">
                    <div className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                        <FileCode2 className="h-4 w-4" /> Pre-Contract (Original)
                    </div>
                    <h3 className="font-bold text-lg">{preContract?.title}</h3>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{preContract?.state}</Badge>
                    <HashBadge hash={preContract?.hash || ''} truncateLength={10} className="bg-background ml-2" />
                </div>

                <div className="hidden md:flex flex-col items-center justify-center px-8 border-x">
                    <GitCompare className="h-6 w-6 text-muted-foreground mb-2" />
                    {diffs?.isHashMatch ?
                        <Badge className="bg-green-500">HASH MATCH</Badge> :
                        <Badge variant="destructive">DIVERGENT</Badge>
                    }
                </div>

                <div className="flex-1 space-y-2 md:text-right">
                    <div className="text-sm font-semibold uppercase text-muted-foreground flex items-center md:justify-end gap-2">
                        <FileCode2 className="h-4 w-4 text-blue-500" /> Updated Contract (Current)
                    </div>
                    <h3 className="font-bold text-lg text-blue-600 dark:text-blue-400">{postContract?.title}</h3>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{postContract?.state}</Badge>
                    <HashBadge hash={postContract?.hash || ''} truncateLength={10} className="bg-background ml-2" />
                </div>
            </div>

            {/* Clause Modifications */}
            <div className="flex items-center justify-between mt-6 mb-2">
                <h2 className="text-xl font-bold flex items-center gap-2"><Scale className="h-5 w-5 text-primary" /> Clause Modifications</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {diffs?.clauses.filter(c => c.state !== 'UNCHANGED').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/10">No clause modifications detected.</div>
                )}
                {diffs?.clauses.filter(c => c.state !== 'UNCHANGED').map((clause, idx) => (
                    <Card key={idx} className={cn("overflow-hidden border-l-4",
                        clause.state === 'ADDED' ? 'border-l-green-500' :
                            clause.state === 'REMOVED' ? 'border-l-red-500' : 'border-l-orange-500'
                    )}>
                        <CardHeader className="py-3 bg-muted/10 border-b flex flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-3">
                                <BadgeForState state={clause.state} />
                                <CardTitle className="text-base">{(clause.updated || clause.original).title}</CardTitle>
                                <Badge variant="outline" className="font-mono text-xs">{(clause.updated || clause.original).type}</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">ID: {(clause.updated || clause.original).id}</span>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4 text-sm">
                            {clause.state === 'MODIFIED' ? (
                                <div className="space-y-4">
                                    <div className="p-3 bg-background border rounded-md font-medium text-slate-800 dark:text-slate-200">
                                        <InlineDiff oldStr={clause.original.content} newStr={clause.updated.content} />
                                    </div>
                                    {clause.impacts && clause.impacts.length > 0 && (
                                        <div className="flex items-start gap-2 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 p-2.5 rounded border border-orange-200 dark:border-orange-900/50">
                                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                            <div className="font-semibold text-xs uppercase tracking-tight">Impact: {clause.impacts[0]}</div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className={cn("p-3 border rounded-md", clause.state === 'ADDED' ? 'bg-green-50/50 dark:bg-green-950/20 text-green-800 dark:text-green-200' : 'bg-red-50/50 dark:bg-red-950/20 text-red-800 dark:text-red-200 line-through opacity-70')}>
                                    {(clause.updated || clause.original).content || "No clause content specified."}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Party Topology Changes */}
            <div className="flex items-center justify-between mt-8 mb-2">
                <h2 className="text-xl font-bold flex items-center gap-2"><UserCircle className="h-5 w-5 text-primary" /> Party Topology Changes</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {diffs?.parties.filter(p => p.state !== 'UNCHANGED').length === 0 && (
                    <div className="col-span-full text-center py-6 text-muted-foreground border rounded-lg bg-muted/10">No party additions or removals.</div>
                )}
                {diffs?.parties.filter(p => p.state !== 'UNCHANGED').map((party, idx) => (
                    <div key={idx} className={cn("p-4 border rounded-lg shadow-sm flex items-center justify-between",
                        party.state === 'ADDED' ? 'bg-green-50/30 border-green-200' :
                            party.state === 'REMOVED' ? 'bg-red-50/30 border-red-200' : 'bg-orange-50/30 border-orange-200'
                    )}>
                        <div>
                            <div className="font-bold">{(party.updated || party.original).name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">Role: {(party.updated || party.original).role}</div>
                        </div>
                        <BadgeForState state={party.state} />
                    </div>
                ))}
            </div>
        </div>
    );
}
