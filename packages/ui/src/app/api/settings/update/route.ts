import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({
        message: 'Settings updated successfully',
        settings: {
            aiModel: body.aiModel || 'gemini-2.5-flash',
            complianceRuleset: body.complianceRuleset || 'standard-v2',
            blockchainNetwork: body.blockchainNetwork || 'ethereum-sepolia',
            webhookUrl: body.webhookUrl || '',
            autoAnchor: body.autoAnchor ?? true,
            notificationsEnabled: body.notificationsEnabled ?? true,
        },
    });
}
