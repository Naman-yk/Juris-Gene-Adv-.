import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { ReactFlow, ReactFlowProvider, Background, Controls, MarkerType, useNodesState, useEdgesState, Handle, Position } from 'reactflow';

// Custom Node Component
const JurisGenieNode = ({ data, selected }) => {
    return (
        <div className={`react-flow__node-jurisgenie ${selected ? 'active' : ''}`}>
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <div className="icon-wrap" style={{
                background: selected ? 'rgba(34, 211, 238, 0.2)' : 'rgba(34, 211, 238, 0.05)',
                color: selected ? '#FFD700' : '#22d3ee',
                boxShadow: selected ? '0 0 10px rgba(255, 215, 0, 0.4)' : 'none'
            }}>
                <i className={`fas ${data.icon}`}></i>
            </div>
            <div>{data.label}</div>
            <Handle type="source" position={Position.Bottom} className="opacity-0" />
        </div>
    );
};

const nodeTypes = {
    jurisgenie: JurisGenieNode
};

const INITIAL_NODES = [
    {
        id: 'upload',
        type: 'jurisgenie',
        position: { x: 250, y: 50 },
        data: {
            label: 'PDF Ingestion',
            icon: 'fa-file-pdf',
            desc: 'Securely ingests raw PDFs and extracts base text layer using advanced OCR.',
            input: 'Raw Contract PDF',
            output: 'Raw Text + Page Geometry',
            guarantees: 'Zero Data Logged, End-to-End Encrypted',
            api: 'POST /api/documents/upload'
        }
    },
    {
        id: 'ai',
        type: 'jurisgenie',
        position: { x: 250, y: 150 },
        data: {
            label: 'AI Annotation',
            icon: 'fa-brain',
            desc: 'Specialized Legal LLM identifies clauses, parties, obligations, and state variables.',
            input: 'Raw Text',
            output: 'Semantic JSON AST (Abstract Syntax Tree)',
            guarantees: '99.9% Clause Recall',
            api: 'POST /api/analyze/extract'
        }
    },
    {
        id: 'human',
        type: 'jurisgenie',
        position: { x: 250, y: 250 },
        data: {
            label: 'Human Review',
            icon: 'fa-user-check',
            desc: 'Domain experts verify AI annotations and resolve ambiguities before lock-in.',
            input: 'Semantic JSON AST',
            output: 'Verified Contract Object',
            guarantees: 'Human in the loop (HITL) precision',
            api: 'PATCH /api/contracts/:id/review'
        }
    },
    {
        id: 'typed',
        type: 'jurisgenie',
        position: { x: 250, y: 350 },
        data: {
            label: 'Typed Contract',
            icon: 'fa-code',
            desc: 'Creates the canonical Deterministic State Machine representing the contract log.',
            input: 'Verified Contract Object',
            output: 'Initial State Hash',
            guarantees: 'Strict Type Mapping',
            api: 'POST /api/contracts/compile'
        }
    },
    {
        id: 'compliance',
        type: 'jurisgenie',
        position: { x: 50, y: 450 },
        data: {
            label: 'Compliance Engine',
            icon: 'fa-shield-alt',
            desc: 'Runs static analysis checks against local regulations (e.g., GDPR, local labor laws).',
            input: 'Typed Contract Schema',
            output: 'Compliance Report',
            guarantees: 'Pre-execution Safety',
            api: 'GET /api/contracts/:id/compliance'
        }
    },
    {
        id: 'execution',
        type: 'jurisgenie',
        position: { x: 450, y: 450 },
        data: {
            label: 'Execution Engine',
            icon: 'fa-cogs',
            desc: 'Event-driven state machine that executes contract transitions deterministically.',
            input: 'Contract State Payload + Event',
            output: 'New Contract State + Execution Hash',
            guarantees: 'Replay Safe, Deterministic Transitions',
            api: 'POST /api/contracts/:id/execute'
        }
    },
    {
        id: 'replay',
        type: 'jurisgenie',
        position: { x: 450, y: 550 },
        data: {
            label: 'Deterministic Replay',
            icon: 'fa-history',
            desc: 'Re-evaluates the event ledger from genesis to ensure current state hash matches exactly.',
            input: 'Event Ledger Array',
            output: 'Reconstructed Hash',
            guarantees: 'Zero Nondeterminism',
            api: 'POST /api/contracts/:id/verify'
        }
    },
    {
        id: 'blockchain',
        type: 'jurisgenie',
        position: { x: 450, y: 650 },
        data: {
            label: 'Blockchain Anchor',
            icon: 'fa-link',
            desc: 'Anchors the cryptographic execution hash to a public ledger for immutable proof.',
            input: 'Execution Hash',
            output: 'On-chain Transaction ID',
            guarantees: 'Immutable Timestamping',
            api: 'POST /api/anchor'
        }
    },
    {
        id: 'public',
        type: 'jurisgenie',
        position: { x: 250, y: 750 },
        data: {
            label: 'Public Verification',
            icon: 'fa-search',
            desc: 'Open portal for independent auditors to verify contract state using the blockchain anchor.',
            input: 'Contract Hash ID',
            output: 'Verified Ledger Status',
            guarantees: 'Trustless Auditability',
            api: 'GET /api/public/verify/:hash'
        }
    }
];

const INITIAL_EDGES = [
    { id: 'e-upload-ai', source: 'upload', target: 'ai', animated: false },
    { id: 'e-ai-human', source: 'ai', target: 'human', animated: false },
    { id: 'e-human-typed', source: 'human', target: 'typed', animated: false },
    { id: 'e-typed-compliance', source: 'typed', target: 'compliance', animated: false },
    { id: 'e-typed-execution', source: 'typed', target: 'execution', animated: false },
    { id: 'e-execution-replay', source: 'execution', target: 'replay', animated: false },
    { id: 'e-replay-blockchain', source: 'replay', target: 'blockchain', animated: false },
    { id: 'e-compliance-public', source: 'compliance', target: 'public', animated: false },
    { id: 'e-blockchain-public', source: 'blockchain', target: 'public', animated: false },
];

function ArchitectureExplorer() {
    const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
    const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
    const [activeNodeId, setActiveNodeId] = useState('execution');
    const [activeRayEdge, setActiveRayEdge] = useState(0);

    const activeNodeData = useMemo(() => {
        const node = nodes.find(n => n.id === activeNodeId);
        return node ? node.data : INITIAL_NODES[5].data;
    }, [activeNodeId, nodes]);

    // Golden ray animation effect
    useEffect(() => {
        const sequence = [
            'e-upload-ai', 'e-ai-human', 'e-human-typed',
            'e-typed-execution', 'e-execution-replay', 'e-replay-blockchain'
        ];

        const interval = setInterval(() => {
            setActiveRayEdge(prev => (prev + 1) % sequence.length);
        }, 2000); // 2 second per edge

        return () => clearInterval(interval);
    }, []);

    // Update edges based on animation state
    useEffect(() => {
        const sequence = [
            'e-upload-ai', 'e-ai-human', 'e-human-typed',
            'e-typed-execution', 'e-execution-replay', 'e-replay-blockchain'
        ];
        const currentActiveEdgeId = sequence[activeRayEdge];

        setEdges(eds => eds.map(edge => {
            if (edge.id === currentActiveEdgeId) {
                return { ...edge, className: 'animated' };
            }
            return { ...edge, className: '' };
        }));

        // Also light up the target node of the animated edge
        const activeEdge = INITIAL_EDGES.find(e => e.id === currentActiveEdgeId);
        if (activeEdge) {
            setNodes(nds => nds.map(n => {
                if (n.id === activeEdge.target) {
                    return { ...n, style: { boxShadow: '0 0 20px rgba(255, 215, 0, 0.4)', borderColor: '#FFD700' } };
                }
                return { ...n, style: {} };
            }));
        }

    }, [activeRayEdge, setEdges, setNodes]);


    const onNodeClick = useCallback((event, node) => {
        setActiveNodeId(node.id);
    }, []);

    return (
        <div className="flex flex-col lg:flex-row h-full w-full">
            {/* Left side: React Flow Graph */}
            <div className="w-full lg:w-2/3 h-[400px] lg:h-full border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800 relative bg-gray-50 dark:bg-[#0a0f1e]">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    minZoom={0.5}
                    maxZoom={1.5}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background color="#334155" gap={24} size={1} />
                    <Controls className="dark:bg-navy-800 dark:border-gray-700 dark:fill-gray-300" />
                </ReactFlow>
                {/* Overlay gradient */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-gray-50 dark:to-[#0a0f1e] opacity-40"></div>
            </div>

            {/* Right side: Details Panel */}
            <div className="w-full lg:w-1/3 h-[400px] lg:h-full p-8 flex flex-col bg-white dark:bg-[#06080d] overflow-y-auto">
                <p className="text-cyan-600 dark:text-cyan-400 font-mono text-xs tracking-widest uppercase mb-2">Node Inspector</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                    <i className={`fas ${activeNodeData.icon} text-gold-500 dark:text-gold-400`}></i>
                    {activeNodeData.label}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 mb-8 text-sm leading-relaxed">
                    {activeNodeData.desc}
                </p>

                <div className="space-y-6 flex-1">
                    <div className="bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Input</p>
                        <p className="font-mono text-sm text-gray-800 dark:text-gray-300">{activeNodeData.input}</p>
                    </div>

                    <div className="flex justify-center">
                        <i className="fas fa-arrow-down text-gray-300 dark:text-gray-700"></i>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4">
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-500/70 uppercase tracking-widest mb-1">Output</p>
                        <p className="font-mono text-sm text-emerald-700 dark:text-emerald-400 font-semibold">{activeNodeData.output}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                        <div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Guarantees</p>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 text-xs font-semibold">
                                <i className="fas fa-check-circle"></i> {activeNodeData.guarantees}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Internal API</p>
                            <p className="font-mono text-[10px] text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded inline-block">
                                {activeNodeData.api}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const rootBox = document.getElementById('architecture-explorer-root');
const root = createRoot(rootBox);
root.render(
    <ReactFlowProvider>
        <ArchitectureExplorer />
    </ReactFlowProvider>
);
