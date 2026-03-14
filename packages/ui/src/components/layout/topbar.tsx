"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Copy, Check, User } from "lucide-react";
import { useContractStore } from "@/lib/stores";
import React, { useState, useEffect } from "react";

export function Topbar() {
    const { active } = useContractStore();
    const { theme, setTheme } = useTheme();
    const [copied, setCopied] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);


    const copyHash = () => {
        if (!active?.hash) return;
        navigator.clipboard.writeText(active.hash);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const stateColor = (state: string) => {
        switch (state) {
            case "ACTIVE": return "badge-success";
            case "DRAFT": return "badge-warning";
            case "TERMINATED": return "badge-danger";
            default: return "badge-info";
        }
    };

    return (
        <header className="h-16 border-b border-[hsl(var(--border))] bg-[var(--bg-secondary)]/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-20">
            {/* Left: Active contract info */}
            <div className="flex items-center gap-4">
                {active ? (
                    <>
                        <span className="font-semibold text-sm text-[var(--text-primary)]">{active.name || active.title}</span>
                        <span className={stateColor(active.state || active.status || "DRAFT")}>{active.state || active.status || "DRAFT"}</span>
                        <button
                            onClick={copyHash}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-primary)] border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)] hover:border-[var(--brand)]/50 transition-colors"
                        >
                            {active.hash.substring(0, 12)}…
                            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                    </>
                ) : (
                    <span className="text-sm text-[var(--text-muted)]">No contract selected</span>
                )}
            </div>

            {/* Right: Theme toggle + Avatar */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="p-2 rounded-lg hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] transition-colors"
                >
                    {mounted ? (
                        theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
                    ) : (
                        <div className="w-4 h-4" />
                    )}
                </button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">

                    <User className="w-4 h-4 text-white" />
                </div>
            </div>
        </header>
    );
}
