import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import os
import math
import tempfile
from typing import List, Dict, Tuple
from collections import Counter
import re

MIN_TEXT_DENSITY = 50  # chars per page minimum before OCR fallback
CHUNK_TOKEN_TARGET = 600


# ── Text Extraction ──────────────────────────────────────────────────────────

def extract_page_data(pdf_path: str) -> List[Dict]:
    """
    Extract text blocks with bounding boxes from each page.
    Falls back to Tesseract OCR for low-density pages.
    Returns: [{pageNumber, blocks: [{text, bbox}]}]
    """
    doc = fitz.open(pdf_path)
    pages = []

    for page_num, page in enumerate(doc, start=1):
        blocks_raw = page.get_text("blocks")  # (x0, y0, x1, y1, text, block_no, block_type)
        text_blocks = [
            {"text": b[4].strip(), "bbox": (b[0], b[1], b[2], b[3])}
            for b in blocks_raw
            if b[6] == 0 and b[4].strip()  # type 0 = text
        ]

        page_text = " ".join(b["text"] for b in text_blocks)

        # OCR fallback for sparse pages
        if len(page_text) < MIN_TEXT_DENSITY:
            ocr_blocks = _ocr_page(page)
            if ocr_blocks:
                text_blocks = ocr_blocks

        pages.append({"pageNumber": page_num, "blocks": text_blocks})

    doc.close()
    return pages


def _ocr_page(page: fitz.Page) -> List[Dict]:
    """Render page to image and run Tesseract OCR."""
    try:
        mat = fitz.Matrix(2, 2)  # 2x zoom for better OCR quality
        pix = page.get_pixmap(matrix=mat)
        img_data = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_data))

        ocr_data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        blocks = []
        for i, text in enumerate(ocr_data["text"]):
            text = text.strip()
            if text and ocr_data["conf"][i] > 30:
                x = ocr_data["left"][i] / 2
                y = ocr_data["top"][i] / 2
                w = ocr_data["width"][i] / 2
                h = ocr_data["height"][i] / 2
                blocks.append({"text": text, "bbox": (x, y, x + w, y + h)})
        return blocks
    except Exception as e:
        print(f"OCR error: {e}")
        return []


# ── Chunking ─────────────────────────────────────────────────────────────────

def _estimate_tokens(text: str) -> int:
    return len(text.split())


def chunk_pages(pages: List[Dict]) -> List[Dict]:
    """
    Chunk page blocks into ~500-800 token chunks preserving page numbers.
    Returns: [{text, pageNumber}]
    """
    chunks = []
    for page in pages:
        page_num = page["pageNumber"]
        current_chunk = []
        current_tokens = 0

        for block in page["blocks"]:
            text = block["text"]
            tokens = _estimate_tokens(text)

            if current_tokens + tokens > CHUNK_TOKEN_TARGET and current_chunk:
                chunks.append({"text": " ".join(current_chunk), "pageNumber": page_num})
                current_chunk = []
                current_tokens = 0

            current_chunk.append(text)
            current_tokens += tokens

        if current_chunk:
            chunks.append({"text": " ".join(current_chunk), "pageNumber": page_num})

    return chunks


# ── Important Paragraph Selection ────────────────────────────────────────────

def _tfidf_score(text: str, all_texts: List[str]) -> float:
    """Simple TF-IDF score for a text against a corpus."""
    words = re.findall(r'\w+', text.lower())
    if not words:
        return 0.0
    tf = Counter(words)
    N = len(all_texts)
    score = 0.0
    for word, count in tf.items():
        tf_val = count / len(words)
        df = sum(1 for t in all_texts if word in t.lower())
        idf = math.log((N + 1) / (df + 1)) + 1
        score += tf_val * idf
    return score


def select_important_paragraphs(pages: List[Dict]) -> List[Dict]:
    """
    Select top paragraphs per page for insight generation.
    Returns: [{pageNumber, text, blocks}]
    """
    page_count = len(pages)
    all_texts = [b["text"] for p in pages for b in p["blocks"]]
    selected = []

    for page in pages:
        blocks = [b for b in page["blocks"] if len(b["text"].split()) > 15]
        if not blocks:
            blocks = page["blocks"][:2]  # fallback

        if page_count < 10:
            # Analyze all blocks
            candidates = blocks
        else:
            # Top 2 by TF-IDF
            scored = sorted(
                blocks,
                key=lambda b: _tfidf_score(b["text"], all_texts),
                reverse=True,
            )
            candidates = scored[:2]

        for block in candidates:
            selected.append({
                "pageNumber": page["pageNumber"],
                "text": block["text"],
                "blocks": page["blocks"],
            })

    return selected


# ── PDF Annotation ────────────────────────────────────────────────────────────

def annotate_pdf(original_path: str, insights: List[Dict], output_path: str):
    """
    Add highlight annotations to PDF for each insight's bboxes.
    insights: [{pageNumber, highlights: [{text, bbox: {x0,y0,x1,y1}}]}]
    
    IMPORTANT: Uses page.add_highlight_annot() to add annotations as metadata 
    objects that sit 'over' the text without flattening. Saves with clean=False 
    to preserve the original searchable text layer.
    """
    doc = fitz.open(original_path)

    for insight in insights:
        page_num = insight["pageNumber"] - 1  # 0-indexed
        if page_num < 0 or page_num >= len(doc):
            continue

        page = doc[page_num]
        for hl in insight.get("highlights", []):
            bbox = hl.get("bbox")
            if not bbox:
                continue
            try:
                # Create rectangle for the highlight area
                rect = fitz.Rect(bbox["x0"], bbox["y0"], bbox["x1"], bbox["y1"])
                
                # Add highlight annotation (sits above text as metadata)
                highlight = page.add_highlight_annot(rect)
                
                # Set yellow color with some transparency
                highlight.set_colors(stroke=[1, 0.8, 0])  # RGB yellow
                
                # Optional: set opacity for better visibility
                highlight.set_opacity(0.4)
                
                # Update the annotation to apply changes
                highlight.update()
            except Exception as e:
                print(f"Annotation error on page {page_num + 1}: {e}")

    # Save with options that preserve text layer and don't flatten
    # clean=False: Don't remove unused objects (preserves structure)
    # deflate=True: Compress streams for smaller file size
    # garbage=4: Maximum garbage collection (removes duplicate objects)
    # linear=False: Don't linearize (faster save for web viewing isn't needed here)
    doc.save(
        output_path,
        garbage=4,
        deflate=True,
        clean=False,
        pretty=False,
        linear=False,
    )
    doc.close()
