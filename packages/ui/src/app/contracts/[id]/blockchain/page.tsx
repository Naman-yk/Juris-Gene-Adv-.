"use client";

import React, { useState } from 'react';
import { Network, Link2, CheckCircle2, Clock, ExternalLink, ArrowLeft, Shield, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { HashBadge } from '@/components/ui/hash-badge';
import { useRouter } from 'next/navigation';
import { useContractStore } from '@/lib/stores';
import { DEMO_BLOCKCHAIN, DEMO_CASE } from '@/lib/demo-data';

export default function BlockchainAuditPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [isAnchored, setIsAnchored] = useState(false);
    const [isAnchoring, setIsAnchoring] = useState(false);

    const contracts = useContractStore((state) => state.contracts);
    const contract = contracts.find(c => c.id === params.id) || { title: "Unknown Contract", hash: "0x000", partyA: "Party A", partyB: "Party B" } as any;

    const handleAnchor = () => {
        setIsAnchoring(true);
        // Simulate anchoring delay for demo effect
        setTimeout(() => {
            setIsAnchored(true);
            setIsAnchoring(false);
        }, 2000);
    };

    const explorerUrl = `https://sepolia.etherscan.io/tx/${DEMO_BLOCKCHAIN.txHash}`;

    return (
        <div className="container py-8 max-w-5xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Blockchain Anchor</h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        Immutable proof — {DEMO_CASE.section}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/contracts/${params.id}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contract
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Anchor Panel */}
                <Card className={isAnchored ? "border-green-500/50 bg-green-500/5" : ""}>
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <span>Network Registration</span>
                            {isAnchored && <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Anchored</span>}
                        </CardTitle>
                        <CardDescription>Secure the conviction judgment hash onto Ethereum Sepolia testnet.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Pre-anchor: show hashes */}
                        <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
                            <div>
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contract Hash</span>
                                <HashBadge hash={DEMO_BLOCKCHAIN.contractHash} truncateLength={24} className="text-base py-1 mt-1" />
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Execution Hash</span>
                                <HashBadge hash={DEMO_BLOCKCHAIN.executionHash} truncateLength={24} className="text-base py-1 mt-1" />
                            </div>
                        </div>

                        {isAnchored ? (
                            <div className="space-y-4 pt-4 border-t border-green-500/20">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Network</span>
                                    <span className="font-semibold flex items-center gap-1.5">
                                        <Network className="h-4 w-4" /> {DEMO_BLOCKCHAIN.network}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm text-muted-foreground">Transaction Hash</span>
                                    <HashBadge hash={DEMO_BLOCKCHAIN.txHash} truncateLength={24} />
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Block Number</span>
                                    <span className="font-mono">{DEMO_BLOCKCHAIN.blockNumber.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Gas Used</span>
                                    <span className="font-mono">{DEMO_BLOCKCHAIN.gasUsed}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Timestamp</span>
                                    <span className="font-mono text-xs">{new Date(DEMO_BLOCKCHAIN.anchoredAt).toLocaleString()}</span>
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
                                {isAnchoring ? (
                                    <span className="flex items-center gap-2">
                                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Broadcasting to Sepolia...
                                    </span>
                                ) : (
                                    "⚓ Anchor Contract on Chain"
                                )}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Info Panel */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" /> What This Proves
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
                                <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-1">Tamper-Proof Record</h4>
                                <p className="text-blue-600/80 dark:text-blue-300/80">The SHA-256 hash of the judgment (Case No. {DEMO_CASE.caseNumber}) is permanently anchored on the Ethereum Sepolia testnet. Any modification to the document will produce a different hash.</p>
                            </div>
                            <div className="p-3 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50">
                                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-1">Timestamp Authority</h4>
                                <p className="text-green-600/80 dark:text-green-300/80">The conviction of {DEMO_CASE.verdict} under {DEMO_CASE.section} is timestamped immutably on {new Date(DEMO_BLOCKCHAIN.anchoredAt).toLocaleDateString()}, proving existence at that point in time.</p>
                            </div>
                            <div className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50">
                                <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-1">Verifiable by Anyone</h4>
                                <p className="text-purple-600/80 dark:text-purple-300/80">Any party can verify the hash on-chain via Etherscan. No centralized authority required — the blockchain is the source of truth.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
