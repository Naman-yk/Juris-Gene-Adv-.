import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
    try {
        console.log('[upload route] Received upload request');
        
        // Parse the incoming FormData from the browser
        let formData: FormData;
        try {
            formData = await request.formData();
        } catch (parseErr) {
            console.error('[upload route] Failed to parse FormData:', parseErr);
            return NextResponse.json(
                { error: 'Failed to parse form data', details: String(parseErr) },
                { status: 400 }
            );
        }

        const file = formData.get('file');
        console.log('[upload route] File received:', file ? `type=${typeof file}, isFile=${file instanceof File}` : 'null');

        if (!file || !(file instanceof File)) {
            console.error('[upload route] No valid file in FormData. Keys:', Array.from(formData.keys()));
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        console.log('[upload route] File details:', file.name, file.size, file.type);

        // Re-build a fresh FormData to send to the backend
        const outForm = new FormData();
        outForm.append('file', file, file.name);

        let backendRes: Response;
        try {
            backendRes = await fetch(`${BACKEND_URL}/contracts/upload`, {
                method: 'POST',
                body: outForm,
            });
        } catch (fetchErr) {
            console.error('[upload route] Fetch to backend failed:', fetchErr);
            return NextResponse.json(
                { error: 'Backend connection failed', details: String(fetchErr) },
                { status: 502 }
            );
        }

        console.log('[upload route] Backend responded:', backendRes.status);
        const data = await backendRes.json();
        return NextResponse.json(data, { status: backendRes.status });
    } catch (err) {
        console.error('[upload route] Unexpected error:', err);
        return NextResponse.json(
            { error: 'Upload proxy failed', details: String(err) },
            { status: 500 }
        );
    }
}
