import express from 'express';
import path from 'path';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

import uploadRouter from './routes/upload';
import queryRouter from './routes/query';
import authRouter from './routes/auth.routes';

const app = express();

// ⭐ Enable CORS for all frontend requests
app.use(cors());

// Helper: ensure a URL has a protocol prefix
function ensureProtocol(url: string): string {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
}

const proUiTarget = ensureProtocol(process.env.PRO_UI_URL || 'http://localhost:3000');
const backendTarget = ensureProtocol(process.env.BACKEND_URL || 'http://localhost:3001');

console.log('[Gateway] PRO_UI_URL target:', proUiTarget);
console.log('[Gateway] BACKEND_URL target:', backendTarget);

// Route /pro to the Pro UI (Next.js)
app.use('/pro', createProxyMiddleware({
    target: proUiTarget,
    changeOrigin: true,
    on: {
        error: (err, _req, res) => {
            console.error('[Proxy /pro] Error:', err.message);
            if ('writeHead' in res) {
                (res as any).writeHead(502, { 'Content-Type': 'text/plain' });
                (res as any).end('Pro UI service is currently unavailable. Please try again later.');
            }
        },
    },
}));

// Route /backend to the Platform Backend API
app.use('/backend', createProxyMiddleware({
    target: backendTarget,
    changeOrigin: true,
    pathRewrite: {
        '^/backend': '', // Remove /backend prefix when forwarding
    },
    on: {
        error: (err, _req, res) => {
            console.error('[Proxy /backend] Error:', err.message);
            if ('writeHead' in res) {
                (res as any).writeHead(502, { 'Content-Type': 'text/plain' });
                (res as any).end('Backend service is currently unavailable. Please try again later.');
            }
        },
    },
}));

// Parse JSON bodies (after proxy to avoid interference with proxy streams)
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Serve Frontend (new top-level Frontend/assets folder)
app.use(express.static(path.join(__dirname, "..", "Frontend/assets")));

// Routes
app.use("/upload", uploadRouter);
app.use("/query", queryRouter);
app.use("/auth", authRouter);

// Health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

// Fallback: serve index.html for unmatched routes
app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "Frontend/assets", "index.html"));
});

export default app;
