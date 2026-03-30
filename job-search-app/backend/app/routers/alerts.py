import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.alert_config import AlertConfig
from app.schemas.alert_config import AlertConfigCreate, AlertConfigRead, AlertConfigUpdate
from app.services.alerts_service import AlertsService

router = APIRouter()


@router.get("/", response_model=list[AlertConfigRead])
async def list_alert_configs(db: AsyncSession = Depends(get_db)):
    """Return all alert configurations."""
    result = await db.execute(select(AlertConfig).order_by(AlertConfig.created_at.desc()))
    return [AlertConfigRead.model_validate(a) for a in result.scalars().all()]


@router.post("/", response_model=AlertConfigRead, status_code=status.HTTP_201_CREATED)
async def create_alert_config(
    payload: AlertConfigCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new alert configuration."""
    alert = AlertConfig(**payload.model_dump())
    db.add(alert)
    await db.flush()
    await db.refresh(alert)
    return AlertConfigRead.model_validate(alert)


@router.put("/{alert_id}", response_model=AlertConfigRead)
async def update_alert_config(
    alert_id: uuid.UUID,
    payload: AlertConfigUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing alert configuration."""
    result = await db.execute(select(AlertConfig).where(AlertConfig.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert config not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(alert, field, value)

    await db.flush()
    await db.refresh(alert)
    return AlertConfigRead.model_validate(alert)


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert_config(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete an alert configuration."""
    result = await db.execute(select(AlertConfig).where(AlertConfig.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert config not found")
    await db.delete(alert)


@router.post("/{alert_id}/run", response_model=list[dict[str, Any]])
async def run_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger an alert and return matching job offers."""
    result = await db.execute(select(AlertConfig).where(AlertConfig.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert config not found")

    svc = AlertsService()
    matches = await svc.run_alert(alert, db)
    return matches
