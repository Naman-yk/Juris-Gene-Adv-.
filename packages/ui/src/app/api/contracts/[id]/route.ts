import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';


export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const backendRes = await fetch(`${BACKEND_URL}/contracts/${params.id}`, {
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        });
        if (backendRes.ok) {
            const data = await backendRes.json();
            return NextResponse.json(data);
        }
        return NextResponse.json({ error: `Backend returned ${backendRes.status}` }, { status: backendRes.status });
    } catch (err) {
        console.error(`[contracts/${params.id} route] Backend unavailable:`, String(err));
        return NextResponse.json({ error: 'Backend API is unreachable' }, { status: 502 });
    }
}
