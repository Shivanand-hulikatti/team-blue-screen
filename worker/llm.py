import os
import json
import requests
from typing import Optional

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MODEL = "arcee-ai/trinity-large-preview:free"


def chat_completion(system_prompt: str, user_message: str) -> str:
    """Call OpenRouter for a chat completion."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mirage-research.app",
        "X-Title": "Mirage Research Platform",
    }
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.2,
    }
    response = requests.post(OPENROUTER_URL, json=payload, headers=headers, timeout=60)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


def generate_insight_and_highlights(paragraph: str) -> dict:
    """
    Given a paragraph, generate an insight and highlight phrases.
    Returns: {"insight": "...", "highlights": ["phrase1", "phrase2"]}
    """
    system = (
        "You are a research analyst. Given a paragraph from a research document, "
        "you must return a JSON object with two fields:\n"
        "1. 'insight': A 2-3 sentence analysis of the paragraph's key finding or contribution.\n"
        "2. 'highlights': An array of 1-3 exact verbatim phrases from the paragraph that are most important.\n"
        "CRITICAL: The phrases in 'highlights' must be EXACT substrings of the input paragraph.\n"
        "Return ONLY valid JSON, no markdown, no extra text."
    )
    user = f"Paragraph:\n{paragraph}"

    try:
        raw = chat_completion(system, user)
        # Strip markdown if present
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        return result
    except Exception as e:
        print(f"LLM insight error: {e}")
        return {"insight": "Could not generate insight.", "highlights": []}
