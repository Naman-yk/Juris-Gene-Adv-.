import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    const contractId = params.id;
    return NextResponse.json({
        contractId,
        currentState: 'EXECUTED',
        stateHash: '0x716e1bc38f426dff03447f56cba26f89e9933262272df917e97fcc7553215510',
        nodes: [
            { id: 'drafted', state: 'DRAFTED', isActive: false, position: { x: 100, y: 200 } },
            { id: 'reviewed', state: 'REVIEWED', isActive: false, position: { x: 300, y: 200 } },
            { id: 'approved', state: 'APPROVED', isActive: false, position: { x: 500, y: 200 } },
            { id: 'executed', state: 'EXECUTED', isActive: true, position: { x: 700, y: 200 } },
            { id: 'terminated', state: 'TERMINATED', isActive: false, position: { x: 500, y: 400 } },
        ],
        transitions: [
            { id: 't1', source: 'drafted', target: 'reviewed', label: 'Submit for Review', event: 'REVIEW', rule: 'All parties identified' },
            { id: 't2', source: 'reviewed', target: 'approved', label: 'Approve', event: 'APPROVE', rule: 'Compliance check passed' },
            { id: 't3', source: 'approved', target: 'executed', label: 'Execute', event: 'EXECUTE', rule: 'All signatures collected' },
            { id: 't4', source: 'executed', target: 'terminated', label: 'Terminate', event: 'TERMINATE', rule: '90-day notice given', isBackwards: false },
        ],
    });
}
