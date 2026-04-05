"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, { Background, Controls, MarkerType, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { Play, RotateCcw, ArrowLeft, Activity } from 'lucide-react';

import { useContractStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CustomStateNode } from '@/components/ui/flow-nodes';
import { AnimatedEdge, flowStyles } from '@/components/ui/flow-edges';
import { DEMO_STATES, DEMO_TRANSITIONS, DEMO_CASE } from '@/lib/demo-data';
import { useAnalysis } from '@/lib/use-analysis';

const nodeTypes = { customState: CustomStateNode };
const edgeTypes = { animatedEdge: AnimatedEdge };

function buildFlowNodes(states: any[]) {
    return states.map(s => ({
        id: s.id,
        type: 'customState' as const,
        position: s.position,
        data: { state: s.state, isActive: s.isActive },
    }));
}

function buildFlowEdges(transitions: any[], onTransitionClick: (data: any) => void) {
    return transitions.map(t => ({
        id: t.id,
        source: t.source,
        target: t.target,
        type: 'animatedEdge' as const,
        data: {
            label: t.label,
            event: t.event,
            rule: t.rule,
            isBackwards: t.isBackwards || false,
            onClick: (edgeData: any) => onTransitionClick(edgeData),
        },
        markerEnd: { type: MarkerType.ArrowClosed },
    }));
}

export default function StateMachinePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { analysis, isDemo, loading } = useAnalysis(params.id);

    const states = isDemo ? DEMO_STATES : (analysis?.states?.nodes || DEMO_STATES);
    const transitions = isDemo ? DEMO_TRANSITIONS : (analysis?.states?.transitions || DEMO_TRANSITIONS);
    const caseLabel = isDemo ? `Case lifecycle: ${DEMO_CASE.caseNumber} — ${DEMO_CASE.section}` : `Document lifecycle: ${analysis?.metadata?.section || 'General'}`;

    const [selectedTransition, setSelectedTransition] = useState<any>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationLog, setSimulationLog] = useState<string[]>([]);

    const initialNodes = useMemo(() => buildFlowNodes(states), [states]);
    const initialEdges = useMemo(() => buildFlowEdges(transitions, setSelectedTransition), [transitions]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Find the first forward transition for simulation
    const simTransition = transitions.find((t: any) => !t.isBackwards && t.source === states.find((s: any) => s.isActive)?.id);

    const simulateTransition = useCallback(() => {
        if (isSimulating || !simTransition) return;
        setIsSimulating(true);
        setSelectedTransition(null);
        setSimulationLog(prev => [...prev, `🔄 Simulating: ${simTransition.label}...`]);

        setEdges(eds =>
            eds.map(e => ({
                ...e,
                data: { ...e.data!, isAnimated: e.id === simTransition.id },
            } as any))
        );

        setTimeout(() => {
            setNodes(nds =>
                nds.map(n => ({
                    ...n,
                    data: { ...n.data, isActive: n.id === simTransition.target },
                }))
            );
            setSimulationLog(prev => [
                ...prev,
                `✅ Trigger: ${simTransition.event}`,
                `📍 State: ${states.find((s: any) => s.id === simTransition.source)?.state} → ${states.find((s: any) => s.id === simTransition.target)?.state}`,
            ]);
            setSelectedTransition(simTransition);
            setIsSimulating(false);
        }, 1500);
    }, [isSimulating, simTransition, setEdges, setNodes, states]);

    const resetSimulation = useCallback(() => {
        setNodes(buildFlowNodes(states));
        setEdges(buildFlowEdges(transitions, setSelectedTransition));
        setSelectedTransition(null);
        setSimulationLog([]);
    }, [setNodes, setEdges, states, transitions]);

    if (loading) {
        return (
            <div className="container py-8 max-w-7xl flex flex-col items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
                <p className="text-muted-foreground font-medium">Building state machine…</p>
            </div>
        );
    }

    return (
        <div className="container py-8 max-w-7xl h-[calc(100vh-64px)] flex flex-col">
            <style dangerouslySetInnerHTML={{ __html: flowStyles }} />

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Activity className="h-7 w-7 text-primary" /> State Machine
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">{caseLabel}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/contracts/${params.id}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contract
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow min-h-0">
                <Card className="lg:col-span-3 h-full overflow-hidden flex flex-col relative bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="absolute top-4 left-4 z-10 flex gap-2">
                        <Button size="sm" onClick={simulateTransition} disabled={isSimulating || !simTransition} className="shadow-md">
                            <Play className="h-4 w-4 mr-1.5" /> Simulate Breach
                        </Button>
                        <Button size="sm" variant="secondary" onClick={resetSimulation} disabled={isSimulating} className="shadow-md bg-white hover:bg-slate-100 text-slate-800 border">
                            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
                        </Button>
                    </div>
                    <div className="flex-grow w-full h-full relative">
                        <ReactFlow
                            nodes={nodes} edges={edges}
                            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                            nodeTypes={nodeTypes} edgeTypes={edgeTypes}
                            fitView fitViewOptions={{ padding: 0.3 }}
                            minZoom={0.5} maxZoom={1.5} defaultEdgeOptions={{ zIndex: 0 }}
                        >
                            <Background color="#cbd5e1" gap={20} size={2} />
                            <Controls className="bg-white border rounded-md shadow-sm" showInteractive={false} />
                        </ReactFlow>
                    </div>
                </Card>

                <div className="lg:col-span-1 flex flex-col h-full space-y-4">
                    <Card className="flex-1 flex flex-col overflow-hidden">
                        <CardHeader className="border-b bg-muted/20 pb-4">
                            <CardTitle className="text-lg">Transition Details</CardTitle>
                            <CardDescription>Click an edge or use &quot;Simulate Breach&quot;.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-0">
                            {selectedTransition ? (
                                <div className="p-5 space-y-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Transition Rule</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="font-mono text-sm border-primary/30 bg-primary/5 text-primary">{selectedTransition.rule}</Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Label</label>
                                        <p className="text-base font-medium mt-1">{selectedTransition.label}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Trigger Event</label>
                                        <Badge variant="secondary" className="font-mono mt-1 w-fit">{selectedTransition.event}</Badge>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                    <Activity className="h-8 w-8 opacity-40 mb-2" />
                                    <p className="text-sm">Click an edge or simulate a breach to see details.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {simulationLog.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm">Simulation Log</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-1 text-xs font-mono">
                                    {simulationLog.map((line, i) => <div key={i} className="text-muted-foreground">{line}</div>)}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
