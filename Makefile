# ApnaGhar - local development
# Docker (everything in containers):   make up        -> http://localhost:8080
# Without Docker (SQLite, your Python): make install && make dev
SHELL := /bin/bash
.DEFAULT_GOAL := help

# Python 3.12/3.13 preferred: some pinned packages (psycopg2-binary, Pillow 11) have no 3.14 wheels yet
PY       ?= $(shell command -v python3.12 || command -v python3.13 || command -v python3)
VENV     := .venv
RAG_VENV := .venv-rag
DC       := docker compose
# This machine's LAN address (for opening the app on a phone on the same Wi-Fi)
LAN_IP   := $(shell ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<NF;i++) if ($$i=="src") print $$(i+1)}' || ipconfig getifaddr en0 2>/dev/null)

-include .env
export

.PHONY: help env up down logs build restart reset ps shell admin import-data rag-refresh \
        install dev dev-backend dev-frontend dev-rag test check fabric fabric-down blockchain-api phone

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

env: ## Create .env from .env.example (only if missing)
	@test -f .env || (cp .env.example .env && echo "Created .env - edit it to add keys")

# ---------- Docker ----------
up: env ## Start the whole stack in Docker (db, backend, frontend, RAG, IPFS)
	$(DC) up --build -d
	@echo ""
	@echo "  App:      http://localhost:8080"
	@echo "  API:      http://localhost:8000/api/"
	@echo "  Django:   http://localhost:8000/admin/"
	@echo "  Login:    $${ADMIN_EMAIL:-admin@apnaghar.local} (password: ADMIN_PASSWORD in .env)"
	@echo "  The chatbot builds its search index on first start (~2 min): make logs s=rag"

down: ## Stop the stack (keeps data)
	$(DC) down

reset: ## Stop the stack and DELETE all local data (database, uploads, IPFS, index)
	$(DC) down -v

logs: ## Follow logs (all services, or one: make logs s=backend)
	$(DC) logs -f $(s)

ps: ## Show running services
	$(DC) ps

build: ## Rebuild the images
	$(DC) build

restart: ## Restart a service: make restart s=backend
	$(DC) restart $(s)

shell: ## Django shell inside the backend container
	$(DC) exec backend python manage.py shell

admin: ## (Re)create the root admin from ADMIN_EMAIL / ADMIN_PASSWORD
	$(DC) exec backend python manage.py ensure_admin

import-data: ## Replace demo data with your old cloud export (rag-pipeline/data/*.csv)
	$(DC) exec backend python manage.py import_cloud_export --replace

rag-refresh: ## Export the database for the chatbot, rebuild its index, restart it
	$(DC) exec backend python manage.py export_for_rag
	$(DC) exec rag sh -c "cd rag-pipeline && python app.py build"
	$(DC) restart rag

phone: ## Serve the frontend over HTTPS so the camera / QR scanning works from your phone
	VITE_HTTPS=true $(DC) up -d --force-recreate frontend
	@echo "Open https://$(LAN_IP):8080 on your phone (same Wi-Fi) and accept the self-signed certificate."
	@echo "Can't connect? Your firewall may block it - with ufw: sudo ufw allow 8080/tcp"

# ---------- Without Docker ----------
install: env ## Install backend, frontend and RAG dependencies locally (no Docker)
	$(PY) -m venv $(VENV)
	$(VENV)/bin/pip install -r backend/requirements.txt
	cd frontend && npm ci
	$(PY) -m venv $(RAG_VENV)
	$(RAG_VENV)/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu
	$(RAG_VENV)/bin/pip install -r rag-pipeline/requirements.txt

dev: ## Run backend (SQLite), frontend and RAG together without Docker - Ctrl+C stops all
	@trap 'kill 0' INT TERM EXIT; \
	$(MAKE) --no-print-directory dev-backend & \
	$(MAKE) --no-print-directory dev-rag & \
	$(MAKE) --no-print-directory dev-frontend & \
	wait

dev-backend: ## Django on :8000 (SQLite in backend/db.sqlite3, uploads in backend/media)
	cd backend && export DEBUG=True RAG_SERVICE_URL=http://localhost:8001 && \
	  ../$(VENV)/bin/python manage.py migrate --noinput && \
	  ../$(VENV)/bin/python manage.py ensure_admin && \
	  ../$(VENV)/bin/python manage.py runserver 0.0.0.0:8000

dev-frontend: ## Vite on :8080, proxying /api, /media and /ipfs to the backend
	cd frontend && VITE_API_BASE_URL= npx vite --port 8080

dev-rag: ## RAG chatbot on :8001 (builds its index on first run)
	@test -f rag-pipeline/faiss_store/faiss.index || (cd rag-pipeline && ../$(RAG_VENV)/bin/python app.py build)
	RAG_PORT=8001 $(RAG_VENV)/bin/python rag-service.py

# ---------- Quality ----------
test: ## Backend tests + frontend type-check and build
	cd backend && SECRET_KEY=test BLOCKCHAIN_API_URL=http://127.0.0.1:9/api/v1 ../$(VENV)/bin/python manage.py test
	cd frontend && npx tsc -p tsconfig.app.json --noEmit && npm run build

check: ## Django system checks
	cd backend && ../$(VENV)/bin/python manage.py check

# ---------- Blockchain (optional) ----------
fabric: ## Download Fabric (first time), start the network and deploy the chaincode
	@test -d blockchain/fabric-samples/test-network || ./blockchain/setup-fabric.sh
	./restart-fabric.sh

fabric-down: ## Stop the Fabric network
	cd blockchain/fabric-samples/test-network && ./network.sh down

blockchain-api: ## Run the Node.js API the backend uses to write to Fabric (:3000)
	cd blockchain/api && npm install && npm start
