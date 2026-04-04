"use client";

import { create } from "zustand";

/* ─── Contract Store ─── */

export interface ContractSummary {
    id: string;
    title: string;
    name?: string; 
    parties: string;
    partyA?: string;
    partyB?: string;
    status: string;
    state?: string;
    hash: string;
    updatedAt: string;
    content?: string; 
    pages?: number;
    clauses?: any[];
}

interface ContractState {
    active: ContractSummary | null;
    contracts: ContractSummary[];
    setActive: (c: ContractSummary | null) => void;
    setContracts: (c: ContractSummary[]) => void;
    addContract: (c: ContractSummary) => void;
    loadDemoContracts: () => Promise<void>;
}

import { persist } from "zustand/middleware";

export const useContractStore = create<ContractState>()(
    persist(
        (set, get) => ({
            active: null,
            contracts: [],
            setActive: (c) => set({ active: c }),
            setContracts: (c) => set({ contracts: c }),
            addContract: (c: ContractSummary) => {
                const existing = get().contracts;
                // Don't add duplicates
                if (existing.find(e => e.id === c.id)) return;
                set({ contracts: [...existing, c] });
            },
            loadDemoContracts: async () => {
                try {
                    const { fetchContracts } = await import('@/lib/api');
                    const data = await fetchContracts();
                    // Merge: keep any uploaded contracts that aren't in the fetched list
                    const existing = get().contracts;
                    const fetchedIds = new Set(data.map((d: ContractSummary) => d.id));
                    const uploadedContracts = existing.filter(c => !fetchedIds.has(c.id));
                    set({ contracts: [...data, ...uploadedContracts] });
                } catch (err) {
                    console.error('[stores] Failed to load contracts from backend:', err);
                }
            },
        }),
        { name: "jurisgenie-contract-store" }
    )
);


/* ─── UI Store ─── */

interface UIState {
    sidebarOpen: boolean;
    toggleSidebar: () => void;
    theme: "light" | "dark";
    setTheme: (t: "light" | "dark") => void;
}

export const useUIStore = create<UIState>((set) => ({
    sidebarOpen: true,
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    theme: "dark",
    setTheme: (t) => set({ theme: t }),
}));
