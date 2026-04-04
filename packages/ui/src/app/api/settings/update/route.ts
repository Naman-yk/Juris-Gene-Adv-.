import { NextRequest, NextResponse } from 'next/server';

function ensureProtocol(url: string): string {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
}

const BACKEND_URL = ensureProtocol(process.env.BACKEND_URL || 'http://localhost:3001');

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const reqInit: RequestInit = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        };

        const backendRes = await fetch(`${BACKEND_URL}/settings/update`, reqInit);
        
        if (backendRes.ok) {
            return NextResponse.json(await backendRes.json());
        }
        return NextResponse.json({ error: `Backend returned ${backendRes.status}` }, { status: backendRes.status });
    } catch (err) {
        console.error('Backend unavailable:', String(err));
        return NextResponse.json({ error: 'Backend API is unreachable' }, { status: 502 });
    }
}
