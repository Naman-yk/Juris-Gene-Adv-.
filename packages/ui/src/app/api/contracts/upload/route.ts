import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';


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

        console.log(`[upload] Forwarding ${file.name} (${file.size} bytes) to ${BACKEND_URL}/contracts/upload`);

        const outForm = new FormData();
        outForm.append('file', file, file.name);

        // 60s timeout to allow for Render free-tier cold starts
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        try {
            const backendRes = await fetch(`${BACKEND_URL}/contracts/upload`, {
                method: 'POST',
                body: outForm,
                signal: controller.signal,
            });

            clearTimeout(timeout);

            const responseText = await backendRes.text();
            let data;
            try {
                data = JSON.parse(responseText);
            } catch {
                console.error('[upload] Non-JSON response from backend:', responseText.substring(0, 500));
                return NextResponse.json({ error: 'Backend returned non-JSON response', details: responseText.substring(0, 200) }, { status: 502 });
            }

            if (backendRes.ok) {
                return NextResponse.json(data, { status: backendRes.status });
            }

            console.error('[upload] Backend error:', backendRes.status, data);
            return NextResponse.json({ error: data.error || `Backend returned ${backendRes.status}`, details: data }, { status: backendRes.status });
        } catch (fetchErr: any) {
            clearTimeout(timeout);
            if (fetchErr.name === 'AbortError') {
                console.error('[upload] Backend request timed out after 60s');
                return NextResponse.json({ error: 'Backend request timed out. The service may be starting up — please try again in 30 seconds.' }, { status: 504 });
            }
            throw fetchErr;
        }
    } catch (err) {
        console.error('[upload] Unexpected error:', err);
        return NextResponse.json({ error: 'Upload proxy failed', details: String(err) }, { status: 500 });
    }
}
