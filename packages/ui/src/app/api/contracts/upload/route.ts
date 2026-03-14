import { NextRequest, NextResponse } from 'next/server';

function ensureProtocol(url: string): string {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
}

const BACKEND_URL = ensureProtocol(process.env.BACKEND_URL || 'http://localhost:3001');

export async function POST(request: NextRequest) {
    try {
        console.log('[upload route] Received upload request');
        
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

        // Try forwarding to real backend first
        try {
            const outForm = new FormData();
            outForm.append('file', file, file.name);

            const backendRes = await fetch(`${BACKEND_URL}/contracts/upload`, {
                method: 'POST',
                body: outForm,
            });

            if (backendRes.ok) {
                console.log('[upload route] Backend responded:', backendRes.status);
                const data = await backendRes.json();
                return NextResponse.json(data, { status: backendRes.status });
            }
        } catch (fetchErr) {
            console.warn('[upload route] Backend unavailable, using demo mode:', String(fetchErr));
        }

        // Demo mode: return a simulated successful upload
        const demoId = 'jg-' + Date.now().toString(36);
        const title = file.name.replace(/\.(pdf|txt|docx|json)$/i, '').replace(/[-_]/g, ' ');
        const hash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

        return NextResponse.json({
            message: 'Contract ingested successfully (demo mode)',
            contract: {
                id: demoId,
                title: title || 'Uploaded Contract',
                parties: 'Party A ↔ Party B',
                status: 'ACTIVE',
                state: 'DRAFTED',
                hash: hash,
                updatedAt: new Date().toISOString().split('T')[0],
                content: `Demo contract created from ${file.name}. In production, this would contain the extracted text from your uploaded document.`,
                pages: Math.ceil(file.size / 3000),
            },
        });
    } catch (err) {
        console.error('[upload route] Unexpected error:', err);
        return NextResponse.json(
            { error: 'Upload proxy failed', details: String(err) },
            { status: 500 }
        );
    }
}
