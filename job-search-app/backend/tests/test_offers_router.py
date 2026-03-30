"""
test_offers_router.py — Integration tests for /api/v1/job-offers.

Each test is fully isolated: the `client` fixture (from conftest.py) wraps
every request in a transaction that is rolled back on teardown.

Coverage:
  - GET  /stats                       (empty DB + with data)
  - POST /                            (201 created, 422 validation)
  - GET  /                            (list, pagination, filter)
  - GET  /{id}                        (200, 404)
  - PUT  /{id}                        (200 partial-update, 404)
  - DELETE /{id}                      (204, 404, soft-verify deletion)
  - PATCH /{id}/status                (200 all valid statuses, 422 invalid)
  - PATCH /{id}/favorite              (toggle on/off)
"""

import pytest
from httpx import AsyncClient

BASE = "/api/v1/job-offers"

# ─── Shared valid payload ─────────────────────────────────────────────────────

VALID_OFFER: dict = {
    "title": "Architecte Cloud AWS",
    "company": "Acme Corp",
    "source": "linkedin",
    "raw_text": "We need a senior cloud architect with 10+ years of AWS experience.",
    "type": "CDI",
    "remote_type": "HYBRID",
    "found_at": "2024-01-15T10:00:00",
}


# ─── Helper ───────────────────────────────────────────────────────────────────


async def _create(client: AsyncClient, overrides: dict | None = None) -> dict:
    """POST a valid offer (with optional field overrides) and return its body."""
    payload = {**VALID_OFFER, **(overrides or {})}
    resp = await client.post(f"{BASE}/", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ─── Stats ────────────────────────────────────────────────────────────────────


async def test_stats_empty_db(client: AsyncClient) -> None:
    resp = await client.get(f"{BASE}/stats")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 0
    assert body["by_status"] == {}
    assert body["avg_score"] is None
    assert body["favorites_count"] == 0


async def test_stats_with_data(client: AsyncClient) -> None:
    await _create(client)
    await _create(client, {"source": "malt", "type": "FREELANCE"})

    # Promote the third offer to APPLIED
    third = await _create(client, {"source": "indeed"})
    await client.patch(f"{BASE}/{third['id']}/status", json={"status": "APPLIED"})

    resp = await client.get(f"{BASE}/stats")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert body["by_status"].get("NEW", 0) == 2
    assert body["by_status"].get("APPLIED", 0) == 1


# ─── Create ───────────────────────────────────────────────────────────────────


async def test_create_offer_returns_201(client: AsyncClient) -> None:
    offer = await _create(client)
    assert offer["title"] == VALID_OFFER["title"]
    assert offer["company"] == VALID_OFFER["company"]
    assert offer["source"] == VALID_OFFER["source"]
    assert offer["status"] == "NEW"
    assert offer["is_favorite"] is False
    assert "id" in offer


async def test_create_offer_defaults(client: AsyncClient) -> None:
    """score + lists should be absent / empty on a fresh offer."""
    offer = await _create(client)
    assert offer["compatibility_score"] is None
    assert offer["keywords"] == []
    assert offer["strengths"] == []
    assert offer["warnings"] == []


@pytest.mark.parametrize("source", ["free-work", "linkedin", "malt", "indeed", "manual"])
async def test_create_offer_all_valid_sources(client: AsyncClient, source: str) -> None:
    offer = await _create(client, {"source": source})
    assert offer["source"] == source


async def test_create_offer_invalid_source_422(client: AsyncClient) -> None:
    resp = await client.post(f"{BASE}/", json={**VALID_OFFER, "source": "twitter"})
    assert resp.status_code == 422


async def test_create_offer_missing_title_422(client: AsyncClient) -> None:
    payload = {k: v for k, v in VALID_OFFER.items() if k != "title"}
    resp = await client.post(f"{BASE}/", json=payload)
    assert resp.status_code == 422


async def test_create_offer_empty_title_422(client: AsyncClient) -> None:
    resp = await client.post(f"{BASE}/", json={**VALID_OFFER, "title": ""})
    assert resp.status_code == 422


# ─── List ─────────────────────────────────────────────────────────────────────


async def test_list_empty(client: AsyncClient) -> None:
    resp = await client.get(f"{BASE}/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["items"] == []
    assert body["total"] == 0
    assert body["page"] == 1


async def test_list_returns_created_offer(client: AsyncClient) -> None:
    await _create(client)
    resp = await client.get(f"{BASE}/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == VALID_OFFER["title"]


async def test_list_pagination(client: AsyncClient) -> None:
    for i in range(5):
        await _create(client, {"title": f"Offer #{i}"})

    resp = await client.get(f"{BASE}/?page=1&page_size=3")
    body = resp.json()
    assert body["total"] == 5
    assert len(body["items"]) == 3
    assert body["pages"] == 2


async def test_list_filter_by_status_no_match(client: AsyncClient) -> None:
    await _create(client)  # status defaults to NEW
    resp = await client.get(f"{BASE}/?status=APPLIED")
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


async def test_list_filter_by_favorite(client: AsyncClient) -> None:
    offer = await _create(client)
    await client.patch(f"{BASE}/{offer['id']}/favorite")  # mark favorite

    resp = await client.get(f"{BASE}/?is_favorite=true")
    assert resp.json()["total"] == 1

    resp = await client.get(f"{BASE}/?is_favorite=false")
    assert resp.json()["total"] == 0


async def test_list_search(client: AsyncClient) -> None:
    await _create(client, {"title": "Python Developer"})
    await _create(client, {"title": "DevOps Engineer"})

    resp = await client.get(f"{BASE}/?search=python")
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["title"] == "Python Developer"


# ─── Read by ID ───────────────────────────────────────────────────────────────


async def test_get_offer_by_id(client: AsyncClient) -> None:
    created = await _create(client)
    resp = await client.get(f"{BASE}/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


async def test_get_offer_not_found(client: AsyncClient) -> None:
    resp = await client.get(f"{BASE}/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


# ─── Update ───────────────────────────────────────────────────────────────────


async def test_update_offer(client: AsyncClient) -> None:
    created = await _create(client)
    resp = await client.put(
        f"{BASE}/{created['id']}",
        json={"title": "Updated Title", "notes": "Excellent opportunity!"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Updated Title"
    assert body["notes"] == "Excellent opportunity!"
    # Unchanged fields are preserved
    assert body["company"] == VALID_OFFER["company"]


async def test_update_offer_not_found(client: AsyncClient) -> None:
    resp = await client.put(
        f"{BASE}/00000000-0000-0000-0000-000000000000",
        json={"title": "Ghost"},
    )
    assert resp.status_code == 404


# ─── Delete ───────────────────────────────────────────────────────────────────


async def test_delete_offer_returns_204(client: AsyncClient) -> None:
    created = await _create(client)
    resp = await client.delete(f"{BASE}/{created['id']}")
    assert resp.status_code == 204


async def test_delete_offer_then_get_returns_404(client: AsyncClient) -> None:
    created = await _create(client)
    await client.delete(f"{BASE}/{created['id']}")
    resp = await client.get(f"{BASE}/{created['id']}")
    assert resp.status_code == 404


async def test_delete_offer_not_found(client: AsyncClient) -> None:
    resp = await client.delete(f"{BASE}/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


# ─── Status patch ─────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "new_status",
    ["ANALYZED", "APPLIED", "INTERVIEW", "REJECTED", "OFFER", "ARCHIVED"],
)
async def test_update_offer_status(client: AsyncClient, new_status: str) -> None:
    created = await _create(client)
    resp = await client.patch(
        f"{BASE}/{created['id']}/status",
        json={"status": new_status},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == new_status


async def test_update_status_invalid_value_422(client: AsyncClient) -> None:
    created = await _create(client)
    resp = await client.patch(
        f"{BASE}/{created['id']}/status",
        json={"status": "PENDING"},
    )
    assert resp.status_code == 422


async def test_update_status_not_found(client: AsyncClient) -> None:
    resp = await client.patch(
        f"{BASE}/00000000-0000-0000-0000-000000000000/status",
        json={"status": "APPLIED"},
    )
    assert resp.status_code == 404


# ─── Favorite toggle ──────────────────────────────────────────────────────────


async def test_toggle_favorite_on(client: AsyncClient) -> None:
    created = await _create(client)
    assert created["is_favorite"] is False

    resp = await client.patch(f"{BASE}/{created['id']}/favorite")
    assert resp.status_code == 200
    assert resp.json()["is_favorite"] is True


async def test_toggle_favorite_off(client: AsyncClient) -> None:
    created = await _create(client)

    # Toggle on, then off
    await client.patch(f"{BASE}/{created['id']}/favorite")
    resp = await client.patch(f"{BASE}/{created['id']}/favorite")
    assert resp.status_code == 200
    assert resp.json()["is_favorite"] is False


async def test_toggle_favorite_not_found(client: AsyncClient) -> None:
    resp = await client.patch(f"{BASE}/00000000-0000-0000-0000-000000000000/favorite")
    assert resp.status_code == 404
