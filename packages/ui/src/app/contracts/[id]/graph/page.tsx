"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Network, ArrowLeft, Layers, Maximize2, AlertTriangle } from 'lucide-react';
import { useTheme } from 'next-themes';

import { useContractStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DEMO_GRAPH_NODES, DEMO_GRAPH_EDGES, DEMO_GRAPH_COLORS, DEMO_GRAPH_POSITIONS } from '@/lib/demo-data';
import { useAnalysis } from '@/lib/use-analysis';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

const DEFAULT_COLORS: Record<string, { dark: string; light: string }> = {
    Party:       { dark: '#10b981', light: '#059669' },
    Financial:   { dark: '#f59e0b', light: '#d97706' },
    Institution: { dark: '#3b82f6', light: '#2563eb' },
    Event:       { dark: '#ef4444', light: '#dc2626' },
    Outcome:     { dark: '#8b5cf6', light: '#7c3aed' },
    Clause:      { dark: '#ec4899', light: '#db2777' },
    State:       { dark: '#6366f1', light: '#4f46e5' },
};

function getColor(group: string, isDark: boolean): string {
    const colors = DEMO_GRAPH_COLORS[group] || DEFAULT_COLORS[group] || DEFAULT_COLORS.Event;
    return isDark ? colors.dark : colors.light;
}

function buildGraphData(nodes: any[], edges: any[], positions: Record<string, { x: number; y: number }>, isDark: boolean) {
    const built = nodes.map(n => ({
        ...n,
        color: getColor(n.group, isDark),
        fx: positions[n.id]?.x ?? 0,
        fy: positions[n.id]?.y ?? 0,
        x: positions[n.id]?.x ?? 0,
        y: positions[n.id]?.y ?? 0,
    }));

    const links = edges.map((e: any, i: number) => ({
        ...e,
        id: `edge-${i}`,
    }));

    return { nodes: built, links };
}

export default function KnowledgeGraphPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { analysis, isDemo, loading, error } = useAnalysis(params.id);

    const graphNodes = isDemo ? DEMO_GRAPH_NODES : (analysis?.graph?.nodes || []);
    const graphEdges = isDemo ? DEMO_GRAPH_EDGES : (analysis?.graph?.edges || []);
    const graphPositions = isDemo ? DEMO_GRAPH_POSITIONS : (analysis?.graph?.positions || {});

    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedNode, setSelectedNode] = useState<any>(null);

    const graphData = buildGraphData(graphNodes, graphEdges, graphPositions, isDark);

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver(entries => {
            if (entries[0]) {
                const { width, height } = entries[0].contentRect;
                setDimensions({ width, height });
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    const fgRef = useRef<any>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (fgRef.current) {
                fgRef.current.centerAt(0, 50, 300);
                fgRef.current.zoom(0.9, 300);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [dimensions]);

    const handleNodeClick = useCallback((node: any) => { setSelectedNode(node); }, []);

    const bgFill = isDark ? '#020617' : '#f8fafc';
    const lineColor = isDark ? '#475569' : '#94a3b8';
    const textColor = isDark ? '#94a3b8' : '#475569';

    const allGroups = Array.from(new Set(graphNodes.map((n: any) => n.group)));
    const legendItems = allGroups.map(group => ({ group, color: getColor(group, isDark) }));

    if (loading) {
        return (
            <div className="container py-8 max-w-[1400px] flex flex-col items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
                <p className="text-muted-foreground font-medium">Building knowledge graph…</p>
            </div>
        );
    }

    if (error && !isDemo) {
        return (
            <div className="container py-8 max-w-[1400px] flex flex-col items-center justify-center min-h-[60vh] text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-xl font-bold mb-2">Analysis Failed</h3>
                <p className="text-muted-foreground mb-4 max-w-md">{error}</p>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
        );
    }

    return (
        <div className="container py-8 max-w-[1400px] h-[calc(100vh-64px)] flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Network className="h-7 w-7 text-primary" /> Knowledge Graph
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        {isDemo ? 'Suraj Yadav → LOAN → Ram Avtar → CHEQUE → SBI → DISHONOUR → CONVICTION' : `${graphNodes.length} entities extracted from document`}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/contracts/${params.id}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contract
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow min-h-0">
                <Card className="lg:col-span-3 h-full overflow-hidden flex flex-col relative border-2 border-primary/10">
                    <div className="absolute top-4 left-4 z-10 flex gap-2">
                        <Badge variant="secondary" className="bg-background/80 backdrop-blur border shadow-sm flex items-center gap-1.5">
                            <Layers className="h-3 w-3" /> {graphData.nodes.length} Nodes
                        </Badge>
                        <Badge variant="secondary" className="bg-background/80 backdrop-blur border shadow-sm flex items-center gap-1.5">
                            <Network className="h-3 w-3" /> {graphData.links.length} Edges
                        </Badge>
                    </div>

                    <div className="absolute bottom-4 left-4 z-10 flex gap-3 bg-background/80 backdrop-blur border rounded-lg px-3 py-2 shadow-sm">
                        {legendItems.map(item => (
                            <div key={item.group} className="flex items-center gap-1.5 text-xs font-medium">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                {item.group}
                            </div>
                        ))}
                    </div>

                    <div className="flex-grow w-full h-full relative" ref={containerRef}>
                        <ForceGraph2D
                            ref={fgRef}
                            width={dimensions.width}
                            height={dimensions.height}
                            graphData={graphData}
                            nodeLabel="name"
                            nodeColor={(node: any) => node.color}
                            nodeRelSize={1}
                            onNodeClick={handleNodeClick}
                            linkColor={() => lineColor}
                            linkDirectionalParticles={2}
                            linkDirectionalParticleSpeed={0.005}
                            linkWidth={2}
                            backgroundColor={bgFill}
                            d3AlphaDecay={0.05}
                            d3VelocityDecay={0.6}
                            cooldownTicks={0}
                            nodeCanvasObject={(node: any, ctx: any, globalScale: number) => {
                                const label = node.name;
                                const fontSize = Math.max(12 / globalScale, 8);
                                ctx.font = `bold ${fontSize}px Inter, Sans-Serif`;
                                const r = Math.sqrt(Math.max(0, node.val)) * 4;
                                ctx.beginPath();
                                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
                                ctx.fillStyle = node.color;
                                ctx.fill();
                                if (selectedNode && selectedNode.id === node.id) {
                                    ctx.lineWidth = 3 / globalScale;
                                    ctx.strokeStyle = '#ffffff';
                                    ctx.stroke();
                                }
                                const textWidth = ctx.measureText(label).width;
                                const padding = fontSize * 0.3;
                                ctx.fillStyle = isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)';
                                ctx.fillRect(node.x - textWidth / 2 - padding, node.y + r + 4, textWidth + padding * 2, fontSize + padding);
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillStyle = textColor;
                                ctx.fillText(label, node.x, node.y + r + 4 + (fontSize + padding) / 2);
                            }}
                            linkCanvasObjectMode={() => 'after'}
                            linkCanvasObject={(link: any, ctx: any, globalScale: number) => {
                                const midX = (link.source.x + link.target.x) / 2;
                                const midY = (link.source.y + link.target.y) / 2;
                                const fontSize = Math.max(10 / globalScale, 6);
                                ctx.font = `bold ${fontSize}px Inter, Sans-Serif`;
                                ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(link.label, midX, midY - 6);
                            }}
                        />
                    </div>
                </Card>

                <div className="lg:col-span-1 flex flex-col h-full">
                    <Card className="flex-1 flex flex-col overflow-hidden">
                        <CardHeader className="border-b bg-muted/20 pb-4">
                            <CardTitle className="text-lg flex items-center gap-2"><Maximize2 className="h-5 w-5" /> Node Inspector</CardTitle>
                            <CardDescription>Click a node in the graph to inspect it.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-0">
                            {selectedNode ? (
                                <div className="p-5 space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedNode.color }} />
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{selectedNode.group}</span>
                                    </div>
                                    <h3 className="text-xl font-bold">{selectedNode.name}</h3>
                                    <div className="space-y-2 pt-3 border-t">
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Connections</label>
                                        {graphEdges.filter((e: any) => e.source === selectedNode.id || e.target === selectedNode.id).map((edge: any, i: number) => {
                                            const otherNodeId = edge.source === selectedNode.id ? edge.target : edge.source;
                                            const otherNode = graphNodes.find((n: any) => n.id === otherNodeId);
                                            const direction = edge.source === selectedNode.id ? '→' : '←';
                                            return (
                                                <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30">
                                                    <Badge variant="outline" className="font-mono text-xs">{edge.label}</Badge>
                                                    <span className="text-muted-foreground">{direction}</span>
                                                    <span className="font-medium">{otherNode?.name || otherNodeId}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                    <Network className="h-8 w-8 opacity-40 mb-2" />
                                    <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Select a Node</h3>
                                    <p className="text-sm opacity-80">Click on any node in the graph to see its connections.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
