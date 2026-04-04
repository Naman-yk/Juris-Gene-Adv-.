import { NextResponse } from 'next/server';

function ensureProtocol(url: string): string {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
}

const BACKEND_URL = ensureProtocol(process.env.BACKEND_URL || 'http://localhost:3001');

export async function GET() {
    try {
        const backendRes = await fetch(`${BACKEND_URL}/contracts`, {
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        });
        if (backendRes.ok) {
            const data = await backendRes.json();
            return NextResponse.json(data);
        }
        return NextResponse.json({ error: `Backend returned ${backendRes.status}` }, { status: backendRes.status });
    } catch (err) {
        console.error('[contracts route] Backend unavailable:', String(err));
        return NextResponse.json({ error: 'Backend API is unreachable' }, { status: 502 });
    }
}
