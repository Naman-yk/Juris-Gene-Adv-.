// React component for the Architecture Explorer
// This is injected and mounted via Babel in index.html

const { useState, useEffect } = React;
const { ReactFlow, Background, Controls } = window.ReactFlow;

const pipelineNodes = [
    { id: '1', data: { label: '01 PDF Document Upload', stat: '2.4s', icon: '📄', simulatedOutput: 'File: Service_Agmt.pdf' }, position: { x: 50, y: 150 }, type: 'custom' },
    { id: '2', data: { label: '02 AI Clause Extraction', stat: '450ms', icon: '🧠', simulatedOutput: 'Clauses: Term, Liability, SLA' }, position: { x: 300, y: 50 }, type: 'custom' },
    { id: '3', data: { label: '03 Metadata Extraction', stat: '120ms', icon: '🏷️', simulatedOutput: 'Parties: TechCorp | CA' }, position: { x: 300, y: 250 }, type: 'custom' },
    { id: '4', data: { label: '04 Human Legal Review', stat: 'Pending', icon: '👤', simulatedOutput: 'Review: APPROVED' }, position: { x: 550, y: 150 }, type: 'custom' },
    { id: '5', data: { label: '05 Typed Contract Gen', stat: '80ms', icon: '🧩', simulatedOutput: 'Canonical JSON AST Ready' }, position: { x: 800, y: 150 }, type: 'custom' },
    { id: '6', data: { label: '06 Compliance Engine', stat: '210ms', icon: '⚖️', simulatedOutput: 'Risk Score: 98/100 (Low)' }, position: { x: 1050, y: 50 }, type: 'custom' },
    { id: '7', data: { label: '07 Exec State Machine', stat: '42ms', icon: '⚙️', simulatedOutput: 'State: PENDING → ACTIVE' }, position: { x: 1050, y: 250 }, type: 'custom' },
    { id: '8', data: { label: '08 Deterministic Replay', stat: '15ms', icon: '⏪', simulatedOutput: 'Replay: SUCCESS (0 diff)' }, position: { x: 1300, y: 150 }, type: 'custom' },
    { id: '9', data: { label: '09 Blockchain Anchor', stat: '12s (ETH)', icon: '🔗', simulatedOutput: 'Tx: 0x33cf...f91a' }, position: { x: 1550, y: 150 }, type: 'custom' },
];

const getEdges = (activeNodeId) => {
    // Glow the edges that lead TO or FROM the active node
    const isActive = (source, target) => activeNodeId === target || activeNodeId === source;
    const styleActio = { stroke: '#fff', strokeWidth: 3, filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.8))' };
    const styleNorm = (color) => ({ stroke: color, strokeWidth: 2 });

    return [
        { id: 'e1-2', source: '1', target: '2', animated: true, style: isActive('1', '2') ? styleActio : styleNorm('#8B5CF6') },
        { id: 'e1-3', source: '1', target: '3', animated: true, style: isActive('1', '3') ? styleActio : styleNorm('#3B82F6') },
        { id: 'e2-4', source: '2', target: '4', animated: true, style: isActive('2', '4') ? styleActio : styleNorm('#8B5CF6') },
        { id: 'e3-4', source: '3', target: '4', animated: true, style: isActive('3', '4') ? styleActio : styleNorm('#3B82F6') },
        { id: 'e4-5', source: '4', target: '5', animated: true, style: isActive('4', '5') ? styleActio : styleNorm('#10B981') },
        { id: 'e5-6', source: '5', target: '6', animated: true, style: isActive('5', '6') ? styleActio : styleNorm('#F59E0B') },
        { id: 'e5-7', source: '5', target: '7', animated: true, style: isActive('5', '7') ? styleActio : styleNorm('#06B6D4') },
        { id: 'e7-8', source: '7', target: '8', animated: true, style: isActive('7', '8') ? styleActio : styleNorm('#06B6D4') },
        { id: 'e8-9', source: '8', target: '9', animated: true, style: isActive('8', '9') ? styleActio : styleNorm('#8B5CF6') },
    ];
};

const nodeDetailsMap = {
    '1': {
        title: 'PDF Document Upload',
        desc: 'Ingests unstructured legal PDFs and prepares them for OCR/parsing operations.',
        output: '{ file_id: "doc_123", status: "PARSED", pages: 14 }',
        struct: 'Binary Blob -> Uint8Array -> Text Blocks'
    },
    '2': {
        title: 'AI Clause Extraction',
        desc: 'Uses LLMs to identify specific clauses (Termination, Liability, SLA) from unstructured text blocks.',
        output: '[{ type: "TERMINATION", text: "...", confidence: 0.94 }]',
        struct: 'Vector Embeddings -> Semantic Search -> Classification'
    },
    '3': {
        title: 'Metadata Extraction',
        desc: 'Extracts critical entities like Parties, Dates, Amounts, and Jurisdiction.',
        output: '{ parties: ["TechCorp", "Vendor"], jurisdiction: "CA" }',
        struct: 'NER (Named Entity Recognition) Models'
    },
    '4': {
        title: 'Human Legal Review',
        desc: 'Gatekeeper stage where human operators confirm AI suggestions before generating the typed object.',
        output: '{ review_id: "rev_881", status: "APPROVED", by: "user_1" }',
        struct: 'Manual Override Database Log'
    },
    '5': {
        title: 'Typed Contract Generation',
        desc: 'Compiles all extracted, reviewed data into the final Canonical JSON Data Model.',
        output: '{ contract_id: "ct_992", hash: "0x8fa4...", parties: [...] }',
        struct: 'Canonical JSON AST (Abstract Syntax Tree)'
    },
    '6': {
        title: 'Compliance Engine',
        desc: 'Evaluates the typed contract against regulatory invariant rules.',
        output: '{ rule: "GDPR_CONSENT", status: "PASS", violations: [] }',
        struct: 'Rule Evaluation Engine Logs'
    },
    '7': {
        title: 'Execution State Machine',
        desc: 'The core engine that processes events and transitions contract states deterministically.',
        output: 'transition(event: PAYMENT_RECEIVED, PENDING -> ACTIVE)',
        struct: 'Deterministic Finite Automaton (DFA)'
    },
    '8': {
        title: 'Deterministic Replay',
        desc: 'Recomputes State Machine from genesis to verify final hash matches the canonical state.',
        output: '{ validation: "SUCCESS", diff: 0, steps: 14 }',
        struct: 'Event Ledger Replay Buffer'
    },
    '9': {
        title: 'Blockchain Anchor',
        desc: 'Submits the final verified state hash to a public or private ledger for immutable proof.',
        output: 'Tx Receipt: { txHash: "0x33cf...", blockNum: 18563042 }',
        struct: 'Smart Contract Transaction Calldata'
    }
};

const CustomNode = ({ data, selected }) => {
    const isPacketHere = data.isPacketActive;

    return (
        <div className={`relative px-4 py-3 shadow-lg rounded-xl border-2 transition-all duration-300 ${selected ? 'border-primary bg-panel shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-border bg-[#0A1224]'} ${isPacketHere ? 'ring-2 ring-emerald-400 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-105' : ''} min-w-[180px]`}>

            {/* Animated Simulation Badge */}
            <div className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black font-mono text-[10px] px-3 py-1.5 rounded-md shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-500 whitespace-nowrap pointer-events-none z-50 ${isPacketHere ? 'opacity-100 transform translate-y-0 scale-100' : 'opacity-0 transform translate-y-2 scale-90'}`}>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 transform"></div>
                <span className="relative z-10 font-bold">{data.simulatedOutput}</span>
            </div>

            <div className="flex items-center gap-3 relative z-10">
                <div className="text-xl">{data.icon}</div>
                <div>
                    <div className="text-xs font-bold text-white mb-1 tracking-tight">{data.label}</div>
                    <div className="text-[10px] text-primary font-mono">{data.stat}</div>
                </div>
            </div>
        </div>
    );
};

const nodeTypes = { custom: CustomNode };

const ArchitectureExplorer = () => {
    const [nodes, setNodes] = useState(pipelineNodes);
    const [edges, setEdges] = useState(getEdges(null));
    const [activeNode, setActiveNode] = useState(nodeDetailsMap['1']);

    // Animation Sequence Logic
    const animationSequence = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const [animationStep, setAnimationStep] = useState(0);

    useEffect(() => {
        const packetNodeId = animationSequence[animationStep];

        // Update nodes with active state
        setNodes(nds => nds.map(n => ({
            ...n,
            data: {
                ...n.data,
                isPacketActive: n.id === packetNodeId
            }
        })));

        // Update edges to glow where packet is
        setEdges(getEdges(packetNodeId));

        // Update Inspector side panel automatically
        setActiveNode(nodeDetailsMap[packetNodeId]);

        // Timer for next step
        const timer = setTimeout(() => {
            setAnimationStep(prev => (prev + 1) % animationSequence.length);
        }, 2500); // Packet moves every 2.5 seconds

        return () => clearTimeout(timer);
    }, [animationStep]);

    const onNodeClick = (event, node) => {
        // Optional: could stop animation or just show info
        setActiveNode(nodeDetailsMap[node.id]);
    };

    return (
        <div className="w-full h-full flex flex-col md:flex-row bg-[#040914] text-white font-sans">

            {/* Node Details Sidebar */}
            <div className="w-full md:w-80 border-r border-border bg-[#0A1224] p-6 flex flex-col shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <div className="text-[10px] text-primary uppercase tracking-widest font-bold">Node Details</div>
                    <div className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Simulation</div>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{activeNode.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed mb-8">{activeNode.desc}</p>

                <div className="space-y-6">
                    <div>
                        <div className="text-[10px] text-text-dim uppercase mb-2">Internal Data Structure</div>
                        <div className="bg-black/50 border border-white/5 rounded p-3 text-xs font-mono text-emerald-400 transition-colors">
                            {activeNode.struct}
                        </div>
                    </div>

                    <div>
                        <div className="text-[10px] text-text-dim uppercase mb-2">Example Output</div>
                        <div className="bg-black/50 border border-white/5 rounded p-3 text-xs font-mono text-purple-300 break-words transition-colors">
                            {activeNode.output}
                        </div>
                    </div>
                </div>
            </div>

            {/* React Flow Container */}
            <div className="flex-1 relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodeClick={onNodeClick}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    className="bg-[#040914]"
                >
                    <Background color="#1E293B" gap={20} size={1} />
                    <Controls className="bg-panel border-border fill-white" />
                </ReactFlow>

                <div className="absolute bottom-4 right-4 bg-black/40 border border-white/10 px-3 py-1.5 rounded text-[10px] font-mono text-text-muted backdrop-blur-sm pointer-events-none">
                    Simulating Contract Flow...
                </div>
            </div>

        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('architecture-explorer-root'));
root.render(<ArchitectureExplorer />);
