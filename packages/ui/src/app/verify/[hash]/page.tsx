"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowLeft, Link2, FileJson, Clock, CheckCircle2, ChevronRight, Activity, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { HashBadge } from '@/components/ui/hash-badge';

export default function PublicHashVerificationPage({ params }: { params: { hash: string } }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    const targetHash = Array.isArray(params.hash) ? params.hash[0] : params.hash;

    // Simulate database lookup
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1200);
        return () => clearTimeout(timer);
    }, []);

    // Mock Payload Details
    const mockExecution = {
        executionHash: targetHash,
        contractHash: "0x8fa4b9c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1",
        timestamp: new Date().toISOString(),
        triggerEvent: {
            type: "PAYMENT_RECEIVED",
            agent: "did:key:z6MkhaXgBZDv",
            payload: { amount: 5000, reference: "INV-2026-003" }
        },
        anchor: {
            network: "Ethereum Mainnet",
            blockNumber: 18563042,
            txId: "0x33cf852aab536bde...f91a"
        }
    };

    if (isLoading) {
        return (
            <div className="container py-24 max-w-5xl flex flex-col items-center justify-center min-h-[50vh]">
                <Activity className="w-12 h-12 text-primary animate-bounce mb-4" />
                <h2 className="text-xl font-semibold">Verifying Execution Proof...</h2>
                <p className="text-muted-foreground font-mono mt-2 text-xs">{targetHash}</p>
            </div>
        );
    }

    return (
        <div className="container py-8 max-w-5xl space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-green-500" /> Public Verification
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">Target Hash:</span>
                        <HashBadge hash={mockExecution.executionHash} className="text-sm px-2 py-1" />
                    </div>
                </div>
                <Button variant="outline" onClick={() => router.push('/verify')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> New Search
                </Button>
            </div>

            {/* Zero-Knowledge Proof Badges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-green-500/10 border-green-500/30 shadow-none">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-500/20 p-2 rounded-full"><CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-500" /></div>
                            <div>
                                <h3 className="font-bold text-green-700 dark:text-green-400">HASH MATCH</h3>
                                <p className="text-xs text-green-600/80 dark:text-green-500/70 font-medium">Input logic = Output state</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-500/10 border-blue-500/30 shadow-none">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-500/20 p-2 rounded-full"><Link2 className="w-6 h-6 text-blue-600 dark:text-blue-500" /></div>
                            <div>
                                <h3 className="font-bold text-blue-700 dark:text-blue-400">ANCHOR VERIFIED</h3>
                                <p className="text-xs text-blue-600/80 dark:text-blue-500/70 font-medium">Settled to Global Ledger</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-purple-500/10 border-purple-500/30 shadow-none">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-500/20 p-2 rounded-full"><ShieldCheck className="w-6 h-6 text-purple-600 dark:text-purple-500" /></div>
                            <div>
                                <h3 className="font-bold text-purple-700 dark:text-purple-400">REPLAY SAFE</h3>
                                <p className="text-xs text-purple-600/80 dark:text-purple-500/70 font-medium">Deterministic proof passed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Contract & Input Data */}
                <Card className="flex flex-col">
                    <CardHeader className="border-b pb-4 bg-muted/20">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileJson className="w-5 h-5 text-muted-foreground" /> Input Vector
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6 flex-1">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Base Contract Hash</p>
                            <div className="bg-muted p-3 rounded-lg flex justify-between items-center border border-dashed border-muted-foreground/30">
                                <span className="font-mono text-sm break-all text-primary">{mockExecution.contractHash}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 px-1">This execution modified the state of the isolated contract code represented by the hash above.</p>
                        </div>

                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5" /> Triggering Event History
                            </p>
                            <div className="bg-[#1e1e1e] rounded-lg border p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold font-mono">{mockExecution.triggerEvent.type}</span>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap"><Clock className="inline w-3 h-3 mr-1" />{new Date(mockExecution.timestamp).toLocaleString()}</span>
                                </div>
                                <pre className="text-xs text-green-400/80 font-mono overflow-x-auto selection:bg-primary/30">
                                    {JSON.stringify(mockExecution.triggerEvent.payload, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Blockchain Proof */}
                <Card className="flex flex-col">
                    <CardHeader className="border-b pb-4 bg-muted/20">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-muted-foreground" /> Cryptographic Settlement
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6 flex-1">

                        <div className="flex flex-col items-center justify-center p-8 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-4">
                            <ShieldCheck className="w-16 h-16 text-blue-500 opacity-80" />
                            <div className="text-center">
                                <h3 className="font-bold text-lg">Indisputable State Transition</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-sm">This execution has been mathematically proven and anchored to a public Layer 1 blockchain.</p>
                            </div>
                        </div>

                        <div className="space-y-4 px-2">
                            <div className="flex justify-between items-center border-b pb-3">
                                <span className="text-sm font-medium text-muted-foreground">Settlement Network</span>
                                <span className="text-sm font-bold">{mockExecution.anchor.network}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-3">
                                <span className="text-sm font-medium text-muted-foreground">Block Height</span>
                                <span className="text-sm font-bold font-mono bg-muted px-2 py-0.5 rounded">{mockExecution.anchor.blockNumber.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center pb-1 gap-4">
                                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Transaction ID</span>
                                <span className="text-xs font-bold font-mono text-blue-500 truncate">{mockExecution.anchor.txId}</span>
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="bg-muted/10 border-t p-4 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Verified by Jurisdiction Node V1.4</span>
                        <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-600">
                            View on Block Explorer <ArrowRight className="ml-1 w-3 h-3" />
                        </Button>
                    </CardFooter>
                </Card>

            </div>
        </div>
    );
}
