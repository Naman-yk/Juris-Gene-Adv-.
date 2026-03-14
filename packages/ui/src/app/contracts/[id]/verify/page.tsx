"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, ShieldAlert, CheckCircle, XCircle, Play, RefreshCw, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { HashBadge } from '@/components/ui/hash-badge';
import { useContractStore } from '@/lib/stores';
import Editor from '@monaco-editor/react';

export default function VerifyPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const contracts = useContractStore((state) => state.contracts);

    // Find contract from store or provide a fallback for demo purposes
    const contract = contracts.find(c => c.id === params.id) || {
        id: params.id,
        title: "Unknown Contract",
        hash: "0xabc123456789def0123456789abcdeffedcba9876543210",
        parties: [],
        clauses: [],
        state: 'ACTIVE',
        engine_version: "1.0.0",
        schema_version: { major: 1, minor: 0, patch: 0 }
    };

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'mismatch' | 'error'>('idle');
    const [resultData, setResultData] = useState<{ original_hash: string, recomputed_hash: string, match: boolean, trace: any[] } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const runVerification = async (forceMismatch = false) => {
        setStatus('loading');
        setErrorMessage('');
        setResultData(null);

        try {
            // Provide dummy events to simulate deterministic replay of historical events
            const mockEvents = [
                {
                    id: 'event-demo-001',
                    type: 'DEADLINE_EXPIRED',
                    timestamp: new Date().toISOString(),
                    source: 'SYSTEM_CLOCK',
                    contract_id: params.id,
                    payload: { description: 'Scheduled deadline verification' },
                    schema_version: { major: 1, minor: 0, patch: 0 }
                }
            ];

            let payloadContract = contract;

            // To simulate a mismatch (tampering simulation)
            if (forceMismatch) {
                payloadContract = JSON.parse(JSON.stringify(contract));
                (payloadContract as any).title = "Tampered Title to Cause Mismatch";
            }

            const response = await fetch(`/api/contracts/${params.id}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contract: payloadContract,
                    events: mockEvents
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }

            const data = await response.json();
            setResultData(data);
            setStatus(data.match ? 'success' : 'mismatch');
        } catch (error) {
            console.error("Verification failed:", error);
            setStatus('error');
            setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred");
        }
    };

    return (
        <div className="container py-8 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Replay Verification <span className="text-xl text-muted-foreground font-normal ml-2">(Determinism Proof)</span></h1>
                    <p className="text-muted-foreground mt-1 mb-2 font-medium">Cryptographically verify state transitions by replaying historical events.</p>
                    <p className="text-muted-foreground flex flex-wrap items-center gap-2 mt-1 font-medium text-sm">
                        {contract.title} <span className="text-border">|</span>
                        ID: {params.id}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.push(`/contracts/${params.id}`)}>
                        Back to Contract
                    </Button>
                </div>
            </div>

            {status === 'mismatch' && (
                <div className="mb-6 p-4 rounded-lg bg-destructive/15 border-2 border-destructive flex items-center gap-4 text-destructive-foreground">
                    <ShieldAlert className="h-8 w-8 text-destructive" />
                    <div>
                        <h3 className="font-bold text-lg text-destructive">Execution mismatch detected. Determinism violated.</h3>
                        <p className="text-sm">The recomputed hash does not match the stored canonical hash. The execution environment or contract data may be tampered with.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Verification Control & Status */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle>Verification Action</CardTitle>
                            <CardDescription>Re-run the execution engine locally against the canonical state.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button
                                className="w-full h-12 text-base font-semibold"
                                onClick={() => runVerification(false)}
                                disabled={status === 'loading'}
                            >
                                {status === 'loading' ? (
                                    <><RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Verifying...</>
                                ) : (
                                    <><Play className="mr-2 h-5 w-5 fill-current" /> Run Verification</>
                                )}
                            </Button>

                            <Button
                                variant="destructive"
                                className="w-full text-sm font-medium opacity-80"
                                onClick={() => runVerification(true)}
                                disabled={status === 'loading'}
                            >
                                <ShieldAlert className="mr-2 h-4 w-4" /> Simulate Tampering
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle>Verification Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-5">
                                <div className="flex flex-col items-center justify-center p-6 bg-muted/40 rounded-xl border border-dashed border-primary/20">
                                    {status === 'idle' && (
                                        <div className="text-center">
                                            <ShieldAlert className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                                            <p className="font-medium text-muted-foreground">Awaiting Execution</p>
                                        </div>
                                    )}
                                    {status === 'loading' && (
                                        <div className="text-center">
                                            <RefreshCw className="h-10 w-10 text-primary mx-auto mb-2 animate-spin" />
                                            <p className="font-medium text-primary">Computing Hashes...</p>
                                        </div>
                                    )}
                                    {status === 'success' && (
                                        <div className="text-center">
                                            <ShieldCheck className="h-12 w-12 text-green-500 mx-auto mb-2" />
                                            <p className="font-bold text-lg text-green-600 dark:text-green-500">VERIFIED</p>
                                            <div className="flex gap-2 justify-center mt-3">
                                                <span className="text-xs font-bold px-2 py-1 rounded bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">HASH MATCH</span>
                                                <span className="text-xs font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">REPLAY SAFE</span>
                                            </div>
                                        </div>
                                    )}
                                    {status === 'mismatch' && (
                                        <div className="text-center">
                                            <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
                                            <p className="font-bold text-lg text-destructive">FAILED</p>
                                            <span className="inline-block mt-2 text-xs font-bold px-2 py-1 rounded bg-destructive/10 text-destructive border border-destructive/20">HASH MISMATCH</span>
                                        </div>
                                    )}
                                    {status === 'error' && (
                                        <div className="text-center">
                                            <ShieldAlert className="h-10 w-10 text-destructive mx-auto mb-2" />
                                            <p className="font-bold text-destructive">Error</p>
                                            <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate" title={errorMessage}>{errorMessage}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1 block">Stored Hashes (Canonical)</label>
                                        <HashBadge hash={resultData?.original_hash || contract.hash} className="w-full justify-between font-mono bg-muted" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1 block">Recomputed Output</label>
                                        <HashBadge
                                            hash={resultData?.recomputed_hash || "—"}
                                            className={`w-full justify-between font-mono ${status === 'success' ? 'bg-green-500/10 border-green-500/20' : status === 'mismatch' ? 'bg-destructive/10 border-destructive/20' : 'bg-muted'}`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Execution Trace */}
                <div className="lg:col-span-2">
                    <Card className="h-full flex flex-col">
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <FileJson className="h-5 w-5" /> Execution Trace Payload
                            </CardTitle>
                            <CardDescription>Detailed JSON trace of the determinism execution.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 flex-grow min-h-[500px] bg-[#1e1e1e] rounded-b-xl overflow-hidden">
                            {resultData?.trace ? (
                                <Editor
                                    height="100%"
                                    defaultLanguage="json"
                                    theme="vs-dark"
                                    value={JSON.stringify(resultData.trace, null, 2)}
                                    options={{
                                        readOnly: true,
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        fontSize: 13,
                                        padding: { top: 16 }
                                    }}
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/20">
                                    <FileJson className="h-12 w-12 mb-4 opacity-50" />
                                    <p className="font-medium">No Trace Available</p>
                                    <p className="text-sm mt-1 opacity-70">Run verification to generate the execution trace.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
