"""
AlertsService — background job that checks AlertConfig rules against job_offers.

Logging:
  - Console via standard Python logging.
  - alerts.log file for persistent event history.

Scheduling (called by APScheduler every 30 min):
  run_all_active() → iterates active AlertConfig rows, fires run_alert() for
  each one that is due (based on check_interval_hours / last_checked_at).
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.alert_config import AlertConfig
from app.models.job_offer import JobOffer, RemoteType

# ── File logger ────────────────────────────────────────────────────────────────
_file_handler = logging.FileHandler("alerts.log", encoding="utf-8")
_file_handler.setFormatter(
    logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
)
alert_logger = logging.getLogger("alerts")
alert_logger.setLevel(logging.INFO)
if not alert_logger.handlers:
    alert_logger.addHandler(_file_handler)


class AlertsService:

    async def run_alert(
        self, alert: AlertConfig, db: AsyncSession
    ) -> list[dict]:
        """
        Query job_offers that match the alert's criteria.
        Logs results to alerts.log and returns the match list.
        """
        query = select(JobOffer)
        conditions = []

        if alert.keywords:
            conditions.append(
                or_(*[JobOffer.raw_text.ilike(f"%{kw}%") for kw in alert.keywords])
            )

        if alert.min_tjm is not None:
            conditions.append(JobOffer.tjm_min >= alert.min_tjm)

        if alert.remote_only:
            conditions.append(JobOffer.remote_type == RemoteType.FULL_REMOTE)

        if conditions:
            query = query.where(*conditions)

        result = await db.execute(
            query.order_by(JobOffer.found_at.desc()).limit(50)
        )
        offers = result.scalars().all()

        matches = [
            {
                "id": str(o.id),
                "title": o.title,
                "company": o.company,
                "type": o.type.value,
                "remote_type": o.remote_type.value,
                "tjm_min": o.tjm_min,
                "tjm_max": o.tjm_max,
                "compatibility_score": o.compatibility_score,
                "found_at": o.found_at.isoformat() if o.found_at else None,
            }
            for o in offers
        ]

        if matches:
            alert_logger.info(
                "ALERT id=%s keywords=%s → %d offre(s) : %s",
                alert.id,
                alert.keywords,
                len(matches),
                " | ".join(f"{m['company']} — {m['title']}" for m in matches[:10]),
            )
        else:
            alert_logger.info(
                "ALERT id=%s keywords=%s → aucune offre correspondante",
                alert.id,
                alert.keywords,
            )

        return matches

    async def run_all_active(self) -> None:
        """
        Scheduled entry point (APScheduler every 30 min).
        Runs each active AlertConfig that is due based on check_interval_hours.
        """
        alert_logger.info("=== Vérification planifiée des alertes ===")

        async with async_session_factory() as db:
            result = await db.execute(
                select(AlertConfig).where(AlertConfig.is_active == True)  # noqa: E712
            )
            configs = result.scalars().all()
            now = datetime.now(timezone.utc)

            due = [
                c
                for c in configs
                if c.last_checked_at is None
                or (now - c.last_checked_at) >= timedelta(hours=c.check_interval_hours)
            ]

            alert_logger.info(
                "%d/%d alerte(s) active(s) à vérifier",
                len(due),
                len(configs),
            )

            for config in due:
                try:
                    await self.run_alert(config, db)
                    config.last_checked_at = now
                except Exception as exc:
                    alert_logger.error(
                        "ALERT id=%s ERREUR: %s", config.id, exc, exc_info=True
                    )

            await db.commit()
