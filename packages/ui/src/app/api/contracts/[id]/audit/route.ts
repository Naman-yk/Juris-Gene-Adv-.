import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    const contractId = params.id;
    const now = new Date().toISOString();
    return NextResponse.json([
        { id: 'a1', contractId, phase: 'INGESTION', action: 'Contract uploaded and parsed', timestamp: '2025-06-01T10:00:00Z', requestId: 'req-001', beforeHash: null, afterHash: '0x716e1b...', user: 'system', eventType: 'UPLOAD' },
        { id: 'a2', contractId, phase: 'ANNOTATION', action: 'AI clause extraction completed', timestamp: '2025-06-01T10:00:05Z', requestId: 'req-002', beforeHash: '0x716e1b...', afterHash: '0x8a2f3c...', user: 'gemini-2.5-flash', eventType: 'ANNOTATE' },
        { id: 'a3', contractId, phase: 'EVALUATION', action: 'Compliance rules evaluated', timestamp: '2025-06-01T10:00:10Z', requestId: 'req-003', beforeHash: '0x8a2f3c...', afterHash: '0x9b4d5e...', user: 'compliance-engine', eventType: 'EVALUATE' },
        { id: 'a4', contractId, phase: 'EXECUTION', action: 'Contract state machine initialized', timestamp: '2025-06-01T10:00:15Z', requestId: 'req-004', beforeHash: '0x9b4d5e...', afterHash: '0xab6f7g...', user: 'execution-engine', eventType: 'EXECUTE' },
        { id: 'a5', contractId, phase: 'VERIFICATION', action: 'Blockchain anchor created', timestamp: '2025-06-01T10:00:20Z', requestId: 'req-005', beforeHash: '0xab6f7g...', afterHash: '0xbc8h9i...', user: 'blockchain-service', eventType: 'ANCHOR' },
    ]);
}
