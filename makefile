###############################################################################
# DOMESTIC BFF — Makefile
###############################################################################

.PHONY: help infra bff-up down clean \
        dev test test-unit test-e2e \
        lint format sonar-scan \
        setup-env seed-mongodb

# ─── Variáveis ──────────────────────────────────────────────────────────────

COMPOSE_FILE = docker-compose.yml
ENV_FILE = .env
ENV_EXAMPLE = .env.example

# Nome do projeto unificado no monorepo
COMPOSE_PROJECT_NAME ?= domestic
BFF_CONTAINER_NAME ?= domestic_bff
MONGO_CONTAINER_NAME ?= domestic_database_mongo
REDIS_CONTAINER_NAME ?= domestic_cache_redis
KEYCLOAK_CONTAINER_NAME ?= domestic_keycloak
KEYCLOAK_DB_NAME ?= domestic_database_keycloak

# Se o .env existir, carrega suas variáveis
ifneq ("$(wildcard $(ENV_FILE))","")
include $(ENV_FILE)
export
endif

# ─── Help ─────────────────────────────────────────────────────────────────

help: ## Mostra esta mensagem de ajuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Setup ────────────────────────────────────────────────────────────────

setup-env: ## Cria .env a partir do exemplo se não existir
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "⚙️  Criando $(ENV_FILE) a partir de $(ENV_EXAMPLE)..."; \
		cp $(ENV_EXAMPLE) $(ENV_FILE); \
	else \
		echo "✅ $(ENV_FILE) já existe."; \
	fi

# ─── Infraestrutura ────────────────────────────────────────────────────────

infra: setup-env ## Sobe Mongo, Redis e Keycloak (apenas se não estiverem rodando)
	@echo "🔍 Verificando serviços de infraestrutura compartilhada..."
	@missing_services=""; \
	for pair in \
		"database_mongo:$(MONGO_CONTAINER_NAME)" \
		"cache_redis:$(REDIS_CONTAINER_NAME)" \
		"keycloak:$(KEYCLOAK_CONTAINER_NAME)" \
		"database_keycloak:$(KEYCLOAK_DB_NAME)"; do \
		service="$${pair%%:*}"; \
		container_name="$${pair#*:}"; \
		container_project="$$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$$container_name" 2>/dev/null || true)"; \
		container_running="$$(docker inspect -f '{{.State.Running}}' "$$container_name" 2>/dev/null || true)"; \
		if [ "$$container_running" = "true" ] && [ "$$container_project" = "$(COMPOSE_PROJECT_NAME)" ]; then \
			echo "✔ $$service já está no ar em '$$container_name' (project=$(COMPOSE_PROJECT_NAME))"; \
		else \
			if [ -n "$$container_project" ] && [ "$$container_project" != "$(COMPOSE_PROJECT_NAME)" ]; then \
				echo "↻ Migrando '$$container_name' de project=$$container_project para project=$(COMPOSE_PROJECT_NAME)"; \
				docker rm -f "$$container_name" >/dev/null; \
			fi; \
			missing_services="$$missing_services $$service"; \
		fi; \
	done; \
	if [ -n "$$missing_services" ]; then \
		echo "Subindo serviços ausentes:$$missing_services"; \
		COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_NAME) docker-compose -f $(COMPOSE_FILE) up -d $$missing_services; \
	else \
		echo "✅ Toda a infraestrutura já está operacional."; \
	fi

bff-up: setup-env ## Sobe apenas o container do BFF
	@echo "🚀 Subindo BFF..."
	COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_NAME) docker-compose -f $(COMPOSE_FILE) up -d bff

all: infra bff-up ## Sobe infra + BFF (atalho principal)

# ─── Seed ──────────────────────────────────────────────────────────────────

seed-mongodb: infra ## Roda seed do MongoDB (simula initContainer do k8s)
	@echo "🌱 Rodando seed do MongoDB..."
	MONGO_URI=$${MONGO_URI:-mongodb://localhost:27017/domestic-bff} npm run seed:mongodb

# ─── Comandos Docker ──────────────────────────────────────────────────────

down: ## Para e remove todos os containers do projeto
	COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_NAME) docker-compose -f $(COMPOSE_FILE) down

stop: ## Apenas para os containers sem removê-los
	COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_NAME) docker-compose -f $(COMPOSE_FILE) stop

logs: ## Tail de logs do BFF
	docker logs -f $(BFF_CONTAINER_NAME)

ps: ## Status dos containers do projeto
	COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_NAME) docker-compose -f $(COMPOSE_FILE) ps

rebuild: setup-env ## Reconstroi a imagem do BFF e sobe
	COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_NAME) docker-compose -f $(COMPOSE_FILE) up -d --build bff

# ─── Desenvolvimento e Testes ──────────────────────────────────────────────

dev: setup-env ## Roda o BFF localmente (requer infra no ar)
	npm run start:dev

test-unit: ## Roda testes unitários
	npm run test:unit

test-e2e: infra ## Roda testes E2E (garante infra no ar)
	npm run test:e2e

lint: ## Executa checagem de lint
	npm run lint

format: ## Formata o código
	npm run format

sonar-scan: ## Executa análise do SonarQube
	npm run sonar

# ─── Limpeza ──────────────────────────────────────────────────────────────

clean: ## Remove containers e volumes persistentes
	@echo "🧹 Limpando recursos do projeto $(COMPOSE_PROJECT_NAME)..."
	COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_NAME) docker-compose -f $(COMPOSE_FILE) down -v --remove-orphans

.DEFAULT_GOAL := help