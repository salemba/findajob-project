# CLAUDE.md — Instructions for Claude Code

This file tells Claude Code agents how to push job offers directly into the
**FindAJob** FastAPI application running locally.

---

## API Base URL

```
http://localhost:8000
```

> Verify the app is running: `GET http://localhost:8000/api/health`

---

## Authentication

Every request to `/api/integration/*` must include the header:

```
X-Integration-Key: <value of INTEGRATION_KEY in backend/.env>
```

Default dev value: `claude-code-integration-key-dev-2025`

---

## Endpoints

### 1. Pre-flight health check

```http
GET /api/integration/status
X-Integration-Key: claude-code-integration-key-dev-2025
```

**Expected response (200):**
```json
{
  "db_connected": true,
  "total_offers": 42,
  "pending_analysis": 3,
  "last_sync": "2025-07-14T10:00:00+00:00",
  "api_version": "1.0.0"
}
```

Always call this first. If `db_connected` is `false`, stop and report the issue.

---

### 2. Push job offers (batch)

```http
POST /api/integration/offers/batch
Content-Type: application/json
X-Integration-Key: claude-code-integration-key-dev-2025
```

**Body:**
```json
{
  "offers": [
    {
      "title": "Architecte Solution Cloud",
      "company": "Acme Corp",
      "source": "linkedin",
      "source_url": "https://linkedin.com/jobs/view/123456",
      "raw_text": "Full job description here...",
      "type": "FREELANCE",
      "tjm_min": 650,
      "tjm_max": 800,
      "remote_type": "FULL_REMOTE",
      "location": "Paris"
    }
  ]
}
```

**Field reference:**

| Field | Required | Values / Notes |
|---|---|---|
| `title` | ✅ | String, max 255 |
| `company` | ✅ | String, max 255 |
| `source` | ✅ | `linkedin` · `free-work` · `malt` · `indeed` · `manual` |
| `type` | ✅ | `FREELANCE` · `CDI` · `CDD` |
| `source_url` | — | Full URL of the listing |
| `raw_text` | — | Full job description (used by Claude AI analysis) |
| `tjm_min` / `tjm_max` | — | Daily rate in € (freelance) |
| `salary_min` / `salary_max` | — | Annual salary in € (CDI/CDD) |
| `remote_type` | — | `FULL_REMOTE` · `HYBRID` · `ON_SITE` (default: `HYBRID`) |
| `location` | — | City or region |
| `notes` | — | Free text notes |

**Expected response (201):**
```json
{
  "created": 3,
  "ids": ["uuid-1", "uuid-2", "uuid-3"],
  "errors": []
}
```

- AI analysis is triggered automatically in the background for each created offer.
- If some offers fail validation, `errors` lists them with the index and reason.
- The batch endpoint accepts up to **50 offers per call**.

---

### 3. Mark an offer as Applied

```http
POST /api/integration/offers/{offer_id}/apply
Content-Type: application/json
X-Integration-Key: claude-code-integration-key-dev-2025
```

**Body:**
```json
{
  "cover_letter_sent": true,
  "cv_version": "CV_2025_v3.pdf",
  "contact_name": "Jane Smith",
  "contact_email": "jane@company.com",
  "contact_linkedin": "https://linkedin.com/in/janesmith"
}
```

**Expected response (201):**
```json
{
  "application_id": "uuid",
  "offer_id": "uuid",
  "offer_status": "APPLIED"
}
```

---

## Typical Claude Code Workflow

```
1. Scrape job boards → collect raw listings
2. GET  /api/integration/status           ← verify API is up
3. POST /api/integration/offers/batch     ← push all new offers
4. (optional) POST /api/integration/offers/{id}/apply  ← if auto-applying
5. Log created IDs + any errors
```

---

## Error Reference

| HTTP | Meaning |
|---|---|
| `200` / `201` | Success |
| `401` | Wrong or missing `X-Integration-Key` |
| `422` | Validation error (check `detail` field) |
| `404` | Offer ID not found |
| `503` | `INTEGRATION_KEY` not configured on the server |

---

## Running the test script

```bash
cd job-search-app/backend
.venv/Scripts/python scripts/test_integration.py
```

Set env vars to target a different server:
```bash
set API_URL=http://localhost:8000
set INTEGRATION_KEY=claude-code-integration-key-dev-2025
.venv/Scripts/python scripts/test_integration.py
```
