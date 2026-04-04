import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/backend-url';

export async function GET() {
    const diagnostics: Record<string, any> = {
        raw_BACKEND_URL: process.env.BACKEND_URL ?? '(undefined)',
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
        diagnostics.backend_error_cause = err.cause ? String(err.cause) : undefined;
    }

    return NextResponse.json(diagnostics, { status: 200 });
}
