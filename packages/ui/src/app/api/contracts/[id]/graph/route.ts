import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        contractId: params.id,
        nodes: [
            { id: 'party-a', name: 'Party A (Licensor)', group: 'party', val: 10, details: { role: 'Licensor', jurisdiction: 'Delaware' } },
            { id: 'party-b', name: 'Party B (Licensee)', group: 'party', val: 10, details: { role: 'Licensee', jurisdiction: 'California' } },
            { id: 'obligation-payment', name: 'Payment Obligation', group: 'obligation', val: 6, details: { amount: 'As per schedule', due: '30 days' } },
            { id: 'obligation-delivery', name: 'Service Delivery', group: 'obligation', val: 6, details: { type: 'Non-exclusive license' } },
            { id: 'clause-termination', name: 'Termination Clause', group: 'clause', val: 5, details: { notice: '90 days written' } },
            { id: 'clause-liability', name: 'Liability Cap', group: 'clause', val: 5, details: { limit: '12 months fees' } },
            { id: 'clause-governing', name: 'Governing Law', group: 'clause', val: 4, details: { jurisdiction: 'State of Delaware' } },
        ],
        edges: [
            { source: 'party-b', target: 'obligation-payment', label: 'owes' },
            { source: 'party-a', target: 'obligation-delivery', label: 'must perform' },
            { source: 'party-a', target: 'clause-termination', label: 'may invoke' },
            { source: 'party-b', target: 'clause-termination', label: 'may invoke' },
            { source: 'obligation-payment', target: 'clause-liability', label: 'capped by' },
            { source: 'clause-termination', target: 'clause-governing', label: 'governed by' },
        ],
    });
}
