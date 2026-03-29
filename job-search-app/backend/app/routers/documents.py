import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.document import Document
from app.schemas.document import DocumentRead

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
    """Download a document as a file (requires file_path to be set on the document)."""
    result = await db.execute(select(Document).where(Document.id == doc_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if not document.file_path:
        raise HTTPException(status_code=400, detail="No file available for this document")
    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    filename = f"{document.type.value.lower()}_v{document.version}.txt"
    return FileResponse(
        path=document.file_path,
        filename=filename,
        media_type="text/plain",
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
