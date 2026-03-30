.PHONY: install dev stop migrate seed test test-backend test-frontend \
        build lint type-check clean logs shell-backend shell-db

# ─────────────────────────────────────────────
#  Variables
# ─────────────────────────────────────────────
COMPOSE     = docker-compose
BACKEND     = $(COMPOSE) exec backend
DB          = $(COMPOSE) exec postgres

# ─────────────────────────────────────────────
#  Setup
# ─────────────────────────────────────────────

## install: Install all dependencies (local dev without Docker)
install:
	@echo "📦 Installing Python dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "📦 Installing Node dependencies..."
	cd frontend && npm install
	@echo "✅ Done."

## env: Copy .env.example → .env if not present
env:
	@[ -f backend/.env ] || (cp backend/.env.example backend/.env && echo "✅ Created backend/.env — fill in your secrets!")

# ─────────────────────────────────────────────
#  Dev
# ─────────────────────────────────────────────

## dev: Start all services (hot-reload)
dev: env
	$(COMPOSE) up --build

## dev-detach: Start all services in the background
dev-detach: env
	$(COMPOSE) up --build -d

## stop: Stop all running services
stop:
	$(COMPOSE) down

## logs: Follow all service logs
logs:
	$(COMPOSE) logs -f

## logs-backend: Follow backend logs only
logs-backend:
	$(COMPOSE) logs -f backend

# ─────────────────────────────────────────────
#  Database
# ─────────────────────────────────────────────

## migrate: Run all pending Alembic migrations
migrate:
	$(BACKEND) alembic upgrade head

## migrate-down: Roll back the last migration
migrate-down:
	$(BACKEND) alembic downgrade -1

## migration: Create a new migration (usage: make migration MSG="add column x")
migration:
	$(BACKEND) alembic revision --autogenerate -m "$(MSG)"

## seed: Populate the database with sample data
seed:
	$(BACKEND) python seed.py

## shell-db: Open a psql shell on the running PostgreSQL container
shell-db:
	$(DB) psql -U findajob -d findajob_db

# ─────────────────────────────────────────────
#  Tests
# ─────────────────────────────────────────────

## test: Run all tests (backend + frontend)
test: test-backend test-frontend

## test-backend: Run pytest inside the backend container
test-backend:
	@echo "🧪 Running backend tests..."
	$(BACKEND) pytest tests/ -v --tb=short

## test-backend-local: Run pytest locally (needs venv activated)
test-backend-local:
	cd backend && pytest tests/ -v --tb=short

## test-frontend: Run Vitest
test-frontend:
	@echo "🧪 Running frontend tests..."
	cd frontend && npm run test -- --run

## test-watch: Run frontend tests in watch mode
test-watch:
	cd frontend && npm run test

## coverage: Generate frontend test coverage report
coverage:
	cd frontend && npm run test:coverage

# ─────────────────────────────────────────────
#  Build
# ─────────────────────────────────────────────

## build: Build the production frontend bundle
build:
	cd frontend && npm run build

## docker-build: Build all Docker images
docker-build:
	$(COMPOSE) build

# ─────────────────────────────────────────────
#  Code quality
# ─────────────────────────────────────────────

## lint: Run ESLint on frontend
lint:
	cd frontend && npm run lint

## type-check: Run TypeScript type checker
type-check:
	cd frontend && npm run type-check

## format: Format Python code with ruff (if installed)
format:
	cd backend && python -m ruff format . || true
	cd backend && python -m ruff check --fix . || true

# ─────────────────────────────────────────────
#  Utilities
# ─────────────────────────────────────────────

## shell-backend: Open a bash shell in the backend container
shell-backend:
	$(BACKEND) bash

## clean: Stop containers and remove volumes + orphans
clean:
	$(COMPOSE) down -v --remove-orphans
	@echo "🧹 Volumes and orphan containers removed."

## clean-all: Also remove built images and node_modules
clean-all: clean
	$(COMPOSE) down --rmi all || true
	rm -rf frontend/node_modules frontend/dist
	@echo "🧹 Full clean done."

# ─────────────────────────────────────────────
#  Help
# ─────────────────────────────────────────────

## help: Show this help message
help:
	@echo "FindAJob — available commands:\n"
	@grep -E '^## ' Makefile | sed 's/## /  make /'
