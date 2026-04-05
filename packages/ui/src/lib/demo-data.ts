/**
 * ─── JurisGenie Demo Data ───
 * Deterministic data for: Suraj Yadav vs Ram Avtar Sharma
 * Case No. 528334/2016 | Section 138 NI Act | Delhi Court
 *
 * This module is the SINGLE SOURCE OF TRUTH for the demo flow.
 * Every feature page imports from here — same input → same output ALWAYS.
 */

/* ─── Detection ─── */

/** Returns true if the extracted text matches the demo case */
export function isDemoCase(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    const markers = ['suraj yadav', 'ram avtar', '073525', '528334', 'section 138'];
    return markers.filter(m => lower.includes(m)).length >= 2;
}

/* ─── Parties ─── */

export const DEMO_PARTIES = {
    complainant: {
        name: 'Sh. Suraj Yadav',
        role: 'Complainant',
        father: 'Late Sh. Jamuna Prasad',
        address: 'D-30, Lalita Block, Shastri Nagar, Delhi-110052',
    },
    accused: {
        name: 'Sh. Ram Avtar Sharma',
        role: 'Accused',
        father: 'Sh. Shiv Charan',
        address: 'B-82, Gali No. 5, Shastri Nagar, Delhi-110052',
    },
};

/* ─── Financial ─── */

export const DEMO_FINANCIAL = {
    loanAmount: 'Rs. 1,80,000',
    chequeAmount: 'Rs. 2,00,000',
    chequeNumber: '073525',
    chequeDate: '03.09.2015',
    bank: 'State Bank of India, Shastri Nagar Branch',
    dishonourReason: 'Funds Insufficient',
    returnMemoDate: '09.09.2015',
    disputedRepayment: 'Rs. 1,20,000',
};

/* ─── Dates ─── */

export const DEMO_DATES = {
    loanDate: '03.09.2015',
    chequeDate: '03.09.2015',
    dishonourDate: '09.09.2015',
    noticeDate: '10.09.2015',
    settlementDate2016: '21.07.2016',
    noticeUnder251: '26.09.2017',
    settlementDate2022: '30.09.2022',
    convictionDate: '02.04.2026',
};

/* ─── Case Metadata ─── */

export const DEMO_CASE = {
    caseNumber: '528334/2016',
    court: 'Court of Ms. Urvi Gupta, JMFC NI ACT-01, Central, Tis Hazari Courts, Delhi',
    section: 'Section 138, Negotiable Instruments Act, 1881',
    judge: 'Ms. Urvi Gupta',
    verdict: 'CONVICTED',
};

/* ─── Exhibits ─── */

export const DEMO_EXHIBITS = [
    { id: 'Ex.CW1/A', description: 'Bank statement showing loan of Rs.1,80,000' },
    { id: 'Ex.CW1/B', description: 'Original Cheque No.073525 dated 03.09.2015' },
    { id: 'Ex.CW1/C', description: 'Bank Return Memo dated 09.09.2015' },
    { id: 'Ex.CW1/D', description: 'Legal Demand Notice dated 10.09.2015' },
    { id: 'Ex.CW1/G', description: 'Tracking report confirming item "delivered"' },
    { id: 'Ex.DW1/1', description: 'Settlement agreement dated 21.07.2016' },
    { id: 'Mark A', description: 'Second settlement document dated 30.09.2022' },
];

/* ─── Knowledge Graph ─── */

export const DEMO_GRAPH_NODES = [
    { id: 'suraj',      name: 'Suraj Yadav',     group: 'Party',       val: 25 },
    { id: 'ramavtar',   name: 'Ram Avtar Sharma', group: 'Party',       val: 25 },
    { id: 'loan',       name: 'Loan (Rs.1,80,000)', group: 'Financial', val: 20 },
    { id: 'cheque',     name: 'Cheque 073525',    group: 'Financial',   val: 20 },
    { id: 'sbi',        name: 'SBI Shastri Nagar', group: 'Institution', val: 18 },
    { id: 'dishonour',  name: 'Dishonour',        group: 'Event',       val: 18 },
    { id: 'notice',     name: 'Legal Notice',     group: 'Event',       val: 18 },
    { id: 'conviction', name: 'Conviction',       group: 'Outcome',     val: 22 },
];

export const DEMO_GRAPH_EDGES = [
    { source: 'suraj',     target: 'loan',       label: 'LENT_TO' },
    { source: 'loan',      target: 'ramavtar',   label: 'BORROWED_BY' },
    { source: 'ramavtar',  target: 'cheque',     label: 'ISSUED' },
    { source: 'cheque',    target: 'sbi',        label: 'DRAWN_ON' },
    { source: 'sbi',       target: 'dishonour',  label: 'DISHONOURED' },
    { source: 'suraj',     target: 'notice',     label: 'NOTICE_SENT' },
    { source: 'notice',    target: 'ramavtar',   label: 'SERVED_TO' },
    { source: 'ramavtar',  target: 'conviction', label: 'CONVICTED' },
];

export const DEMO_GRAPH_COLORS: Record<string, { dark: string; light: string }> = {
    Party:       { dark: '#10b981', light: '#059669' },
    Financial:   { dark: '#f59e0b', light: '#d97706' },
    Institution: { dark: '#3b82f6', light: '#2563eb' },
    Event:       { dark: '#ef4444', light: '#dc2626' },
    Outcome:     { dark: '#8b5cf6', light: '#7c3aed' },
};

/* ─── Fixed Node Positions for Knowledge Graph ─── */
/* Centered around origin (0,0) so nodes appear in the middle of the canvas */

export const DEMO_GRAPH_POSITIONS: Record<string, { x: number; y: number }> = {
    suraj:      { x: -300, y: -100 },
    loan:       { x: -100, y: -200 },
    ramavtar:   { x:  100, y: -100 },
    cheque:     { x:  300, y: -200 },
    sbi:        { x:  300, y:    0 },
    dishonour:  { x:  100, y:  150 },
    notice:     { x: -250, y:  150 },
    conviction: { x:    0, y:  300 },
};

/* ─── Compliance Engine (Section 138 NI Act) ─── */

export type ComplianceStatus = 'PASS' | 'FAIL' | 'REVIEW';

export interface ComplianceRule {
    id: string;
    rule: string;
    description: string;
    status: ComplianceStatus;
    explanation: string;
}

export const DEMO_COMPLIANCE_RULES: ComplianceRule[] = [
    {
        id: 'rule-1',
        rule: 'CHEQUE_ISSUED',
        description: 'A cheque was drawn on an account for discharge of a legally enforceable debt',
        status: 'PASS',
        explanation: 'Cheque No. 073525 dated 03.09.2015 for Rs.2,00,000 was issued by the accused to discharge the loan of Rs.1,80,000. The cheque was duly signed and presented.',
    },
    {
        id: 'rule-2',
        rule: 'DEBT_EXISTS',
        description: 'A legally enforceable debt or liability exists',
        status: 'PASS',
        explanation: 'Bank statement (Ex.CW1/A) confirms Rs.1,80,000 loan. Accused admitted liability of Rs.2,00,000 during cross-examination (later retracted on counsel\'s prompting — retraction not considered valid).',
    },
    {
        id: 'rule-3',
        rule: 'PRESENTED_TO_BANK',
        description: 'Cheque was presented to bank within validity period',
        status: 'PASS',
        explanation: 'Cheque was presented to SBI Shastri Nagar and returned with endorsement "Funds Insufficient" vide return memo dated 09.09.2015 (Ex.CW1/C).',
    },
    {
        id: 'rule-4',
        rule: 'DISHONOURED',
        description: 'Cheque was returned unpaid / dishonoured by the bank',
        status: 'PASS',
        explanation: 'Bank Return Memo (Ex.CW1/C) dated 09.09.2015 confirms cheque was dishonoured with reason: "Funds Insufficient".',
    },
    {
        id: 'rule-5',
        rule: 'NOTICE_WITHIN_30_DAYS',
        description: 'Legal notice was sent within 30 days of dishonour',
        status: 'PASS',
        explanation: 'Legal demand notice (Ex.CW1/D) dated 10.09.2015 — sent within 1 day of dishonour (09.09.2015). Delivery confirmed via tracking report (Ex.CW1/G).',
    },
    {
        id: 'rule-6',
        rule: 'PAYMENT_NOT_MADE_15_DAYS',
        description: 'Payment was not made within 15 days of receiving the notice',
        status: 'PASS',
        explanation: 'Despite service of legal notice, accused failed to make payment within the statutory period of 15 days. Defence of Rs.1,20,000 repayment was raised but no documentary proof was produced.',
    },
];

export const DEMO_ADDITIONAL_FINDINGS: ComplianceRule[] = [
    {
        id: 'finding-1',
        rule: 'DOCUMENT_AUTHENTICITY',
        description: 'Settlement documents were properly authenticated',
        status: 'FAIL',
        explanation: 'Settlement documents Ex.DW1/1 (2016) and Mark A (2022) were never put to complainant during cross-examination. Per Section 145 CrPC, these are inadmissible.',
    },
    {
        id: 'finding-2',
        rule: 'ADMISSION_OF_LIABILITY',
        description: 'Accused admission of liability detected',
        status: 'REVIEW',
        explanation: 'Accused admitted liability of Rs.2,00,000 towards complainant on record. He was subsequently prompted by his counsel to state otherwise — legally significant clause flagged for review.',
    },
    {
        id: 'finding-3',
        rule: 'PROOF_OF_PAYMENT',
        description: 'Repayment claim requires documentary evidence',
        status: 'FAIL',
        explanation: 'Defence claimed repayment of Rs.1,20,000 but produced no bank receipt, transfer record, or witness testimony to substantiate the claim.',
    },
];

/* ─── State Machine ─── */

export interface DemoState {
    id: string;
    state: string;
    isActive: boolean;
    position: { x: number; y: number };
}

export interface DemoTransition {
    id: string;
    source: string;
    target: string;
    label: string;
    event: string;
    rule: string;
    isBackwards?: boolean;
}

export const DEMO_STATES: DemoState[] = [
    { id: 's1', state: 'DRAFT',     isActive: false, position: { x: 250, y: 30 } },
    { id: 's2', state: 'ACTIVE',    isActive: true,  position: { x: 250, y: 170 } },
    { id: 's3', state: 'BREACHED',  isActive: false, position: { x: 80,  y: 310 } },
    { id: 's4', state: 'TRIAL',     isActive: false, position: { x: 250, y: 450 } },
    { id: 's5', state: 'CONVICTED', isActive: false, position: { x: 420, y: 310 } },
];

export const DEMO_TRANSITIONS: DemoTransition[] = [
    { id: 'e1-2', source: 's1', target: 's2', label: 'Complaint Filed',       event: 'COMPLAINT_FILED',        rule: 'R_COMPLAINT' },
    { id: 'e2-3', source: 's2', target: 's3', label: 'Cheque Dishonoured',    event: 'PAYMENT_DISHONOURED',    rule: 'R_DISHONOUR' },
    { id: 'e3-4', source: 's3', target: 's4', label: 'Notice Sent + No Payment', event: 'NOTICE_SERVED',       rule: 'R_NOTICE_PERIOD' },
    { id: 'e4-5', source: 's4', target: 's5', label: 'Judgment Pronounced',   event: 'JUDGMENT_PRONOUNCED',    rule: 'R_CONVICTION' },
    { id: 'e3-2', source: 's3', target: 's2', label: 'Settlement Attempted',  event: 'SETTLEMENT_ATTEMPTED',   rule: 'R_SETTLE', isBackwards: true },
];

/* ─── Determinism Score ─── */

export interface ScoreDeduction {
    id: string;
    category: string;
    description: string;
    points: number;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export const DEMO_DETERMINISM_SCORE = 62;

export const DEMO_SCORE_DEDUCTIONS: ScoreDeduction[] = [
    { id: 'd1', category: 'AMBIGUOUS_TERM',        description: '"security cheque" — term undefined, repayment amount disputed, no proof',     points: -10, severity: 'HIGH' },
    { id: 'd2', category: 'UNDEFINED_OBLIGATION',   description: 'Settlement terms vague, withdrawal condition ambiguous (Ex.DW1/1, Mark A)', points: -10, severity: 'HIGH' },
    { id: 'd3', category: 'INCOMPLETE_OBLIGATION',  description: 'Repayment of Rs.1,20,000 claimed but not verifiable — no documentary proof', points: -8,  severity: 'HIGH' },
    { id: 'd4', category: 'AMBIGUOUS_TERM',        description: '"bald denials" — non-deterministic defence language flagged',                 points: -5,  severity: 'MEDIUM' },
    { id: 'd5', category: 'WELL_DEFINED',           description: 'Dishonour event well-documented via bank return memo',                       points: -5,  severity: 'LOW' },
];

export function getDeterminismRiskLabel(score: number): { label: string; color: string } {
    if (score <= 40) return { label: 'HIGH RISK', color: 'text-red-500' };
    if (score <= 70) return { label: 'MEDIUM RISK', color: 'text-yellow-500' };
    return { label: 'LOW RISK', color: 'text-green-500' };
}

/* ─── Contract Diff (2016 vs 2022 Settlement) ─── */

export const DEMO_DIFF = {
    versionA: {
        title: 'Settlement Agreement — 21.07.2016 (Ex.DW1/1)',
        date: '21.07.2016',
        clauses: [
            { id: 'a1', text: 'The accused undertakes to pay Rs. 2,00,000 to the complainant on 27.06.2017.', status: 'original' as const },
            { id: 'a2', text: 'Upon payment, the complainant shall withdraw the complaint case.', status: 'original' as const },
            { id: 'a3', text: 'The cheque amount represents the total outstanding loan obligation.', status: 'removed' as const },
        ],
    },
    versionB: {
        title: 'Settlement Document — 30.09.2022 (Mark A)',
        date: '30.09.2022',
        clauses: [
            { id: 'b1', text: 'The accused undertakes to pay Rs. 2,00,000 to the complainant.', status: 'modified' as const },
            { id: 'b2', text: 'Upon payment, the complainant shall withdraw the complaint case.', status: 'original' as const },
            { id: 'b3', text: 'The accused claims partial repayment of Rs. 1,20,000 has been made.', status: 'added' as const },
            { id: 'b4', text: 'The remaining balance is disputed and subject to court determination.', status: 'added' as const },
        ],
    },
    summary: {
        added: 2,
        removed: 1,
        modified: 1,
        unchanged: 1,
        status: 'DIVERGENT' as const,
    },
};

/* ─── Blockchain Anchor ─── */

export const DEMO_BLOCKCHAIN = {
    contractHash: '0x7a3f8c1d2e4b5a6f9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    executionHash: '0x4e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d',
    txHash: '0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
    network: 'Ethereum Sepolia (Testnet)',
    blockNumber: 7283945,
    anchoredAt: '2026-04-02T14:30:00.000Z',
    status: 'ANCHORED' as const,
    gasUsed: '21,000',
};

/* ─── Pre-built Contract Object (for seeding the backend) ─── */

export const DEMO_CONTRACT = {
    id: 'jg-demo-138',
    title: 'Suraj Yadav vs Ram Avtar Sharma — Section 138 NI Act',
    parties: 'Sh. Suraj Yadav ↔ Sh. Ram Avtar Sharma',
    partyA: 'Sh. Suraj Yadav',
    partyB: 'Sh. Ram Avtar Sharma',
    status: 'ACTIVE',
    state: 'ACTIVE',
    hash: '0x7a3f8c1d2e4b5a6f9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    updatedAt: '2026-04-02',
    pages: 23,
    clauses: [
        { id: 'clause-138-cheque',   title: 'Cheque Issuance — Rs.2,00,000 via Cheque No.073525', type: 'PAYMENT',     obligations: [{ id: 'obl-pay', status: 'BREACHED' }], rights: [] },
        { id: 'clause-138-notice',   title: 'Legal Notice — Demand within 30 days of dishonour',  type: 'NOTICE',      obligations: [{ id: 'obl-notice', status: 'FULFILLED' }], rights: [] },
        { id: 'clause-138-settle',   title: 'Settlement Undertaking — Pay Rs.2,00,000 by 27.06.2017', type: 'SETTLEMENT', obligations: [{ id: 'obl-settle', status: 'BREACHED' }], rights: [{ id: 'right-withdraw', type: 'WITHDRAWAL' }] },
        { id: 'clause-138-defence',  title: 'Defence — Security cheque claim and disputed repayment', type: 'DEFENCE',    obligations: [], rights: [{ id: 'right-defence', type: 'DEFENCE' }] },
        { id: 'clause-138-verdict',  title: 'Conviction under Section 138 NI Act',                 type: 'VERDICT',     obligations: [{ id: 'obl-fine', status: 'PENDING' }], rights: [] },
    ],
};
