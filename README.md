# JurisGenie — Deterministic Legal Infrastructure Stack

A production-grade legal contract analysis and execution engine built on deterministic, pure-function principles. This repository contains the complete "Infrastructure for India" stack (and global legal markets), from AI ingestion to deterministic state-machine execution and blockchain anchoring.

## High-Level Architecture

| Layer | Component | Package/Module | Purpose |
|-------|-----------|----------------|---------|
| **L7** | **Pro UI** | `packages/ui` | Next.js Advanced Dashboard with Blockchain visualization & core analysis |
| **L6** | **Gateway** | `intelligence-engine` | Unified Node.js gateway (port 8000) for Classic vs Pro experience |
| **L6** | **Backend** | `packages/platform` | REST API, SQLite persistence, and Orchestration layer |
| **L5** | **Execution** | `packages/execution` | State machine, obligation lifecycle, and penalty computation (Pure Function) |
| **L4** | **Engine** | `packages/engine` | Deterministic rule evaluation (Pure Function) |
| **L3** | **Core** | `packages/core` | Canonical serialization, SHA-256 hashing, and Legal Invariants |
| **AI** | **Inference** | `intelligence-engine` | RAG-powered clause extraction and legal intelligence |

## Core Guarantees

1. **Determinism**: `evaluate(input) === evaluate(input)` — reproducible results across any machine.
2. **Purity**: Core logic (L3-L5) performs no I/O, ensuring absolute reliability.
3. **Hash Verification**: Every result is cryptographically signed with SHA-256 for tamper detection.
4. **AI Firewall**: Human-in-the-loop verification before AI data enters the execution state.
5. **Unified Gateway**: Seamless transition from Classic landing pages to Advanced Pro analytics.

## Prerequisites

- **Node.js**: ≥ 20.0.0
- **pnpm**: `npm install -g pnpm`
- **API Keys**: Google Gemini (AI) and Pinecone (Vector Store)

## Quick Start (Local Development)

```bash
# 1. Install all dependencies
pnpm install

# 2. Run the full unified stack (Gateway + Pro UI + Backend)
# Port 8000 (Gateway), 3000 (Pro UI), 3001 (Backend)
npm run dev:all (custom script) or run them in separate terminals:
- Terminal A: cd packages/platform && npm run dev
- Terminal B: cd packages/ui && npm run dev
- Terminal C: cd intelligence-engine && npm run dev
```

## Deployment via Render

This project is pre-configured for **Render Blueprints**. 
Simply connect this repository to Render, and it will automatically provision:
- **jurisgenie-classic**: The public gateway and landing page.
- **jurisgenie-backend**: The transactional API.
- **jurisgenie-pro**: The mission-critical analytics dashboard.

*See `render.yaml` for configuration details.*

## Project Structure

```
.
├── intelligence-engine/   # Gateway, Classic UI (HTML/JS), and RAG Backend
├── packages/
│   ├── ui/               # Next.js 14 Pro UI Dashboard
│   ├── platform/         # Express API and persistence
│   ├── core/             # L3: Types + Serialization + Hashing
│   ├── engine/           # L4: Rule Engine
│   └── execution/        # L5: State Machine
├── render.yaml           # Deployment blueprint
└── replace-urls.js       # Production URL sanitizer
```

## Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, Lucide React (Pro); Vanilla JS/Tailwind (Classic)
- **Backend**: Node.js/Express, better-sqlite3
- **AI**: Google Gemini Pro, Pinecone Vector DB
- **Determinism**: Decimal.js, SHA-256 Hashing
- **Build System**: pnpm workspaces, Turborepo-ready
