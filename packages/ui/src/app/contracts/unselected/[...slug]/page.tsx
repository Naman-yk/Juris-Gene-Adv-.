"use client";

import { usePathname } from 'next/navigation';
import { FileSearch, ShieldCheck, Play, Bug, Link2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

/* Module-specific empty state messages */
const MODULE_MESSAGES: Record<string, { title: string; message: string; icon: any; hint?: string; hintHref?: string }> = {
    compliance: {
        title: "Compliance Engine",
        message: "Select a contract to run compliance evaluation.",
        icon: ShieldCheck,
    },
    execution: {
        title: "Execution Engine",
        message: "Select a contract to use the execution engine.",
        icon: Play,
        hint: "Run the compliance engine before executing the contract.",
    },
    simulate: {
        title: "Attack Simulator",
        message: "Select a contract to run attack simulations.",
        icon: Bug,
        hint: "Run the execution engine to enable attack simulation.",
    },
    blockchain: {
        title: "Blockchain Anchor",
        message: "Select a contract to anchor to blockchain.",
        icon: Link2,
        hint: "Generate a state hash before anchoring to blockchain.",
    },
    graph: {
        title: "Knowledge Graph",
        message: "Select a contract to view its knowledge graph.",
        icon: FileSearch,
    },
    determinism: {
        title: "Determinism Score",
        message: "Select a contract to evaluate determinism.",
        icon: FileSearch,
    },
    "state-machine": {
        title: "State Machine",
        message: "Select a contract to view its state machine.",
        icon: FileSearch,
    },
    audit: {
        title: "Audit Trail",
        message: "Select a contract to view its audit trail.",
        icon: FileSearch,
    },
    verify: {
        title: "Public Verify",
        message: "Select a contract to verify its execution.",
        icon: FileSearch,
    },
    diff: {
        title: "Contract Diff",
        message: "Select a contract to compare its versions.",
        icon: FileSearch,
    },
};

export default function UnselectedCatchAllPage() {
    const router = useRouter();
    const pathname = usePathname();

    // Extract module name from path: /contracts/unselected/compliance → compliance
    const segments = pathname.split('/').filter(Boolean);
    const moduleSlug = segments[segments.length - 1] || '';
    const moduleInfo = MODULE_MESSAGES[moduleSlug];

    const Icon = moduleInfo?.icon || FileSearch;
    const title = moduleInfo?.title || "Module";
    const message = moduleInfo?.message || "Select a contract to use this module.";
    const hint = moduleInfo?.hint;

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[70vh]">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="bg-slate-900/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto border border-slate-800">
                    <Icon className="w-10 h-10 text-slate-500" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold">{title}</h2>
                    <p className="text-slate-400">{message}</p>
                </div>

                {hint && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400 flex items-center gap-2 justify-center">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>{hint}</span>
                    </div>
                )}

                <div className="pt-4 border-t border-slate-800">
                    <Button
                        onClick={() => router.push('/contracts')}
                        className="bg-cyan-600 hover:bg-cyan-700 w-full"
                    >
                        Browse Contracts
                        <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
