console.log("DEBUG: server.ts loaded");

import dotenv from 'dotenv';
dotenv.config();

import app from "./app";

import { ensureIndex } from "./services/init-index";
import { initDb } from "./db/init";

const PORT = process.env.PORT || 8000;

(async () => {
    try {
        initDb();
        if (process.env.PINECONE_INDEX) {
            await ensureIndex(process.env.PINECONE_INDEX);
        }
        app.listen(Number(PORT), () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (e) {
        console.error("Failed to start server:", e);
        process.exit(1);
    }
})();
