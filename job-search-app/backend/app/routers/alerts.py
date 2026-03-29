from datetime import datetime, date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.models.application import Application, ApplicationStatus
from app.models.job_offer import JobOffer
from app.services.claude_service import ClaudeService

router = APIRouter()


class AlertSettings(BaseModel):
    follow_up_days: int = Field(7, ge=1, le=30, description="Days before follow-up reminder")
    next_step_warning_days: int = Field(2, ge=1, le=14)
    email_alerts_enabled: bool = False
    email_to: Optional[str] = None


class AlertItem(BaseModel):
    type: str
    severity: str
    title: str
    description: str
    application_id: Optional[str] = None
    job_offer_title: Optional[str] = None
    company: Optional[str] = None
    due_date: Optional[str] = None


@router.get("/", response_model=list[AlertItem])
async def get_alerts(
    days_ahead: int = 7,
    db: AsyncSession = Depends(get_db),
):
    """Get all active alerts: overdue follow-ups, upcoming deadlines, stale applications."""
    alerts: list[AlertItem] = []
    today = date.today()
    deadline = today + timedelta(days=days_ahead)

    # 1. Follow-up overdue
    result = await db.execute(
        select(Application, JobOffer)
        .join(JobOffer, Application.job_offer_id == JobOffer.id)
        .where(
            and_(
                Application.follow_up_date.isnot(None),
                Application.follow_up_date <= today,
                Application.status.notin_([
                    ApplicationStatus.REJECTED,
                    ApplicationStatus.WITHDRAWN,
                    ApplicationStatus.OFFER_ACCEPTED,
                    ApplicationStatus.GHOSTED,
                ]),
            )
        )
    )
    for app, offer in result.all():
        alerts.append(AlertItem(
            type="follow_up_overdue",
            severity="high",
            title=f"Relance en retard",
            description=f"La relance pour {offer.company} était prévue le {app.follow_up_date}",
            application_id=str(app.id),
            job_offer_title=offer.title,
            company=offer.company,
            due_date=str(app.follow_up_date),
        ))

    # 2. Upcoming next steps
    result = await db.execute(
        select(Application, JobOffer)
        .join(JobOffer, Application.job_offer_id == JobOffer.id)
        .where(
            and_(
                Application.next_step_date.isnot(None),
                Application.next_step_date >= today,
                Application.next_step_date <= deadline,
            )
        )
    )
    for app, offer in result.all():
        alerts.append(AlertItem(
            type="upcoming_step",
            severity="medium",
            title=f"Prochaine étape à venir",
            description=f"{app.next_step_description or 'Étape prévue'} chez {offer.company} le {app.next_step_date}",
            application_id=str(app.id),
            job_offer_title=offer.title,
            company=offer.company,
            due_date=str(app.next_step_date),
        ))

    # 3. Stale applications (sent > 21 days, no update)
    stale_threshold = today - timedelta(days=21)
    result = await db.execute(
        select(Application, JobOffer)
        .join(JobOffer, Application.job_offer_id == JobOffer.id)
        .where(
            and_(
                Application.status == ApplicationStatus.SENT,
                Application.applied_date.isnot(None),
                Application.applied_date <= stale_threshold,
            )
        )
    )
    for app, offer in result.all():
        alerts.append(AlertItem(
            type="stale_application",
            severity="low",
            title=f"Candidature sans réponse",
            description=f"Candidature chez {offer.company} envoyée le {app.applied_date} sans réponse depuis plus de 21 jours",
            application_id=str(app.id),
            job_offer_title=offer.title,
            company=offer.company,
            due_date=str(app.applied_date),
        ))

    # 4. Expiring job offers
    result = await db.execute(
        select(JobOffer)
        .where(
            and_(
                JobOffer.expiry_date.isnot(None),
                JobOffer.expiry_date >= today,
                JobOffer.expiry_date <= deadline,
                JobOffer.status.notin_(["Candidatée", "Ignorée", "Expirée"]),
            )
        )
    )
    for offer in result.scalars().all():
        alerts.append(AlertItem(
            type="offer_expiring",
            severity="medium",
            title=f"Offre qui expire bientôt",
            description=f"L'offre '{offer.title}' chez {offer.company} expire le {offer.expiry_date}",
            job_offer_title=offer.title,
            company=offer.company,
            due_date=str(offer.expiry_date),
        ))

    # Sort by severity
    severity_order = {"high": 0, "medium": 1, "low": 2}
    alerts.sort(key=lambda a: severity_order.get(a.severity, 3))

    return alerts


@router.get("/summary", response_model=dict)
async def get_alerts_summary(db: AsyncSession = Depends(get_db)):
    """Get a quick summary count of alerts by severity."""
    all_alerts = await get_alerts(days_ahead=7, db=db)
    summary = {"high": 0, "medium": 0, "low": 0, "total": len(all_alerts)}
    for alert in all_alerts:
        summary[alert.severity] = summary.get(alert.severity, 0) + 1
    return summary
