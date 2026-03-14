import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    const contractId = params.id;
    return NextResponse.json({
        contractId,
        nodes: [
            { id: 'party-licensor', name: 'Acme Corporation (Licensor)', group: 'party', val: 10, details: { role: 'Licensor', jurisdiction: 'Delaware' } },
            { id: 'party-licensee', name: 'TechStart Inc. (Licensee)', group: 'party', val: 10, details: { role: 'Licensee', jurisdiction: 'California' } },
            { id: 'obligation-payment', name: 'Payment Obligation', group: 'obligation', val: 6, details: { amount: 'As per schedule', due: '30 days' } },
            { id: 'obligation-delivery', name: 'Software Delivery', group: 'obligation', val: 6, details: { type: 'Non-exclusive license' } },
            { id: 'clause-termination', name: 'Termination Clause', group: 'clause', val: 5, details: { notice: '90 days written' } },
            { id: 'clause-liability', name: 'Liability Cap', group: 'clause', val: 5, details: { limit: '12 months fees' } },
            { id: 'clause-governing', name: 'Governing Law', group: 'clause', val: 4, details: { jurisdiction: 'State of Delaware' } },
        ],
        edges: [
            { source: 'party-licensee', target: 'obligation-payment', label: 'owes' },
            { source: 'party-licensor', target: 'obligation-delivery', label: 'must perform' },
            { source: 'party-licensor', target: 'clause-termination', label: 'may invoke' },
            { source: 'party-licensee', target: 'clause-termination', label: 'may invoke' },
            { source: 'obligation-payment', target: 'clause-liability', label: 'capped by' },
            { source: 'clause-termination', target: 'clause-governing', label: 'governed by' },
        ],
    });
}
