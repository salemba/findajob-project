import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.application import Application, ApplicationStatus
from app.models.job_offer import JobOffer
from app.schemas.application import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationRead,
    ApplicationListRead,
    ApplicationStatusUpdate,
    TimelineEvent,
)

router = APIRouter()


@router.get("/", response_model=dict)
async def list_applications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[ApplicationStatus] = None,
    job_offer_id: Optional[uuid.UUID] = None,
    order_by: str = Query("created_at", regex="^(created_at|applied_date|status|priority)$"),
    order_desc: bool = True,
    db: AsyncSession = Depends(get_db),
):
    query = select(Application)

    filters = []
    if status:
        filters.append(Application.status == status)
    if job_offer_id:
        filters.append(Application.job_offer_id == job_offer_id)
    if filters:
        query = query.where(and_(*filters))

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    order_col = getattr(Application, order_by, Application.created_at)
    query = query.order_by(order_col.desc() if order_desc else order_col.asc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    applications = result.scalars().all()

    return {
        "items": [ApplicationListRead.model_validate(a) for a in applications],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


@router.post("/", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
async def create_application(
    payload: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
):
    # Check job offer exists
    offer_result = await db.execute(
        select(JobOffer).where(JobOffer.id == payload.job_offer_id)
    )
    if not offer_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Job offer not found")

    # Add initial timeline event
    data = payload.model_dump()
    if not data.get("timeline"):
        data["timeline"] = [
            {
                "date": datetime.utcnow().isoformat(),
                "event": "Création de la candidature",
                "description": f"Statut initial : {payload.status.value}",
                "icon": "plus",
            }
        ]

    application = Application(**data)
    db.add(application)
    await db.flush()
    await db.refresh(application)
    return ApplicationRead.model_validate(application)


@router.get("/pipeline", response_model=dict)
async def get_pipeline(db: AsyncSession = Depends(get_db)):
    """Kanban-style pipeline view grouped by status."""
    result = await db.execute(
        select(Application.status, func.count(Application.id)).group_by(Application.status)
    )
    counts = {row[0]: row[1] for row in result.all()}
    return {"pipeline": counts}


@router.get("/{app_id}", response_model=ApplicationRead)
async def get_application(app_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Application).where(Application.id == app_id))
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return ApplicationRead.model_validate(application)


@router.patch("/{app_id}", response_model=ApplicationRead)
async def update_application(
    app_id: uuid.UUID,
    payload: ApplicationUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Application).where(Application.id == app_id))
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key in ("interview_notes", "timeline") and value is not None:
            setattr(application, key, [v.model_dump() if hasattr(v, "model_dump") else v for v in value])
        else:
            setattr(application, key, value)

    await db.flush()
    await db.refresh(application)
    return ApplicationRead.model_validate(application)


@router.patch("/{app_id}/status", response_model=ApplicationRead)
async def update_application_status(
    app_id: uuid.UUID,
    payload: ApplicationStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Application).where(Application.id == app_id))
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    old_status = application.status
    application.status = payload.status

    # Append timeline event
    timeline = list(application.timeline or [])
    timeline.append({
        "date": datetime.utcnow().isoformat(),
        "event": f"Statut mis à jour : {old_status.value} → {payload.status.value}",
        "description": payload.event_description or payload.notes,
        "icon": "arrow-right",
    })
    application.timeline = timeline

    if payload.notes:
        application.notes = (application.notes or "") + f"\n[{datetime.utcnow().date()}] {payload.notes}"

    await db.flush()
    await db.refresh(application)
    return ApplicationRead.model_validate(application)


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(app_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Application).where(Application.id == app_id))
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    await db.delete(application)
