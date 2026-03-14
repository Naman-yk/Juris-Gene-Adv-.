"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Network, ArrowLeft, Layers, ShieldCheck, HelpCircle, Activity, FileText, UserCircle, Maximize2 } from 'lucide-react';
import { useTheme } from 'next-themes';

import { useContractStore, useUIStore } from '@/lib/stores';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HashBadge } from '@/components/ui/hash-badge';
import { fetchGraph, type GraphData } from '@/lib/api';

// Dynamically import ForceGraph2D as it requires window/canvas space
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export default function KnowledgeGraphPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Store data
    const contracts = useContractStore((state) => state.contracts);
    const contract = contracts.find(c => c.id === params.id);

    // Fallback data if direct navigation
    const activeContract = {
        id: params.id,
        title: contract?.title || "Sample Commercial Lease",
        hash: contract?.hash || "0xabc123456789def0123456789abcdeffedcba9876543210",
        state: contract?.state || contract?.status || 'ACTIVE',
        parties: Array.isArray((contract as any)?.parties)
            ? (contract as any).parties
            : typeof contract?.parties === 'string' && contract.parties.trim().length > 0
                ? contract.parties.split(',').map((p, i) => ({ id: `party-${i}`, role: "PARTY", name: p.trim(), provenance: "SYSTEM", confidence: 100 }))
                : [
                    { id: "party-tenant", role: "TENANT", name: "ACME Corp", provenance: "HUMAN_AUTHORED", confidence: 100 },
                    { id: "party-landlord", role: "LANDLORD", name: "Oasis Holdings LLC", provenance: "AI_EXTRACTED", confidence: 95 }
                ],
        clauses: (contract as any)?.clauses || [
            {
                id: "clause-rent",
                title: "Monthly Rent",
                type: "PAYMENT",
                obligations: [
                    { id: "obl-pay-rent", status: "ACTIVE", penalty: { type: "FINANCIAL", amount: 500 } }
                ],
                rights: [],
                events: [{ id: "evt-rent-paid", type: "PAYMENT_RECEIVED", party_id: "party-tenant" }]
            },
            {
                id: "clause-termination",
                title: "Early Termination",
                type: "TERMINATION",
                obligations: [],
                rights: [
                    { id: "right-terminate", type: "TERMINATION", holder: "party-tenant" }
                ]
            }
        ],
        provenance: "AI_EXTRACTED",
        engine_version: "1.0.0"
    };

    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedNode, setSelectedNode] = useState<any>(null);

    // Responsive dimensions
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

    // Fetch graph data from API with fallback to local construction
    const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });

    const groupColors: Record<string, { dark: string; light: string }> = {
        State: { dark: '#3b82f6', light: '#2563eb' },
        Party: { dark: '#10b981', light: '#059669' },
        Clause: { dark: '#ec4899', light: '#db2777' },
        Obligation: { dark: '#f59e0b', light: '#d97706' },
        Right: { dark: '#8b5cf6', light: '#7c3aed' },
        Risk: { dark: '#ef4444', light: '#dc2626' },
    };

    useEffect(() => {
        fetchGraph(params.id)
            .then((apiData) => {
                // Apply colors based on group
                const coloredNodes = apiData.nodes.map(n => ({
                    ...n,
                    color: (groupColors[n.group] || groupColors.State)[isDark ? 'dark' : 'light'],
                }));
                setGraphData({ nodes: coloredNodes, links: apiData.edges.map(e => ({ ...e })) });
            })
            .catch(() => {
                // Fallback: build from local contract data
                const nodes: any[] = [];
                const links: any[] = [];

                nodes.push({
                    id: 'contract-root',
                    name: activeContract.title,
                    group: 'State',
                    val: 30,
                    color: isDark ? '#3b82f6' : '#2563eb',
                    details: { provenance: "SYSTEM", confidence: 100, status: activeContract.state, hash: activeContract.hash },
                });

                if ((activeContract as any).parties) {
                    ((activeContract as any).parties as any[]).forEach((party: any) => {
                        nodes.push({ id: party.id, name: party.name || party.role, group: 'Party', val: 15, color: isDark ? '#10b981' : '#059669', details: { provenance: party.provenance || "HUMAN_AUTHORED", confidence: party.confidence || 100, hash: `hash-party-${party.id}` } });
                        links.push({ source: 'contract-root', target: party.id, label: 'involves' });
                    });
                }

                if ((activeContract as any).clauses) {
                    ((activeContract as any).clauses as any[]).forEach((clause: any) => {
                        nodes.push({ id: clause.id, name: clause.title || `Clause: ${clause.type}`, group: 'Clause', val: 20, color: isDark ? '#ec4899' : '#db2777', details: { provenance: "AI_EXTRACTED", confidence: 94, hash: `hash-${clause.id}`, type: clause.type } });
                        links.push({ source: 'contract-root', target: clause.id, label: 'contains' });

                        if (clause.obligations) {
                            clause.obligations.forEach((obl: any) => {
                                nodes.push({ id: obl.id, name: `Obligation: ${obl.status}`, group: 'Obligation', val: 10, color: isDark ? '#f59e0b' : '#d97706', details: { provenance: "AI_EXTRACTED", confidence: 88, hash: `hash-${obl.id}`, sourceClause: clause.title } });
                                links.push({ source: clause.id, target: obl.id, label: 'defines' });
                            });
                        }

                        if (clause.rights) {
                            clause.rights.forEach((right: any) => {
                                nodes.push({ id: right.id, name: `Right: ${right.type}`, group: 'Right', val: 10, color: isDark ? '#8b5cf6' : '#7c3aed', details: { provenance: "AI_EXTRACTED", confidence: 91, hash: `hash-${right.id}`, sourceClause: clause.title, holder: right.holder } });
                                links.push({ source: clause.id, target: right.id, label: 'grants' });
                                if (right.holder) {
                                    // Ensure holder node exists to avoid d3-force error
                                    if (!nodes.some(n => n.id === right.holder)) {
                                        nodes.push({ id: right.holder, name: `Party: ${right.holder.replace('party-', '')}`, group: 'Party', val: 15, color: isDark ? '#10b981' : '#059669', details: { provenance: "SYSTEM", confidence: 100 } });
                                    }
                                    links.push({ source: right.holder, target: right.id, label: 'holds' });
                                }
                            });
                        }
                    });
                }

                setGraphData({ nodes, links });
            });
    }, [params.id, isDark]);

    // Force distance tuning
    const fgRef = useRef<any>(null);
    useEffect(() => {
        if (fgRef.current && graphData.nodes.length > 0) {
            // Apply repulsive charge to spread nodes apart
            fgRef.current.d3Force('charge').strength(-400).distanceMax(400);

            // Adjust link distance
            fgRef.current.d3Force('link').distance(80);

            // Re-heat simulation
            fgRef.current.d3ReheatSimulation();
        }
    }, [graphData]);

    const handleNodeClick = useCallback((node: any) => {
        setSelectedNode(node);
    }, []);

    // Background color based on theme
    const bgFill = isDark ? '#020617' : '#f8fafc'; // slate 950 : slate 50
    const lineColor = isDark ? '#334155' : '#cbd5e1'; // slate 700 : slate 300
    const textColor = isDark ? '#94a3b8' : '#64748b'; // slate 400 : slate 500

    return (
        <div className="container py-8 max-w-[1400px] h-[calc(100vh-64px)] flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Network className="h-7 w-7 text-primary" /> Knowledge Graph
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">Relational entity mapping and provenance tracking.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/contracts/${params.id}`)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contract
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow min-h-0">
                {/* Left Panel: Force Graph Canvas */}
                <Card className="lg:col-span-3 h-full overflow-hidden flex flex-col relative border-2 border-primary/10">
                    <div className="absolute top-4 left-4 z-10 flex gap-2">
                        <Badge variant="secondary" className="bg-background/80 backdrop-blur border shadow-sm flex items-center gap-1.5">
                            <Layers className="h-3 w-3" /> {graphData.nodes.length} Nodes
                        </Badge>
                        <Badge variant="secondary" className="bg-background/80 backdrop-blur border shadow-sm flex items-center gap-1.5">
                            <Network className="h-3 w-3" /> {graphData.links.length} Edges
                        </Badge>
                    </div>

                    <div className="flex-grow w-full h-full relative" ref={containerRef}>
                        <ForceGraph2D
                            ref={fgRef}
                            width={dimensions.width}
                            height={dimensions.height}
                            graphData={graphData}
                            nodeLabel="name"
                            nodeColor={node => node.color}
                            nodeRelSize={1}
                            onNodeClick={handleNodeClick}
                            linkColor={() => lineColor}
                            linkDirectionalParticles={2}
                            linkDirectionalParticleSpeed={0.005}
                            backgroundColor={bgFill}
                            d3AlphaDecay={0.02}
                            d3VelocityDecay={0.4}
                            cooldownTicks={100}
                            nodeCanvasObject={(node: any, ctx, globalScale) => {
                                // Draw circle
                                const label = node.name;
                                const fontSize = 12 / globalScale;
                                ctx.font = `${fontSize}px Sans-Serif`;
                                const textWidth = ctx.measureText(label).width;
                                const r = Math.sqrt(Math.max(0, node.val)) * 4;

                                ctx.beginPath();
                                ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
                                ctx.fillStyle = node.color;
                                ctx.fill();

                                // Draw border if selected
                                if (selectedNode && selectedNode.id === node.id) {
                                    ctx.lineWidth = 2 / globalScale;
                                    ctx.strokeStyle = '#ffffff';
                                    ctx.stroke();
                                    ctx.lineWidth = 1 / globalScale;
                                    ctx.strokeStyle = '#000000';
                                    ctx.stroke();
                                }

                                // Draw label text
                                const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding
                                ctx.fillStyle = isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)';
                                ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + r + 2, bckgDimensions[0], bckgDimensions[1]);

                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillStyle = textColor;
                                ctx.fillText(label, node.x, node.y + r + 2 + bckgDimensions[1] / 2);
                            }}
                            linkCanvasObjectMode={() => 'after'}
                        />
                    </div>
                </Card>

                {/* Right Panel: Node Inspector */}
                <div className="lg:col-span-1 flex flex-col h-full space-y-4">
                    <Card className="flex-1 flex flex-col overflow-hidden">
                        <CardHeader className="border-b bg-muted/20 pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Maximize2 className="h-5 w-5" /> Node Inspector
                            </CardTitle>
                            <CardDescription>Click a node in the graph to inspect its deterministic derivation.</CardDescription>
                        </CardHeader>

                        <CardContent className="flex-1 overflow-y-auto p-0">
                            {selectedNode ? (
                                <div className="p-5 space-y-6">
                                    {/* Header */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: selectedNode.color }}
                                            />
                                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{selectedNode.group}</span>
                                        </div>
                                        <h3 className="text-xl font-bold">{selectedNode.name}</h3>
                                        {selectedNode.details.type && (
                                            <Badge variant="outline" className="mt-2 font-mono">{selectedNode.details.type}</Badge>
                                        )}
                                    </div>

                                    {/* Source Mapping */}
                                    {selectedNode.details.sourceClause && (
                                        <div className="space-y-1 p-3 rounded-lg border bg-muted/40 text-sm">
                                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                                <Layers className="w-3 h-3" /> Belongs to Clause
                                            </label>
                                            <div className="font-medium">{selectedNode.details.sourceClause}</div>
                                        </div>
                                    )}

                                    {selectedNode.details.holder && (
                                        <div className="space-y-1 p-3 rounded-lg border bg-muted/40 text-sm">
                                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                                <UserCircle className="w-3 h-3" /> Party Holder
                                            </label>
                                            <div className="font-medium">{selectedNode.details.holder}</div>
                                        </div>
                                    )}

                                    {/* AI Provenance */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">Extraction Metadata</label>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Provenance</span>
                                            <Badge variant={selectedNode.details.provenance === 'HUMAN_AUTHORED' ? 'default' : 'secondary'} className={selectedNode.details.provenance === 'HUMAN_AUTHORED' ? 'bg-blue-600' : 'bg-purple-600 text-white'}>
                                                {selectedNode.details.provenance?.replace('_', ' ')}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground flex items-center gap-1.5"><Activity className="w-4 h-4" /> Confidence</span>
                                            <span className={`font-bold ${selectedNode.details.confidence > 90 ? 'text-green-500' : 'text-yellow-500'}`}>
                                                {selectedNode.details.confidence}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Cryptographic Proof */}
                                    <div className="space-y-2 pt-4 border-t">
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">
                                            Cryptographic Node Hash
                                        </label>
                                        <HashBadge hash={selectedNode.details.hash} className="w-full bg-muted font-mono justify-between" truncateLength={20} />
                                        <p className="text-[10px] text-muted-foreground leading-tight mt-1">
                                            Merklized abstract syntax tree root for this logical entity. Altering its attributes inherently alters its hash identity.
                                        </p>
                                    </div>

                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                    <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mb-4">
                                        <Network className="h-8 w-8 opacity-40" />
                                    </div>
                                    <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-1">Select an Entity</h3>
                                    <p className="text-sm opacity-80">Click on any node in the graph map to inspect source origin, extraction confidence, and hashes.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
