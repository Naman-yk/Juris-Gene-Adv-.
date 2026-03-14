"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard, FileText, ShieldCheck, Play, Link2, ClipboardList, Settings, Scale, ChevronLeft, ChevronRight, CheckCircle2, Workflow, Network, Split, Activity, Bug, LineChart, AlertTriangle, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores";

/* ─── Lifecycle phase colors ─── */
const LIFECYCLE_PHASES: Record<string, { phase: string; color: string }> = {
    "CORE": { phase: "INGESTION", color: "#f97316" },
    "CONTRACT ANALYSIS": { phase: "UNDERSTANDING", color: "#a78bfa" },
    "VALIDATION": { phase: "VALIDATION", color: "#10b981" },
    "EXECUTION": { phase: "EXECUTION", color: "#06b6d4" },
    "SECURITY": { phase: "SECURITY", color: "#ef4444" },
    "VERIFICATION": { phase: "VERIFICATION", color: "#8b5cf6" },
    "INFRASTRUCTURE": { phase: "MONITORING", color: "#64748b" },
    "LEGACY": { phase: "LEGACY", color: "#475569" },
};

/* ─── Types ─── */
type NavItem = {
    label: string;
    icon: any;
    baseHref: string;
    requiresContract?: boolean;
    alwaysAccessible?: boolean;
    lifecycleGate?: {
        requires: string;
        message: string;
    };
};

type NavGroup = {
    groupLabel: string;
    items: NavItem[];
};

/* ─── Navigation Groups ─── */
const navGroups: NavGroup[] = [
    {
        groupLabel: "CORE",
        items: [
            { label: "Dashboard", icon: LayoutDashboard, baseHref: "/", alwaysAccessible: true },
            { label: "Contracts", icon: FileText, baseHref: "/contracts", alwaysAccessible: true },
        ]
    },
    {
        groupLabel: "CONTRACT ANALYSIS",
        items: [
            { label: "Contract Diff", icon: Split, baseHref: "/diff", requiresContract: true },
            { label: "Knowledge Graph", icon: Network, baseHref: "/graph", requiresContract: true },
        ]
    },
    {
        groupLabel: "VALIDATION",
        items: [
            { label: "Compliance", icon: ShieldCheck, baseHref: "/compliance", requiresContract: true },
            { label: "Determinism Score", icon: Activity, baseHref: "/determinism", requiresContract: true },
        ]
    },
    {
        groupLabel: "EXECUTION",
        items: [
            { label: "Execution", icon: Play, baseHref: "/execution", requiresContract: true },
            { label: "State Machine", icon: Workflow, baseHref: "/state-machine", requiresContract: true },
        ]
    },
    {
        groupLabel: "SECURITY",
        items: [
            { label: "Attack Simulator", icon: Bug, baseHref: "/simulate", requiresContract: true },
            { label: "Audit", icon: ClipboardList, baseHref: "/audit", requiresContract: true },
        ]
    },
    {
        groupLabel: "VERIFICATION",
        items: [
            { label: "Public Verify", icon: CheckCircle2, baseHref: "/verify", alwaysAccessible: true },
            { label: "Blockchain", icon: Link2, baseHref: "/blockchain", requiresContract: true },
        ]
    },
    {
        groupLabel: "INFRASTRUCTURE",
        items: [
            { label: "System Metrics", icon: LineChart, baseHref: "/system/metrics", alwaysAccessible: true },
            { label: "Settings", icon: Settings, baseHref: "/settings", alwaysAccessible: true },
        ]
    },
    {
        groupLabel: "LEGACY",
        items: [
            { label: "Classic Model", icon: LayoutDashboard, baseHref: "/classic-model", alwaysAccessible: true },
        ]
    }
];

export function Sidebar() {
    const pathname = usePathname();
    const { sidebarOpen, toggleSidebar } = useUIStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <aside className="w-[72px] h-screen border-r border-[hsl(var(--border))] bg-[var(--bg-secondary)]/80 backdrop-blur-xl z-30" />;
    }

    // Extract active contract ID
    const contractMatch = pathname.match(/^\/contracts\/([^\/]+)/);
    let activeContractId = contractMatch ? contractMatch[1] : null;
    if (activeContractId === 'new' || activeContractId === 'diff' || activeContractId === 'unselected') {
        activeContractId = null;
    }

    return (
        <motion.aside
            initial={false}
            animate={{ width: sidebarOpen ? 260 : 72 }}
            className="h-screen sticky top-0 flex flex-col border-r border-[hsl(var(--border))] bg-[var(--bg-secondary)]/80 backdrop-blur-xl z-30"
        >
            {/* Logo */}
            <div className="flex items-center h-16 px-4 border-b border-[hsl(var(--border))]">
                <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-900/30">
                        <Scale className="w-4 h-4 text-white" />
                    </div>
                    {sidebarOpen && (
                        <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="font-bold text-sm whitespace-nowrap text-[var(--text-primary)]"
                        >
                            JurisGenie
                        </motion.span>
                    )}
                </div>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 py-2 px-2.5 overflow-y-auto sidebar-scrollbar">
                {navGroups.map((group, groupIdx) => {
                    const lifecycle = LIFECYCLE_PHASES[group.groupLabel];
                    return (
                        <div key={group.groupLabel}>
                            {/* Separator between groups */}
                            {groupIdx > 0 && (
                                <div className="mx-2 my-2">
                                    <div
                                        className="h-[1px] rounded-full"
                                        style={{
                                            background: `linear-gradient(90deg, transparent, ${lifecycle?.color || '#334155'}33, transparent)`
                                        }}
                                    />
                                </div>
                            )}

                            <div className="space-y-0.5">
                                {/* Group label with lifecycle phase */}
                                {sidebarOpen ? (
                                    <div className="px-3 py-1.5 mt-1 flex items-center gap-2">
                                        <div
                                            className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm"
                                            style={{
                                                backgroundColor: lifecycle?.color || '#475569',
                                                boxShadow: `0 0 6px ${lifecycle?.color || '#475569'}50`
                                            }}
                                        />
                                        <span className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
                                            {group.groupLabel}
                                        </span>
                                        <span
                                            className="text-[8px] font-semibold tracking-widest uppercase ml-auto opacity-50"
                                            style={{ color: lifecycle?.color || '#475569' }}
                                        >
                                            {lifecycle?.phase}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex justify-center py-1.5 mt-1">
                                        <div
                                            className="w-1.5 h-1.5 rounded-full"
                                            style={{
                                                backgroundColor: lifecycle?.color || '#475569',
                                                boxShadow: `0 0 6px ${lifecycle?.color || '#475569'}50`
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Nav items */}
                                {group.items.map((item) => {
                                    // Resolve the actual href
                                    let href = item.baseHref;
                                    const needsContract = item.requiresContract && !item.alwaysAccessible;

                                    if (needsContract) {
                                        if (activeContractId) {
                                            href = `/contracts/${activeContractId}${item.baseHref}`;
                                        } else {
                                            href = `/contracts/unselected${item.baseHref}`;
                                        }
                                    }

                                    const isActive = pathname === href || (item.baseHref !== "/" && pathname.startsWith(href));
                                    const isContextMissing = needsContract && !activeContractId;
                                    const hasLifecycleGate = !!item.lifecycleGate;

                                    return (
                                        <Link
                                            key={item.label}
                                            href={href}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                                                isActive
                                                    ? "bg-[var(--brand)]/10 text-[var(--brand)]"
                                                    : isContextMissing
                                                        ? "text-[var(--text-muted)] hover:bg-[var(--bg-primary)]/50 hover:text-[var(--text-secondary)]"
                                                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                                            )}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="sidebar-active"
                                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--brand)] rounded-full"
                                                />
                                            )}
                                            <item.icon className={cn(
                                                "w-[18px] h-[18px] shrink-0",
                                                isContextMissing && "opacity-50"
                                            )} />
                                            {sidebarOpen && (
                                                <motion.span
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="whitespace-nowrap flex-1 text-[13px]"
                                                >
                                                    {item.label}
                                                </motion.span>
                                            )}

                                            {/* Context-dependent indicator */}
                                            {sidebarOpen && isContextMissing && !hasLifecycleGate && (
                                                <Lock className="w-3 h-3 text-[var(--text-muted)] opacity-40 shrink-0" />
                                            )}

                                            {/* Lifecycle gate indicator */}
                                            {sidebarOpen && hasLifecycleGate && (
                                                <div className="relative group/gate">
                                                    <AlertTriangle className="w-3 h-3 text-amber-500/60 shrink-0" />
                                                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/gate:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-[10px] text-slate-300 px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-xl z-50 pointer-events-none">
                                                        {item.lifecycleGate!.message}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Tooltip for collapsed mode */}
                                            {!sidebarOpen && (
                                                <div className="absolute left-full ml-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-[11px] text-slate-200 px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-xl z-50 pointer-events-none font-medium">
                                                    {item.label}
                                                    {isContextMissing && (
                                                        <span className="block text-[9px] text-slate-400 mt-0.5">Select a contract</span>
                                                    )}
                                                </div>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Lifecycle flow indicator */}
            {sidebarOpen && (
                <div className="px-3 py-2 border-t border-[hsl(var(--border))]">
                    <div className="flex items-center gap-1 overflow-hidden">
                        {Object.entries(LIFECYCLE_PHASES).slice(0, 6).map(([, val], idx, arr) => (
                            <div key={val.phase} className="flex items-center gap-1">
                                <span
                                    className="text-[7px] font-bold tracking-wider uppercase whitespace-nowrap"
                                    style={{ color: val.color }}
                                >
                                    {val.phase.slice(0, 3)}
                                </span>
                                {idx < arr.length - 1 && (
                                    <span className="text-[8px] text-slate-600">→</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Collapse Button */}
            <div className="p-2.5 border-t border-[hsl(var(--border))]">
                <button
                    onClick={toggleSidebar}
                    className="w-full flex items-center justify-center py-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-primary)] transition-colors"
                >
                    {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
            </div>
        </motion.aside>
    );
}
