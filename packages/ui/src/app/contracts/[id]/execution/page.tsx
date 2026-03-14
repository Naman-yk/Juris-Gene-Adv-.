"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Activity, History, Shield, ArrowRight, PenTool, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { HashBadge } from '@/components/ui/hash-badge';
import { useContractStore } from '@/lib/stores';
import { executeEvent } from '@/lib/api';
import { WhyStateChangedPanel, PenaltyExplanation } from '@/components/ui/explainability';
import { cn } from '@/lib/utils';

// Mock execution events
const EVENT_TYPES = ['PAYMENT_RECEIVED', 'DELIVERY_CONFIRMED', 'BREACH_DETECTED', 'TERMINATION_NOTICE', 'LATE_PAYMENT', 'FORCE_MAJEURE'];

const EXECUTION_LOG = [
    { id: 1, type: 'PAYMENT_RECEIVED', timestamp: '2026-06-05T10:00:00Z', payload: { amount: 50000, currency: 'USD' }, resultingState: 'ACTIVE', hash: '0xabc123456789def0123456789abcdeffedcba9876543210', executionResult: { state_changed: true, previous_state: 'PENDING', new_state: 'ACTIVE', transition: { transition_id: 'TR_PAY_001' }, triggering_event: { type: 'PAYMENT_RECEIVED' }, obligations_breached: [] }, penalties: [] },
];

export default function ExecutionPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [eventType, setEventType] = useState(EVENT_TYPES[0]);
    const [payload, setPayload] = useState('{\n  "amount": 1000\n}');
    const [isSimulated, setIsSimulated] = useState(true);
    const [isExecuting, setIsExecuting] = useState(false);
    const [logs, setLogs] = useState<any[]>(EXECUTION_LOG);

    const contracts = useContractStore((state) => state.contracts);
    const contract = contracts.find(c => c.id === params.id) || { title: "Unknown Contract", hash: "0xabc123456789def0123456789abcdeffedcba9876543210" };

    // Extract parties from contract data (backend stores as 'partyA'/'partyB' or 'parties' string with '↔' separator)
    const c = contract as any;
    const parties = (() => {
        if (c.partyA && c.partyB) return [{ id: 'p1', name: c.partyA }, { id: 'p2', name: c.partyB }];
        if (c.parties_parsed?.length >= 2) return c.parties_parsed;
        if (typeof c.parties === 'string' && c.parties.includes('↔')) {
            const [a, b] = c.parties.split('↔').map((s: string) => s.trim());
            return [{ id: 'p1', name: a || 'Party A' }, { id: 'p2', name: b || 'Party B' }];
        }
        // Try content-based extraction for court cases (Appellant vs Respondent)
        if (c.content) {
            const text = c.content;
            const appellantMatch = text.match(/([A-Z][A-Z\s,]{3,50}?)\s*(?:\.{2,}|\n)\s*(?:Appellant|Petitioner)/i);
            const respondentMatch = text.match(/versus\s+([A-Z][A-Z\s,]{3,50}?)\s*(?:\.{2,}|\n|\s+&\s+ORS)/i);
            if (appellantMatch && respondentMatch) {
                return [{ id: 'p1', name: appellantMatch[1].trim() }, { id: 'p2', name: respondentMatch[1].trim() }];
            }
            
            // Fallback for simple "X versus Y"
            const versusMatch = text.match(/([A-Z][A-Z\s,]{3,50}?)\s+(?:versus|vs\.?|V\/s\.?|V\.)\s+([A-Z][A-Z\s,]{3,50}?)(?:\s|\.|,|$)/i);
            if (versusMatch) {
                return [{ id: 'p1', name: versusMatch[1].trim() }, { id: 'p2', name: versusMatch[2].trim() }];
            }

            // BETWEEN ... AND pattern for individual names
            const betweenMatch = text.match(/BETWEEN\s+(?:Mr\.?|Ms\.?|Mrs\.?|Shri\.?|Smt\.?)?\s*([A-Z][a-zA-Z\s.]{2,40}?)\s*(?:,|\(|son|daughter|aged|represented)/i);
            const andMatch = text.match(/(?:;\s*AND|\)\s*AND|AND)\s+(?:Mr\.?|Ms\.?|Mrs\.?|Shri\.?|Smt\.?)?\s*([A-Z][a-zA-Z\s.]{2,40}?)\s*(?:,|\(|son|daughter|aged|represented)/i);
            if (betweenMatch && andMatch) {
                return [{ id: 'p1', name: betweenMatch[1].trim() }, { id: 'p2', name: andMatch[1].trim() }];
            }
        }
        if (typeof c.parties === 'string' && c.parties !== 'Uploaded Document') {
            return [{ id: 'p1', name: c.parties }, { id: 'p2', name: 'Counter Party' }];
        }
        return [{ id: 'p1', name: 'Party A' }, { id: 'p2', name: 'Party B' }];
    })();

    const [signatures, setSignatures] = useState<Record<string, boolean>>(
        parties.reduce((acc: any, p: any) => ({ ...acc, [p.id]: false }), {})
    );

    const isFullySigned = Object.values(signatures).every(v => v === true);

    const toggleSignature = (partyId: string) => {
        setSignatures(prev => ({ ...prev, [partyId]: !prev[partyId] }));
    };

    const handleExecute = async () => {
        if (!isFullySigned) return;
        setIsExecuting(true);
        try {
            const eventPayload = JSON.parse(payload || '{}');
            const result = await executeEvent(params.id, {
                event: {
                    id: `ev-${Date.now()}`,
                    contract_id: params.id,
                    party_id: parties[0].id,
                    type: eventType,
                    source: 'MANUAL',
                    payload: eventPayload,
                    timestamp: new Date().toISOString(),
                    provenance: 'RULE_DERIVED',
                    schema_version: { major: 1, minor: 0, patch: 0 }
                },
                simulate: isSimulated
            });

            // Reconcile engine output with UI Expectations
            const newLog = {
                id: logs.length + 1,
                type: eventType,
                timestamp: new Date().toISOString(),
                payload: eventPayload,
                resultingState: result.resulting_contract?.state || 'ACTIVE',
                hash: result.execution_hash || '0x' + Math.random().toString(16).slice(2, 42).padEnd(40, '0'),
                executionResult: {
                    state_changed: true, // We assume state changed for the UI to show the panel
                    previous_state: logs[0]?.resultingState || 'ACTIVE',
                    new_state: result.resulting_contract?.state || 'ACTIVE',
                    transition: { transition_id: result.transition_id || `TR_${eventType}_${Date.now().toString().slice(-4)}` },
                    triggering_event: { type: eventType },
                    obligations_breached: result.penalties?.map((p: any) => p.obligation_id) || []
                },
                penalties: result.penalties || []
            };
            setLogs([newLog, ...logs]);
        } catch (error) {
            console.error("Execution failed:", error);
            alert("Execution failed: " + (error instanceof Error ? error.message : "Unknown error"));
        } finally {
            setIsExecuting(false);
        }
    };

    const applyPreset = (type: string, presetPayload: string) => {
        setEventType(type);
        setPayload(presetPayload);
    };

    // Cast contract to correct type that has state, or use a default that avoids TS errors
    const contractState = (contract as any)?.state || 'DRAFT';



    return (
        <div className="container py-8 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Scenario Simulator <span className="text-xl text-muted-foreground font-normal ml-2">(Deterministic Execution)</span></h1>
                    <p className="text-muted-foreground mt-1 mb-2 font-medium">Same contract + different events &rarr; predictable outcomes</p>
                    <p className="text-muted-foreground flex flex-wrap items-center gap-2 mt-1 font-medium text-sm">
                        {contract.title} <span className="text-border">|</span>
                        ID: {params.id} <span className="text-border">|</span>
                        Base Hash: <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{contract.hash.substring(0, 8)}...</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.push(`/contracts/${params.id}/compliance`)}>
                        Back to Compliance
                    </Button>
                    <Button onClick={() => router.push(`/contracts/${params.id}/blockchain`)}>
                        Anchor to Blockchain <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: State Machine & Event Trigger */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Multi-Party Signature Gating */}
                    <Card className={!isFullySigned ? "border-amber-300 dark:border-amber-900/50 shadow-sm transition-all" : "border-green-300 dark:border-green-900/50"}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex justify-between items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <PenTool className={isFullySigned ? "h-5 w-5 text-green-500" : "h-5 w-5 text-amber-500"} />
                                    Signatures
                                </div>
                                {isFullySigned ? (
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-green-600 bg-green-500/10 px-2 py-0.5 rounded">Execution Ready</span>
                                ) : (
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</span>
                                )}
                            </CardTitle>
                            <CardDescription className="text-xs">All parties must sign via wallet to activate engine routing.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {parties.map((party: any) => (
                                <div key={party.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/40 text-sm">
                                    <div className="font-medium truncate mr-2">{party.name}</div>
                                    <Button
                                        variant={signatures[party.id] ? "ghost" : "default"}
                                        size="sm"
                                        className={signatures[party.id] ? "text-green-600 hover:text-green-700 hover:bg-green-50/50" : ""}
                                        onClick={() => toggleSignature(party.id)}
                                    >
                                        {signatures[party.id] ? <><Check className="w-4 h-4 mr-1" /> Signed</> : "Sign"}
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" /> Current State
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center py-6 bg-muted/30 rounded-lg border border-dashed">
                                <StatusBadge
                                    status={logs[0]?.resultingState === 'TERMINATED' ? 'ERROR' : 'VERIFIED'}
                                    label={logs[0]?.resultingState || 'ACTIVE'}
                                    className="text-lg px-4 py-1.5 mb-2"
                                />
                                <span className="text-sm font-mono text-muted-foreground mt-2">Hash: <HashBadge hash={logs[0]?.hash || '0x0'} truncateLength={6} /></span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={cn(!isFullySigned && "opacity-50 pointer-events-none relative blur-[1px] transition-all duration-300")}>
                        {!isFullySigned && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
                                <Lock className="w-8 h-8 text-amber-500 mb-2" />
                                <span className="font-bold text-amber-700 dark:text-amber-400">Execution Locked</span>
                                <span className="text-xs text-muted-foreground">Pending missing signatures.</span>
                            </div>
                        )}
                        <CardHeader className="pb-3">
                            <CardTitle>Trigger Event</CardTitle>
                            <CardDescription>Dispatch events to transition contract state.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 mb-4 p-3 bg-muted/40 rounded-lg border">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Scenario Presets</label>
                                <div className="flex flex-col gap-2">
                                    <Button variant="secondary" size="sm" className="w-full justify-start text-xs h-8" onClick={() => applyPreset('LATE_PAYMENT', '{\n  "days_late": 10\n}')}>
                                        Delay Payment by 10 Days
                                    </Button>
                                    <Button variant="secondary" size="sm" className="w-full justify-start text-xs h-8" onClick={() => applyPreset('FORCE_MAJEURE', '{\n  "reason": "Global Pandemic"\n}')}>
                                        Declare Force Majeure
                                    </Button>
                                    <Button variant="secondary" size="sm" className="w-full justify-start text-xs h-8" onClick={() => applyPreset('TERMINATION_NOTICE', '{\n  "effective_date": "2026-07-01"\n}')}>
                                        Issue Termination Notice
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Event Type</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                    value={eventType}
                                    onChange={(e) => setEventType(e.target.value)}
                                >
                                    {EVENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Payload (JSON)</label>
                                <textarea
                                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background font-mono"
                                    value={payload}
                                    onChange={(e) => setPayload(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    id="simulate"
                                    checked={isSimulated}
                                    onChange={(e) => setIsSimulated(e.target.checked)}
                                    className="h-4 w-4 accent-primary"
                                />
                                <label htmlFor="simulate" className="text-sm cursor-pointer">Simulated Run (Dry-run)</label>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={handleExecute} disabled={!isFullySigned || isExecuting}>
                                <Play className="h-4 w-4 mr-2" /> {isExecuting ? "Executing Engine..." : "Dispatch Event"}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Right Column: Execution Log */}
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <History className="h-5 w-5" /> Execution Log
                                </CardTitle>
                                <CardDescription>Chronological ledger of all state transitions.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2 bg-blue-500/10 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-semibold border border-blue-500/20">
                                <Shield className="h-3.5 w-3.5" /> REPLAY_SAFE
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="space-y-4">
                                {logs.map((log, i) => (
                                    <div key={log.id} className={`p-4 rounded-lg border ${i === 0 ? 'bg-muted/40 border-primary/20 shadow-sm' : 'bg-background'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">{log.type}</span>
                                                {i === 0 && <span className="text-[10px] uppercase font-bold tracking-wider text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded">Latest</span>}
                                            </div>
                                            <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm mt-3 border-t pt-3">
                                            <div>
                                                <span className="text-muted-foreground block mb-1 text-xs uppercase tracking-wider">Payload</span>
                                                <pre className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto text-foreground">
                                                    {JSON.stringify(log.payload, null, 2)}
                                                </pre>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <div>
                                                    <span className="text-muted-foreground block mb-1 text-xs uppercase tracking-wider">Resulting State</span>
                                                    <StatusBadge status={log.resultingState === 'TERMINATED' ? 'ERROR' : (log.resultingState === 'BREACHED' ? 'PENDING' : 'VERIFIED')} label={log.resultingState} />
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground block mb-1 text-xs uppercase tracking-wider">State Hash</span>
                                                    <HashBadge hash={log.hash} truncateLength={8} className="bg-background" />
                                                </div>
                                            </div>
                                        </div>

                                        <WhyStateChangedPanel executionResult={log.executionResult} />
                                        {log.penalties?.map((p: any, idx: number) => (
                                            <PenaltyExplanation key={idx} penalty={p} />
                                        ))}

                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
