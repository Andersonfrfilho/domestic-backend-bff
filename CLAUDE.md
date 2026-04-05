# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run start:dev           # Watch mode
npm run start:dev:local     # Load .env.dev.local and watch

# Testing
npm run test:unit           # Unit tests (*.unit.spec.ts)
npm run test:unit:watch     # Unit tests watch mode
npm run test:unit:cov       # Unit tests with coverage report

# Code quality
npm run lint                # Fix ESLint issues + import order
npm run format:all          # Prettier + lint
```

## Architecture

**Stack:** NestJS 11 + Fastify, TypeScript 5, MongoDB (Mongoose), Redis (cache + Pub/Sub), socket.io (WebSocket), `fetch` (HTTP client para API interna).

**Purpose:** Backend for Frontend — agrega dados do Backend API em contratos otimizados para o app. Não escreve em PostgreSQL, não publica em RabbitMQ.

**Porta:** 3001

**Spec:** `.agents/skills/SPEC-BFF.md` (no repositório domestic-backend-api)

### Module structure

```
src/modules/
├── shared/
│   ├── mongo/              # BffMongoModule — Mongoose connection
│   ├── cache/              # BffCacheService — Redis get/set/del + Pub/Sub
│   ├── api-client/         # ApiClientService — fetch wrapper para Backend API (interno)
│   └── screen/             # ScreenConfigService — SDUI configs no MongoDB
├── home/                   # GET /bff/home — SDUI layout + dados agregados
├── search/                 # GET /bff/search — busca + filtros SDUI
├── provider-profile/       # GET /bff/providers/:id/profile — perfil agregado
├── dashboard/              # GET /bff/dashboard/contractor|provider
├── chat/                   # REST (rooms/messages) + WebSocket gateway
├── notification/           # Proxy → API (GET/PUT notificações)
├── screens/                # Admin SDUI — upsert/list/deactivate screen_configs
└── health/                 # Liveness/readiness
```

### Server-Driven UI (SDUI)

Módulos `home` e `search` retornam layout dinâmico configurado via MongoDB (`screen_configs`):

```json
{
  "screen_id": "home",
  "version": "1.0",
  "components": [
    { "id": "cats", "type": "category_list", "data_source": "categories", "order": 0, "config": {} },
    { "id": "featured", "type": "provider_grid", "data_source": "featured_providers", "order": 1, "config": { "columns": 2 } }
  ]
}
```

O BFF resolve cada `data_source` → chama API → injeta dados no campo `data`. Frontend renderiza com base no `type`.

**Telas estáticas (contratos tipados):** `dashboard`, `chat`, `notification`.

### Chat WebSocket

- **Namespace:** `/chat`
- **Eventos client→server:** `join_room`, `leave_room`, `send_message`, `mark_read`
- **Eventos server→client:** `message_received`, `user_joined`, `user_left`, `messages_read`, `error`
- **Distribuição multi-instância:** Redis Pub/Sub `chat:<roomId>` via `psubscribe('chat:*')`

### Cache Strategy

| Módulo | Chave Redis | TTL |
|---|---|---|
| `home` | `bff:home` | 5min |
| `search` | `bff:search:<sha256(params)>` | 2min |
| `provider-profile` | `bff:provider-profile:<id>` | 3min |
| `dashboard:contractor` | `bff:dashboard:contractor:<user_id>` | 1min |
| `dashboard:provider` | `bff:dashboard:provider:<user_id>` | 1min |

### Auth

Headers injetados pelo Kong: `X-User-Id`, `X-User-Roles`, `X-User-Type`. O BFF passa esses headers para o Backend API nas chamadas internas. O WebSocket extrai `X-User-Id` do handshake (header ou query `?user_id=`).

### Environment

Validado via Joi em `src/config/env.validation.ts`. Vars principais:
- `MONGO_URI` — MongoDB do BFF (padrão: `mongodb://localhost:27017/zolve-bff`)
- `CACHE_REDIS_HOST/PORT/PASSWORD` — Redis
- `API_BASE_URL` — URL interna do Backend API (padrão: `http://localhost:3000`)
- `CACHE_TTL_*` — TTLs configuráveis

### TypeScript path aliases

```
@app/*      → src/*
@config/*   → src/config/*
@modules/*  → src/modules/*
```

### Testing conventions

- Unit test files: `*.unit.spec.ts`
- Mock: `ApiClientService`, `BffCacheService`, Mongoose models, `ChatService`
- Coverage threshold: 50%
