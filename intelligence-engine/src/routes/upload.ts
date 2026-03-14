import express from "express";
import multer from "multer";
import fs from "fs";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
// @ts-ignore
import pdf from "pdf-parse";
import { authenticateToken } from "../middleware/auth.middleware";
import { chunkText } from "../services/chunker";
import { saveChunks } from "../services/local-search";

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

interface MulterRequest extends express.Request {
  file?: any;
}

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => cb(null, uploadDir),
  filename: (_req: any, file: any, cb: any) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

router.post("/", authenticateToken, upload.single("file"), async (req: express.Request, res: express.Response) => {
  const mReq = req as MulterRequest;
  let text = "";
  let filePath = "";

  try {
    if (mReq.file) {
      filePath = mReq.file.path;
      console.log("Reading PDF/File:", filePath);

      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      text = data.text;
      console.log(`Parsed text length: ${text.length}`);

      // --- LOCAL RAG: Chunk & Store Locally (INSTANT, NO API CALLS) ---
      const chunkSize = Number(process.env.CHUNK_SIZE ?? 8000);
      const chunks = chunkText(text, chunkSize);
      console.log(`Chunked into ${chunks.length} pieces.`);

      // Store chunks locally using keyword index (NO embeddings, NO Pinecone)
      saveChunks(chunks);
      console.log("Chunks indexed locally. ZERO API calls. Instant.");

      // --- Generate Analysis (1 API call, with auto-retry on 429) ---
      let analysis = {};
      const apiKey = process.env.GEMINI_API_KEY!;
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `Analyze this legal document and provide a JSON response with:
      - "clarity_score": number 0-100
      - "risk_score": number 0-100
      - "time_saved": string estimate
      - "summary": brief summary string
      - "risks": array of {
          "label": string (the risk category),
          "value": number 0-100 (risk level),
          "explanation": string (A detailed, legally precise explanation of why this is a risk for this specific document. Do not use generic placeholders. Focus on the legal implications and potential exposure.)
        }

      Document Text:
      ${text.slice(0, 30000)}`;

      let analysisSuccess = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Analysis attempt ${attempt}/3...`);
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const textResponse = response.text();

          const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[0]);
            analysisSuccess = true;
            console.log("Analysis generated successfully!");
            break;
          }
        } catch (analysisError: any) {
          const is429 = analysisError.status === 429;
          if (is429 && attempt < 3) {
            console.log(`Quota hit. Waiting 45s before retry ${attempt + 1}/3...`);
            await new Promise(r => setTimeout(r, 45000));
          } else {
            console.error("Analysis failed:", analysisError.message?.slice(0, 120));
          }
        }
      }

      if (!analysisSuccess) {
        analysis = {
          clarity_score: 50,
          risk_score: 50,
          time_saved: "Estimated 2 hours",
          summary: "Quota temporarily exhausted. Re-upload in a few minutes for full analysis.",
          risks: [{ label: "Pending Analysis", value: 50 }]
        };
      }

      // Cleanup uploaded PDF
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return res.json({
        message: 'File indexed successfully (Local RAG Mode)',
        analysis
      });

    } else {
      return res.status(400).json({ error: "No file uploaded" });
    }

  } catch (error: any) {
    console.error('Upload error:', error);
    try {
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) { }
    res.status(500).json({ error: error.message });
  }
});

export default router;