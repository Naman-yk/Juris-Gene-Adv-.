import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        contractId: params.id,
        event: 'execute',
        previousState: 'APPROVED',
        newState: 'EXECUTED',
        stateHash: '0x716e1bc38f426dff03447f56cba26f89e9933262272df917e97fcc7553215510',
        message: 'Contract executed successfully.',
    });
}
