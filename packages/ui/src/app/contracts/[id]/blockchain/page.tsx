"use client";

import React, { useState, useEffect } from 'react';
import { Network, Link2, CheckCircle2, Clock, UploadCloud, Edit2, ShieldCheck, Play, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { HashBadge } from '@/components/ui/hash-badge';
import { useRouter } from 'next/navigation';
import { useContractStore } from '@/lib/stores';
import { anchorOnChain, fetchAudit, fetchExecutionState, type AnchorData, type AuditEntry } from '@/lib/api';

export default function BlockchainAuditPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [isAnchored, setIsAnchored] = useState(false);
    const [isAnchoring, setIsAnchoring] = useState(false);
    const [anchorData, setAnchorData] = useState<AnchorData | null>(null);
    const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [executionState, setExecutionState] = useState<any>(null);
    const [isLoadingState, setIsLoadingState] = useState(true);

    const contracts = useContractStore((state) => state.contracts);
    const contract = contracts.find(c => c.id === params.id) || { title: "Unknown Contract", hash: "0xabc123456789def0123456789abcdeffedcba9876543210", partyA: "Party A", partyB: "Party B" } as any;

    // Load audit trail & execution state on mount
    useEffect(() => {
        Promise.all([
            fetchAudit(params.id).catch(() => []),
            fetchExecutionState(params.id).catch(() => null)
        ]).then(([audits, execState]) => {
            setAuditEntries(audits);
            setExecutionState(execState);
            setIsLoadingState(false);
        });
    }, [params.id]);

    const handleAnchor = async () => {
        setIsAnchoring(true);
        setError(null);
        try {
            const result = await anchorOnChain(params.id, executionState?.stateHash);
            setAnchorData(result);
            setIsAnchored(true);
            // Refresh audit entries
            fetchAudit(params.id)
                .then(setAuditEntries)
                .catch(() => {});
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Anchor failed');
        } finally {
            setIsAnchoring(false);
        }
    };

    const explorerUrl = anchorData?.txHash
        ? `https://sepolia.etherscan.io/tx/${anchorData.txHash}`
        : '#';

    if (isLoadingState) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center h-[70vh]">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
                    <p className="text-muted-foreground">Loading blockchain state...</p>
                </div>
            </div>
        );
    }

    if (!executionState?.stateHash) {
         return (
             <div className="flex-1 p-8 flex items-center justify-center h-[70vh]">
                 <div className="text-center p-12 border border-dashed border-blue-800/50 rounded-xl bg-blue-950/10 max-w-lg mx-auto mt-10">
                     <Link2 className="w-16 h-16 text-blue-500 mx-auto mb-6" />
                     <h2 className="text-2xl font-bold mb-3 text-blue-400">No Execution State Found</h2>
                     <p className="text-slate-400 mb-8 leading-relaxed">Generate a state hash before anchoring to blockchain. Only executing or finalized contracts can be anchored to the Layer 1 network.</p>
                     <Button onClick={() => router.push(`/contracts/${params.id}/execution`)} className="bg-blue-600 hover:bg-blue-700 w-full py-6 text-lg">
                         Go to Execution Engine
                     </Button>
                 </div>
             </div>
         );
    }

    return (
        <div className="container py-8 max-w-5xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Blockchain Anchor & Audit</h1>
                    <p className="text-muted-foreground flex flex-wrap items-center gap-2 mt-1 font-medium">
                        {contract.title} <span className="text-border">|</span>
                        Parties: {contract.partyA || 'Party A'} ↔ {contract.partyB || 'Party B'} <span className="text-border">|</span>
                        ID: {params.id} <span className="text-border">|</span>
                        Base Hash: <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{contract.hash.substring(0, 8)}...</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.push(`/contracts/${params.id}/execution`)}>
                        Back to Execution
                    </Button>
                    <Button onClick={() => router.push('/')}>
                        Return to Dashboard
                    </Button>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-3 rounded-lg bg-destructive/15 border border-destructive text-destructive text-sm">
                    ⚠ {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Anchor Panel */}
                <div className="space-y-6">
                    <Card className={isAnchored ? "border-green-500/50 bg-green-500/5" : ""}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>Network Registration</span>
                                {isAnchored && <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Anchored</span>}
                            </CardTitle>
                            <CardDescription>Secure the immutable execution hash directly onto an EVM-compatible chain.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="p-4 bg-muted/30 rounded-lg border flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-muted-foreground">Execution State</span>
                                    <span className="font-mono text-sm font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded">{executionState.state}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-medium text-muted-foreground">State Hash</span>
                                    <HashBadge hash={anchorData?.executionHash || executionState.stateHash} truncateLength={20} className="text-base py-1" />
                                </div>
                            </div>

                            {isAnchored && anchorData ? (
                                <div className="space-y-4 pt-4 border-t border-green-500/20">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Network</span>
                                        <span className="font-semibold flex items-center gap-1.5"><Network className="h-4 w-4" /> {anchorData.network} Testnet</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Transaction Hash</span>
                                        <HashBadge hash={anchorData.txHash || ''} />
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Block Number</span>
                                        <span className="font-mono">{anchorData.blockNumber}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Timestamp</span>
                                        <span className="font-mono text-muted-foreground">{anchorData.verifiedAt}</span>
                                    </div>
                                    <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" className="w-full mt-4 bg-background text-green-700 border-green-500 hover:bg-green-50 dark:hover:bg-green-950">
                                            <ExternalLink className="h-4 w-4 mr-2" /> View on Sepolia Explorer
                                        </Button>
                                    </a>
                                </div>
                            ) : (
                                <Button
                                    className="w-full h-12 text-lg font-medium"
                                    onClick={handleAnchor}
                                    disabled={isAnchoring}
                                >
                                    {isAnchoring ? "Broadcasting to Network..." : "Anchor on Chain"}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Audit Timeline */}
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" /> Immutable Audit Trail
                            </CardTitle>
                            <CardDescription>Comprehensive lifecycle provenance from the backend audit log.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative border-l-2 border-muted-foreground/20 ml-3 space-y-8 mt-4">
                                {auditEntries.map((entry, i) => (
                                    <div key={entry.id} className="relative pl-6">
                                        <div className={`absolute left-[-9px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 ${
                                            entry.eventType === 'ANCHOR' ? 'border-green-500' : 'border-primary'
                                        } text-primary`}>
                                        </div>
                                        <div className={`p-4 rounded-lg ${entry.eventType === 'ANCHOR' ? 'bg-green-500/10 border-green-500/30 border' : 'bg-muted'}`}>
                                            <div className="flex justify-between items-start">
                                                <h4 className={`font-semibold text-sm flex items-center gap-2 ${
                                                    entry.eventType === 'ANCHOR' ? 'text-green-700 dark:text-green-400' : ''
                                                }`}>
                                                    {entry.phase}: {entry.action.substring(0, 60)}{entry.action.length > 60 ? '...' : ''}
                                                </h4>
                                                <span className="text-xs text-muted-foreground font-mono">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                                <span>By: {entry.user}</span>
                                                {entry.afterHash && <span>Hash: {entry.afterHash.substring(0, 12)}...</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {auditEntries.length === 0 && (
                                    <div className="pl-6 text-sm text-muted-foreground">No audit entries found.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
