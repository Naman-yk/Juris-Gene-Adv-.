import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';


export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const reqInit: RequestInit = {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        };

        const backendRes = await fetch(`${BACKEND_URL}/contracts/${params.id}/audit`, reqInit);
        
        if (backendRes.ok) {
            return NextResponse.json(await backendRes.json());
        }
        return NextResponse.json({ error: `Backend returned ${backendRes.status}` }, { status: backendRes.status });
    } catch (err) {
        console.error('Backend unavailable:', String(err));
        return NextResponse.json({ error: 'Backend API is unreachable' }, { status: 502 });
    }
}
