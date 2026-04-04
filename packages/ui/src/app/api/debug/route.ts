import { NextResponse } from 'next/server';

function ensureProtocol(url: string): string {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
}

const RAW_BACKEND = process.env.BACKEND_URL;
const BACKEND_URL = ensureProtocol(RAW_BACKEND || 'http://localhost:3001');

export async function GET() {
    const diagnostics: Record<string, any> = {
        raw_BACKEND_URL: RAW_BACKEND ?? '(undefined)',
        resolved_BACKEND_URL: BACKEND_URL,
        NODE_ENV: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
    };

    // Test connectivity to backend
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`${BACKEND_URL}/health`, {
            signal: controller.signal,
            cache: 'no-store',
        });
        clearTimeout(timeout);
        diagnostics.backend_status = res.status;
        diagnostics.backend_response = await res.text();
        diagnostics.backend_ok = true;
    } catch (err: any) {
        diagnostics.backend_ok = false;
        diagnostics.backend_error = err.message || String(err);
        diagnostics.backend_error_name = err.name;
        diagnostics.backend_error_cause = err.cause ? String(err.cause) : undefined;
    }

    return NextResponse.json(diagnostics, { status: 200 });
}
