import os
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.document import Document
from app.schemas.document import DocumentRead
from app.services.export_service import ExportService

router = APIRouter()


@router.get("/{offer_id}", response_model=list[DocumentRead])
async def list_documents_by_offer(
    offer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """List all documents for a given job offer, ordered by most recent first."""
    result = await db.execute(
        select(Document)
        .where(Document.job_offer_id == offer_id)
        .order_by(Document.created_at.desc())
    )
    documents = result.scalars().all()
    return [DocumentRead.model_validate(d) for d in documents]


@router.get("/{doc_id}/download")
async def download_document(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Download the stored file for a document (DOCX or PDF)."""
    result = await db.execute(select(Document).where(Document.id == doc_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if not document.file_path:
        raise HTTPException(
            status_code=404,
            detail="No file available — export the document first via POST /{id}/export",
        )
    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    ext = os.path.splitext(document.file_path)[1].lower()  # '.docx' | '.pdf' | …
    if ext == ".docx":
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif ext == ".pdf":
        media_type = "application/pdf"
    else:
        media_type = "application/octet-stream"

    type_slug = document.type.value.lower()  # "cv" or "cover_letter"
    filename = f"{type_slug}_v{document.version}{ext}"
    return FileResponse(path=document.file_path, filename=filename, media_type=media_type)


@router.post("/{doc_id}/export")
async def export_document(
    doc_id: uuid.UUID,
    format: Literal["pdf", "docx"] = Query(..., description="Export format: pdf or docx"),
    db: AsyncSession = Depends(get_db),
):
    """Export a document to PDF or DOCX and return the file."""
    result = await db.execute(select(Document).where(Document.id == doc_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if not document.content:
        raise HTTPException(status_code=400, detail="Document has no content to export")

    svc = ExportService()
    file_path = svc.export(document, format)

    document.file_path = file_path
    await db.flush()
    await db.refresh(document)

    filename = f"{document.type.value.lower()}_v{document.version}.{format}"
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream",
    )


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(doc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Delete a document permanently."""
    result = await db.execute(select(Document).where(Document.id == doc_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.delete(document)


@router.patch("/{doc_id}/validate", response_model=DocumentRead)
async def validate_document(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Mark a document as validated by the user (is_validated = True)."""
    result = await db.execute(select(Document).where(Document.id == doc_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.is_validated = True
    await db.flush()
    await db.refresh(document)
    return DocumentRead.model_validate(document)
