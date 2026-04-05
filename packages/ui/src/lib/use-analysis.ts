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

// Persistent localStorage cache key prefix
const LS_PREFIX = 'jg-analysis-';

function getPersistedAnalysis(contractId: string): DocumentAnalysis | null {
    try {
        const raw = localStorage.getItem(LS_PREFIX + contractId);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function persistAnalysis(contractId: string, analysis: DocumentAnalysis): void {
    try {
        localStorage.setItem(LS_PREFIX + contractId, JSON.stringify(analysis));
    } catch { /* storage full, ignore */ }
}

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
        fetchedRef.current = true;

        // Check in-memory cache
        const cached = clientCache.get(contractId);
        if (cached) {
            setAnalysis(cached);
            setLoading(false);
            return;
        }

        // Check localStorage cache
        const persisted = getPersistedAnalysis(contractId);
        if (persisted) {
            clientCache.set(contractId, persisted);
            setAnalysis(persisted);
            setLoading(false);
            return;
        }

        // Client-side extraction — no API dependency, works instantly
        if (content && content.trim().length > 30) {
            try {
                const { extractFromText } = require('./client-extract');
                const result = extractFromText(content) as DocumentAnalysis;
                clientCache.set(contractId, result);
                persistAnalysis(contractId, result);
                setAnalysis(result);
                setLoading(false);
            } catch (err: any) {
                console.error('[useAnalysis] Client extraction error:', err.message);
                setError('Failed to analyze document');
                setLoading(false);
            }
        } else {
            setError('No document content available for analysis');
            setLoading(false);
        }
    }, [contractId, isDemo, content]);

    return { analysis, isDemo, loading, error };
}

