import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({
        contractId: params.id,
        complianceScore: 87,
        status: 'PASS',
        rules: [
            { rule: 'Payment Terms', result: 'PASS', explanation: 'Payment within 30 days meets standard NET-30 terms.' },
            { rule: 'Termination Notice', result: 'PASS', explanation: '90-day notice period exceeds minimum 30-day requirement.' },
            { rule: 'Liability Cap', result: 'WARNING', explanation: 'Liability capped at 12 months fees — consider uncapped for IP infringement.' },
            { rule: 'GDPR Compliance', result: 'PASS', explanation: 'Data processing terms align with GDPR Article 28.' },
        ],
    });
}
