import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    const contractId = params.id;
    return NextResponse.json({
        contractId,
        title: 'SaaS License Agreement',
        contractHash: '0x716e1bc38f426dff03447f56cba26f89e9933262272df917e97fcc7553215510',
        state: 'EXECUTED',
        blockchainHash: '0xbc8h9i...',
        transactionHash: '0xdemo123abc456def789',
        blockNumber: 19847256,
        network: 'ethereum-sepolia',
        anchoredAt: '2025-06-01T10:00:20Z',
        status: 'ANCHORED',
        verified: true,
    });
}
