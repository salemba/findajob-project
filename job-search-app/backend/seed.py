"""
Seed script — inserts 3 fictitious job offers for testing.

Usage (from backend/ directory, with venv activated):
    python seed.py

Or with Docker:
    docker-compose exec backend python seed.py
"""
import asyncio
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.job_offer import JobOffer, OfferType, RemoteType, OfferStatus


OFFERS = [
    # ── Offer 1: Freelance Cloud Architect – Full Remote ─────────────────────
    JobOffer(
        title="Architecte Cloud AWS / GCP – Migration Data Platform",
        company="DataStream SAS",
        source="free-work",
        source_url="https://www.free-work.com/fr/tech-it/freelance/job-mission/architecte-cloud-aws-gcp",
        raw_text="""
Nous recherchons un Architecte Cloud Senior pour piloter la migration de notre
plateforme data vers AWS et GCP.

Missions :
- Définir l'architecture cible multi-cloud (AWS + GCP)
- Migrer les pipelines Spark/Hadoop vers Databricks / BigQuery
- Mettre en place la gouvernance data (Data Catalog, Lineage)
- Accompagner les équipes DevOps sur l'IaC (Terraform, Pulumi)
- Participer aux comités d'architecture et rédiger les ADRs

Compétences requises :
- 10+ ans d'expérience en architecture SI, dont 5+ en cloud
- Maîtrise AWS (EC2, S3, Glue, Redshift, Lambda) et GCP (BigQuery, Dataflow)
- Terraform / Terragrunt, GitOps
- Kafka, Spark, dbt
- Anglais courant (équipe internationale)

Durée : 6 mois renouvelables
TJM : 700–850 €/j
Démarrage : ASAP
""".strip(),
        type=OfferType.FREELANCE,
        tjm_min=700,
        tjm_max=850,
        remote_type=RemoteType.FULL_REMOTE,
        location="Paris / Full Remote",
        contract_duration="6 mois renouvelables",
        compatibility_score=92,
        score_details={
            "ia_llm": 55,
            "big_data": 90,
            "cloud": 95,
            "devops": 80,
            "architecture": 95,
            "comment": "Offre très alignée : AWS/GCP, Terraform, Data Platform. TJM dans la cible.",
        },
        keywords=[
            "AWS", "GCP", "Databricks", "BigQuery", "Terraform",
            "Kafka", "Spark", "dbt", "Migration", "Data Platform",
        ],
        strengths=[
            "TJM supérieur à l'objectif (700–850 vs 600 min)",
            "Stack 100% dans la cible (AWS + GCP)",
            "Full remote — aucun déplacement requis",
            "Mission longue durée (6 mois+)",
        ],
        warnings=[
            "Anglais courant requis — vérifier le niveau attendu",
            "Démarrage ASAP — délai de préavis à anticiper",
        ],
        status=OfferStatus.ANALYZED,
        is_favorite=True,
        notes="Entreprise sérieuse, CTO joignable sur LinkedIn. Relancer si pas de retour avant le 05/04.",
        found_at=datetime(2026, 3, 27, 9, 15, tzinfo=timezone.utc),
    ),

    # ── Offer 2: CDI Principal Architect – Hybrid ────────────────────────────
    JobOffer(
        title="Principal Architect – Digital & Cloud Transformation",
        company="Crédit Industriel SA",
        source="linkedin",
        source_url="https://www.linkedin.com/jobs/view/4123456789",
        raw_text="""
Crédit Industriel SA recherche un Principal Architect pour rejoindre la
Direction Architecture & Innovation de son pôle Digital.

Votre rôle :
- Définir et porter la vision architecturale sur un portefeuille de 15+ projets
- Encadrer une équipe de 6 architectes solutions et applicatifs
- Piloter l'adoption du cloud hybride (Azure + On-Premise)
- Définir les patterns d'intégration (API, Event-Driven, Microservices)
- Représenter l'architecture auprès du COMEX

Profil :
- 12+ ans d'expérience dont 3+ en management d'équipe technique
- Certifications Azure Architecture (AZ-305 ou équivalent)
- Maîtrise des cadres TOGAF / ArchiMate
- Expérience sectorielle banque / finance appréciée
- Leadership reconnu, aisance à l'oral en français et anglais

Package :
- Salaire : 90 000 – 110 000 € brut annuel + variable 15%
- Télétravail 3j/semaine
- Locaux : La Défense (92)
""".strip(),
        type=OfferType.CDI,
        salary_min=90_000,
        salary_max=110_000,
        remote_type=RemoteType.HYBRID,
        location="La Défense, 92",
        compatibility_score=85,
        score_details={
            "ia_llm": 30,
            "big_data": 40,
            "cloud": 75,
            "devops": 50,
            "architecture": 98,
            "leadership": 95,
            "comment": "Excellent pour le volet architecture/leadership. Moins de tech pure que souhaité.",
        },
        keywords=[
            "Azure", "TOGAF", "ArchiMate", "Microservices", "API Gateway",
            "Event-Driven", "Management", "COMEX", "AZ-305",
        ],
        strengths=[
            "Package dans la cible (90–110k + variable)",
            "Management d'équipe — évolution de carrière claire",
            "Grande visibilité stratégique (COMEX)",
        ],
        warnings=[
            "3j présentiel / semaine — moins de flexibilité",
            "TOGAF/ArchiMate peu pratiqué — revoir le profil",
            "Secteur bancaire : cycles de décision lents",
        ],
        status=OfferStatus.NEW,
        is_favorite=False,
        notes="Poste intéressant mais très orienté management. À étudier si ouvert au pivot CDI.",
        found_at=datetime(2026, 3, 28, 14, 30, tzinfo=timezone.utc),
    ),

    # ── Offer 3: Freelance Solutions Architect – Hybrid ──────────────────────
    JobOffer(
        title="Architecte Solutions IA / MLOps – Retail Tech",
        company="Shopstream Technologies",
        source="malt",
        source_url="https://www.malt.fr/mission/architecte-solutions-ia-mlops-retail",
        raw_text="""
Shopstream Technologies (scale-up 250p, Série B) cherche un Architecte Solutions
pour structurer leur stack IA/ML en production.

Contexte : Plateforme de personnalisation e-commerce, 50M sessions/mois.

Périmètre :
- Concevoir l'architecture MLOps end-to-end (Feature Store, Model Registry, CI/CD ML)
- Choisir et intégrer les outils : MLflow, Kubeflow ou Vertex AI
- Définir les patterns d'inférence temps-réel (Kafka + Redis + FastAPI)
- Collaborer avec les Lead Engineers et le CTO
- Rédiger les RFCs architecturales et les guides de bonnes pratiques

Stack actuelle :
- Cloud : AWS (EKS, SageMaker, S3, RDS Aurora)
- Infra : Terraform, ArgoCD, Helm
- Data : dbt, Airflow, Snowflake
- ML : scikit-learn, XGBoost, PyTorch

Durée : 4 mois (option renouvellement 4 mois)
TJM : 650–750 €/j
Démarrage : 14 avril 2026
3j remote / 2j Paris 10e
""".strip(),
        type=OfferType.FREELANCE,
        tjm_min=650,
        tjm_max=750,
        remote_type=RemoteType.HYBRID,
        location="Paris 10e (2j/sem)",
        contract_duration="4 mois + option 4 mois",
        compatibility_score=88,
        score_details={
            "ia_llm": 80,
            "big_data": 70,
            "cloud": 88,
            "devops": 85,
            "architecture": 90,
            "comment": "Très bonne adéquation. MLOps + AWS + Kubernetes dans la cible. IA/LLM moins présent mais MLOps couvre le sujet.",
        },
        keywords=[
            "MLOps", "MLflow", "Kubeflow", "Vertex AI", "AWS SageMaker",
            "Kubernetes", "EKS", "ArgoCD", "Kafka", "FastAPI",
            "Snowflake", "dbt", "Feature Store",
        ],
        strengths=[
            "TJM acceptable (650–750 €/j)",
            "Stack AWS + K8s + Terraform — plein dans la cible",
            "Contexte IA/ML stimulant (scale-up dynamique)",
            "4j remote / semaine",
        ],
        warnings=[
            "2j/semaine sur site à Paris 10e — prévoir déplacements",
            "Forte composante MLOps pure — s'assurer de l'alignement avec l'expertise",
        ],
        status=OfferStatus.NEW,
        is_favorite=True,
        notes="Scale-up prometteuse. CTO ex-Google. Contacter via Malt et aussi LinkedIn pour maximiser les chances.",
        found_at=datetime(2026, 3, 29, 8, 0, tzinfo=timezone.utc),
    ),
]


async def seed() -> None:
    async with async_session_factory() as session:
        session: AsyncSession

        print("🌱  Inserting seed data...")
        for offer in OFFERS:
            session.add(offer)

        await session.commit()

        print(f"✅  {len(OFFERS)} job offers inserted successfully.")
        for o in OFFERS:
            print(f"   • [{o.type.value}] {o.title} @ {o.company}  — score: {o.compatibility_score}")


if __name__ == "__main__":
    asyncio.run(seed())
