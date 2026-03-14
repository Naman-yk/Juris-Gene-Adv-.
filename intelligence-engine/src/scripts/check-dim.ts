
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

async function checkDimension() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" });

    try {
        const result = await model.embedContent("Hello world");
        const values = result.embedding.values;
        console.log(`Dimension: ${values.length}`);
    } catch (e) {
        console.error(e);
    }
}

checkDimension();
