# 🔍 FindAJob — Job Search Manager

Application web full-stack de gestion de recherche d'emploi, conçue pour un profil **Architecte IT Senior**.  
Propulsée par **FastAPI**, **React 18**, **PostgreSQL** et **Claude AI** (Anthropic).

---

## ✨ Fonctionnalités

| Module | Description |
|--------|-------------|
| **Offres** | Import, scoring IA automatique (compatibilité 0–100), Kanban 6 colonnes avec drag-and-drop |
| **Analyse IA** | Analyse complète de l'offre, extraction de mots-clés, points forts / alertes |
| **Documents** | Génération de CV et lettres de motivation par IA, export PDF/DOCX/HTML |
| **Dashboard** | KPI temps réel, jauge de compatibilité, timeline d'activité |
| **Alertes** | Relances automatiques, prochaines étapes, candidatures stagnantes |

---

## 🏗️ Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | FastAPI 0.115 · Python 3.11 · SQLAlchemy 2.0 async · Alembic 1.14 |
| Base de données | PostgreSQL 16 (prod) · SQLite + aiosqlite (tests) |
| IA | Anthropic SDK 0.40 — `claude-opus-4-5` |
| Frontend | React 18 · TypeScript 5 · Vite 5 · Tailwind CSS 3 |
| État | Zustand 5 · TanStack Query 5 |
| Drag & drop | @dnd-kit/core |
| Tests back | pytest 8 · pytest-asyncio · httpx |
| Tests front | Vitest 2 · Testing Library · jsdom |

---

## 🚀 Démarrage rapide

### Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Engine ≥ 24)
- [Git](https://git-scm.com/)
- Clé API Anthropic — [console.anthropic.com](https://console.anthropic.com)

### 3 commandes

```bash
git clone <repo-url> && cd job-search-app

cp backend/.env.example backend/.env
# ✏️  Ouvrez backend/.env et renseignez ANTHROPIC_API_KEY

make dev          # docker-compose up --build (postgres + backend + frontend)
```

Attendez ~30 secondes que les services démarrent, puis :

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/api/docs |
| pgAdmin | http://localhost:5050 |

> **Premier lancement** — lancez les migrations après le premier `make dev` :
> ```bash
> make migrate   # alembic upgrade head
> make seed      # données de démo (optionnel)
> ```

---

## 🔧 Variables d'environnement

Copiez `backend/.env.example` → `backend/.env` et renseignez les variables requises.

| Variable | Requis | Défaut | Description |
|----------|:------:|--------|-------------|
| `DATABASE_URL` | ✅ | — | `postgresql+asyncpg://user:pass@host:5432/db` |
| `ANTHROPIC_API_KEY` | ✅ | — | Clé API Anthropic (`sk-ant-api03-...`) |
| `ANTHROPIC_MODEL` | ➖ | `claude-opus-4-5` | Modèle Claude à utiliser |
| `ENVIRONMENT` | ➖ | `development` | `development` \| `production` |
| `ALLOWED_ORIGINS` | ➖ | `http://localhost:5173` | CORS (séparés par virgule) |
| `EXPORT_DIR` | ➖ | `/tmp/exports` | Répertoire d'export des documents |
| `SECRET_KEY` | ➖ | généré | Clé JWT/sessions |
| `SMTP_HOST` | ➖ | — | Serveur SMTP pour les notifications |
| `SMTP_PORT` | ➖ | `587` | Port SMTP |
| `SMTP_USER` | ➖ | — | Utilisateur SMTP |
| `SMTP_PASSWORD` | ➖ | — | Mot de passe SMTP |

> **Test** : définissez `TEST_DATABASE_URL=postgresql+asyncpg://...` pour cibler  
> une vraie BDD PostgreSQL au lieu de la SQLite in-memory par défaut.

---

## 📁 Architecture du projet

```
job-search-app/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy ORM (JobOffer, Document, Alert…)
│   │   ├── schemas/         # Pydantic v2 (Create/Update/Read)
│   │   ├── routers/         # FastAPI routers (job_offers, documents, ai, alerts)
│   │   ├── services/        # ClaudeService, ScoringService, ExportService
│   │   ├── config.py        # Pydantic Settings
│   │   ├── database.py      # Async SQLAlchemy engine + get_db
│   │   └── main.py          # App entry-point (lifespan, CORS, routers)
│   ├── alembic/             # Migrations
│   ├── tests/
│   │   ├── conftest.py      # Fixtures (SQLite in-memory, httpx client)
│   │   ├── test_claude_service.py
│   │   └── test_offers_router.py
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── pytest.ini
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/   # KpiCard, CompatibilityGauge, MiniKanban…
│   │   │   ├── offers/      # AnalysisPanel, DocumentViewer…
│   │   │   └── ui/          # Button, Badge, Card, Modal, Spinner
│   │   ├── pages/           # Dashboard, Offers, OfferDetail, Kanban, NewOffer…
│   │   ├── services/        # Axios clients (jobOffers, ai, documents, alerts)
│   │   ├── stores/          # Zustand (offersStore, documentsStore, uiStore)
│   │   ├── tests/           # Vitest (KpiCard, CompatibilityGauge, offersStore)
│   │   └── types/           # TypeScript interfaces
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml
├── Makefile
└── README.md
```

---

## 🛠️ Commandes Make

```bash
make dev            # Lance tous les services (hot-reload)
make dev-detach     # Lance en arrière-plan
make stop           # Arrête les services

make migrate        # alembic upgrade head
make migrate-down   # Annule la dernière migration
make migration MSG="add column x"   # Crée une nouvelle migration
make seed           # Insère des données de démo

make test           # Lance tous les tests (backend + frontend)
make test-backend   # pytest dans le conteneur backend
make test-frontend  # Vitest (mode --run, CI)
make test-watch     # Vitest en mode watch
make coverage       # Rapport de couverture frontend

make build          # Build production frontend (dist/)
make lint           # ESLint
make type-check     # tsc --noEmit

make logs           # Logs de tous les services
make shell-backend  # Shell bash dans le conteneur backend
make shell-db       # psql dans le conteneur PostgreSQL
make clean          # docker-compose down -v
make clean-all      # + supprime images et node_modules
```

---

## 📖 API Endpoints

Documentation interactive : **http://localhost:8000/api/docs** (Swagger UI)

| Groupe | Préfixe | Opérations clés |
|--------|---------|-----------------|
| Job Offers | `/api/v1/job-offers` | CRUD + scoring IA + stats |
| Documents | `/api/v1/documents` | CRUD + génération IA + export |
| AI | `/api/v1/ai` | Analyse offre, génération CV/LM, préparation entretien |
| Alerts | `/api/v1/alerts` | CRUD + règles de relance |

### Exemples rapides

```bash
# Créer une offre
curl -X POST http://localhost:8000/api/v1/job-offers/ \
  -H "Content-Type: application/json" \
  -d '{"title":"Cloud Architect","company":"ACME","source":"linkedin","type":"CDI","remote_type":"HYBRID","found_at":"2024-01-15T10:00:00"}'

# Lancer l'analyse IA
curl -X POST http://localhost:8000/api/v1/ai/analyze/{offer_id}

# Statistiques
curl http://localhost:8000/api/v1/job-offers/stats
```

---

## 🧪 Tests

### Backend

```bash
# Dans le conteneur (recommandé)
make test-backend

# En local (nécessite un venv activé)
cd backend && pytest tests/ -v --tb=short
```

Les tests utilisent **SQLite in-memory** par défaut (via `aiosqlite`).  
Pour cibler PostgreSQL : `TEST_DATABASE_URL=postgresql+asyncpg://... pytest`.

### Frontend

```bash
cd frontend && npm run test:run   # exécution unique (CI)
cd frontend && npm run test       # mode watch (dev)
cd frontend && npm run test:coverage
```

---

## 🤖 Profil candidat IA

Le profil de scoring est centralisé dans `backend/app/services/` :

- **`scoring_service.py`** → `ARCHITECT_PROFILE` (règles locales, sans API)
- **`claude_service.py`** → `DEFAULT_CANDIDATE_PROFILE` (contexte envoyé à Claude)

**Profil par défaut :**

```
Architecte IT Senior — 15 ans d'expérience
Cloud : AWS (certifié), Azure, GCP
DevOps : Kubernetes, Terraform, CI/CD
Langages : Python, Java, TypeScript
Cible : 90 000 €/an · Remote / Hybride
```

Modifiez ces profils selon votre situation avant de lancer l'analyse IA.

---

## 🗺️ Roadmap

- [ ] Authentification JWT (multi-utilisateurs)
- [ ] Import automatique d'offres via scraping (LinkedIn, Indeed)
- [ ] Export PDF des bilans de candidature
- [ ] Notifications email (alertes de relance)
- [ ] Mode sombre / clair (toggle)
- [ ] Application mobile (React Native)

---

## 📜 Licence

MIT — Projet personnel, Architecte IA Senior.
