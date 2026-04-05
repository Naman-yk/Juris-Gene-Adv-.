/**
 * ─── Gemini Document Intelligence ───
 * 
 * Extracts structured legal data from any uploaded document using
 * the Gemini API. Returns a unified analysis object consumed by
 * all 7 feature pages.
 * 
 * For the demo case (Suraj Yadav vs Ram Avtar Sharma), hardcoded
 * data is returned instead (handled by the caller).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

/* ─── Types ─── */

export interface AnalysisEntity {
    id: number;
    type: string;      // 'Party Identification' | 'Financial Instrument' | 'Key Dates' | 'Legal Provision' | 'Exhibits' | 'Defence Claims'
    confidence: number;
    text: string;
}

export interface GraphNode {
    id: string;
    name: string;
    group: string;     // 'Party' | 'Financial' | 'Institution' | 'Event' | 'Outcome'
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

/* ─── Gemini Client ─── */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
    if (!genAI) {
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not set');
        }
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    }
    return genAI;
}

/* ─── Analysis Cache ─── */

const analysisCache = new Map<string, DocumentAnalysis>();

export function getCachedAnalysis(contractId: string): DocumentAnalysis | null {
    return analysisCache.get(contractId) || null;
}

export function setCachedAnalysis(contractId: string, analysis: DocumentAnalysis): void {
    analysisCache.set(contractId, analysis);
}

/* ─── Position Layout Helper ─── */

function generatePositions(nodes: GraphNode[]): Record<string, { x: number; y: number }> {
    const positions: Record<string, { x: number; y: number }> = {};
    const count = nodes.length;
    const radiusX = 300;
    const radiusY = 250;
    nodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / count - Math.PI / 2;
        positions[node.id] = {
            x: Math.round(radiusX * Math.cos(angle)),
            y: Math.round(radiusY * Math.sin(angle)),
        };
    });
    return positions;
}

/* ─── State Machine Position Helper ─── */

function generateStatePositions(count: number): { x: number; y: number }[] {
    const positions = [
        { x: 250, y: 30 },
        { x: 250, y: 170 },
        { x: 80, y: 310 },
        { x: 420, y: 310 },
        { x: 250, y: 450 },
    ];
    // If more than 5 states, auto-generate
    while (positions.length < count) {
        positions.push({ x: 100 + (positions.length % 3) * 170, y: 170 + Math.floor(positions.length / 3) * 140 });
    }
    return positions.slice(0, count);
}

/* ─── Main Extraction Function ─── */

const EXTRACTION_PROMPT = `You are a legal document analysis engine. Analyze the following legal document and extract structured data.

Return a JSON object with EXACTLY this structure (no markdown, no code fences, just raw JSON):

{
  "metadata": {
    "title": "Brief case/document title",
    "parties": "Party A ↔ Party B",
    "caseNumber": "case number if found, or empty string",
    "court": "court name if found, or empty string",
    "section": "relevant legal section/act, or 'General Contract Law'",
    "verdict": "CONVICTED/ACQUITTED/DISMISSED/SETTLED/ACTIVE/PENDING or empty string"
  },
  "entities": [
    {
      "id": 1,
      "type": "Party Identification",
      "confidence": 95,
      "text": "Full party details as found in document"
    },
    {
      "id": 2,
      "type": "Financial Instrument",
      "confidence": 90,
      "text": "All financial details: amounts, instruments, bank details"
    },
    {
      "id": 3,
      "type": "Key Dates",
      "confidence": 92,
      "text": "All important dates found in the document, one per line"
    },
    {
      "id": 4,
      "type": "Legal Provision",
      "confidence": 97,
      "text": "Applicable legal sections, acts, court details"
    },
    {
      "id": 5,
      "type": "Exhibits",
      "confidence": 85,
      "text": "List of exhibits/evidence referenced"
    },
    {
      "id": 6,
      "type": "Key Claims",
      "confidence": 80,
      "text": "Main claims, defences, or obligations described"
    }
  ],
  "graphNodes": [
    {"id": "unique_id", "name": "Display Name", "group": "Party|Financial|Institution|Event|Outcome", "val": 20}
  ],
  "graphEdges": [
    {"source": "node_id_1", "target": "node_id_2", "label": "RELATIONSHIP_TYPE"}
  ],
  "complianceRules": [
    {
      "id": "rule-1",
      "rule": "RULE_CODE",
      "description": "What this rule checks",
      "status": "PASS|FAIL|REVIEW",
      "explanation": "Why this status was assigned based on document evidence"
    }
  ],
  "additionalFindings": [
    {
      "id": "finding-1",
      "rule": "FINDING_CODE",
      "description": "What was found",
      "status": "PASS|FAIL|REVIEW",
      "explanation": "Details of the finding"
    }
  ],
  "stateNames": ["STATE_1", "STATE_2", "STATE_3"],
  "stateTransitions": [
    {"source": 0, "target": 1, "label": "Trigger Event", "event": "EVENT_CODE", "rule": "RULE_CODE"}
  ],
  "activeStateIndex": 0,
  "determinismScore": 75,
  "scoreDeductions": [
    {"id": "d1", "category": "CATEGORY", "description": "What reduces the score", "points": -5, "severity": "HIGH|MEDIUM|LOW"}
  ],
  "diffSections": [
    {"id": "sec-1", "text": "Key clause or section text", "status": "original|added|removed|modified"}
  ]
}

RULES:
- Extract ALL parties, amounts, dates, legal sections, and evidence mentioned
- For graphNodes: create nodes for people, organizations, financial instruments, key events, and outcomes. Use groups: Party, Financial, Institution, Event, Outcome
- For complianceRules: check against the applicable legal framework. If it's a Section 138 NI Act case, check cheque issuance, debt existence, bank presentation, dishonour, notice within 30 days, and payment failure within 15 days. For contracts, check payment terms, obligations, termination clauses, etc.
- For stateNames: identify the lifecycle of this document (e.g., DRAFT, ACTIVE, BREACHED, RESOLVED, etc.)
- For determinismScore: rate 0-100 how deterministic/unambiguous the document outcomes are. Deduct points for vague terms, missing evidence, disputed claims, etc.
- For diffSections: extract the 3-5 most important clauses/sections as if comparing versions
- Keep entity text concise but factual — include specific names, amounts, dates
- Return valid JSON only, no explanations outside the JSON

DOCUMENT:
`;

export async function analyzeDocument(content: string): Promise<DocumentAnalysis> {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = EXTRACTION_PROMPT + content.substring(0, 30000); // Limit to 30k chars

    const result = await model.generateContent(prompt);
    const response = result.response;
    let text = response.text();

    // Strip markdown code fences if present
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    let parsed: any;
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        console.error('[gemini-extract] Failed to parse JSON from Gemini:', text.substring(0, 500));
        throw new Error('Gemini returned invalid JSON');
    }

    // Build structured analysis from parsed response
    const entities: AnalysisEntity[] = (parsed.entities || []).map((e: any) => ({
        id: e.id,
        type: e.type,
        confidence: e.confidence || 90,
        text: e.text || '',
    }));

    // Graph
    const graphNodes: GraphNode[] = (parsed.graphNodes || []).map((n: any) => ({
        id: n.id,
        name: n.name,
        group: n.group || 'Event',
        val: n.val || 20,
    }));

    const graphEdges: GraphEdge[] = (parsed.graphEdges || []).map((e: any) => ({
        source: e.source,
        target: e.target,
        label: e.label,
    }));

    const positions = generatePositions(graphNodes);

    // Compliance
    const complianceRules: ComplianceRule[] = (parsed.complianceRules || []).map((r: any) => ({
        id: r.id,
        rule: r.rule,
        description: r.description,
        status: r.status || 'REVIEW',
        explanation: r.explanation,
    }));

    const additionalFindings: ComplianceRule[] = (parsed.additionalFindings || []).map((f: any) => ({
        id: f.id,
        rule: f.rule,
        description: f.description,
        status: f.status || 'REVIEW',
        explanation: f.explanation,
    }));

    // State Machine
    const stateNames: string[] = parsed.stateNames || ['DRAFT', 'ACTIVE', 'COMPLETED'];
    const statePositions = generateStatePositions(stateNames.length);
    const activeIdx = parsed.activeStateIndex ?? 0;

    const stateNodes: StateNode[] = stateNames.map((name: string, i: number) => ({
        id: `s${i + 1}`,
        state: name,
        isActive: i === activeIdx,
        position: statePositions[i],
    }));

    const stateTransitions: StateTransition[] = (parsed.stateTransitions || []).map((t: any) => ({
        id: `e${t.source + 1}-${t.target + 1}`,
        source: `s${t.source + 1}`,
        target: `s${t.target + 1}`,
        label: t.label,
        event: t.event,
        rule: t.rule,
        isBackwards: (t.target < t.source),
    }));

    // Determinism Score
    const determinismScore: number = parsed.determinismScore || 75;
    const scoreDeductions: ScoreDeduction[] = (parsed.scoreDeductions || []).map((d: any) => ({
        id: d.id,
        category: d.category,
        description: d.description,
        points: d.points,
        severity: d.severity || 'MEDIUM',
    }));

    // Diff — build from sections or use first/last version perspective
    const diffSections: DiffClause[] = (parsed.diffSections || []).map((s: any) => ({
        id: s.id,
        text: s.text,
        status: s.status || 'original',
    }));

    const originalClauses = diffSections.filter((s: DiffClause) => s.status === 'original' || s.status === 'removed');
    const currentClauses = diffSections.filter((s: DiffClause) => s.status === 'original' || s.status === 'added' || s.status === 'modified');

    const metadata = parsed.metadata || {};

    const analysis: DocumentAnalysis = {
        entities,
        graph: {
            nodes: graphNodes,
            edges: graphEdges,
            positions,
        },
        compliance: {
            rules: complianceRules,
            additionalFindings,
        },
        states: {
            nodes: stateNodes,
            transitions: stateTransitions,
        },
        determinism: {
            score: determinismScore,
            deductions: scoreDeductions,
        },
        diff: {
            versionA: {
                title: `Original Document — ${metadata.title || 'Version A'}`,
                date: metadata.caseNumber || 'N/A',
                clauses: originalClauses.length > 0 ? originalClauses : diffSections.slice(0, 3),
            },
            versionB: {
                title: `Current Analysis — ${metadata.title || 'Version B'}`,
                date: new Date().toISOString().split('T')[0],
                clauses: currentClauses.length > 0 ? currentClauses : diffSections,
            },
            summary: {
                added: diffSections.filter((s: DiffClause) => s.status === 'added').length,
                removed: diffSections.filter((s: DiffClause) => s.status === 'removed').length,
                modified: diffSections.filter((s: DiffClause) => s.status === 'modified').length,
                unchanged: diffSections.filter((s: DiffClause) => s.status === 'original').length,
                status: 'ANALYZED',
            },
        },
        metadata: {
            title: metadata.title || 'Uploaded Document',
            parties: metadata.parties || 'Unknown Parties',
            caseNumber: metadata.caseNumber || '',
            court: metadata.court || '',
            section: metadata.section || 'General Contract Law',
            verdict: metadata.verdict || '',
        },
    };

    return analysis;
}
