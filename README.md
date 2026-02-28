# Mirage

AI-powered research document intelligence platform with:
- Project-scoped PDF ingestion and processing
- Automatic insight + highlight extraction
- Search/RAG chat grounded in uploaded documents
- Interactive PDF viewer with annotations, user notes, and image-region Q&A
- 3D knowledge graph generated from project insights

---

## Table of Contents

- [What Mirage does](#what-mirage-does)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Environment variables](#environment-variables)
- [Run locally (recommended for development)](#run-locally-recommended-for-development)
- [Run with Docker Compose](#run-with-docker-compose)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Processing pipeline](#processing-pipeline)
- [RAG and scope isolation](#rag-and-scope-isolation)
- [Knowledge graph generation](#knowledge-graph-generation)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)

---

## What Mirage does

Mirage is a multi-service application for research workflows:

1. Create a project.
2. Upload one or more PDF files.
3. Process each PDF asynchronously (text extraction, chunking, embeddings, insights, highlight mapping, annotation).
4. View annotated PDF pages and generated insights.
5. Ask project-scoped questions in chat (text + optional image-region context).
6. Explore a generated 3D knowledge graph of project entities and relationships.

---

## Architecture

```text
Frontend (React, port 3000)
     ├─ Dashboard / Projects / Document Viewer / Knowledge Graph
     ├─ Uploads files via backend endpoint
     └─ Calls backend REST API
                         │
                         ▼
Backend (Node.js + Express + Mongoose, port 5001 externally)
     ├─ Project / Document / Insight / Chat / Graph APIs
     ├─ UploadThing proxy upload endpoint
     ├─ Triggers worker processing (HTTP)
     └─ Stores metadata, chunks, embeddings, insights in MongoDB
                         │
                         ▼
Worker (Python FastAPI, port 8000)
     ├─ Downloads original PDF
     ├─ Extracts text + bboxes (PyMuPDF, OCR fallback)
     ├─ Generates chunk embeddings (SentenceTransformers)
     ├─ Generates insights + highlight phrases (OpenRouter)
     ├─ Maps phrases to accurate bboxes
     └─ Writes annotated PDF and uploads back via backend

MongoDB
     └─ Stores projects, documents, chunks, insights
```

---

## Tech stack

### Frontend
- React 18
- React Router 6
- Tailwind CSS
- PDF.js (CDN-loaded in viewer)
- `react-force-graph-3d` + `three-spritetext`

### Backend
- Node.js + Express
- Mongoose (MongoDB)
- Axios
- Multer
- UploadThing server SDK

### Worker
- FastAPI + Uvicorn
- PyMuPDF (`fitz`)
- Tesseract OCR (`pytesseract`, Pillow)
- SentenceTransformers (`all-MiniLM-L6-v2` local model)
- OpenRouter chat completions

---

## Repository structure

```text
mirage-0/
├── backend/
│   ├── controllers/
│   │   ├── chatController.js
│   │   ├── documentController.js
│   │   ├── graphController.js
│   │   └── projectController.js
│   ├── models/
│   │   ├── Chunk.js
│   │   ├── Document.js
│   │   ├── Insight.js
│   │   └── Project.js
│   ├── routes/
│   │   ├── api.js
│   │   └── uploadthing.js
│   ├── services/
│   │   ├── embedding.js
│   │   ├── llm.js
│   │   └── worker.js
│   ├── utils/
│   │   └── similarity.js
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── api.js
│   │   └── App.js
│   └── Dockerfile
├── worker/
│   ├── main.py
│   ├── pdf_processor.py
│   ├── embeddings.py
│   ├── llm.py
│   ├── highlight_mapper.py
│   └── requirements.txt
├── docs/
│   └── PDF_HIGHLIGHT_GUIDE.md
└── docker-compose.yml
```

---

## Prerequisites

### For local development
- Node.js 18+ (Node 20 recommended)
- Python 3.11 recommended
- MongoDB (local or Atlas)
- Tesseract OCR installed on your machine
     - macOS: `brew install tesseract`
     - Debian/Ubuntu: `sudo apt-get install tesseract-ocr`

### For Docker workflow
- Docker + Docker Compose

---

## Environment variables

This repo does not currently include `.env.example` files for every service, so create `.env` files manually.

### Root (used by `docker-compose.yml`)

Create `/mirage-0/.env`:

```env
OPENROUTER_API_KEY=your_openrouter_key
UPLOADTHING_TOKEN=your_uploadthing_token
UPLOADTHING_SECRET=your_uploadthing_secret
HF_TOKEN=optional_legacy_value
```

> Note: `HF_TOKEN` is present in compose but current worker embedding path is local `sentence-transformers`, so this value is generally not required.

### Backend (`backend/.env` for local run)

```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/mirage
WORKER_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
OPENROUTER_API_KEY=your_openrouter_key
UPLOADTHING_TOKEN=your_uploadthing_token
```

### Worker (`worker/.env` for local run)

```env
OPENROUTER_API_KEY=your_openrouter_key
BACKEND_URL=http://localhost:5001
INSIGHT_CONCURRENCY=4
WORKER_LOG_LEVEL=INFO
```

### Frontend (`frontend/.env` for local run)

```env
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_UPLOADTHING_URL=/api/uploadthing
```

---

## Run locally (recommended for development)

Run each service in its own terminal.

### 1) Start MongoDB

If local MongoDB is installed:

```bash
mongod
```

Or use Atlas and set `MONGO_URI` accordingly.

### 2) Start backend

```bash
cd backend
npm install
set -a; source .env; set +a
npm run dev
```

Backend health check: `http://localhost:5001/health`

### 3) Start worker

```bash
cd worker
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
set -a; source .env; set +a
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Worker health check: `http://localhost:8000/health`

### 4) Start frontend

```bash
cd frontend
npm install
npm start
```

Frontend URL: `http://localhost:3000`

---

## Run with Docker Compose

From repository root:

```bash
docker compose up --build
```

Exposed services:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5001` (container runs on 5000 internally)
- Worker: `http://localhost:8000`
- MongoDB: `mongodb://localhost:27017`

Stop:

```bash
docker compose down
```

Persisted volume:
- `mongo-data`

---

## API reference

Base URL (local): `http://localhost:5001/api`

### Health

- `GET /health` (backend)
- `GET /health` (worker)

### Projects

- `POST /projects`
     - body: `{ "name": "My Project", "userId": "default-user" }`
- `GET /projects`
- `GET /projects/:id`
- `DELETE /projects/:id`
- `GET /projects/:projectId/knowledge-graph`

### Documents

- `POST /projects/:projectId/upload`
     - body: `{ "fileUrl": "https://...", "filename": "paper.pdf" }`
     - creates `Document` and triggers async worker processing

- `GET /projects/:projectId/documents`
- `GET /documents/:documentId?projectId=:projectId`
- `GET /projects/:projectId/documents/:documentId/insights`
- `POST /projects/:projectId/documents/:documentId/insights`
     - body (user annotation):
          ```json
          {
               "text": "selected text",
               "note": "my note",
               "tags": ["important"],
               "pageNumber": 3,
               "boundingRect": { "left": 10, "top": 20, "width": 100, "height": 24 },
               "type": "user-created"
          }
          ```

### Chat

- `POST /projects/:projectId/chat`
     - supports standard RAG and image-context mode
     - body:
          ```json
          {
               "message": "What are the key findings?",
               "context": "optional selected text",
               "documentId": "optional document scope",
               "imageBase64": "optional data:image/png;base64,..."
          }
          ```

### Upload endpoint

- `POST /uploadthing-upload` (multipart file form)
     - proxied by backend to UploadThing
     - used by frontend drag/drop uploader and worker annotated-PDF upload

---

## Data model

### `Project`
- `name`
- `userId`
- `createdAt`

### `Document`
- `projectId`
- `filename`
- `fileUrl`
- `annotatedFileUrl`
- `status`: `UPLOADED | PROCESSING | DONE | ERROR`
- `pageCount`
- `errorMessage`
- `createdAt`

### `Chunk`
- `projectId`
- `documentId`
- `text`
- `embedding` (numeric vector)
- `pageNumber`

### `Insight`
- `projectId`
- `documentId`
- `pageNumber`
- System-generated: `insightText`, `highlights[]`
- User-created: `type`, `text`, `note`, `tags[]`, `boundingRect`
- timestamps

---

## Processing pipeline

When a PDF is uploaded to a project:

1. Backend creates `Document` with `PROCESSING`.
2. Backend calls worker `POST /process`.
3. Worker downloads original PDF from `fileUrl`.
4. Worker extracts page blocks with bboxes via PyMuPDF.
5. OCR fallback runs for low-text-density pages.
6. Worker chunks text per page (target ~600-token chunks).
7. Worker embeds chunk text using local `all-MiniLM-L6-v2`.
8. Worker selects important paragraph candidates (TF-IDF heuristic).
9. Worker calls OpenRouter to generate insight + highlight phrases.
10. Worker maps phrases to precise bboxes on page.
11. Worker annotates PDF with highlight annotations.
12. Worker uploads annotated PDF through backend upload endpoint.
13. Worker returns chunks/insights/annotated URL.
14. Backend stores chunks and insights, updates document to `DONE` (or `ERROR` on failure).

---

## RAG and scope isolation

Chat behavior (`/projects/:projectId/chat`):

- Embeds user question (and optional selected context).
- Retrieves chunks only from the same `projectId` (and optional `documentId`).
- Ranks chunks with cosine similarity.
- Builds prompt with top sources and strict grounding instruction.
- Returns answer + source metadata (page, score, preview).

This design enforces project-level separation and prevents cross-project retrieval.

---

## Knowledge graph generation

The graph endpoint derives a sparse graph from project insights:

- Nodes:
     - `project`
     - `document`
     - extracted top `entity` tokens from insight text/highlights
- Links:
     - `contains` (project → documents)
     - `mentions` (document → entities)
     - `related` (entity ↔ entity co-occurrence)

Rendered in frontend with interactive 3D force graph.

---

## Troubleshooting

### Worker fails to start
- Ensure system Tesseract is installed (non-Docker local run).
- Confirm Python env is active and `pip install -r requirements.txt` completed.
- First run may take time while sentence-transformer model downloads.

### Upload fails
- Verify `UPLOADTHING_TOKEN` is set for backend.
- Ensure backend endpoint `POST /api/uploadthing-upload` is reachable from frontend and worker.

### Document stuck in `PROCESSING`
- Check backend logs for worker call failures.
- Check worker logs for OpenRouter rate limits/timeouts.
- Increase or lower `INSIGHT_CONCURRENCY` depending on API limits.

### Chat returns “No documents have been processed...”
- Wait until at least one document reaches `DONE`.
- Confirm chunks were written in MongoDB (`chunks` collection).

### PDF text is not selectable or highlights look off
- Review implementation notes in `docs/PDF_HIGHLIGHT_GUIDE.md`.

---

## Known limitations

- No background queue/broker; processing is fire-and-forget with retry on worker call.
- No authentication/authorization yet (default user model).
- In-memory similarity search in backend (no dedicated vector DB).
- Frontend polling (`3s`) for document status rather than push updates.
- LLM quality and cost depend on configured OpenRouter model availability.

---

## Development notes

- Backend dev command: `npm run dev` (`nodemon`).
- Frontend build command: `npm run build`.
- Worker production server command: `uvicorn main:app --host 0.0.0.0 --port 8000`.

If you plan to extend the PDF highlight behavior, start with `docs/PDF_HIGHLIGHT_GUIDE.md`.
