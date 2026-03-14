import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
    return NextResponse.json({
        counters: {
            requestCount: 1247,
            contractsProcessed: 23,
            evaluationsRun: 89,
            executionsRun: 45,
            anchorsCreated: 12,
        },
        uptime: 86400,
        latencyHistory: [
            { timestamp: '2025-06-01T08:00:00Z', annotationDelay: 120, engineExecution: 45, blockAnchor: 3200, replayVerification: 80 },
            { timestamp: '2025-06-01T09:00:00Z', annotationDelay: 115, engineExecution: 42, blockAnchor: 3100, replayVerification: 75 },
            { timestamp: '2025-06-01T10:00:00Z', annotationDelay: 130, engineExecution: 48, blockAnchor: 3400, replayVerification: 85 },
            { timestamp: '2025-06-01T11:00:00Z', annotationDelay: 110, engineExecution: 40, blockAnchor: 2900, replayVerification: 70 },
            { timestamp: '2025-06-01T12:00:00Z', annotationDelay: 125, engineExecution: 44, blockAnchor: 3150, replayVerification: 78 },
        ],
    });
}
