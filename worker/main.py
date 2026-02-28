# import os
# import uuid
# import tempfile
# import requests
# import logging
# from fastapi import FastAPI, HTTPException, BackgroundTasks
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from typing import Optional

# from pdf_processor import (
#     extract_page_data,
#     chunk_pages,
#     select_important_paragraphs,
#     annotate_pdf,
# )
# from embeddings import embed_texts
# from llm import generate_insight_and_highlights
# from highlight_mapper import map_highlights_to_bboxes

# # Configure logging
# logging.basicConfig(
#     level=os.getenv('WORKER_LOG_LEVEL', 'INFO'),
#     format='[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
# )
# logger = logging.getLogger('worker')

# app = FastAPI(title="Mirage Worker")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# UPLOADTHING_SECRET = os.getenv("UPLOADTHING_SECRET", "")
# TEMP_DIR = tempfile.gettempdir()


# class ProcessRequest(BaseModel):
#     documentId: str
#     projectId: str
#     fileUrl: str


# # ── File Upload (via Node.js backend) ─────────────────────────────────────────

# BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:5000")

# def upload_to_uploadthing(file_path: str, filename: str) -> str:
#     """
#     Upload a file via the Node.js backend, which handles UploadThing v7 upload.
#     Returns the UploadThing file URL.
#     """
#     with open(file_path, "rb") as f:
#         files = {"file": (filename, f, "application/pdf")}
#         resp = requests.post(
#             f"{BACKEND_URL}/api/uploadthing-upload",
#             files=files,
#             timeout=120,
#         )
#         resp.raise_for_status()
#         data = resp.json()
#         return data["fileUrl"]


# # ── Main Processing Pipeline ──────────────────────────────────────────────────

# @app.post("/process")
# async def process_document(req: ProcessRequest):
#     logger.info('process start')
#     """Full document processing pipeline."""
#     tmp_input = os.path.join(TEMP_DIR, f"{req.documentId}_original.pdf")
#     tmp_output = os.path.join(TEMP_DIR, f"{req.documentId}_annotated.pdf")

#     try:
#         # ── Step 1: Download PDF ──────────────────────────────────────────
#         logger.info('[%s] Downloading PDF...', req.documentId)
#         pdf_response = requests.get(req.fileUrl, timeout=60)
#         pdf_response.raise_for_status()
#         with open(tmp_input, "wb") as f:
#             f.write(pdf_response.content)

#         # ── Step 2: Extract text + bounding boxes ────────────────────────
#         logger.info('[%s] Extracting text...', req.documentId)
#         pages = extract_page_data(tmp_input)
#         page_count = len(pages)

#         # ── Step 3: Chunk ─────────────────────────────────────────────────
#         logger.info('[%s] Chunking...', req.documentId)
#         raw_chunks = chunk_pages(pages)

#         # ── Step 4: Embed chunks ──────────────────────────────────────────
#         logger.info('[%s] Embedding %d chunks...', req.documentId, len(raw_chunks))
#         chunk_texts = [c["text"] for c in raw_chunks]

#         # Batch in groups of 32 to avoid API limits
#         embeddings = []
#         for i in range(0, len(chunk_texts), 32):
#             batch = chunk_texts[i:i+32]
#             batch_embeddings = embed_texts(batch)
#             embeddings.extend(batch_embeddings)

#         chunks = []
#         for i, chunk in enumerate(raw_chunks):
#             if i < len(embeddings):
#                 chunks.append({
#                     "text": chunk["text"],
#                     "embedding": embeddings[i],
#                     "pageNumber": chunk["pageNumber"],
#                 })

#         # ── Step 5: Select important paragraphs ──────────────────────────
#         logger.info('[%s] Selecting key paragraphs...', req.documentId)
#         important_paragraphs = select_important_paragraphs(pages)

#         # ── Steps 6 & 7: Generate insights + map to bboxes ───────────────
#         logger.info('[%s] selected %d paragraphs for insight', req.documentId, len(important_paragraphs))
#         insights = []
#         page_blocks_map = {p["pageNumber"]: p["blocks"] for p in pages}

#         for para in important_paragraphs:
#             logger.info('generating insight for page=%s', para.get('pageNumber'))
#             print("In para loop")
#             llm_result = generate_insight_and_highlights(para["text"])
#             page_blocks = page_blocks_map.get(para["pageNumber"], [])
#             highlight_bboxes = map_highlights_to_bboxes(
#                 llm_result.get("highlights", []), page_blocks
#             )
#             insights.append({
#                 "pageNumber": para["pageNumber"],
#                 "insightText": llm_result.get("insight", ""),
#                 "highlights": highlight_bboxes,
#             })

#         # ── Step 8: Annotate PDF ──────────────────────────────────────────
#         logger.info('[%s] Annotating PDF...', req.documentId)
#         annotate_pdf(tmp_input, insights, tmp_output)

#         # ── Upload annotated PDF ──────────────────────────────────────────
#         logger.info('[%s] Uploading annotated PDF...', req.documentId)
#         annotated_filename = f"annotated_{req.documentId}.pdf"
#         try:
#             annotated_url = upload_to_uploadthing(tmp_output, annotated_filename)
#         except Exception as e:
#             logger.warning('UploadThing failed, using original URL: %s', e)
#             annotated_url = req.fileUrl  # fallback to original

#         # ── Step 9: Return results ────────────────────────────────────────
#         logger.info('[%s] processing complete pageCount=%s chunks=%s insights=%s', req.documentId, page_count, len(chunks), len(insights))

#         return {
#             "pageCount": page_count,
#             "chunks": chunks,
#             "insights": insights,
#             "annotatedFileUrl": annotated_url,
#         }

#     except Exception as e:
#         logger.exception('[%s] ERROR: %s', req.documentId, e)
#         raise HTTPException(status_code=500, detail=str(e))
#     finally:
#         # Cleanup temp files
#         for path in [tmp_input, tmp_output]:
#             try:
#                 if os.path.exists(path):
#                     os.remove(path)
#             except Exception:
#                 pass


# class EmbedRequest(BaseModel):
#     text: str


# @app.post("/embed")
# async def embed_text(req: EmbedRequest):
#     """Generate embedding for a single text using local model."""
#     try:
#         embedding = embed_texts([req.text])[0]
#         return {"embedding": embedding}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))


# @app.get("/health")
# def health():
#     return {"status": "ok"}

import os
import asyncio
import tempfile
import requests
import logging
import fitz
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pdf_processor import (
    extract_page_data,
    chunk_pages,
    select_important_paragraphs,
    annotate_pdf,
)
from embeddings import embed_texts
from llm import generate_insight_and_highlights
from highlight_mapper import map_highlights_to_bboxes

# Configure logging
logging.basicConfig(
    level=os.getenv('WORKER_LOG_LEVEL', 'INFO'),
    format='[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
)
logger = logging.getLogger('worker')

app = FastAPI(title="Mirage Worker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADTHING_SECRET = os.getenv("UPLOADTHING_SECRET", "")
TEMP_DIR = tempfile.gettempdir()
INSIGHT_CONCURRENCY = int(os.getenv("INSIGHT_CONCURRENCY", "10"))  # tune per LLM rate limit


class ProcessRequest(BaseModel):
    documentId: str
    projectId: str
    fileUrl: str


# ── File Upload (via Node.js backend) ─────────────────────────────────────────

BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:5000")


def upload_to_uploadthing(file_path: str, filename: str) -> str:
    with open(file_path, "rb") as f:
        files = {"file": (filename, f, "application/pdf")}
        resp = requests.post(
            f"{BACKEND_URL}/api/uploadthing-upload",
            files=files,
            timeout=120,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["fileUrl"]


# ── Concurrent insight generation ────────────────────────────────────────────

async def _generate_insight_for_para(para: dict, semaphore: asyncio.Semaphore) -> dict:
    """
    Run one LLM call inside a semaphore slot so we don't overwhelm the LLM.
    generate_insight_and_highlights is a blocking function, so we offload it
    to a thread via asyncio.to_thread() — keeps the event loop free.
    """
    async with semaphore:
        logger.info('generating insight for page=%s', para.get('pageNumber'))
        try:
            llm_result = await asyncio.to_thread(
                generate_insight_and_highlights, para["text"]
            )
        except Exception as e:
            logger.warning('LLM failed for page=%s: %s', para.get('pageNumber'), e)
            llm_result = {"insight": "", "highlights": []}

        return {
            "pageNumber": para["pageNumber"],
            "insightText": llm_result.get("insight", ""),
            "rawHighlights": llm_result.get("highlights", []),
        }


# ── Main Processing Pipeline ──────────────────────────────────────────────────

@app.post("/process")
async def process_document(req: ProcessRequest):
    """Full document processing pipeline."""
    logger.info('[%s] process start', req.documentId)
    tmp_input = os.path.join(TEMP_DIR, f"{req.documentId}_original.pdf")
    tmp_output = os.path.join(TEMP_DIR, f"{req.documentId}_annotated.pdf")

    try:
        # ── Step 1: Download PDF ──────────────────────────────────────────
        logger.info('[%s] Downloading PDF...', req.documentId)
        pdf_response = requests.get(req.fileUrl, timeout=60)
        pdf_response.raise_for_status()
        with open(tmp_input, "wb") as f:
            f.write(pdf_response.content)

        # ── Step 2: Extract text + bounding boxes ────────────────────────
        logger.info('[%s] Extracting text...', req.documentId)
        pages = await asyncio.to_thread(extract_page_data, tmp_input)
        page_count = len(pages)

        # ── Step 3: Chunk ─────────────────────────────────────────────────
        logger.info('[%s] Chunking...', req.documentId)
        raw_chunks = chunk_pages(pages)

        # ── Step 4: Embed chunks ──────────────────────────────────────────
        logger.info('[%s] Embedding %d chunks...', req.documentId, len(raw_chunks))
        chunk_texts = [c["text"] for c in raw_chunks]

        # Batch embed in groups of 32, offloaded to thread
        embeddings = []
        for i in range(0, len(chunk_texts), 32):
            batch = chunk_texts[i:i + 32]
            batch_embeddings = await asyncio.to_thread(embed_texts, batch)
            embeddings.extend(batch_embeddings)

        chunks = [
            {
                "text": chunk["text"],
                "embedding": embeddings[i],
                "pageNumber": chunk["pageNumber"],
            }
            for i, chunk in enumerate(raw_chunks)
            if i < len(embeddings)
        ]

        # ── Step 5: Select important paragraphs ──────────────────────────
        logger.info('[%s] Selecting key paragraphs...', req.documentId)
        important_paragraphs = select_important_paragraphs(pages)
        logger.info('[%s] selected %d paragraphs for insight', req.documentId, len(important_paragraphs))

        # ── Steps 6 & 7: Generate insights concurrently ──────────────────
        logger.info('[%s] Generating %d insights concurrently (concurrency=%d)...',
                    req.documentId, len(important_paragraphs), INSIGHT_CONCURRENCY)

        page_blocks_map = {p["pageNumber"]: p["blocks"] for p in pages}
        semaphore = asyncio.Semaphore(INSIGHT_CONCURRENCY)

        # Fire all LLM calls at once, capped by semaphore
        insight_tasks = [
            _generate_insight_for_para(para, semaphore)
            for para in important_paragraphs
        ]
        insights_unordered = await asyncio.gather(*insight_tasks)

        # Re-sort by page number to maintain document order
        insights = sorted(insights_unordered, key=lambda x: x["pageNumber"])

        # Map raw highlight phrases to precise bbox coordinates using PDF text search
        with fitz.open(tmp_input) as pdf_doc:
            for insight in insights:
                page_number = insight.get("pageNumber", 0)
                raw_highlights = insight.pop("rawHighlights", [])

                if page_number < 1 or page_number > len(pdf_doc):
                    insight["highlights"] = []
                    continue

                page = pdf_doc[page_number - 1]
                page_blocks = page_blocks_map.get(page_number, [])
                insight["highlights"] = map_highlights_to_bboxes(
                    raw_highlights,
                    page_blocks,
                    page=page,
                )

        # ── Step 8: Annotate PDF ──────────────────────────────────────────
        logger.info('[%s] Annotating PDF...', req.documentId)
        await asyncio.to_thread(annotate_pdf, tmp_input, insights, tmp_output)

        # ── Upload annotated PDF ──────────────────────────────────────────
        logger.info('[%s] Uploading annotated PDF...', req.documentId)
        annotated_filename = f"annotated_{req.documentId}.pdf"
        try:
            annotated_url = await asyncio.to_thread(
                upload_to_uploadthing, tmp_output, annotated_filename
            )
        except Exception as e:
            logger.warning('[%s] UploadThing failed, using original URL: %s', req.documentId, e)
            annotated_url = req.fileUrl

        # ── Step 9: Return results ────────────────────────────────────────
        logger.info('[%s] processing complete pageCount=%s chunks=%s insights=%s',
                    req.documentId, page_count, len(chunks), len(insights))

        return {
            "pageCount": page_count,
            "chunks": chunks,
            "insights": insights,
            "annotatedFileUrl": annotated_url,
        }

    except Exception as e:
        logger.exception('[%s] ERROR: %s', req.documentId, e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for path in [tmp_input, tmp_output]:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass


# ── Embed endpoint ────────────────────────────────────────────────────────────

class EmbedRequest(BaseModel):
    text: str


@app.post("/embed")
async def embed_text(req: EmbedRequest):
    """Generate embedding for a single text using local model."""
    try:
        embedding = (await asyncio.to_thread(embed_texts, [req.text]))[0]
        return {"embedding": embedding}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}
