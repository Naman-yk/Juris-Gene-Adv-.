import { NextRequest, NextResponse } from 'next/server';

function ensureProtocol(url: string): string {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
}

const BACKEND_URL = ensureProtocol(process.env.BACKEND_URL || 'http://localhost:3001');

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const reqInit: RequestInit = {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        };

        const backendRes = await fetch(`${BACKEND_URL}/contracts/${params.id}/state-machine`, reqInit);
        
        if (backendRes.ok) {
            return NextResponse.json(await backendRes.json());
        }
        return NextResponse.json({ error: `Backend returned ${backendRes.status}` }, { status: backendRes.status });
    } catch (err) {
        console.error('Backend unavailable:', String(err));
        return NextResponse.json({ error: 'Backend API is unreachable' }, { status: 502 });
    }
}
