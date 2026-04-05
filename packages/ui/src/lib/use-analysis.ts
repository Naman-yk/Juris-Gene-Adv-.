/**
 * ─── useAnalysis Hook ───
 * 
 * Client-side hook that fetches the Gemini-extracted analysis for a contract.
 * Returns the structured analysis data, loading state, and error.
 * 
 * For the demo case (jg-demo-138), returns null so pages can use hardcoded data.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { isDemoCase } from './demo-data';
import { useContractStore } from './stores';

export interface AnalysisEntity {
    id: number;
    type: string;
    confidence: number;
    text: string;
}

export interface GraphNode {
    id: string;
    name: string;
    group: string;
    val: number;
}

export interface GraphEdge {
    source: string;
    target: string;
    label: string;
}

export interface ComplianceRule {
    id: string;
    rule: string;
    description: string;
    status: 'PASS' | 'FAIL' | 'REVIEW';
    explanation: string;
}

export interface StateNode {
    id: string;
    state: string;
    isActive: boolean;
    position: { x: number; y: number };
}

export interface StateTransition {
    id: string;
    source: string;
    target: string;
    label: string;
    event: string;
    rule: string;
    isBackwards?: boolean;
}

export interface ScoreDeduction {
    id: string;
    category: string;
    description: string;
    points: number;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DiffClause {
    id: string;
    text: string;
    status: 'original' | 'added' | 'removed' | 'modified';
}

export interface DocumentAnalysis {
    entities: AnalysisEntity[];
    graph: {
        nodes: GraphNode[];
        edges: GraphEdge[];
        positions: Record<string, { x: number; y: number }>;
    };
    compliance: {
        rules: ComplianceRule[];
        additionalFindings: ComplianceRule[];
    };
    states: {
        nodes: StateNode[];
        transitions: StateTransition[];
    };
    determinism: {
        score: number;
        deductions: ScoreDeduction[];
    };
    diff: {
        versionA: { title: string; date: string; clauses: DiffClause[] };
        versionB: { title: string; date: string; clauses: DiffClause[] };
        summary: { added: number; removed: number; modified: number; unchanged: number; status: string };
    };
    metadata: {
        title: string;
        parties: string;
        caseNumber: string;
        court: string;
        section: string;
        verdict: string;
    };
}

// In-memory client-side cache to avoid re-fetching
const clientCache = new Map<string, DocumentAnalysis>();

export function useAnalysis(contractId: string): {
    analysis: DocumentAnalysis | null;
    isDemo: boolean;
    loading: boolean;
    error: string | null;
} {
    const contracts = useContractStore((state) => state.contracts);
    const contract = contracts.find(c => c.id === contractId);

    // Detect demo case
    const content = contract?.content || '';
    const isDemo = contractId === 'jg-demo-138' || isDemoCase(content);

    // Initialize loading=true for non-demo so pages show spinner immediately
    const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
    const [loading, setLoading] = useState(!isDemo);
    const [error, setError] = useState<string | null>(null);
    const fetchedRef = useRef(false);

    useEffect(() => {
        // For demo case, don't fetch — pages use hardcoded data
        if (isDemo) {
            setAnalysis(null);
            setLoading(false);
            return;
        }

        // Skip if already fetched in this mount
        if (fetchedRef.current) return;

        // Check client cache
        const cached = clientCache.get(contractId);
        if (cached) {
            setAnalysis(cached);
            setLoading(false);
            return;
        }

        // Fetch from backend
        fetchedRef.current = true;
        setLoading(true);
        setError(null);

        fetch(`/api/contracts/${contractId}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        })
            .then(res => {
                if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
                return res.json();
            })
            .then(data => {
                if (data.analysis) {
                    clientCache.set(contractId, data.analysis);
                    setAnalysis(data.analysis);
                } else {
                    throw new Error('No analysis data returned');
                }
            })
            .catch(err => {
                console.error('[useAnalysis] Error:', err.message);
                setError(err.message);
            })
            .finally(() => setLoading(false));
    }, [contractId, isDemo]);

    return { analysis, isDemo, loading, error };
}
