## 🤖 RAG-CHATBOT1: Context-Aware Document Q\&A System

Unleash the power of your documents with a minimal yet robust **Retrieval-Augmented Generation (RAG)** chatbot. This system allows you to upload PDFs and text files, index their content, and receive highly accurate, context-aware answers powered by Google's Gemini models and Pinecone vector database.

### 🚀 Features at a Glance

| Feature | Description | Benefit |
| :--- | :--- | :--- |
| **Document Ingestion** | Upload and parse **PDF/TXT** files. | Seamless integration of your proprietary data. |
| **Gemini Embeddings** | Chunk and embed text using **Gemini Embeddings**. | State-of-the-art semantic search capability. |
| **Pinecone Vector DB** | Store and manage high-dimensional vectors. | Fast, scalable, and efficient similarity search. |
| **Gemini LLM** | Query with context-aware answers from **Gemini**. | Highly accurate and relevant responses. |
| **Upstash Redis Caching** | Caching layer for repeated queries. | Improved response time and reduced API costs. |
| **Minimal Stack** | Built with Node.js, Express, and TypeScript. | Lightweight, familiar, and easy to maintain. |
| **Full Deployment** | Ready for production deployment on platforms like Render. | Quick transition from development to live application. |

### 🛠️ Technology Stack

  * **Backend:** Node.js, Express, TypeScript
  * **LLM & Embeddings:** Gemini API
  * **Vector Database:** Pinecone
  * **Caching:** Upstash Redis
  * **Frontend:** Simple HTML for demonstration
  * **Deployment:** Render (Example)

### 💡 How the RAG System Works

The system implements a classic RAG workflow, ensuring your AI-generated answers are always grounded in your uploaded documents.

1.  **Ingestion:** A user uploads a **PDF** or **TXT** file.
2.  **Extraction:** The text is extracted from the document.
3.  **Chunking:** The extracted text is divided into smaller, manageable **chunks** (e.g., $CHUNK\_SIZE=800$).
4.  **Embedding:** Each text chunk is converted into a high-dimensional vector using **Gemini Embeddings**.
5.  **Indexing:** These vectors are stored in the **Pinecone Vector Database**.
6.  **Query:** A user asks a question. The question is also converted into an embedding.
7.  **Retrieval:** The query embedding is used to search Pinecone for the **top-k** most similar document chunks.
8.  **Augmentation:** These retrieved chunks (the context) are combined with the user's question.
9.  **Generation:** The augmented prompt is sent to the **Gemini LLM**, which generates the final, context-aware **Answer**.
10. **Caching:** The Answer is stored in the **Redis Cache** for fast retrieval on repeated questions.

> **Workflow:** PDF → Extract → Chunk → Embed → Pinecone → Query → Retrieve → Gemini → Answer → Redis Cache

### 📂 Project Structure

A clean and organized structure for maintainability:

```
src/
├── app.ts            # Express application setup
├── server.ts         # Server configuration and startup
├── routes/           # API endpoints (e.g., /upload, /query)
├── services/         # Core logic (Pinecone, Gemini, Redis, Chunking)
└── frontend/index.html # Simple demo UI
```

### ⚙️ Setup and Installation

Follow these steps to get your RAG Chatbot running locally.

#### 1\. Clone the Repository

```bash
git clone https://github.com/yourusername/rag-chatbot.git
cd rag-chatbot
```

#### 2\. Install Dependencies

```bash
npm install
```

#### 3\. Configure Environment Variables

Create a file named `.env` in the root directory and populate it with your API keys and configuration settings.

```dotenv
PORT=4090

# Google AI
GEMINI_API_KEY=YOUR_GEMINI_KEY

# Pinecone
PINECONE_API_KEY=YOUR_PINECONE_KEY
PINECONE_INDEX=your-index # Ensure this index is created in your Pinecone console

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# RAG Configuration
CHUNK_SIZE=800       # Size of text blocks for embedding
PINECONE_BATCH_SIZE=50 # How many vectors to upload in a single batch
```

#### 4\. Run in Development

Start the server using the development script. It will automatically restart on file changes.

```bash
npm run dev
```

The server will be running at `http://localhost:4090`. Open your browser to access the minimal frontend and start interacting with your documents\!

-----

