"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useContractStore } from "@/lib/stores";

/**
 * Invisible component that auto-loads demo contracts
 * into the zustand store on first mount, and ensures
 * the active contract matches the URL path.
 */
export function ContractLoader() {
    const pathname = usePathname();
    const loadDemoContracts = useContractStore((s) => s.loadDemoContracts);
    const contracts = useContractStore((s) => s.contracts);
    const setActive = useContractStore((s) => s.setActive);

    // Initial load
    useEffect(() => {
        loadDemoContracts();
    }, [loadDemoContracts]);

    // Track active contract based on URL
    useEffect(() => {
        if (!pathname || contracts.length === 0) return;
        
        // Extract ID from paths like `/contracts/jg-001/core`
        const match = pathname.match(/\/contracts\/([^/]+)/);
        if (match && match[1] && match[1] !== "new" && match[1] !== "diff") {
            const found = contracts.find((c) => c.id === match[1]);
            if (found) {
                setActive(found);
            }
        } else {
            setActive(null);
        }
    }, [pathname, contracts, setActive]);

    return null;
}
