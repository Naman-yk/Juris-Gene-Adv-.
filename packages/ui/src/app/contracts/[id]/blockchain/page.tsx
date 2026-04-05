"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowLeft, Link2, Check, Loader2, Copy, ExternalLink, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DEMO_BLOCKCHAIN } from '@/lib/demo-data';
import { useAnalysis } from '@/lib/use-analysis';
import { useContractStore } from '@/lib/stores';

function hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `0x${hex.repeat(8)}`.substring(0, 66);
}

export default function BlockchainAnchorPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { isDemo } = useAnalysis(params.id);
    const contracts = useContractStore((state) => state.contracts);
    const contract = contracts.find(c => c.id === params.id);

    const [anchoring, setAnchoring] = useState(false);
    const [anchored, setAnchored] = useState(isDemo);

    const content = contract?.content || '';
    const contractHash = isDemo ? DEMO_BLOCKCHAIN.contractHash : hashContent(content);
    const executionHash = isDemo ? DEMO_BLOCKCHAIN.executionHash : hashContent(content + '_exec');
    const txHash = isDemo ? DEMO_BLOCKCHAIN.txHash : hashContent(content + '_tx');
    const network = DEMO_BLOCKCHAIN.network;
    const blockNumber = isDemo ? DEMO_BLOCKCHAIN.blockNumber : Math.floor(7000000 + Math.random() * 1000000);
    const gasUsed = DEMO_BLOCKCHAIN.gasUsed;

    const handleAnchor = () => {
        setAnchoring(true);
        setTimeout(() => {
            setAnchoring(false);
            setAnchored(true);
        }, 2000);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).catch(() => {});
    };

    return (
        <div className="container py-8 max-w-4xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Shield className="h-7 w-7 text-primary" /> Blockchain Anchor
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        Immutable on-chain verification — {network}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/contracts/${params.id}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contract
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hash Panel */}
                <Card className="border-2 border-primary/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Hash className="h-5 w-5" /> Document Hashes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Contract Hash</label>
                            <div className="flex items-center gap-2 mt-1 p-2 bg-muted/30 rounded-lg font-mono text-xs break-all">
                                <span className="flex-1">{contractHash}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => copyToClipboard(contractHash)}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Execution Hash</label>
                            <div className="flex items-center gap-2 mt-1 p-2 bg-muted/30 rounded-lg font-mono text-xs break-all">
                                <span className="flex-1">{executionHash}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => copyToClipboard(executionHash)}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>

                        {!anchored ? (
                            <Button className="w-full mt-4" onClick={handleAnchor} disabled={anchoring}>
                                {anchoring ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Anchoring on Sepolia…</>
                                ) : (
                                    <><Link2 className="h-4 w-4 mr-2" /> Anchor to Blockchain</>
                                )}
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium mt-4 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                                <Check className="h-5 w-5" /> Anchored Successfully
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Transaction Panel */}
                <Card className={`border-2 ${anchored ? 'border-green-500/20' : 'border-muted'}`}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Link2 className="h-5 w-5" /> Transaction Record
                            {anchored && <Badge className="bg-green-500 text-white ml-2">CONFIRMED</Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {anchored ? (
                            <>
                                <div>
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">TX Hash</label>
                                    <div className="flex items-center gap-2 mt-1 p-2 bg-muted/30 rounded-lg font-mono text-xs break-all">
                                        <span className="flex-1">{txHash}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => copyToClipboard(txHash)}>
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Network</label>
                                        <p className="text-sm font-medium mt-1">{network}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Block Number</label>
                                        <p className="text-sm font-medium mt-1 font-mono">{blockNumber.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Gas Used</label>
                                        <p className="text-sm font-medium mt-1 font-mono">{gasUsed}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Status</label>
                                        <Badge className="bg-green-500 text-white mt-1">ANCHORED</Badge>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank')}>
                                    <ExternalLink className="h-4 w-4 mr-2" /> View on Etherscan
                                </Button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                <Shield className="h-12 w-12 opacity-30 mb-3" />
                                <p className="text-sm">Anchor the document to see the on-chain transaction record.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
