"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText, Brain, UserCheck, Database, ShieldCheck, Play, Link2, CheckCircle2,
    Search, ArrowRight, Plus, Activity, Cpu, Zap, Clock, Network, Lock,
    ChevronDown, ChevronUp, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useContractStore } from "@/lib/stores";
import { HashBadge } from "@/components/ui/hash-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
    AreaChart, Area, ResponsiveContainer, LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";

/* ───────── PIPELINE NODES DATA ───────── */
const PIPELINE_NODES = [
    { id: "pdf", label: "PDF Upload", icon: FileText, color: "#f97316", desc: "Ingest unstructured legal documents from any jurisdiction." },
    { id: "ai", label: "AI Annotation", icon: Brain, color: "#a78bfa", desc: "Extract clauses, parties, obligations from legal text using LLMs." },
    { id: "human", label: "Human Review", icon: UserCheck, color: "#fbbf24", desc: "AI suggestions require human confirmation before activation." },
    { id: "typed", label: "Typed Contract", icon: Database, color: "#3b82f6", desc: "Normalized, schema-validated contract core with cryptographic hash." },
    { id: "compliance", label: "Compliance", icon: ShieldCheck, color: "#10b981", desc: "Automated GDPR, regulatory, and risk heuristic evaluation." },
    { id: "engine", label: "Execution Engine", icon: Play, color: "#06b6d4", desc: "Event-driven deterministic contract execution with replay safety." },
    { id: "verify", label: "Verification", icon: CheckCircle2, color: "#22d3ee", desc: "Cryptographic hash comparison and deterministic replay proof." },
    { id: "anchor", label: "Blockchain Anchor", icon: Link2, color: "#8b5cf6", desc: "Immutable proof of execution stored on Layer 1 blockchain." },
];

/* ───────── ARCHITECTURE FLOW ───────── */
const ARCH_STEPS = [
    { title: "PDF Upload", api: "POST /api/upload", guarantee: "Provenance tracking", detail: "Raw documents are ingested, parsed, and prepared for AI extraction. Supports PDF, DOCX, and scanned images via OCR pipeline." },
    { title: "ParsedDocument", api: "Internal: text-extraction-service", guarantee: "Lossless parsing", detail: "Text extraction preserves document structure, page boundaries, and clause numbering for downstream annotation." },
    { title: "AI Annotation", api: "POST /api/annotate (Gemini Pro)", guarantee: "Structured output schema", detail: "LLM extracts typed entities: parties, clauses, obligations, rights, penalties, and governing law references into strict JSON schema." },
    { title: "Human Review Gate", api: "UI: /contracts/:id/review", guarantee: "Human-in-the-loop", detail: "Every AI-generated annotation requires explicit human confirmation. No automated activation without review sign-off." },
    { title: "Typed Contract Core", api: "GET /api/contracts/:id", guarantee: "Schema-validated, hashed", detail: "The canonical representation. Every field is typed, versioned, and cryptographically hashed. This is the single source of truth." },
    { title: "Compliance Evaluation", api: "POST /api/compliance/evaluate", guarantee: "Deterministic rule engine", detail: "GDPR consent checks, liability caps, termination clause validation, and completeness scoring are run against the typed core." },
    { title: "Execution Engine", api: "POST /api/execute", guarantee: "Deterministic, replay-safe", detail: "Events trigger state transitions through a finite state machine. Same inputs always produce the same outputs." },
    { title: "Execution Hash", api: "Internal: hash-computation", guarantee: "SHA-256 integrity", detail: "Every state transition generates a cryptographic hash binding the input event, resulting state, and timestamp immutably." },
    { title: "Blockchain Anchor", api: "POST /api/anchor (Ethereum)", guarantee: "L1 settlement finality", detail: "Execution hashes are anchored to Ethereum mainnet, providing tamper-proof public verification of contract state." },
    { title: "Public Verification", api: "GET /verify/:hash", guarantee: "Zero-knowledge proof", detail: "Any third party can independently verify execution correctness by replaying events against the canonical contract core." },
];

/* ───────── TRUST BADGES ───────── */
const TRUST_BADGES = [
    { label: "VERIFIED", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", tooltip: "Contract state verified through deterministic replay" },
    { label: "REPLAY SAFE", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", tooltip: "Same inputs always produce the same execution output" },
    { label: "HASH MATCH", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", tooltip: "Recomputed hash matches stored canonical hash" },
    { label: "HUMAN REVIEWED", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", tooltip: "All AI annotations confirmed by human operator" },
    { label: "ANCHOR CONFIRMED", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", tooltip: "Execution proof immutably stored on blockchain" },
];

/* ───────── MOCK OBSERVABILITY DATA ───────── */
const generateSparkData = (count: number, min: number, max: number) =>
    Array.from({ length: count }, (_, i) => ({
        t: i,
        v: Math.floor(Math.random() * (max - min + 1) + min),
    }));

/* ───────── STATE MACHINE NODES ───────── */
const SM_NODES = ["PENDING", "ACTIVE", "LATE", "TERMINATED"];
const SM_EDGES = [
    { from: "PENDING", to: "ACTIVE", event: "PAYMENT_RECEIVED" },
    { from: "ACTIVE", to: "LATE", event: "DEADLINE_MISSED" },
    { from: "ACTIVE", to: "TERMINATED", event: "TERMINATION_NOTICE" },
    { from: "LATE", to: "ACTIVE", event: "LATE_PAYMENT" },
    { from: "LATE", to: "TERMINATED", event: "BREACH_FINAL" },
];

/* ───────── PAGE COMPONENT ───────── */
export default function Home() {
    const router = useRouter();
    const contracts = useContractStore((s) => s.contracts);

    /* Hydration Fix */
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    /* Pipeline ray animation state */

    const [activeNode, setActiveNode] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveNode((prev) => (prev + 1) % PIPELINE_NODES.length);
        }, 1200);
        return () => clearInterval(interval);
    }, []);

    /* Architecture expanded states */
    const [expandedArch, setExpandedArch] = useState<number | null>(null);

    /* Interactive demo */
    const [demoStep, setDemoStep] = useState(-1);
    const [demoHash, setDemoHash] = useState("");
    const demoSteps = ["Ingestion", "AI Annotation", "Human Review", "Typed Contract", "Rule Evaluation", "Execution", "Blockchain Anchor"];

    const runDemo = () => {
        setDemoStep(0);
        setDemoHash("");
        const advanceStep = (step: number) => {
            if (step >= demoSteps.length) {
                setDemoHash("0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(""));
                return;
            }
            setTimeout(() => {
                setDemoStep(step);
                advanceStep(step + 1);
            }, 700);
        };
        advanceStep(0);
    };

    /* Verify input */
    const [verifyHash, setVerifyHash] = useState("");

    /* State machine animation */
    const [smActive, setSmActive] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setSmActive((prev) => (prev + 1) % SM_NODES.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    /* Sparkline data */
    const [sparkData, setSparkData] = useState<any>({
        ai: [],
        engine: [],
        anchor: [],
        verify: [],
    });

    useEffect(() => {
        if (mounted) {
            setSparkData({
                ai: generateSparkData(20, 200, 450),
                engine: generateSparkData(20, 5, 25),
                anchor: generateSparkData(20, 8, 12),
                verify: generateSparkData(20, 15, 45),
            });
        }
    }, [mounted]);


    return (
        <div className="space-y-0">

            {/* ═══════ SECTION 1 — HERO PIPELINE ═══════ */}
            <section className="relative overflow-hidden py-16 md:py-24 -m-6 mb-0 px-6">
                {/* Gradient backdrop */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#030712] via-[#0a1628] to-[#0c0a1d]" />
                <div className="absolute inset-0 grid-bg opacity-40" />

                <div className="relative z-10 max-w-6xl mx-auto text-center space-y-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <p className="text-cyan-400 font-mono text-sm tracking-widest uppercase mb-3">Deterministic Legal Infrastructure</p>
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-200 to-purple-300 bg-clip-text text-transparent leading-tight">
                            PDF → Executable Contract<br />→ Verified Execution → Blockchain Proof
                        </h1>
                        <p className="text-slate-400 mt-6 text-lg max-w-2xl mx-auto">
                            Transform unstructured legal documents into deterministically executable smart contracts with cryptographic verification and Layer 1 settlement.
                        </p>
                    </motion.div>

                    {/* Pipeline visualization */}
                    <div className="relative mt-12 pt-4">
                        {/* Connecting line */}
                        <div className="absolute top-1/2 left-6 right-6 h-[2px] bg-gradient-to-r from-cyan-500/20 via-cyan-500/40 to-purple-500/20 -translate-y-1/2 rounded-full hidden md:block" />

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 relative z-10">
                            {PIPELINE_NODES.map((node, idx) => {
                                const Icon = node.icon;
                                const isActive = idx === activeNode;
                                return (
                                    <motion.div
                                        key={node.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.08, duration: 0.4 }}
                                        className="flex flex-col items-center gap-3 group"
                                    >
                                        <div
                                            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 border ${isActive
                                                    ? "scale-110 shadow-lg shadow-cyan-500/30 border-cyan-400/60"
                                                    : "border-slate-700/50 hover:border-slate-600"
                                                }`}
                                            style={{
                                                background: isActive
                                                    ? `${node.color}22`
                                                    : "rgba(15,23,42,0.7)",
                                                boxShadow: isActive
                                                    ? `0 0 24px 4px ${node.color}33`
                                                    : "none",
                                            }}
                                        >
                                            <Icon
                                                className="w-6 h-6 transition-colors duration-300"
                                                style={{ color: isActive ? node.color : "#64748b" }}
                                            />
                                        </div>
                                        <span className={`text-[11px] font-semibold text-center transition-colors ${isActive ? "text-white" : "text-slate-500"}`}>
                                            {node.label}
                                        </span>
                                        {/* Tooltip */}
                                        <AnimatePresence>
                                            {isActive && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                                    className="absolute top-[88px] max-w-[180px] bg-slate-900/95 backdrop-blur border border-slate-700/50 rounded-lg px-3 py-2 text-[10px] text-slate-300 text-center shadow-xl pointer-events-none"
                                                >
                                                    {node.desc}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-center gap-4 pt-4">
                        <Button size="lg" onClick={() => router.push("/contracts/new")} className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-600/20">
                            <Plus className="mr-2 h-5 w-5" /> New Contract Ingestion
                        </Button>
                        <Button size="lg" variant="outline" onClick={() => router.push("/contracts")} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                            <Eye className="mr-2 h-5 w-5" /> View Contracts
                        </Button>
                    </div>
                </div>
            </section>

            {/* ═══════ SECTION 1.5 — COMPACT PIPELINE DIAGRAM ═══════ */}
            <section className="max-w-6xl mx-auto py-12 px-4">
                <div className="text-center mb-8">
                    <p className="text-cyan-400 font-mono text-xs tracking-widest uppercase">System Pipeline</p>
                    <h2 className="text-xl md:text-2xl font-bold mt-2">Contract Lifecycle Architecture</h2>
                    <p className="text-slate-400 text-sm mt-1">From raw document to immutable blockchain proof — every step is deterministic and verifiable.</p>
                </div>

                <div className="relative glass-panel p-6 md:p-8 overflow-hidden">
                    {/* Background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/20 via-transparent to-purple-950/20 pointer-events-none" />

                    {/* Pipeline stages */}
                    <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                        {[
                            { icon: FileText, title: "PDF Upload", desc: "Ingest documents", color: "#f97316" },
                            { icon: Brain, title: "AI Extraction", desc: "LLM clause parsing", color: "#a78bfa" },
                            { icon: UserCheck, title: "Human Review", desc: "Expert validation", color: "#fbbf24" },
                            { icon: Database, title: "Typed Contract", desc: "Schema-validated", color: "#3b82f6" },
                            { icon: ShieldCheck, title: "Compliance", desc: "Rule evaluation", color: "#10b981" },
                            { icon: Play, title: "Execution FSM", desc: "State transitions", color: "#06b6d4" },
                            { icon: Lock, title: "Security", desc: "Attack testing", color: "#ef4444" },
                            { icon: Link2, title: "Blockchain", desc: "L1 anchor proof", color: "#8b5cf6" },
                        ].map((stage, idx, arr) => {
                            const StageIcon = stage.icon;
                            return (
                                <motion.div
                                    key={stage.title}
                                    initial={{ opacity: 0, y: 12 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.06 }}
                                    className="relative flex flex-col items-center text-center group"
                                >
                                    {/* Connector arrow (not on first item) */}
                                    {idx > 0 && (
                                        <div className="absolute -left-2 top-5 w-4 text-center hidden lg:block">
                                            <ArrowRight className="w-3 h-3 text-slate-600" />
                                        </div>
                                    )}
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 border border-slate-700/50 transition-all duration-300 group-hover:scale-110"
                                        style={{
                                            background: `${stage.color}15`,
                                            borderColor: `${stage.color}30`,
                                        }}
                                    >
                                        <StageIcon className="w-5 h-5" style={{ color: stage.color }} />
                                    </div>
                                    <span className="text-[11px] font-semibold text-slate-200 leading-tight">{stage.title}</span>
                                    <span className="text-[9px] text-slate-500 mt-0.5 leading-tight">{stage.desc}</span>

                                    {/* Step number */}
                                    <div
                                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold border"
                                        style={{
                                            backgroundColor: `${stage.color}20`,
                                            borderColor: `${stage.color}40`,
                                            color: stage.color,
                                        }}
                                    >
                                        {idx + 1}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Connecting line behind stages */}
                    <div className="absolute top-1/2 left-8 right-8 h-[1px] bg-gradient-to-r from-orange-500/20 via-cyan-500/30 to-purple-500/20 -translate-y-1/2 hidden lg:block z-0" />
                </div>
            </section>

            {/* ═══════ SECTION 2 — ARCHITECTURE EXPLAINER ═══════ */}
            <section className="max-w-5xl mx-auto py-16 space-y-6">
                <div className="text-center mb-8">
                    <p className="text-cyan-400 font-mono text-xs tracking-widest uppercase">System Architecture</p>
                    <h2 className="text-2xl md:text-3xl font-bold mt-2">End-to-End Pipeline</h2>
                    <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">Click any stage to inspect APIs, guarantees, and implementation details.</p>
                </div>

                <div className="relative">
                    {/* Vertical connecting line */}
                    <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-gradient-to-b from-cyan-500/30 via-blue-500/20 to-purple-500/30 hidden md:block" />

                    <div className="space-y-3">
                        {ARCH_STEPS.map((step, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.04 }}
                            >
                                <div
                                    className={`md:ml-14 glass-panel p-4 cursor-pointer transition-all hover:border-cyan-800/50 ${expandedArch === idx ? "border-cyan-700/50 bg-cyan-950/10" : ""}`}
                                    onClick={() => setExpandedArch(expandedArch === idx ? null : idx)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <span className="text-cyan-500 font-mono text-xs font-bold w-6">{String(idx + 1).padStart(2, "0")}</span>
                                            <span className="font-semibold text-sm">{step.title}</span>
                                        </div>
                                        {expandedArch === idx ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                    </div>
                                    <AnimatePresence>
                                        {expandedArch === idx && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-3 pt-3 border-t border-slate-800 text-sm text-slate-400 space-y-2">
                                                    <p>{step.detail}</p>
                                                    <div className="flex flex-wrap gap-3 text-xs">
                                                        <span className="font-mono bg-slate-800/60 px-2 py-0.5 rounded text-cyan-400">{step.api}</span>
                                                        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-medium">{step.guarantee}</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ SECTION 3 — TRUST INDICATORS ═══════ */}
            <section className="max-w-5xl mx-auto py-12">
                <div className="flex flex-wrap justify-center gap-3">
                    {TRUST_BADGES.map((badge) => (
                        <div key={badge.label} className="group relative">
                            <div className={`px-4 py-2 rounded-lg border font-mono text-xs font-bold tracking-wider ${badge.bg} ${badge.color} cursor-default transition-all hover:scale-105`}>
                                {badge.label}
                            </div>
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-[10px] text-slate-300 px-3 py-1.5 rounded-md whitespace-nowrap shadow-xl z-20 pointer-events-none">
                                {badge.tooltip}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════ SECTION 4 — INTERACTIVE DEMO ═══════ */}
            <section className="max-w-4xl mx-auto py-12">
                <div className="text-center mb-6">
                    <p className="text-cyan-400 font-mono text-xs tracking-widest uppercase">Interactive Demo</p>
                    <h2 className="text-2xl font-bold mt-2">Watch the Pipeline Execute</h2>
                </div>
                <Card className="glass-panel overflow-hidden">
                    <CardContent className="p-6 space-y-6">
                        <Button onClick={runDemo} disabled={demoStep >= 0 && demoStep < demoSteps.length} className="bg-cyan-600 hover:bg-cyan-700">
                            <Play className="mr-2 h-4 w-4" /> Run Pipeline Demo
                        </Button>
                        <div className="space-y-2">
                            {demoSteps.map((step, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${demoStep > idx ? "bg-emerald-500 text-white" : demoStep === idx ? "bg-cyan-500 text-white animate-pulse" : "bg-slate-800 text-slate-500"
                                        }`}>
                                        {demoStep > idx ? "✓" : idx + 1}
                                    </div>
                                    <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${demoStep > idx ? "bg-emerald-500 w-full" : demoStep === idx ? "bg-cyan-500 w-2/3 animate-pulse" : "w-0"
                                                }`}
                                        />
                                    </div>
                                    <span className={`text-xs font-medium w-32 ${demoStep >= idx ? "text-white" : "text-slate-600"}`}>{step}</span>
                                </div>
                            ))}
                        </div>
                        {demoHash && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                                <p className="text-xs text-emerald-400 font-mono">EXECUTION HASH GENERATED</p>
                                <p className="text-sm font-mono text-emerald-300 mt-1">{demoHash}</p>
                            </motion.div>
                        )}
                    </CardContent>
                </Card>
            </section>

            {/* ═══════ SECTION 5 — CONTRACT LIST + SECTION 6 — DETERMINISM ═══════ */}
            <section className="max-w-6xl mx-auto py-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Contracts */}
                <Card className="glass-panel flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Contracts</CardTitle>
                        <CardDescription>Recently ingested semantic contracts.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        {contracts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg border-slate-800">
                                No contracts ingested yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {contracts.map((contract) => (
                                    <div key={contract.id} className="group flex items-center justify-between p-3 rounded-lg border border-slate-800 hover:border-cyan-800/50 transition-colors cursor-pointer" onClick={() => router.push(`/contracts/${contract.id}/core`)}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold truncate text-sm">{contract.title}</h4>
                                                <StatusBadge status={contract.status as any} />
                                            </div>
                                            <HashBadge hash={contract.hash} truncateLength={6} />
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Determinism Dashboard */}
                <Card className="glass-panel">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-cyan-500" /> Determinism Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-center">
                            <div className="relative w-32 h-32">
                                {mounted ? (
                                    <>
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                            <circle cx="60" cy="60" r="50" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                                            <circle cx="60" cy="60" r="50" stroke="currentColor" strokeWidth="8" fill="transparent"
                                                strokeDasharray={2 * Math.PI * 50}
                                                strokeDashoffset={2 * Math.PI * 50 * (1 - 0.94)}
                                                className="text-cyan-500 transition-all duration-1000" strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-3xl font-bold">94</span>
                                            <span className="text-[10px] text-slate-400 uppercase">Score</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full rounded-full border-8 border-slate-800" />
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Exec Hash</p>
                                <p className="font-mono text-xs text-cyan-400 mt-1">0x8fa4...c9d0</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Replay</p>
                                <p className="text-xs text-emerald-400 font-bold mt-1">VERIFIED</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Blockchain</p>
                                <p className="text-xs text-blue-400 font-bold mt-1">ANCHORED</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Engine</p>
                                <p className="text-xs text-emerald-400 font-bold mt-1">HEALTHY</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* ═══════ SECTION 7 — STATE MACHINE + SECTION 8 — CLAUSE DIFF ═══════ */}
            <section className="max-w-6xl mx-auto py-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* State Machine */}
                <Card className="glass-panel">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-purple-400" /> State Machine</CardTitle>
                        <CardDescription>Execution engine finite state transitions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap justify-center gap-4 mb-6">
                            {SM_NODES.map((node, idx) => (
                                <div key={node} className={`px-4 py-2 rounded-lg border text-xs font-bold font-mono transition-all duration-500 ${smActive === idx
                                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-lg shadow-cyan-500/20 scale-110"
                                        : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                                    }`}>
                                    {node}
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2">
                            {SM_EDGES.map((edge, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                                    <span className="text-slate-400">{edge.from}</span>
                                    <ArrowRight className="w-3 h-3 text-cyan-600" />
                                    <span className="text-slate-400">{edge.to}</span>
                                    <span className="ml-auto bg-slate-800/60 px-2 py-0.5 rounded text-[10px] text-cyan-400">{edge.event}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Clause Diff Preview */}
                <Card className="glass-panel">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-orange-400" /> Clause Diff</CardTitle>
                        <CardDescription>Side-by-side contract version comparison.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Old Contract</p>
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-800 font-mono text-xs leading-relaxed space-y-1">
                                    <p>Tenant shall pay rent of <span className="bg-red-500/20 text-red-400 px-1 rounded line-through">$4,500</span> monthly.</p>
                                    <p>Payment due on <span className="bg-red-500/20 text-red-400 px-1 rounded line-through">the 5th</span> of each month.</p>
                                    <p className="text-slate-500">Late penalty: standard rate.</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">New Contract</p>
                                <div className="bg-slate-900 rounded-lg p-3 border border-slate-800 font-mono text-xs leading-relaxed space-y-1">
                                    <p>Tenant shall pay rent of <span className="bg-emerald-500/20 text-emerald-400 px-1 rounded">$5,000</span> monthly.</p>
                                    <p>Payment due on <span className="bg-emerald-500/20 text-emerald-400 px-1 rounded">the 1st</span> of each month.</p>
                                    <p className="text-slate-500">Late penalty: standard rate.</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 text-center font-medium">
                            2 modifications detected • Financial impact: +$500/month
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* ═══════ SECTION 9 — OBSERVABILITY ═══════ */}
            <section className="max-w-6xl mx-auto py-12">
                <div className="text-center mb-6">
                    <p className="text-cyan-400 font-mono text-xs tracking-widest uppercase">System Telemetry</p>
                    <h2 className="text-2xl font-bold mt-2">Observability</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: "AI Pipeline", value: "324ms", icon: Cpu, color: "#a78bfa", data: sparkData.ai },
                        { label: "Engine Exec", value: "14ms", icon: Zap, color: "#fbbf24", data: sparkData.engine },
                        { label: "Block Anchor", value: "10.2s", icon: Link2, color: "#3b82f6", data: sparkData.anchor },
                        { label: "Replay Verify", value: "28ms", icon: ShieldCheck, color: "#22c55e", data: sparkData.verify },
                    ].map((metric) => {
                        const Icon = metric.icon;
                        return (
                            <Card key={metric.label} className="glass-panel">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400 font-medium">{metric.label}</span>
                                        <Icon className="w-4 h-4" style={{ color: metric.color }} />
                                    </div>
                                    <div className="text-2xl font-bold">{metric.value}</div>
                                    <div className="h-12">
                                        {mounted && metric.data.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={metric.data}>
                                                    <defs>
                                                        <linearGradient id={`grad-${metric.label}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={metric.color} stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <Area type="monotone" dataKey="v" stroke={metric.color} strokeWidth={1.5} fill={`url(#grad-${metric.label})`} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="w-full h-full bg-slate-800/20 animate-pulse rounded" />
                                        )}
                                    </div>

                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </section>

            {/* ═══════ SECTION 10 — PUBLIC VERIFICATION CTA ═══════ */}
            <section className="max-w-4xl mx-auto py-16">
                <Card className="glass-panel overflow-hidden border-cyan-900/30">
                    <CardContent className="p-8 text-center space-y-6">
                        <ShieldCheck className="w-12 h-12 text-cyan-500 mx-auto" />
                        <h2 className="text-2xl font-bold">Public Execution Verification</h2>
                        <p className="text-sm text-slate-400 max-w-lg mx-auto">
                            Enter any execution hash to independently verify state integrity, blockchain anchor, and replay determinism.
                        </p>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (verifyHash.length >= 10) router.push(`/verify/${verifyHash}`);
                            }}
                            className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
                        >
                            <input
                                type="text"
                                placeholder="0x4abc123..."
                                className="flex-1 px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none transition-all"
                                value={verifyHash}
                                onChange={(e) => setVerifyHash(e.target.value)}
                            />
                            <Button type="submit" disabled={verifyHash.length < 10} className="bg-cyan-600 hover:bg-cyan-700 px-6">
                                <Search className="mr-2 h-4 w-4" /> Verify
                            </Button>
                        </form>
                        <div className="flex justify-center gap-3 pt-2">
                            {["HASH MATCH", "REPLAY VERIFIED", "ANCHOR CONFIRMED"].map((label) => (
                                <span key={label} className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                    {label}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
