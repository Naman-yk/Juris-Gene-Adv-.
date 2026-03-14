"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, GitCompare, ArrowLeft, Plus, Minus, FileBox, FileCode2, Scale, AlertTriangle, ShieldCheck, UserCircle } from 'lucide-react';
import { diffWords, Change } from 'diff';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HashBadge } from '@/components/ui/hash-badge';
import { cn } from '@/lib/utils';
import { ContractSummary, useContractStore } from '@/lib/stores';

type DiffState = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';

interface DiffResult<T> {
    state: DiffState;
    original?: T;
    updated?: T;
}

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

export default function ContractDiffPage() {
    const router = useRouter();
    const existingContracts = useContractStore((state) => state.contracts);

    const [contractA, setContractA] = useState<any>(null);
    const [contractB, setContractB] = useState<any>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setContract: React.Dispatch<any>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonObj = JSON.parse(event.target?.result as string);
                setContract(jsonObj);
            } catch (err) {
                alert("Invalid JSON file uploaded.");
            }
        };
        reader.readAsText(file);
    };

    const loadMockDiff = () => {
        // Creates a mock base and modified contract to test UI
        const base = {
            id: 'mock-1', title: 'Standard Commercial Lease', state: 'ACTIVE', hash: '0x123abc',
            parties: [
                { id: 'p1', role: 'LANDLORD', name: 'Acme LLC' },
                { id: 'p2', role: 'TENANT', name: 'Tech Startup Inc' }
            ],
            clauses: [
                { id: 'c1', title: 'Monthly Rent', content: 'The tenant shall pay $5000 per month.', type: 'PAYMENT', obligations: [{ id: 'o1', type: 'PAYMENT', penalty: { amount: 500 } }] },
                { id: 'c2', title: 'Maintenance', content: 'Landlord handles all structural maintenance.', type: 'OBLIGATION', obligations: [] }
            ]
        };

        const modified = {
            id: 'mock-1-v2', title: 'Standard Commercial Lease', state: 'DRAFT', hash: '0x456def',
            parties: [
                { id: 'p1', role: 'LANDLORD', name: 'Acme Properties LLC' }, // Modified name
                { id: 'p2', role: 'TENANT', name: 'Tech Startup Inc' },
                { id: 'p3', role: 'GUARANTOR', name: 'John Doe' } // Added
            ],
            clauses: [
                { id: 'c1', title: 'Monthly Rent', content: 'The tenant shall pay $6500 per month on the 1st.', type: 'PAYMENT', obligations: [{ id: 'o1', type: 'PAYMENT', penalty: { amount: 1000 } }] }, // Modified content and obligation
                // c2 removed
                { id: 'c3', title: 'Late Fees', content: 'A 5% late fee applies after 5 days.', type: 'PENALTY', obligations: [] } // Added
            ]
        };
        setContractA(base);
        setContractB(modified);
    };

    const diffs = useMemo(() => {
        if (!contractA || !contractB) return null;

        const result = {
            parties: [] as any[],
            clauses: [] as any[],
            isHashMatch: contractA.hash === contractB.hash
        };

        // Diff Parties
        const mapA_P = new Map(contractA.parties?.map((p: any) => [p.id, p]));
        const mapB_P = new Map(contractB.parties?.map((p: any) => [p.id, p]));

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
        const mapA_C = new Map(contractA.clauses?.map((c: any) => [c.id, c]));
        const mapB_C = new Map(contractB.clauses?.map((c: any) => [c.id, c]));

        mapA_C.forEach((cA: any, id) => {
            const cB = mapB_C.get(id);
            if (!cB) result.clauses.push({ state: 'REMOVED', original: cA });
            else if (JSON.stringify(cA) !== JSON.stringify(cB)) {

                // Identify obligation impacts
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
    }, [contractA, contractB]);

    const BadgeForState = ({ state }: { state: DiffState }) => {
        switch (state) {
            case 'ADDED': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">ADDED</Badge>;
            case 'REMOVED': return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">REMOVED</Badge>;
            case 'MODIFIED': return <Badge variant="outline" className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200">MODIFIED</Badge>;
            default: return null;
        }
    };

    return (
        <div className="container py-8 max-w-5xl h-full flex flex-col space-y-6 overflow-y-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <GitCompare className="h-7 w-7 text-primary" /> Version Diff Engine
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">Identify structural and textual divergences between contract versions.</p>
                </div>
            </div>

            {!contractA || !contractB ? (
                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-dashed shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileCode2 className="h-5 w-5 opacity-70" /> Base Contract (A)</CardTitle>
                            <CardDescription>Upload the original JSON trace.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <Upload className="h-8 w-8 text-primary/60" />
                            </div>
                            <input type="file" accept=".json" onChange={(e) => handleFileUpload(e, setContractA)} className="text-sm border p-2 rounded-md w-full max-w-[250px] bg-muted/30" />
                        </CardContent>
                    </Card>

                    <Card className="border-dashed shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileCode2 className="h-5 w-5 opacity-70 text-blue-500" /> Target Contract (B)</CardTitle>
                            <CardDescription>Upload the modified JSON trace.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Upload className="h-8 w-8 text-blue-500/60" />
                            </div>
                            <input type="file" accept=".json" onChange={(e) => handleFileUpload(e, setContractB)} className="text-sm border p-2 rounded-md w-full max-w-[250px] bg-muted/30" />

                            <Button variant="ghost" size="sm" onClick={loadMockDiff} className="mt-4 absolute bottom-4 right-4 opacity-50 hover:opacity-100">Load Mock Diff for Demo</Button>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/30 p-4 rounded-xl border">
                        <div className="flex-1 space-y-2">
                            <div className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">Base Version</div>
                            <h3 className="font-bold text-lg">{contractA.title}</h3>
                            <HashBadge hash={contractA.hash} truncateLength={10} className="bg-background" />
                        </div>

                        <div className="hidden md:flex flex-col items-center justify-center px-8 border-x">
                            <GitCompare className="h-6 w-6 text-muted-foreground mb-2" />
                            {diffs?.isHashMatch ?
                                <Badge className="bg-green-500">HASH MATCH</Badge> :
                                <Badge variant="destructive">DIVERGENT</Badge>
                            }
                        </div>

                        <div className="flex-1 space-y-2 md:text-right">
                            <div className="text-sm font-semibold uppercase text-muted-foreground flex items-center md:justify-end gap-2">Target Version</div>
                            <h3 className="font-bold text-lg text-blue-600 dark:text-blue-400">{contractB.title}</h3>
                            <HashBadge hash={contractB.hash} truncateLength={10} className="bg-background" />
                        </div>
                    </div>

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

                    <div className="flex justify-between items-center mt-8 pt-6 border-t">
                        <Button variant="outline" onClick={() => { setContractA(null); setContractB(null); }}>
                            Run New Comparison
                        </Button>
                    </div>

                </div>
            )}
        </div>
    );
}
