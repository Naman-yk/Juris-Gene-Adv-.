/**
 * Resolves the BACKEND_URL from Render's environment variables.
 * 
 * Render's `property: host` returns just the service name (e.g., "jurisgenie-backend-6ijp")
 * without the ".onrender.com" suffix or "https://" protocol.
 * This helper ensures we get a fully qualified URL.
 */
export function resolveBackendUrl(): string {
    const raw = process.env.BACKEND_URL || 'http://localhost:3001';

    // Already a full URL
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
        return raw;
    }

    // Already a full hostname (contains a dot)
    if (raw.includes('.')) {
        return `https://${raw}`;
    }

    // Bare Render service name (e.g., "jurisgenie-backend-6ijp") → append .onrender.com
    return `https://${raw}.onrender.com`;
}

export const BACKEND_URL = resolveBackendUrl();
