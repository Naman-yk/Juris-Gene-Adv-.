import { NextRequest, NextResponse } from 'next/server';

function ensureProtocol(url: string): string {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
}

const BACKEND_URL = ensureProtocol(process.env.BACKEND_URL || 'http://localhost:3001');

export async function POST(request: NextRequest) {
    try {
        let formData: FormData;
        try {
            formData = await request.formData();
        } catch (parseErr) {
            return NextResponse.json({ error: 'Failed to parse form data', details: String(parseErr) }, { status: 400 });
        }

        const file = formData.get('file');

        if (!file || !(file instanceof File)) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const outForm = new FormData();
        outForm.append('file', file, file.name);

        const backendRes = await fetch(`${BACKEND_URL}/contracts/upload`, {
            method: 'POST',
            body: outForm,
        });

        if (backendRes.ok) {
            const data = await backendRes.json();
            return NextResponse.json(data, { status: backendRes.status });
        }
        
        return NextResponse.json({ error: `Backend returned ${backendRes.status}` }, { status: backendRes.status });
    } catch (err) {
        console.error('[upload route] Unexpected error:', err);
        return NextResponse.json({ error: 'Upload proxy failed', details: String(err) }, { status: 500 });
    }
}
