import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => ({}));
    const contractId = body.contractId || 'jg-001';
    
    return NextResponse.json({
        executionHash: '0x716e1bc38f426dff03447f56cba26f89e9933262272df917e97fcc7553215510',
        anchorStatus: 'ANCHORED',
        network: 'ethereum-sepolia',
        txHash: '0xdemo' + Math.random().toString(36).substring(2, 15),
        blockNumber: 19847256 + Math.floor(Math.random() * 100),
        verifiedAt: new Date().toISOString(),
    });
}
