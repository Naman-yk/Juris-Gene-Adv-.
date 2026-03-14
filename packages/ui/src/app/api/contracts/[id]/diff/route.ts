import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        versionA: 1,
        versionB: 2,
        contractA: {
            id: params.id,
            title: 'SaaS License Agreement (v1)',
            parties: 'TechStart Inc. ↔ Acme Corporation',
            status: 'DRAFT',
            hash: '0xa1b2c3d4e5f6...',
            updatedAt: '2025-05-28',
            content: 'Payment shall be due within 15 calendar days of invoice receipt. Either party may terminate this agreement with 30 days written notice.',
        },
        contractB: {
            id: params.id,
            title: 'SaaS License Agreement (v2)',
            parties: 'TechStart Inc. ↔ Acme Corporation',
            status: 'ACTIVE',
            hash: '0x716e1bc38f42...',
            updatedAt: '2025-06-01',
            content: 'Payment shall be due within 30 calendar days of invoice receipt. Either party may terminate this agreement with 90 days written notice.',
        },
        isHashMatch: false,
    });
}
