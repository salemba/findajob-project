import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.job_offer import JobOffer, OfferStatus
from app.models.document import Document, DocumentType
from app.schemas.document import DocumentRead
from app.services.claude_service import ClaudeService

router = APIRouter()

_MODEL = "claude-sonnet-4-6"


class AnalyzeRequest(BaseModel):
    job_offer_id: uuid.UUID


class GenerateDocRequest(BaseModel):
    job_offer_id: uuid.UUID


@router.post("/analyze", response_model=dict)
async def analyze_offer(
    payload: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Analyze a job offer with Claude: extract score, keywords, strengths, warnings."""
    result = await db.execute(select(JobOffer).where(JobOffer.id == payload.job_offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")

    service = ClaudeService()
    try:
        analysis = await service.analyze_offer(offer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    # Persist results to offer
    offer.compatibility_score = analysis.get("score")
    offer.score_details = analysis.get("score_details", {})
    offer.keywords = analysis.get("keywords", [])
    offer.strengths = analysis.get("strengths", [])
    offer.warnings = analysis.get("warnings", [])
    if offer.status == OfferStatus.NEW:
        offer.status = OfferStatus.ANALYZED

    await db.flush()
    await db.refresh(offer)

    return {
        "job_offer_id": str(offer.id),
        "score": offer.compatibility_score,
        "score_details": offer.score_details,
        "keywords": offer.keywords,
        "strengths": offer.strengths,
        "warnings": offer.warnings,
        "status": offer.status.value,
    }


@router.post("/generate-cv", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def generate_cv(
    payload: GenerateDocRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate an ATS-optimized CV for the given job offer."""
    result = await db.execute(select(JobOffer).where(JobOffer.id == payload.job_offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")

    service = ClaudeService()
    try:
        content = await service.generate_cv(offer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CV generation failed: {str(e)}")

    version_result = await db.execute(
        select(func.max(Document.version))
        .where(Document.job_offer_id == offer.id)
        .where(Document.type == DocumentType.CV)
    )
    max_version = version_result.scalar_one() or 0

    document = Document(
        job_offer_id=offer.id,
        type=DocumentType.CV,
        content=content,
        model_used=_MODEL,
        version=max_version + 1,
    )
    db.add(document)
    await db.flush()
    await db.refresh(document)
    return DocumentRead.model_validate(document)


@router.post(
    "/generate-cover-letter",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
)
async def generate_cover_letter(
    payload: GenerateDocRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a cover letter for the given job offer."""
    result = await db.execute(select(JobOffer).where(JobOffer.id == payload.job_offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")

    service = ClaudeService()
    try:
        content = await service.generate_cover_letter(offer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cover letter generation failed: {str(e)}")

    version_result = await db.execute(
        select(func.max(Document.version))
        .where(Document.job_offer_id == offer.id)
        .where(Document.type == DocumentType.COVER_LETTER)
    )
    max_version = version_result.scalar_one() or 0

    document = Document(
        job_offer_id=offer.id,
        type=DocumentType.COVER_LETTER,
        content=content,
        model_used=_MODEL,
        version=max_version + 1,
    )
    db.add(document)
    await db.flush()
    await db.refresh(document)
    return DocumentRead.model_validate(document)


@router.post("/regenerate/{doc_id}", response_model=DocumentRead)
async def regenerate_document(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Regenerate an existing document with improvements (version++)."""
    doc_result = await db.execute(
        select(Document)
        .where(Document.id == doc_id)
        .options(selectinload(Document.job_offer))
    )
    document = doc_result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    service = ClaudeService()
    try:
        new_content = await service.regenerate_document(document)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Regeneration failed: {str(e)}")

    document.content = new_content
    document.version += 1
    document.is_validated = False
    await db.flush()
    await db.refresh(document)
    return DocumentRead.model_validate(document)
