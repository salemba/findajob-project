"""
test_integration_documents.py — Tests for POST /api/integration/documents.

Coverage
--------
- POST /documents with valid key + existing offer  → 201, document_id + download_url
- POST /documents with wrong key                   → 401
- POST /documents without key header               → 422
- POST /documents with non-existent offer_id       → 404
- POST /documents with COVER_LETTER type           → 201
"""

import uuid
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient

BASE        = "/api/integration"
OFFERS_BASE = "/api/v1/job-offers"

# Must match the value monkeypatched by the autouse fixture below
VALID_KEY = "test-integration-key-for-unit-tests"
WRONG_KEY = "definitely-wrong-key"

VALID_OFFER: dict = {
    "title": "Architecte Cloud Azure",
    "company": "Acme Corp",
    "source": "linkedin",
    "raw_text": "We need a senior cloud architect with 10+ years of Azure experience.",
    "type": "CDI",
    "remote_type": "HYBRID",
    "found_at": "2024-01-15T10:00:00",
}

CV_CONTENT = """\
Jean Dupont
Architecte Cloud Senior

PROFIL
Expert Azure & AWS avec 12 ans d'expérience en transformation numérique.

COMPÉTENCES TECHNIQUES
• Azure (AKS, DevOps, Functions)
• Terraform, Kubernetes, Docker
• Architecture microservices

EXPÉRIENCES PROFESSIONNELLES
2020-2024  Lead Architect — Capgemini
  Conception d'une plateforme data lake sur Azure.
"""

LETTER_CONTENT = """\
Madame, Monsieur,

Suite à votre offre d'architecte Cloud publiée sur LinkedIn,
je me permets de vous adresser ma candidature.

Fort de 12 années d'expérience dans l'architecture IT et la transformation
numérique, je suis convaincu de pouvoir apporter une valeur significative
à vos équipes.

Dans l'attente de vous rencontrer, je reste à votre disposition.

Cordialement,
Jean Dupont
"""


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def patch_integration_key(monkeypatch):
    """Override integration_key for every test in this module."""
    import app.routers.integration as mod
    monkeypatch.setattr(mod.settings, "integration_key", VALID_KEY)


# ── Helpers ───────────────────────────────────────────────────────────────────


async def _create_offer(client: AsyncClient) -> str:
    resp = await client.post(f"{OFFERS_BASE}/", json=VALID_OFFER)
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


# ── Tests ─────────────────────────────────────────────────────────────────────


async def test_create_cv_document_valid_key(
    client: AsyncClient, tmp_path
) -> None:
    """Valid key + existing offer → 201, returns document_id and download_url."""
    offer_id = await _create_offer(client)

    with patch("app.routers.integration.ExportService") as MockSvc:
        instance = MockSvc.return_value
        fake_path = str(tmp_path / "cv_v1.docx")
        instance.export.return_value = fake_path

        resp = await client.post(
            f"{BASE}/documents",
            headers={"X-Integration-Key": VALID_KEY},
            json={
                "offer_id": offer_id,
                "type": "CV",
                "content": CV_CONTENT,
                "version": 1,
            },
        )

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert "document_id" in body
    assert "download_url" in body
    assert body["download_url"].endswith("/download")
    assert body["download_url"].startswith("/api/v1/documents/")
    # Verify ExportService.export() was called once with format "docx"
    instance.export.assert_called_once()
    _call_args = instance.export.call_args
    assert _call_args.args[1] == "docx"


async def test_create_document_wrong_key(client: AsyncClient) -> None:
    """Wrong integration key → 401."""
    resp = await client.post(
        f"{BASE}/documents",
        headers={"X-Integration-Key": WRONG_KEY},
        json={
            "offer_id": str(uuid.uuid4()),
            "type": "CV",
            "content": "Some content",
            "version": 1,
        },
    )
    assert resp.status_code == 401


async def test_create_document_no_key(client: AsyncClient) -> None:
    """Missing X-Integration-Key header → 422 (required header absent)."""
    resp = await client.post(
        f"{BASE}/documents",
        json={
            "offer_id": str(uuid.uuid4()),
            "type": "CV",
            "content": "Some content",
            "version": 1,
        },
    )
    assert resp.status_code == 422


async def test_create_document_offer_not_found(client: AsyncClient) -> None:
    """Non-existent offer_id → 404."""
    resp = await client.post(
        f"{BASE}/documents",
        headers={"X-Integration-Key": VALID_KEY},
        json={
            "offer_id": str(uuid.uuid4()),  # random UUID not in DB
            "type": "CV",
            "content": "Some content",
            "version": 1,
        },
    )
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


async def test_create_cover_letter(client: AsyncClient, tmp_path) -> None:
    """COVER_LETTER type is accepted and creates a document."""
    offer_id = await _create_offer(client)

    with patch("app.routers.integration.ExportService") as MockSvc:
        instance = MockSvc.return_value
        instance.export.return_value = str(tmp_path / "cover_letter_v1.docx")

        resp = await client.post(
            f"{BASE}/documents",
            headers={"X-Integration-Key": VALID_KEY},
            json={
                "offer_id": offer_id,
                "type": "COVER_LETTER",
                "content": LETTER_CONTENT,
                "version": 1,
            },
        )

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert "document_id" in body
    assert "download_url" in body


async def test_document_version_stored(client: AsyncClient, tmp_path) -> None:
    """The version field is persisted correctly (version=2)."""
    offer_id = await _create_offer(client)

    with patch("app.routers.integration.ExportService") as MockSvc:
        MockSvc.return_value.export.return_value = str(tmp_path / "cv_v2.docx")

        resp = await client.post(
            f"{BASE}/documents",
            headers={"X-Integration-Key": VALID_KEY},
            json={
                "offer_id": offer_id,
                "type": "CV",
                "content": CV_CONTENT,
                "version": 2,
            },
        )

    assert resp.status_code == 201
    doc_id = resp.json()["document_id"]

    # Fetch the document via the standard documents endpoint to verify version
    docs_resp = await client.get(f"/api/v1/documents/{offer_id}")
    assert docs_resp.status_code == 200
    docs = docs_resp.json()
    matching = [d for d in docs if d["id"] == doc_id]
    assert len(matching) == 1
    assert matching[0]["version"] == 2
    assert matching[0]["model_used"] == "claude-code"
    assert matching[0]["is_validated"] is False
