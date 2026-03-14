/* ─── JurisGenie API Client ─── */
/* All functions call the platform server via Next.js rewrite (/api/* → localhost:3001/*) */

/* ─── Types ─── */

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

export interface AnchorData {
    executionHash: string;
    anchorStatus: "PENDING" | "ANCHORED" | "VERIFIED";
    network: string;
    txHash: string | null;
    blockNumber: number | null;
    verifiedAt: string | null;
}

export interface AuditEntry {
    id: string;
    contractId: string;
    phase: string;
    action: string;
    timestamp: string;
    requestId: string;
    beforeHash: string | null;
    afterHash: string | null;
    user: string;
    eventType: string;
}

export interface MetricsData {
    counters: {
        requestCount: number;
        contractsProcessed: number;
        evaluationsRun: number;
        executionsRun: number;
        anchorsCreated: number;
    };
    uptime: number;
    latencyHistory: {
        timestamp: string;
        annotationDelay: number;
        engineExecution: number;
        blockAnchor: number;
        replayVerification: number;
    }[];
}

export interface AttackResult {
    success: boolean;
    reason: string;
    rule: string;
    stateHash: string;
    blockchainHash: string | null;
    contractId: string;
    attackType: string;
    timestamp: string;
}

export interface VerifyResult {
    contractId: string;
    title: string;
    contractHash: string;
    state: string;
    blockchainHash: string | null;
    transactionHash: string | null;
    blockNumber: number | null;
    network: string | null;
    anchoredAt: string | null;
    status: "ANCHORED" | "NOT_ANCHORED";
    verified: boolean;
}

export interface StateMachineData {
    contractId: string;
    currentState: string;
    stateHash: string;
    nodes: {
        id: string;
        state: string;
        isActive: boolean;
        position: { x: number; y: number };
    }[];
    transitions: {
        id: string;
        source: string;
        target: string;
        label: string;
        event: string;
        rule: string;
        isBackwards?: boolean;
    }[];
}

export interface GraphData {
    contractId: string;
    nodes: {
        id: string;
        name: string;
        group: string;
        val: number;
        details: Record<string, any>;
    }[];
    edges: {
        source: string;
        target: string;
        label: string;
    }[];
}

export interface SettingsData {
    aiModel: string;
    complianceRuleset: string;
    blockchainNetwork: string;
    webhookUrl: string;
    autoAnchor: boolean;
    notificationsEnabled: boolean;
}

export interface VersionSummary {
    versionId: string;
    version: number;
    createdAt: string;
    hash: string;
    state: string;
}

export interface DiffResult {
    versionA: number;
    versionB: number;
    contractA: ContractSummary;
    contractB: ContractSummary;
    isHashMatch: boolean;
}

/* ─── Contract CRUD ─── */

export async function fetchContracts(): Promise<ContractSummary[]> {
    const res = await fetch('/pro/api/contracts');
    if (!res.ok) throw new Error(`Failed to fetch contracts: ${res.status}`);
    return res.json();
}

export async function fetchContract(id: string): Promise<ContractSummary> {
    const res = await fetch(`/pro/api/contracts/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch contract ${id}: ${res.status}`);
    return res.json();
}

export async function uploadContract(file: File): Promise<{ message: string; contract: ContractSummary }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/pro/api/contracts/upload', { method: 'POST', body: formData });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errText}`);
    }
    return res.json();
}

/* ─── Versions & Diff ─── */

export async function fetchVersions(contractId: string): Promise<VersionSummary[]> {
    const res = await fetch(`/pro/api/contracts/${contractId}/versions`);
    if (!res.ok) throw new Error(`Failed to fetch versions: ${res.status}`);
    return res.json();
}

export async function fetchDiff(contractId: string, versionA: number, versionB: number): Promise<DiffResult> {
    const res = await fetch(`/pro/api/contracts/${contractId}/diff?versionA=${versionA}&versionB=${versionB}`);
    if (!res.ok) throw new Error(`Failed to fetch diff: ${res.status}`);
    return res.json();
}

/* ─── System Metrics ─── */

export async function fetchSystemMetrics(): Promise<MetricsData> {
    const res = await fetch('/pro/api/metrics/system');
    if (!res.ok) throw new Error(`Failed to fetch metrics: ${res.status}`);
    return res.json();
}

/* ─── Attack Simulator ─── */

export async function simulateAttack(contractId: string, attackType: string): Promise<AttackResult> {
    const res = await fetch('/pro/api/simulate/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId, attackType }),
    });
    if (!res.ok) throw new Error(`Attack simulation failed: ${res.status}`);
    return res.json();
}

/* ─── Public Verify ─── */

export async function verifyContractPublic(contractId: string): Promise<VerifyResult> {
    const res = await fetch(`/pro/api/verify/${contractId}`);
    if (!res.ok) throw new Error(`Verification failed: ${res.status}`);
    return res.json();
}

/* ─── State Machine ─── */

export async function fetchStateMachine(contractId: string): Promise<StateMachineData> {
    const res = await fetch(`/pro/api/contracts/${contractId}/state-machine`);
    if (!res.ok) throw new Error(`Failed to fetch state machine: ${res.status}`);
    return res.json();
}

/* ─── Knowledge Graph ─── */

export async function fetchGraph(contractId: string): Promise<GraphData> {
    const res = await fetch(`/pro/api/contracts/${contractId}/graph`);
    if (!res.ok) throw new Error(`Failed to fetch graph: ${res.status}`);
    const data: GraphData = await res.json();
    
    // Sanitize data: filter edges that reference non-existent nodes to prevent d3-force-3d crashes
    if (data && data.nodes && data.edges) {
        const nodeIds = new Set(data.nodes.map(n => n.id));
        data.edges = data.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
    }
    
    return data;
}

/* ─── Blockchain Anchor ─── */

export async function fetchExecutionState(contractId: string): Promise<any> {
    const res = await fetch(`/pro/api/contracts/${contractId}/state`);
    if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`Failed to fetch execution state: ${res.status}`);
    }
    return res.json();
}

export async function anchorOnChain(contractId: string, stateHash?: string): Promise<AnchorData> {
    const res = await fetch('/pro/api/blockchain/anchor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId, stateHash }),
    });
    if (!res.ok) throw new Error(`Anchor failed: ${res.status}`);
    return res.json();
}

/* ─── Audit ─── */

export async function fetchAudit(contractId: string): Promise<AuditEntry[]> {
    const res = await fetch(`/pro/api/contracts/${contractId}/audit`);
    if (!res.ok) throw new Error(`Failed to fetch audit: ${res.status}`);
    return res.json();
}

/* ─── Settings ─── */

export async function fetchSettings(): Promise<SettingsData> {
    const res = await fetch('/pro/api/settings');
    if (!res.ok) throw new Error(`Failed to fetch settings: ${res.status}`);
    return res.json();
}

export async function updateSettings(updates: Partial<SettingsData>): Promise<{ message: string; settings: SettingsData }> {
    const res = await fetch('/pro/api/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`Failed to update settings: ${res.status}`);
    return res.json();
}

/* ─── Contract Evaluation & Execution ─── */

export async function evaluateCompliance(contractId: string, body?: any): Promise<any> {
    const res = await fetch(`/pro/api/contracts/${contractId}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
    });
    if (!res.ok) throw new Error(`Evaluation failed: ${res.status}`);
    return res.json();
}

export async function executeEvent(contractId: string, eventData: Record<string, unknown>): Promise<any> {
    const res = await fetch(`/pro/api/contracts/${contractId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
    });
    if (!res.ok) throw new Error(`Execution failed: ${res.status}`);
    return res.json();
}

export async function verifyReplay(contractId: string, contract: any, events: any[]): Promise<any> {
    const res = await fetch(`/pro/api/contracts/${contractId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract, events }),
    });
    if (!res.ok) throw new Error(`Verification failed: ${res.status}`);
    return res.json();
}
