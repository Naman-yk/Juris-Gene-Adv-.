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

// Route /pro to the Pro UI (Next.js)
// Using direct middleware mounting to preserve the /pro prefix for Next.js basePath
app.use('/pro', createProxyMiddleware({
    target: process.env.PRO_UI_URL || 'http://localhost:3000',
    changeOrigin: true,
}));

// Route /backend to the Platform Backend API
app.use('/backend', createProxyMiddleware({
    target: process.env.BACKEND_URL || 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: {
        '^/backend': '', // Remove /backend prefix when forwarding
    },
}));

// Parse JSON bodies (after proxy to avoid interference with proxy streams if needed, 
// but fine for these routes)
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
