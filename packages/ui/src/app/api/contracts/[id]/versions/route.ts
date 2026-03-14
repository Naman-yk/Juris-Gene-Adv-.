import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    return NextResponse.json([
        { versionId: 'v1', version: 1, createdAt: '2025-05-28T08:00:00Z', hash: '0xa1b2c3d4e5f6...', state: 'DRAFTED' },
        { versionId: 'v2', version: 2, createdAt: '2025-06-01T10:00:00Z', hash: '0x716e1bc38f42...', state: 'EXECUTED' },
    ]);
}
