"""
integration.py — Endpoints dédiés à Claude Code pour l'injection automatique d'offres.

Authentification : header  X-Integration-Key: <INTEGRATION_KEY depuis .env>

Routes
------
GET  /api/integration/status
POST /api/integration/offers/batch
POST /api/integration/offers/{id}/apply
"""

from __future__ import annotations

import uuid
import logging
from datetime import datetime
from typing import Optional

from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import async_session_factory, get_db
from app.models.application import Application
from app.models.document import Document as DocModel, DocumentType
from app.models.job_offer import JobOffer, OfferStatus, OfferType, RemoteType
from app.schemas.job_offer import JobOfferCreate
from app.services.claude_service import ClaudeService
from app.services.export_service import ExportService
from app.services.scout_service import run_scout_cycle

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


# ── Auth dependency ───────────────────────────────────────────────────────────


def verify_integration_key(
    x_integration_key: str = Header(..., alias="X-Integration-Key"),
) -> None:
    """Reject requests that don't carry the correct integration key."""
    if not settings.integration_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="INTEGRATION_KEY not configured on the server.",
        )
    if x_integration_key != settings.integration_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid integration key.",
        )


# ── Pydantic models ───────────────────────────────────────────────────────────


class IntegrationOfferIn(BaseModel):
    """Payload for a single offer sent by Claude Code."""

    title: str = Field(..., min_length=1, max_length=255)
    company: str = Field(..., min_length=1, max_length=255)
    source: str = Field(..., description="linkedin | free-work | malt | indeed | manual")
    source_url: Optional[str] = Field(None, max_length=2048)
    raw_text: str = Field(default="", description="Full job description text")
    type: OfferType = OfferType.CDI
    tjm_min: Optional[int] = Field(None, ge=0)
    tjm_max: Optional[int] = Field(None, ge=0)
    salary_min: Optional[int] = Field(None, ge=0)
    salary_max: Optional[int] = Field(None, ge=0)
    remote_type: RemoteType = RemoteType.HYBRID
    location: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class BatchOfferIn(BaseModel):
    offers: list[IntegrationOfferIn] = Field(..., min_length=1, max_length=50)


class ApplyIn(BaseModel):
    cover_letter_sent: bool = False
    cv_version: Optional[str] = Field(None, max_length=255)
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_linkedin: Optional[str] = Field(None, max_length=500)


# ── Background task ───────────────────────────────────────────────────────────


async def _analyze_offer_background(offer_id: uuid.UUID) -> None:
    """Run Claude analysis for a single offer. Called as a background task."""
    async with async_session_factory() as session:
        try:
            result = await session.execute(select(JobOffer).where(JobOffer.id == offer_id))
            offer = result.scalar_one_or_none()
            if not offer:
                logger.warning("Background analysis: offer %s not found", offer_id)
                return

            service = ClaudeService()
            analysis = await service.analyze_offer(offer)

            offer.compatibility_score = analysis.get("score")
            offer.score_details = analysis.get("score_details", {})
            offer.keywords = analysis.get("keywords", [])
            offer.strengths = analysis.get("strengths", [])
            offer.warnings = analysis.get("warnings", [])
            if offer.status == OfferStatus.NEW:
                offer.status = OfferStatus.ANALYZED

            await session.commit()
            logger.info(
                "Background analysis complete: offer %s score=%s",
                offer_id,
                offer.compatibility_score,
            )
        except Exception as exc:
            logger.exception("Background analysis failed for offer %s: %s", offer_id, exc)
            await session.rollback()


# ── Routes ────────────────────────────────────────────────────────────────────


@router.get(
    "/status",
    summary="Health + stats for Claude Code pre-flight check",
    dependencies=[Depends(verify_integration_key)],
)
async def integration_status(db: AsyncSession = Depends(get_db)) -> dict:
    """
    Retourne l'état de la base et des métriques rapides.
    Claude Code appelle cet endpoint avant d'envoyer des offres.
    """
    # DB connectivity check
    db_connected = False
    total_offers = 0
    pending_analysis = 0
    last_sync: Optional[str] = None

    try:
        total_result = await db.execute(select(func.count(JobOffer.id)))
        total_offers = total_result.scalar_one()

        pending_result = await db.execute(
            select(func.count(JobOffer.id)).where(JobOffer.status == OfferStatus.NEW)
        )
        pending_analysis = pending_result.scalar_one()

        last_result = await db.execute(
            select(JobOffer.created_at).order_by(JobOffer.created_at.desc()).limit(1)
        )
        last_row = last_result.scalar_one_or_none()
        last_sync = last_row.isoformat() if last_row else None
        db_connected = True
    except Exception as exc:
        logger.error("Status check DB error: %s", exc)

    return {
        "db_connected": db_connected,
        "total_offers": total_offers,
        "pending_analysis": pending_analysis,
        "last_sync": last_sync,
        "api_version": settings.app_version,
    }


@router.post(
    "/offers/batch",
    summary="Batch-create offers and trigger automatic AI analysis",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_integration_key)],
)
async def batch_create_offers(
    payload: BatchOfferIn,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Crée plusieurs offres d'un coup.
    Une tâche de fond déclenche l'analyse Claude pour chaque offre créée.
    """
    ALLOWED_SOURCES = {"free-work", "linkedin", "malt", "indeed", "manual"}
    created_ids: list[str] = []
    errors: list[dict] = []

    for idx, item in enumerate(payload.offers):
        try:
            # Validate source
            if item.source not in ALLOWED_SOURCES:
                raise ValueError(
                    f"source '{item.source}' invalide. Valeurs autorisées : {ALLOWED_SOURCES}"
                )

            offer = JobOffer(
                title=item.title,
                company=item.company,
                source=item.source,
                source_url=item.source_url,
                raw_text=item.raw_text,
                type=item.type,
                tjm_min=item.tjm_min,
                tjm_max=item.tjm_max,
                salary_min=item.salary_min,
                salary_max=item.salary_max,
                remote_type=item.remote_type,
                location=item.location,
                notes=item.notes,
                found_at=datetime.utcnow(),
                status=OfferStatus.NEW,
            )
            db.add(offer)
            await db.flush()  # get the generated UUID
            await db.refresh(offer)
            created_ids.append(str(offer.id))

            # Schedule AI analysis as a background task
            background_tasks.add_task(_analyze_offer_background, offer.id)

        except Exception as exc:
            errors.append({"index": idx, "title": item.title, "error": str(exc)})

    # Commit all successful inserts in one shot
    if created_ids:
        await db.commit()

    logger.info(
        "Integration batch: %d created, %d errors", len(created_ids), len(errors)
    )
    return {
        "created": len(created_ids),
        "ids": created_ids,
        "errors": errors,
    }


@router.post(
    "/offers/{offer_id}/apply",
    summary="Mark an offer as applied and create an Application record",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_integration_key)],
)
async def apply_to_offer(
    offer_id: uuid.UUID,
    payload: ApplyIn,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Crée une Application pour l'offre et passe son statut à APPLIED.
    """
    result = await db.execute(select(JobOffer).where(JobOffer.id == offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")

    application = Application(
        job_offer_id=offer_id,
        applied_at=datetime.utcnow(),
        cover_letter_sent=payload.cover_letter_sent,
        cv_version_sent=payload.cv_version,
        contact_name=payload.contact_name,
        contact_email=payload.contact_email,
        contact_linkedin=payload.contact_linkedin,
    )
    db.add(application)

    offer.status = OfferStatus.APPLIED

    await db.flush()
    await db.refresh(application)
    await db.commit()

    return {
        "application_id": str(application.id),
        "offer_id": str(offer_id),
        "offer_status": offer.status.value,
    }


# ── Document ingestion ────────────────────────────────────────────────────────


class DocumentIngestionIn(BaseModel):
    """Payload sent by Claude Code to push a generated document."""

    offer_id: uuid.UUID
    type: Literal["CV", "COVER_LETTER"]
    content: str = Field(..., min_length=1, description="Plain-text content generated by Claude Code")
    version: int = Field(1, ge=1)


@router.post(
    "/documents",
    summary="Receive plain-text document from Claude Code, generate DOCX, persist in DB",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_integration_key)],
)
async def create_integration_document(
    payload: DocumentIngestionIn,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Accepte du texte brut (CV ou lettre de motivation) produit par Claude Code,
    génère un fichier DOCX via ExportService, persiste le Document en base
    et retourne l'URL de téléchargement.
    """
    # 1. Verify offer exists
    result = await db.execute(select(JobOffer).where(JobOffer.id == payload.offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")

    # 2. Create Document record (flush first to get the generated UUID)
    document = DocModel(
        job_offer_id=payload.offer_id,
        type=DocumentType[payload.type],
        content=payload.content,
        version=payload.version,
        model_used="claude-code",
        is_validated=False,
    )
    db.add(document)
    await db.flush()

    # 3. Generate the DOCX file using the existing export service
    svc = ExportService()
    file_path = svc.export(document, "docx")

    # 4. Persist the file path and commit
    document.file_path = file_path
    await db.commit()
    await db.refresh(document)

    logger.info("Integration document created: %s → %s", document.id, file_path)
    return {
        "document_id": str(document.id),
        "download_url": f"/api/v1/documents/{document.id}/download",
    }

# \u2500\u2500 Manual scout trigger \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500


@router.post(
    "/scout/run-now",
    summary="Manually trigger a scout cycle (runs in background)",
    dependencies=[Depends(verify_integration_key)],
)
async def trigger_scout_now(background_tasks: BackgroundTasks) -> dict:
    """
    D\u00e9clenche imm\u00e9diatement un cycle de recherche d'offres sans attendre
    le prochain tick du scheduler. Retourne instantan\u00e9ment.
    """
    background_tasks.add_task(run_scout_cycle)
    return {"status": "started", "message": "Scout cycle triggered manually."}