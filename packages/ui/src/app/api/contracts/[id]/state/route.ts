import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        contractId: params.id,
        currentState: 'EXECUTED',
        stateHash: '0x716e1bc38f426dff03447f56cba26f89e9933262272df917e97fcc7553215510',
    });
}

export async function POST(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        contractId: params.id,
        newState: 'EXECUTED',
        event: 'demo-event',
        stateHash: '0x716e1bc38f426dff03447f56cba26f89e9933262272df917e97fcc7553215510',
        message: 'State transition applied successfully',
    });
}
