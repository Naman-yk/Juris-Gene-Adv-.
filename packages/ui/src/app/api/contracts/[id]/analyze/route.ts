import { BACKEND_URL } from '@/lib/backend-url';
import { NextResponse } from 'next/server';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const backendRes = await fetch(`${BACKEND_URL}/contracts/${params.id}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
        });

        const data = await backendRes.json();
        return NextResponse.json(data, { status: backendRes.status });
    } catch (error: any) {
        console.error('[analyze proxy] Error:', error.message);
        return NextResponse.json({ error: 'Failed to reach backend', details: error.message }, { status: 502 });
    }
}
