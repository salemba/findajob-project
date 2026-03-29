# 🔍 FindAJob — Job Search Manager

Application web full-stack de gestion de recherche d'emploi, optimisée pour un profil **Architecte IT Senior**.  
Propulsée par **FastAPI**, **React 18**, **PostgreSQL** et **Claude AI** (Anthropic).

---

## ✨ Fonctionnalités

- **Offres d'emploi** — Suivi complet des offres avec scoring IA automatique (profil architecte)
- **Candidatures** — Pipeline Kanban en 9 étapes, timeline, notes d'entretien
- **Documents** — Génération de CV et lettres de motivation par IA, export PDF/DOCX/HTML
- **Outils IA** — Analyse d'offres, d'entreprises, préparation d'entretiens
- **Alertes** — Relances, prochaines étapes, candidatures stagnantes

---

## 🏗️ Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | FastAPI 0.115 · Python 3.11 · SQLAlchemy 2.0 async · Alembic |
| Base de données | PostgreSQL 16 |
| IA | Anthropic Claude (claude-opus-4-5) |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS |
| État | Zustand · TanStack Query v5 |
| HTTP | Axios |

---

## 🚀 Démarrage rapide (Docker)

### Prérequis
- Docker Desktop
- Clé API Anthropic : https://console.anthropic.com

### 1. Configuration
```bash
cp backend/.env.example backend/.env
# Éditez backend/.env et renseignez au minimum :
# ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Lancer les services
```bash
cd job-search-app
docker-compose up -d
```

### 3. Migrations de base de données
```bash
docker-compose exec backend alembic upgrade head
```

### 4. Accès
| Service | URL |
|---------|-----|
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| pgAdmin | http://localhost:5050 |

---

## 🛠️ Développement manuel

### Backend

```bash
cd job-search-app/backend

# Créer l'environnement virtuel
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
.venv\Scripts\activate      # Windows

# Installer les dépendances
pip install -r requirements.txt

# Configurer l'environnement
cp .env.example .env
# Éditer .env (DATABASE_URL, ANTHROPIC_API_KEY, etc.)

# Lancer la base de données PostgreSQL (via Docker)
docker run -d --name pg_dev \
  -e POSTGRES_USER=findajob \
  -e POSTGRES_PASSWORD=findajob_password \
  -e POSTGRES_DB=findajob_db \
  -p 5432:5432 \
  postgres:16-alpine

# Migrations
alembic upgrade head

# Démarrer le serveur (avec hot-reload)
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd job-search-app/frontend

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
# → http://localhost:5173

# Build de production
npm run build
```

---

## 📁 Structure du projet

```
job-search-app/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy models (JobOffer, Application, Document)
│   │   ├── schemas/         # Pydantic v2 schemas
│   │   ├── routers/         # FastAPI routers
│   │   │   ├── job_offers.py
│   │   │   ├── applications.py
│   │   │   ├── documents.py
│   │   │   ├── claude_ai.py
│   │   │   └── alerts.py
│   │   ├── services/
│   │   │   ├── claude_service.py   # Anthropic API calls
│   │   │   ├── scoring_service.py  # Rule-based scoring (no API)
│   │   │   └── export_service.py   # PDF/DOCX/HTML export
│   │   ├── config.py        # Pydantic settings
│   │   ├── database.py      # Async SQLAlchemy engine
│   │   └── main.py          # FastAPI app
│   ├── alembic/             # Database migrations
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Layout, StatusBadge, Modal, Input, ...
│   │   ├── pages/           # Dashboard, JobOffers, Applications, ...
│   │   ├── services/        # Axios API clients
│   │   ├── stores/          # Zustand stores
│   │   └── types/           # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
│
└── docker-compose.yml
```

---

## 🔧 Variables d'environnement

Copiez `backend/.env.example` → `backend/.env` et renseignez :

| Variable | Requis | Description |
|----------|--------|-------------|
| `DATABASE_URL` | ✅ | `postgresql+asyncpg://user:pass@host:5432/db` |
| `ANTHROPIC_API_KEY` | ✅ | Clé API Anthropic (`sk-ant-...`) |
| `ANTHROPIC_MODEL` | ➖ | Défaut: `claude-opus-4-5` |
| `FRONTEND_URL` | ➖ | Défaut: `http://localhost:5173` |
| `ALLOWED_ORIGINS` | ➖ | CORS, séparés par virgule |
| `SMTP_*` | ➖ | Pour les notifications email (optionnel) |
| `EXPORT_DIR` | ➖ | Chemin d'export des documents (défaut: `./exports`) |

---

## 📖 API Endpoints

La documentation interactive est disponible sur http://localhost:8000/docs (Swagger UI).

| Groupe | Préfixe | Description |
|--------|---------|-------------|
| Job Offers | `/api/v1/job-offers` | CRUD + scoring IA |
| Applications | `/api/v1/applications` | CRUD + pipeline + timeline |
| Documents | `/api/v1/documents` | CRUD + génération IA + export |
| AI | `/api/v1/ai` | Outils IA directs |
| Alerts | `/api/v1/alerts` | Alertes et relances |

---

## 🤖 Profil candidat IA

Le profil de scoring est défini dans `backend/app/services/scoring_service.py` (`ARCHITECT_PROFILE`) et `claude_service.py` (`DEFAULT_CANDIDATE_PROFILE`).

**Profil par défaut :**
- Architecte IT Senior — 15 ans d'expérience
- Cloud : AWS (certifié), Azure, GCP
- DevOps : Kubernetes, Terraform, CI/CD
- Langages : Python, Java, TypeScript
- Salaire cible : 90 000 € / an
- Mode de travail préféré : Remote / Hybride

Modifiez ces profils pour les adapter à votre situation.

---

## 📜 Licence

MIT
