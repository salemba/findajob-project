"""
test_integration.py
-------------------
Script autonome (pas pytest) pour valider le module d'intégration Claude Code.

Usage (depuis backend/) :
    .venv/Scripts/python scripts/test_integration.py

Pré-requis :
    pip install httpx
    Le serveur FastAPI doit tourner sur http://localhost:8000
    INTEGRATION_KEY doit correspondre à celui configuré dans .env
"""

import sys
import asyncio
import json
import os
from pathlib import Path

# Allow running from repo root as well
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import httpx
except ImportError:
    print("❌  httpx manquant — lance: pip install httpx")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────

BASE_URL = os.getenv("API_URL", "http://localhost:8000")
INTEGRATION_KEY = os.getenv("INTEGRATION_KEY", "claude-code-integration-key-dev-2025")
HEADERS = {"X-Integration-Key": INTEGRATION_KEY, "Content-Type": "application/json"}

# ── Three fictional offers ─────────────────────────────────────────────────────

OFFERS = [
    {
        "title": "Architecte Solution Cloud Azure — Mission freelance 6 mois",
        "company": "Capgemini Engineering",
        "source": "linkedin",
        "source_url": "https://www.linkedin.com/jobs/view/999000001",
        "raw_text": (
            "Nous recherchons un Architecte Solution Azure expérimenté pour accompagner "
            "la migration d'un ERP legacy vers le cloud. Vous maîtrisez AKS, Terraform, "
            "Azure DevOps et avez une solide expérience en design de microservices. "
            "Mission de 6 mois, renouvelable. TJM : 650-800 €. Full remote possible."
        ),
        "type": "FREELANCE",
        "tjm_min": 650,
        "tjm_max": 800,
        "remote_type": "FULL_REMOTE",
        "location": "Paris (remote)",
        "notes": "Détectée via scraping LinkedIn — Mission longue durée intéressante",
    },
    {
        "title": "Lead Architect Data & IA — CDI Strasbourg",
        "company": "Axa Banque",
        "source": "indeed",
        "source_url": "https://fr.indeed.com/viewjob?jk=abc123def456",
        "raw_text": (
            "Axa Banque renforce son centre d'excellence Data. En tant que Lead Architect "
            "Data & IA, vous définirez la vision technique du data lake, piloterez les "
            "équipes MLOps et garantirez la gouvernance des données (RGPD). "
            "Package : 85-100k€ + bonus. Hybride 2j/semaine."
        ),
        "type": "CDI",
        "salary_min": 85000,
        "salary_max": 100000,
        "remote_type": "HYBRID",
        "location": "Strasbourg",
        "notes": "Poste CDI senior — à analyser pour comparaison avec freelance",
    },
    {
        "title": "Consultant Transformation Numérique — Mission Malt",
        "company": "BNP Paribas CIB",
        "source": "malt",
        "source_url": "https://www.malt.fr/mission/bnp-transformation-numerique-2025",
        "raw_text": (
            "Mission de conseil en transformation numérique pour la DSI CIB de BNP Paribas. "
            "Vous interviendrez sur la rationalisation du portefeuille applicatif, l'adoption "
            "d'une démarche produit et l'évangélisation DevSecOps. "
            "Profil : 12+ ans d'expérience, certifications AWS/Azure appréciées. "
            "TJM : 700-850 €. Paris La Défense, 3j sur site."
        ),
        "type": "FREELANCE",
        "tjm_min": 700,
        "tjm_max": 850,
        "remote_type": "HYBRID",
        "location": "La Défense",
        "notes": "Top client — priorité haute pour candidature",
    },
]

# ── Helpers ───────────────────────────────────────────────────────────────────


def print_separator(title: str = "") -> None:
    line = "─" * 60
    if title:
        print(f"\n{line}")
        print(f"  {title}")
        print(line)
    else:
        print(line)


def dump(data: dict) -> None:
    print(json.dumps(data, indent=2, ensure_ascii=False, default=str))


# ── Test steps ────────────────────────────────────────────────────────────────


async def test_status(client: httpx.AsyncClient) -> None:
    print_separator("1/3  GET /api/integration/status")
    resp = client.get(f"{BASE_URL}/api/integration/status", headers=HEADERS)
    print(f"  Status code : {resp.status_code}")
    data = resp.json()
    dump(data)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    assert data["db_connected"] is True, "DB non connectée !"
    print("  ✅ OK")


async def test_batch(client: httpx.AsyncClient) -> list[str]:
    print_separator("2/3  POST /api/integration/offers/batch  (3 offres)")
    payload = {"offers": OFFERS}
    resp = client.post(
        f"{BASE_URL}/api/integration/offers/batch",
        headers=HEADERS,
        json=payload,
    )
    print(f"  Status code : {resp.status_code}")
    data = resp.json()
    dump(data)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}"
    assert data["created"] == 3, f"Expected 3 created, got {data['created']}"
    assert data["errors"] == [], f"Unexpected errors: {data['errors']}"
    print("  ✅ OK — analyses IA déclenchées en arrière-plan")
    return data["ids"]


async def test_apply(client: httpx.AsyncClient, offer_id: str) -> None:
    print_separator(f"3/3  POST /api/integration/offers/{offer_id[:8]}…/apply")
    payload = {
        "cover_letter_sent": True,
        "cv_version": "CV_2025_v3_senior_archi.pdf",
        "contact_name": "Marie Dupont",
        "contact_email": "marie.dupont@capgemini.com",
        "contact_linkedin": "https://linkedin.com/in/marie-dupont-capgemini",
    }
    resp = client.post(
        f"{BASE_URL}/api/integration/offers/{offer_id}/apply",
        headers=HEADERS,
        json=payload,
    )
    print(f"  Status code : {resp.status_code}")
    data = resp.json()
    dump(data)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}"
    assert data["offer_status"] == "APPLIED", f"Expected APPLIED, got {data['offer_status']}"
    print("  ✅ OK — candidature créée, statut APPLIED")


async def test_auth_rejected(client: httpx.AsyncClient) -> None:
    print_separator("BONUS  Auth check — mauvaise clé doit retourner 401")
    bad_headers = {**HEADERS, "X-Integration-Key": "wrong-key"}
    resp = client.get(f"{BASE_URL}/api/integration/status", headers=bad_headers)
    print(f"  Status code : {resp.status_code}")
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
    print("  ✅ OK — accès refusé avec mauvaise clé")


# ── Main ──────────────────────────────────────────────────────────────────────


async def run() -> None:
    print_separator("INTEGRATION TEST SUITE — FindAJob API")
    print(f"  Base URL : {BASE_URL}")
    print(f"  Key      : {INTEGRATION_KEY[:8]}{'*' * (len(INTEGRATION_KEY) - 8)}")

    # Use synchronous httpx (no async transport needed for local calls)
    with httpx.Client(timeout=30.0) as client:

        # 1. Status
        await test_status(client)

        # 2. Batch create
        offer_ids = await test_batch(client)

        # 3. Apply to first offer
        await test_apply(client, offer_ids[0])

        # 4. Auth guard
        await test_auth_rejected(client)

    print_separator()
    print("  🎉  Tous les tests ont passé !")
    print_separator()


if __name__ == "__main__":
    asyncio.run(run())
