import { NextRequest, NextResponse } from 'next/server';

const defaultSettings = {
    aiModel: 'gemini-2.5-flash',
    complianceRuleset: 'standard-v2',
    blockchainNetwork: 'ethereum-sepolia',
    webhookUrl: '',
    autoAnchor: true,
    notificationsEnabled: true,
};

export async function GET(_request: NextRequest) {
    return NextResponse.json(defaultSettings);
}
