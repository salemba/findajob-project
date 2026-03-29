import json

import anthropic

from app.config import get_settings
from app.models.job_offer import JobOffer
from app.models.document import Document, DocumentType

settings = get_settings()

# Salem BEN AFIA — Architecte IA / Data / Applicatif — 17 ans d'expérience
CANDIDATE_PROFILE = {
    "name": "Salem BEN AFIA",
    "title": "Architecte IA / Data / Applicatif",
    "experience_years": 17,
    "tjm_target": 650,
    "tjm_market": "700-800",
    "cdi_target_salary": "90K€+",
    "availability": "Immédiate",
    "location": "Paris / Île-de-France",
    "preferences": {
        "remote": "Full remote (priorité), ouvert international",
        "contract": "Freelance TJM 650€/j ou CDI 90K€+",
    },
    "current_mission": {
        "company": "Banque de France",
        "period": "2024 – aujourd'hui",
        "role": "Architecte IA / Data senior",
        "highlights": [
            "Conception et déploiement d'agents autonomes IA avec N8N et Apache Airflow",
            "Intégration de LLM souverains : Claude (Anthropic), Mistral via Azure AI Foundry",
            "Architecture PQC (Post-Quantum Cryptography) pour sécurisation des flux sensibles",
            "Rédaction HLD/LLD au COCA (Comité d'Architecture de la Banque de France)",
            "Infrastructure GPU H100/A100 pour inférence et fine-tuning de modèles",
            "Orchestration multi-agents, RAG sur données internes réglementaires",
        ],
    },
    "previous_experiences": [
        {
            "company": "Société Générale",
            "period": "2021-2024",
            "role": "Lead Architecte Data & Cloud",
            "highlights": [
                "Architecture data lake sur Azure (ADLS Gen2, Databricks, Delta Lake)",
                "Migration legacy vers microservices event-driven (Kafka, Kubernetes)",
                "Définition des standards d'architecture pour 5 équipes produit",
            ],
        },
        {
            "company": "AXA Group",
            "period": "2018-2021",
            "role": "Architecte Solutions Senior",
            "highlights": [
                "Architecture API-first pour plateforme assurance (REST/GraphQL)",
                "Cloud AWS : EKS, Lambda, RDS Aurora, S3",
                "Mise en place MLOps pipeline pour modèles actuariels",
            ],
        },
        {
            "company": "Capgemini / Sogeti",
            "period": "2007-2018",
            "role": "Consultant Architecte IT",
            "highlights": [
                "11 ans de missions dans banque, assurance, télécoms, retail",
                "Delivery de projets critiques jusqu'à 5M€",
                "Formation et coaching d'équipes architecture",
            ],
        },
    ],
    "skills": {
        "ia_ml": [
            "LLM (Claude, GPT-4, Mistral, Llama)",
            "Agents IA (N8N, LangChain, AutoGen)",
            "RAG (Retrieval Augmented Generation)",
            "Azure AI Foundry",
            "Hugging Face",
            "MLOps (MLflow, Kubeflow)",
            "GPU H100/A100",
            "Fine-tuning",
        ],
        "architecture": [
            "Architecture d'entreprise (TOGAF)",
            "Architecture SOA/Microservices",
            "Event-Driven Architecture (Kafka, RabbitMQ)",
            "API Design (REST, GraphQL, gRPC)",
            "Domain-Driven Design (DDD)",
            "Architecture hexagonale",
            "CQRS/Event Sourcing",
            "Post-Quantum Cryptography (PQC)",
            "Zero Trust Security",
        ],
        "cloud_data": [
            "Azure (Expert)",
            "AWS (Advanced)",
            "GCP (Intermédiaire)",
            "Kubernetes / Helm / ArgoCD",
            "Terraform / Pulumi",
            "Databricks / Spark",
            "Data Lake / Data Mesh",
            "PostgreSQL",
            "MongoDB",
            "Redis",
            "Elasticsearch",
        ],
        "languages_frameworks": [
            "Python (FastAPI, SQLAlchemy)",
            "TypeScript / Node.js",
            "Java / Spring Boot",
            "Rust (notions)",
            "React 18",
        ],
        "governance": [
            "HLD/LLD (Dossiers d'architecture)",
            "COCA / DAT",
            "RGPD / Conformité réglementaire bancaire",
            "ISO 27001",
        ],
    },
    "certifications": [
        "TOGAF 9.2 Certified",
        "AWS Solutions Architect Professional",
        "Azure Solutions Architect Expert (AZ-305)",
        "Kubernetes CKA",
    ],
    "education": "Master Informatique — Université Paris-Saclay",
    "languages": ["Français (natif)", "Anglais (courant, C1)", "Arabe (parlé)"],
    "key_differentiators": [
        "Double compétence IA générative + Architecture bancaire réglementée",
        "PQC : l'un des rares architectes maîtrisant la cryptographie post-quantique en production",
        "Expérience GPU computing (H100/A100) rare hors GAFAM",
        "Capacité à rédiger des dossiers d'architecture au niveau COPA/COCA",
        "Livraison prouvée sur environnements critiques (BdF, SG, AXA)",
    ],
}


MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 2000


class ClaudeService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    def _call(self, system: str, user: str) -> str:
        """Synchronous Claude call. Returns response text."""
        message = self.client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return message.content[0].text

    async def analyze_offer(self, offer: JobOffer) -> dict:
        """
        Analyze a job offer against Salem BEN AFIA's profile.
        Returns structured JSON: score, score_details, keywords, strengths, warnings.
        """
        system = (
            "Tu es un expert en matching de profils IT senior pour le marché freelance et CDI français.\n"
            "Tu analyses les offres d'emploi et les évalues avec précision et honnêteté.\n"
            "Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte autour."
        )

        offer_info = (
            f"Titre : {offer.title}\n"
            f"Entreprise : {offer.company}\n"
            f"Type de contrat : {offer.type.value}\n"
            f"Remote : {offer.remote_type.value}\n"
            f"Localisation : {offer.location or 'Non précisée'}\n"
            f"TJM annoncé : {f'{offer.tjm_min}-{offer.tjm_max}€/j' if offer.tjm_min else 'Non précisé'}\n"
            f"Salaire annoncé : {f'{offer.salary_min}-{offer.salary_max}€' if offer.salary_min else 'Non précisé'}\n"
            f"Durée contrat : {offer.contract_duration or 'Non précisée'}\n\n"
            f"TEXTE BRUT DE L'OFFRE :\n{offer.raw_text[:6000]}"
        )

        user = f"""Analyse cette offre pour Salem BEN AFIA.

OFFRE :
{offer_info}

PROFIL SALEM BEN AFIA :
{json.dumps(CANDIDATE_PROFILE, ensure_ascii=False, indent=2)}

Retourne UNIQUEMENT ce JSON :
{{
  "score": <entier 0-100>,
  "score_details": {{
    "technical_match": <entier 0-100>,
    "experience_match": <entier 0-100>,
    "remote_match": <entier 0-100>,
    "compensation_match": <entier 0-100>,
    "domain_match": <entier 0-100>,
    "comment": "<synthèse 2-3 phrases>"
  }},
  "keywords": ["<mot-clé tech 1>", "<mot-clé tech 2>"],
  "strengths": ["<point fort 1>", "<point fort 2>", "<point fort 3>"],
  "warnings": ["<alerte 1>", "<alerte 2>"]
}}

Règles de scoring :
- score 90-100 : mission idéale, tout match
- score 75-89 : bonne opportunité, quelques ajustements
- score 50-74 : mission correcte, points d'attention
- score < 50 : déconseillée, trop de divergences
- Remote FULL_REMOTE = +15 pts si offre full remote
- TJM < 550 = warning obligatoire
- Technos PQC / LLM / agents IA = +10 pts bonus"""

        text = self._call(system, user)
        return json.loads(text)

    async def generate_cv(self, offer: JobOffer) -> str:
        """
        Generate an ATS-optimized CV for Salem BEN AFIA targeting a specific offer.
        Returns plain text, max 2 pages, Banque de France missions first.
        """
        system = (
            "Tu es un expert en rédaction de CV pour architectes IT senior sur le marché français.\n"
            "Tu génères des CV optimisés ATS en texte brut, percutants et personnalisés.\n"
            "Génère UNIQUEMENT le contenu du CV, sans commentaires ni balises markdown."
        )

        user = f"""Génère un CV ATS texte brut 2 pages maximum pour Salem BEN AFIA.

OFFRE CIBLE :
Titre : {offer.title}
Entreprise : {offer.company}
Type : {offer.type.value}
Remote : {offer.remote_type.value}
TJM : {f'{offer.tjm_min}-{offer.tjm_max}€/j' if offer.tjm_min else 'Non précisé'}

TEXTE DE L'OFFRE :
{offer.raw_text[:3000]}

PROFIL COMPLET :
{json.dumps(CANDIDATE_PROFILE, ensure_ascii=False, indent=2)}

Instructions :
1. Commence IMMÉDIATEMENT par les missions Banque de France (poste actuel) en tête
2. Intègre les mots-clés exacts de l'offre dans les descriptions de missions
3. Format texte brut ATS (pas de tableaux, pas de colonnes, pas de caractères spéciaux)
4. Structure : En-tête | Profil (3 lignes max) | Expériences (chrono inverse) | Compétences | Formation | Certifications
5. Chaque mission = 3-4 bullet points avec verbes d'action et métriques chiffrées
6. Maximum 2 pages (environ 800-900 mots)
7. Mets en avant PQC, LLM souverains, agents IA si mentionnés dans l'offre"""

        return self._call(system, user)

    async def generate_cover_letter(self, offer: JobOffer) -> str:
        """
        Generate a cover letter for Salem BEN AFIA.
        300-350 words, direct senior tone, surprising hook, no hollow phrases.
        """
        system = (
            "Tu es expert en rédaction de lettres de motivation pour profils IT senior.\n"
            "Style : direct, senior, sans formules creuses ni platitudes.\n"
            "Génère UNIQUEMENT la lettre, sans commentaires."
        )

        user = f"""Rédige une lettre de motivation pour Salem BEN AFIA.

OFFRE :
Titre : {offer.title}
Entreprise : {offer.company}
Type : {offer.type.value}
Remote : {offer.remote_type.value}

TEXTE DE L'OFFRE :
{offer.raw_text[:3000]}

PROFIL :
{json.dumps(CANDIDATE_PROFILE, ensure_ascii=False, indent=2)}

Contraintes STRICTES :
1. 300-350 mots EXACTEMENT (compte les mots)
2. Accroche surprenante et spécifique à l'entreprise (pas "C'est avec grand intérêt...")
3. Ton direct senior : "je livre", "j'ai construit", pas "je souhaite mettre à profit"
4. Cite 2 réalisations concrètes avec chiffres (BdF en priorité si pertinent)
5. Zéro formule creuse : pas de "dynamique", "passionné", "orienté résultats"
6. Conclure sur une proposition de valeur claire, pas une demande de pitié
7. Formule de politesse sobre : "Cordialement, Salem BEN AFIA"
8. Personnalise pour {offer.company} avec un détail spécifique à l'entreprise"""

        return self._call(system, user)

    async def regenerate_document(self, doc: Document) -> str:
        """
        Regenerate an existing document with improvements.
        Assumes doc.job_offer relationship is loaded.
        Returns new content string.
        """
        offer = doc.job_offer

        if doc.type == DocumentType.CV:
            system = (
                "Tu es expert en rédaction de CV pour architectes IT senior.\n"
                "Tu régénères un CV existant avec des améliorations ciblées.\n"
                "Génère UNIQUEMENT le contenu CV amélioré, sans commentaires."
            )
            user = f"""Régénère et améliore ce CV pour Salem BEN AFIA.

OFFRE CIBLE :
Titre : {offer.title if offer else 'Non précisée'}
Entreprise : {offer.company if offer else 'Non précisée'}

CV ACTUEL (version {doc.version}) :
{doc.content}

Améliorations à apporter :
1. Renforce les verbes d'action et les métriques
2. Améliore l'accroche et le résumé de profil
3. Optimise les mots-clés ATS selon l'offre
4. Garde la même structure, améliore le fond"""

        else:  # COVER_LETTER
            system = (
                "Tu es expert en rédaction de lettres de motivation pour profils IT senior.\n"
                "Tu régénères une lettre existante avec des améliorations.\n"
                "Génère UNIQUEMENT la lettre améliorée, sans commentaires."
            )
            user = f"""Régénère et améliore cette lettre de motivation pour Salem BEN AFIA.

OFFRE CIBLE :
Titre : {offer.title if offer else 'Non précisée'}
Entreprise : {offer.company if offer else 'Non précisée'}

LETTRE ACTUELLE (version {doc.version}) :
{doc.content}

Améliorations :
1. Accroche plus percutante et plus spécifique
2. Exemples plus concrets avec métriques
3. Ton encore plus direct, moins de formules
4. 300-350 mots STRICTEMENT"""

        return self._call(system, user)
