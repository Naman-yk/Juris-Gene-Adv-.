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
    loadDemoContracts: () => Promise<void>;
}

import { persist } from "zustand/middleware";

const FALLBACK_CONTRACTS: ContractSummary[] = [
    {
        id: 'jg-001',
        title: 'SaaS License Agreement',
        parties: 'TechStart Inc. ↔ Acme Corporation',
        partyA: 'TechStart Inc.',
        partyB: 'Acme Corporation',
        status: 'ACTIVE',
        hash: '0x716e1bc38f426dff03447f56cba26f89e9933262272df917e97fcc7553215510',
        updatedAt: '2025-06-01',
        content: 'This Software Licensing Agreement is entered into by Acme Corporation ("Licensor") and TechStart Inc. ("Licensee"). Payment shall be due within 30 calendar days.',
        pages: 1,
    },
    {
        id: 'jg-002',
        title: 'Data Processing Agreement',
        parties: 'CloudVault Ltd. ↔ DataFlow GmbH',
        status: 'DRAFT',
        hash: '0xc4d2b8e1f09a3b7c5d6e8f1a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9',
        updatedAt: '2025-05-28',
        content: 'This Data Processing Agreement governs the processing of personal data by the Processor on behalf of the Controller pursuant to GDPR Article 28.',
    },
    {
        id: 'jg-003',
        title: 'Commercial Supply Contract',
        parties: 'ACME Corporation ↔ Globex Industries',
        status: 'ACTIVE',
        hash: '0xf1e9d7c5a3b1e8d6c4b2a0f9e7d5c3b1a9f8e6d4c2b0a8f7e5d3c1b9a8f6e4d2',
        updatedAt: '2025-06-02',
        content: 'This Commercial Supply Agreement is made between ACME Corporation ("Buyer") and Globex Industries ("Seller"). Payment within 30 days of delivery.',
    },
];

export const useContractStore = create<ContractState>()(
    persist(
        (set, get) => ({
            active: null,
            contracts: [],
            setActive: (c) => set({ active: c }),
            setContracts: (c) => set({ contracts: c }),
            loadDemoContracts: async () => {
                try {
                    const { fetchContracts } = await import('@/lib/api');
                    const data = await fetchContracts();
                    set({ contracts: data });
                    return;
                } catch {
                    // Backend not available
                }
                
                // Fallback only if we have absolutely nothing
                if (get().contracts.length === 0) {
                    set({ contracts: FALLBACK_CONTRACTS });
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
