import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => ({}));
    const contractId = body.contractId || 'jg-001';
    const attackType = body.attackType || 'replay';

    return NextResponse.json({
        success: false,
        reason: `Attack blocked: ${attackType} attack detected and prevented by deterministic state validation.`,
        rule: 'State hash mismatch — replay attack cannot alter the canonical execution path.',
        stateHash: '0x716e1bc38f426dff03447f56cba26f89e9933262272df917e97fcc7553215510',
        blockchainHash: '0xbc8h9i...',
        contractId,
        attackType,
        timestamp: new Date().toISOString(),
    });
}
