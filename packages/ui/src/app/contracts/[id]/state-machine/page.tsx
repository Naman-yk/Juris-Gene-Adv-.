"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, { Background, Controls, MarkerType, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { Play, RotateCcw, FileText, ArrowLeft, ShieldCheck, Activity, RefreshCw } from 'lucide-react';

import { useContractStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HashBadge } from '@/components/ui/hash-badge';
import { CustomStateNode } from '@/components/ui/flow-nodes';
import { AnimatedEdge, flowStyles } from '@/components/ui/flow-edges';
import { fetchStateMachine, type StateMachineData } from '@/lib/api';

const nodeTypes = {
    customState: CustomStateNode,
};
const edgeTypes = {
    animatedEdge: AnimatedEdge,
};

export default function StateMachinePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const contracts = useContractStore((state) => state.contracts);
    const contract = contracts.find(c => c.id === params.id) || {
        id: params.id,
        title: "Simulation Contract",
        state: 'ACTIVE',
        hash: "0xabc123456789def0123456789abcdeffedcba9876543210"
    };

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedTransition, setSelectedTransition] = useState<any>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [smData, setSmData] = useState<StateMachineData | null>(null);

    // Fetch state machine data from API
    useEffect(() => {
        fetchStateMachine(params.id)
            .then((data) => {
                setSmData(data);

                const apiNodes = data.nodes.map(n => ({
                    id: n.id,
                    type: 'customState',
                    position: n.position,
                    data: { state: n.state, isActive: n.isActive },
                }));

                const apiEdges = data.transitions.map(t => ({
                    id: t.id,
                    source: t.source,
                    target: t.target,
                    type: 'animatedEdge',
                    data: {
                        label: t.label,
                        event: t.event,
                        rule: t.rule,
                        isBackwards: t.isBackwards || false,
                        onClick: (edgeData: any) => setSelectedTransition(edgeData),
                    },
                    markerEnd: { type: MarkerType.ArrowClosed },
                }));

                setNodes(apiNodes);
                setEdges(apiEdges);
                setLoading(false);
            })
            .catch(() => {
                // Fallback to hardcoded structure
                const fallbackNodes = [
                    { id: '1', type: 'customState' as const, position: { x: 250, y: 50 }, data: { state: 'DRAFT', isActive: contract.state === 'DRAFT' } },
                    { id: '2', type: 'customState' as const, position: { x: 250, y: 200 }, data: { state: 'ACTIVE', isActive: contract.state === 'ACTIVE' } },
                    { id: '3', type: 'customState' as const, position: { x: 50, y: 350 }, data: { state: 'BREACHED', isActive: contract.state === 'BREACHED' } },
                    { id: '4', type: 'customState' as const, position: { x: 250, y: 350 }, data: { state: 'SUSPENDED', isActive: contract.state === 'SUSPENDED' } },
                    { id: '5', type: 'customState' as const, position: { x: 450, y: 350 }, data: { state: 'DISPUTED', isActive: contract.state === 'DISPUTED' } },
                    { id: '6', type: 'customState' as const, position: { x: 150, y: 500 }, data: { state: 'TERMINATED', isActive: contract.state === 'TERMINATED' } },
                    { id: '7', type: 'customState' as const, position: { x: 350, y: 500 }, data: { state: 'EXPIRED', isActive: contract.state === 'EXPIRED' } },
                ];
                setNodes(fallbackNodes);
                setEdges([]);
                setLoading(false);
            });
    }, [params.id, contract.state, setNodes, setEdges]);

    // Simulate a state transition (e.g. ACTIVE -> BREACHED)
    const simulateTransition = useCallback(() => {
        if (isSimulating) return;
        setIsSimulating(true);
        setSelectedTransition(null);

        setEdges((eds) =>
            eds.map((e) => {
                if (e.id === 'e2-3') {
                    return { ...e, data: { ...e.data, isAnimated: true, onClick: e.data.onClick } };
                }
                return { ...e, data: { ...e.data, isAnimated: false, onClick: e.data.onClick } };
            })
        );

        setTimeout(() => {
            setNodes((nds) =>
                nds.map((n) => ({
                    ...n,
                    data: { ...n.data, isActive: n.id === '3' }
                }))
            );

            const t7EdgeData = edges.find(e => e.id === 'e2-3')?.data;
            if (t7EdgeData) setSelectedTransition(t7EdgeData);

            setIsSimulating(false);
        }, 1500);
    }, [isSimulating, edges, setEdges, setNodes]);

    const resetSimulation = useCallback(() => {
        // Refetch from API
        fetchStateMachine(params.id).then((data) => {
            setNodes(data.nodes.map(n => ({
                id: n.id,
                type: 'customState',
                position: n.position,
                data: { state: n.state, isActive: n.isActive },
            })));
            setEdges(data.transitions.map(t => ({
                id: t.id,
                source: t.source,
                target: t.target,
                type: 'animatedEdge',
                data: {
                    label: t.label,
                    event: t.event,
                    rule: t.rule,
                    isBackwards: t.isBackwards || false,
                    isAnimated: false,
                    onClick: (edgeData: any) => setSelectedTransition(edgeData),
                },
                markerEnd: { type: MarkerType.ArrowClosed },
            })));
        }).catch(() => {});
        setSelectedTransition(null);
    }, [params.id, setEdges, setNodes]);

    if (loading) {
        return (
            <div className="container py-8 max-w-7xl flex items-center justify-center h-[60vh]">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
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
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        Visualizing deterministic execution paths for {contract.title}
                        {smData && <span className="ml-2 text-xs text-primary">• Current: {smData.currentState}</span>}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/contracts/${params.id}`)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contract
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow min-h-0">
                {/* Left Panel: React Flow Canvas */}
                <Card className="lg:col-span-3 h-full overflow-hidden flex flex-col relative bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="absolute top-4 left-4 z-10 flex gap-2">
                        <Button size="sm" onClick={simulateTransition} disabled={isSimulating} className="shadow-md">
                            <Play className="h-4 w-4 mr-1.5" /> Simulate Breach
                        </Button>
                        <Button size="sm" variant="secondary" onClick={resetSimulation} disabled={isSimulating} className="shadow-md bg-white hover:bg-slate-100 text-slate-800 border">
                            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset View
                        </Button>
                    </div>

                    <div className="absolute top-4 right-4 z-10 bg-white/90 dark:bg-black/90 px-3 py-1.5 rounded-full border shadow-sm text-xs font-semibold flex items-center gap-2">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        Engine: Active
                    </div>

                    <div className="flex-grow w-full h-full relative">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            nodeTypes={nodeTypes}
                            edgeTypes={edgeTypes}
                            fitView
                            fitViewOptions={{ padding: 0.2 }}
                            minZoom={0.5}
                            maxZoom={1.5}
                            defaultEdgeOptions={{ zIndex: 0 }}
                            className="bg-dot-pattern"
                        >
                            <Background color="#cbd5e1" gap={20} size={2} />
                            <Controls className="bg-white border rounded-md shadow-sm" showInteractive={false} />
                        </ReactFlow>
                    </div>
                </Card>

                {/* Right Panel: Transition Details */}
                <div className="lg:col-span-1 flex flex-col h-full space-y-4">
                    <Card className="flex-1 flex flex-col overflow-hidden">
                        <CardHeader className="border-b bg-muted/20 pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5" /> Transition Details
                            </CardTitle>
                            <CardDescription>Click any edge in the graph to inspect deterministic transition rules.</CardDescription>
                        </CardHeader>

                        <CardContent className="flex-1 overflow-y-auto p-0">
                            {selectedTransition ? (
                                <div className="p-5 space-y-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Transition Rule</label>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-mono text-sm border-primary/30 bg-primary/5 text-primary">
                                                {selectedTransition.rule}
                                            </Badge>
                                            <span className="text-base font-medium">{selectedTransition.label}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Trigger Mechanism</label>
                                        <Badge variant="secondary" className="font-mono mt-1 w-fit bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200">
                                            {selectedTransition.event}
                                        </Badge>
                                    </div>

                                    <div className="space-y-3 pt-3 border-t">
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex justify-between items-center">
                                            Verification Status
                                            <span className="flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                                                <ShieldCheck className="w-3 h-3" /> REPLAY SAFE
                                            </span>
                                        </label>

                                        <div className="space-y-1.5">
                                            <div className="text-[10px] uppercase text-muted-foreground font-semibold">State Hash </div>
                                            <HashBadge hash={smData?.stateHash || contract.hash} className="w-full bg-muted font-mono" truncateLength={24} />
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3 mt-4">
                                        <h4 className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-1 flex items-center gap-1.5">
                                            <Activity className="w-3 h-3" /> Determinism Engine
                                        </h4>
                                        <p className="text-[11px] text-orange-800/80 dark:text-orange-300/80 leading-relaxed">
                                            This transition is evaluated strictly according to guard {selectedTransition.rule}.
                                            The underlying evaluation functions have no side effects and ensure 100% reproducibility.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                    <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mb-4">
                                        <FileText className="h-8 w-8 opacity-40" />
                                    </div>
                                    <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Select a Transition</h3>
                                    <p className="text-sm opacity-80">Click on any path in the diagram to inspect transition constraints.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
