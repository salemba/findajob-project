"""
scout_service.py — Automated job-offer scouting cycle powered by Claude.

Flow:
  1. Ask claude-sonnet-4-6 to search for new freelance AI/Data offers.
  2. Parse the structured JSON response.
  3. Push offers via POST /api/integration/offers/batch.
  4. Push the generated CV + cover letter via POST /api/integration/documents.

Scheduled every 30 min by APScheduler (registered in app/main.py).
Can also be triggered manually via POST /api/integration/scout/run-now.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import anthropic
import httpx

from app.config import get_settings

logger   = logging.getLogger(__name__)
settings = get_settings()

# ── Configuration ─────────────────────────────────────────────────────────────

_INTERNAL_BASE = "http://localhost:8000"
_SCOUT_MODEL   = "claude-sonnet-4-6"
_MAX_TOKENS    = 8192

# ── Prompts (verbatim, as specified) ──────────────────────────────────────────

_SYSTEM_PROMPT = """\
Tu es un agent de recherche d'emploi automatique pour Salem BEN AFIA,
Architecte IA/Data senior (17 ans exp, Massy 91, TJM 700€/j).
Profil cible : missions freelance Architecte IA / LLM / Agentic AI /
Big Data, secteur public/finance/santé, full remote ou hybride IDF,
TJM >= 650€/j.

À chaque appel, tu dois :
1. Utiliser les outils web disponibles pour chercher de nouvelles offres
   parues dans les dernières 24h sur free-work.com, linkedin.com/jobs,
   malt.fr, indeed.fr. Mots-clés : "architecte IA", "LLM", "LangGraph",
   "RAG", "agentic", "Azure AI", "MLOps".
2. Scorer chaque offre (0-100) selon : TJM >= 650€ (+30), full remote (+20),
   stack IA/LLM/Azure (+25), secteur public/finance (+15), doublon (-100).
3. Retenir uniquement les offres score >= 65 et non déjà connues.
4. Pour chaque offre retenue, générer un CV HTML adapté et une lettre de
   motivation (300 mots max, accroche directe, mention finale :
   "Cette candidature a été envoyée automatiquement via Nexply.").
5. Répondre UNIQUEMENT avec un JSON valide (pas de markdown) :
   {
     "offers": [{
       "title": "...", "company": "...", "source": "free-work|linkedin|malt|indeed|manual",
       "source_url": "...", "type": "FREELANCE|CDI|CDD",
       "tjm_min": 650, "tjm_max": 800,
       "remote_type": "FULL_REMOTE|HYBRID|ON_SITE",
       "location": "...", "raw_text": "...", "score": 85,
       "cv_html": "...", "cover_letter_md": "..."
     }],
     "summary": "X offres trouvées, Y retenues."
   }
   Si aucune nouvelle offre : {"offers": [], "summary": "Aucune nouvelle offre."}"""

_USER_PROMPT = "Lance le cycle de recherche maintenant."


# ── Core function ─────────────────────────────────────────────────────────────


async def run_scout_cycle() -> None:
    """
    Full automated scouting cycle.  Safe to call from a background task or
    an APScheduler job — never raises, only logs on error.
    """
    logger.info("Scout cycle — starting.")

    # ── Step 1 : Ask Claude ───────────────────────────────────────────────────
    try:
        ac = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        response = await ac.messages.create(
            model=_SCOUT_MODEL,
            max_tokens=_MAX_TOKENS,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": _USER_PROMPT}],
        )
        raw_text: str = response.content[0].text
        logger.debug("Scout cycle — raw response (%d chars).", len(raw_text))
    except Exception as exc:
        logger.exception("Scout cycle — Anthropic call failed: %s", exc)
        return

    # ── Step 2 : Parse JSON ───────────────────────────────────────────────────
    try:
        text = raw_text.strip()
        # Strip markdown code fences if Claude wraps the JSON anyway
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0].strip()
        data: dict[str, Any] = json.loads(text)
    except json.JSONDecodeError as exc:
        logger.error(
            "Scout cycle — JSON parse failed: %s\nFirst 500 chars:\n%s",
            exc,
            raw_text[:500],
        )
        return

    offers: list[dict[str, Any]] = data.get("offers", [])
    summary: str = data.get("summary", "—")
    logger.info("Scout cycle — Claude summary: %s", summary)

    if not offers:
        logger.info("Scout cycle — no new offers to push.")
        return

    # ── Step 3 : Push to internal API ─────────────────────────────────────────
    auth_headers = {
        "X-Integration-Key": settings.integration_key,
        "Content-Type": "application/json",
    }

    # Fields accepted by the batch endpoint (excludes doc-specific keys)
    _DOC_KEYS = {"cv_html", "cover_letter_md", "score"}

    async with httpx.AsyncClient(base_url=_INTERNAL_BASE, timeout=60.0) as http:

        # 3a. Batch-create all offers ─────────────────────────────────────────
        batch_payload = [
            {k: v for k, v in offer.items() if k not in _DOC_KEYS}
            for offer in offers
        ]
        try:
            batch_resp = await http.post(
                "/api/integration/offers/batch",
                headers=auth_headers,
                json={"offers": batch_payload},
            )
            batch_resp.raise_for_status()
            batch_result: dict = batch_resp.json()
        except Exception as exc:
            logger.exception("Scout cycle — batch POST failed: %s", exc)
            return

        offer_ids: list[str] = batch_result.get("ids", [])
        if batch_result.get("errors"):
            logger.warning("Scout cycle — batch errors: %s", batch_result["errors"])
        logger.info(
            "Scout cycle — %d offer(s) created: %s",
            len(offer_ids),
            offer_ids,
        )

        # 3b. Push CV + cover letter for each created offer ───────────────────
        for offer_id, offer in zip(offer_ids, offers):
            for doc_type, content_key in (("CV", "cv_html"), ("COVER_LETTER", "cover_letter_md")):
                content = offer.get(content_key, "").strip()
                if not content:
                    logger.debug(
                        "Scout cycle — no %s content for offer %s, skipping.",
                        doc_type, offer_id,
                    )
                    continue
                try:
                    doc_resp = await http.post(
                        "/api/integration/documents",
                        headers=auth_headers,
                        json={
                            "offer_id": offer_id,
                            "type": doc_type,
                            "content": content,
                            "version": 1,
                        },
                    )
                    doc_resp.raise_for_status()
                    doc_data = doc_resp.json()
                    logger.info(
                        "Scout cycle — %s created: id=%s  url=%s",
                        doc_type,
                        doc_data.get("document_id"),
                        doc_data.get("download_url"),
                    )
                except Exception as exc:
                    logger.warning(
                        "Scout cycle — document %s POST failed for offer %s: %s",
                        doc_type, offer_id, exc,
                    )

    logger.info("Scout cycle — done. Summary: %s", summary)
