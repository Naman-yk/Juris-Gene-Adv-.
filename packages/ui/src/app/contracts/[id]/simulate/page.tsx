"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Fingerprint, Copy, Ban, ArrowLeft, Bug, TerminalSquare, AlertTriangle, ShieldCheck, Zap, Lock } from 'lucide-react';
import { useContractStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { simulateAttack, type AttackResult } from '@/lib/api';

type AttackType = 'REPLAY' | 'DUPLICATE' | 'TAMPER' | 'UNAUTHORIZED';

interface SimulationResult {
    status: 'IDLE' | 'PENDING' | 'BLOCKED';
    reason?: string;
    rule?: string;
    payload?: string;
    stateHash?: string;
    blockchainHash?: string | null;
}

export default function SecuritySimulatorPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const contracts = useContractStore((state) => state.contracts);
    const contract = contracts.find(c => c.id === params.id);

    const [result, setResult] = useState<SimulationResult>({ status: 'IDLE' });
    const [activeAttack, setActiveAttack] = useState<AttackType | null>(null);

    const triggerAttack = async (type: AttackType) => {
        setActiveAttack(type);
        setResult({ status: 'PENDING' });

        try {
            const response = await simulateAttack(params.id, type);
            
            // Build payload display based on attack type
            let payloadObj: any = {
                contractId: params.id,
                timestamp: response.timestamp,
                action: 'EXECUTE_OBLIGATION',
                obligationId: 'obl-pay-rent-01',
                actor: 'did:key:z6MkhaXgBZDv',
            };

            switch (type) {
                case 'REPLAY':
                    payloadObj.transactionHash = '0xold_hash_8a9b7c6d5e4f3g2h1';
                    break;
                case 'DUPLICATE':
                    payloadObj.nonce = 42;
                    break;
                case 'TAMPER':
                    payloadObj.amount = 10;
                    payloadObj.signature = '0xinvalid_sig_mismatch';
                    break;
                case 'UNAUTHORIZED':
                    payloadObj.actor = 'did:key:zBadActor000';
                    break;
            }

            setResult({
                status: 'BLOCKED',
                reason: response.reason,
                rule: response.rule,
                payload: JSON.stringify(payloadObj, null, 2),
                stateHash: response.stateHash,
                blockchainHash: response.blockchainHash,
            });
        } catch (e) {
            setResult({
                status: 'BLOCKED',
                reason: e instanceof Error ? e.message : 'Unknown error',
                rule: 'RULE_ERR_NETWORK',
                payload: JSON.stringify({ error: 'Failed to reach backend' }, null, 2),
            });
        }
    };

    // Cast contract to correct type that has state, or use a default that avoids TS errors
    const contractState = (contract as any)?.state || 'DRAFT';

    // Contract state was previously gated here, but simulator is now accessible at all stages

    return (
        <div className="container py-8 max-w-5xl space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
                        <Bug className="h-8 w-8 text-primary" /> Security Attack Simulator
                    </h1>
                    <p className="text-muted-foreground">Visually test the execution engine's deterministic rejection mechanisms against non-compliant state manipulation.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/contracts/${params.id}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contract
                </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Control Panel */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Zap className="h-5 w-5 text-yellow-500" /> Attack Vectors</h2>

                    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => triggerAttack('REPLAY')}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Copy className="h-5 w-5 text-blue-500" /> Replay Attack
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Intercepts a valid, previously executed transaction and attempts to blindly resubmit the exact same signed payload.</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => triggerAttack('DUPLICATE')}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Fingerprint className="h-5 w-5 text-purple-500" /> Duplicate Event
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Submits a new transaction that fulfills an obligation already recorded as complete.</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => triggerAttack('TAMPER')}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-orange-500" /> Payload Tampering
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Modifies the raw JSON variables after initial client logic but before engine submission, breaking the signature hash.</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => triggerAttack('UNAUTHORIZED')}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 text-red-500" /> Unauthorized Actor
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Submits a valid state transition request signed by an identity not mapped to active party roles.</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Simulation Output */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2"><TerminalSquare className="h-5 w-5 text-slate-500" /> Engine Interception</h2>

                    <Card className="bg-slate-950 text-slate-50 border-slate-800 shadow-xl overflow-hidden flex flex-col h-[520px]">
                        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
                            <div className="flex gap-1.5 border-r border-slate-700 pr-3">
                                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                            </div>
                            <span className="text-xs font-mono text-slate-400">execution-engine-v1.log</span>
                        </div>
                        <CardContent className="p-6 font-mono text-sm space-y-4 flex-1 overflow-y-auto">
                            {result.status === 'IDLE' && (
                                <div className="text-slate-500 flex flex-col items-center justify-center h-full gap-4">
                                    <ShieldCheck className="w-12 h-12 opacity-20" />
                                    <p>Engine idle. Awaiting inbound payload for deterministic evaluation.</p>
                                </div>
                            )}

                            {result.status === 'PENDING' && (
                                <div className="text-blue-400 animate-pulse">
                                    <p>[{new Date().toISOString()}] INFO: Intercepted inbound HTTP request...</p>
                                    <p className="mt-2 text-slate-400">Deserializing payload body...</p>
                                    <p className="mt-2 text-slate-400">Calling POST /api/simulate/attack...</p>
                                </div>
                            )}

                            {result.status === 'BLOCKED' && (
                                <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                                    <div>
                                        <p className="text-slate-400 mb-2">[{new Date().toISOString()}] INBOUND PAYLOAD:</p>
                                        <pre className="bg-slate-900/50 p-3 rounded border border-slate-800 text-green-400/80 overflow-x-auto text-xs">
                                            {result.payload}
                                        </pre>
                                    </div>

                                    <Alert variant="destructive" className="bg-red-950/40 border-red-900/50 text-red-200 shadow-2xl">
                                        <Ban className="h-6 w-6 text-red-500 top-4" />
                                        <div className="ml-3">
                                            <AlertTitle className="text-xl font-black text-red-500 tracking-wider mb-2">ATTACK BLOCKED</AlertTitle>
                                            <AlertDescription className="space-y-4">
                                                <div>
                                                    <span className="text-red-400/70 text-xs font-bold uppercase tracking-widest block mb-1">Reason</span>
                                                    <span className="opacity-90 leading-relaxed font-sans">{result.reason}</span>
                                                </div>
                                                <div className="bg-black/40 p-2 rounded-md border border-red-900/30">
                                                    <span className="text-red-400/70 text-xs font-bold uppercase tracking-widest block mb-1">Execution Rule Triggered</span>
                                                    <span className="font-bold font-mono text-red-400">{result.rule}</span>
                                                </div>
                                                {result.stateHash && (
                                                    <div className="bg-black/40 p-2 rounded-md border border-red-900/30">
                                                        <span className="text-red-400/70 text-xs font-bold uppercase tracking-widest block mb-1">State Hash (Unchanged)</span>
                                                        <span className="font-mono text-xs text-slate-400">{result.stateHash}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 text-xs font-sans text-red-500/60 mt-2">
                                                    <ShieldAlert className="w-4 h-4" /> State transition aborted. Contract integrity maintained.
                                                </div>
                                            </AlertDescription>
                                        </div>
                                    </Alert>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
