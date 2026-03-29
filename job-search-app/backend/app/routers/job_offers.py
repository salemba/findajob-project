import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_

from app.database import get_db
from app.models.job_offer import JobOffer, OfferStatus, OfferType, RemoteType
from app.schemas.job_offer import (
    JobOfferCreate,
    JobOfferUpdate,
    JobOfferRead,
)

router = APIRouter()


class StatusUpdate(BaseModel):
    status: OfferStatus


@router.get("/", response_model=dict)
async def list_job_offers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[OfferStatus] = None,
    remote_type: Optional[RemoteType] = None,
    type: Optional[OfferType] = None,
    score_min: Optional[int] = Query(None, ge=0, le=100),
    is_favorite: Optional[bool] = None,
    search: Optional[str] = None,
    order_by: str = Query(
        "created_at",
        pattern="^(created_at|compatibility_score|company|title|found_at)$",
    ),
    order_desc: bool = True,
    db: AsyncSession = Depends(get_db),
):
    query = select(JobOffer)

    filters = []
    if status:
        filters.append(JobOffer.status == status)
    if remote_type:
        filters.append(JobOffer.remote_type == remote_type)
    if type:
        filters.append(JobOffer.type == type)
    if score_min is not None:
        filters.append(JobOffer.compatibility_score >= score_min)
    if is_favorite is not None:
        filters.append(JobOffer.is_favorite == is_favorite)
    if search:
        filters.append(
            or_(
                JobOffer.title.ilike(f"%{search}%"),
                JobOffer.company.ilike(f"%{search}%"),
                JobOffer.raw_text.ilike(f"%{search}%"),
            )
        )

    if filters:
        query = query.where(and_(*filters))

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    order_col = getattr(JobOffer, order_by, JobOffer.created_at)
    if order_desc:
        query = query.order_by(order_col.desc())
    else:
        query = query.order_by(order_col.asc())

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    offers = result.scalars().all()

    return {
        "items": [JobOfferRead.model_validate(o) for o in offers],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


@router.get("/stats", response_model=dict)
async def get_stats(db: AsyncSession = Depends(get_db)):
    total_result = await db.execute(select(func.count(JobOffer.id)))
    total = total_result.scalar_one()

    status_counts_result = await db.execute(
        select(JobOffer.status, func.count(JobOffer.id)).group_by(JobOffer.status)
    )
    by_status = {row[0].value: row[1] for row in status_counts_result.all()}

    avg_score_result = await db.execute(
        select(func.avg(JobOffer.compatibility_score))
    )
    avg_score = avg_score_result.scalar_one()

    favorites_result = await db.execute(
        select(func.count(JobOffer.id)).where(JobOffer.is_favorite == True)  # noqa: E712
    )
    favorites_count = favorites_result.scalar_one()

    return {
        "total": total,
        "by_status": by_status,
        "avg_score": round(float(avg_score), 1) if avg_score else None,
        "favorites_count": favorites_count,
    }


@router.get("/{offer_id}", response_model=JobOfferRead)
async def get_job_offer(offer_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(JobOffer).where(JobOffer.id == offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")
    return JobOfferRead.model_validate(offer)


@router.post("/", response_model=JobOfferRead, status_code=status.HTTP_201_CREATED)
async def create_job_offer(
    payload: JobOfferCreate,
    db: AsyncSession = Depends(get_db),
):
    offer = JobOffer(**payload.model_dump())
    db.add(offer)
    await db.flush()
    await db.refresh(offer)
    return JobOfferRead.model_validate(offer)


@router.put("/{offer_id}", response_model=JobOfferRead)
async def update_job_offer(
    offer_id: uuid.UUID,
    payload: JobOfferUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(JobOffer).where(JobOffer.id == offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(offer, key, value)

    await db.flush()
    await db.refresh(offer)
    return JobOfferRead.model_validate(offer)


@router.delete("/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job_offer(offer_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(JobOffer).where(JobOffer.id == offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")
    await db.delete(offer)


@router.patch("/{offer_id}/status", response_model=JobOfferRead)
async def update_offer_status(
    offer_id: uuid.UUID,
    payload: StatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(JobOffer).where(JobOffer.id == offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")

    offer.status = payload.status
    await db.flush()
    await db.refresh(offer)
    return JobOfferRead.model_validate(offer)


@router.patch("/{offer_id}/favorite", response_model=JobOfferRead)
async def toggle_favorite(
    offer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(JobOffer).where(JobOffer.id == offer_id))
    offer = result.scalar_one_or_none()
    if not offer:
        raise HTTPException(status_code=404, detail="Job offer not found")

    offer.is_favorite = not offer.is_favorite
    await db.flush()
    await db.refresh(offer)
    return JobOfferRead.model_validate(offer)
