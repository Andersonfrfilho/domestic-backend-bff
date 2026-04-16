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
│   ├── screen/             # ScreenConfigService — SDUI configs no MongoDB
│   ├── navigation/         # NavigationConfigService — nav configs no MongoDB
│   ├── constants/          # cache-keys.constant.ts — TODAS as chaves Redis centralizadas
│   └── interceptors/       # CamelCaseResponseInterceptor (global)
├── app-config/             # GET /bff/app-config — config global do app (startup)
├── home/                   # GET /bff/home — SDUI layout + dados agregados
├── search/                 # GET /bff/search — busca + filtros SDUI
├── provider-profile/       # GET /bff/providers/:id/profile — perfil agregado
├── dashboard/              # GET /bff/dashboard/contractor|provider
├── navigation/             # Admin: CRUD /bff/navigation/:screenId
├── chat/                   # REST (rooms/messages) + WebSocket gateway
├── notification/           # Proxy → API (GET/PUT notificações)
├── screens/                # Admin SDUI — upsert/list/deactivate screen_configs
└── health/                 # Liveness/readiness
```

---

## BFF Architecture Rules

Estas regras definem o que pertence (e o que **não** pertence) a este projeto.
Seguir estas convenções é obrigatório para manter o padrão de grandes organizações (Netflix, Airbnb, Uber).

### O que o BFF FAZ

- **Agrega** respostas de múltiplos endpoints do Backend API em um único contrato otimizado para o app
- **Transforma** snake_case → camelCase via `CamelCaseResponseInterceptor` (global, automático)
- **Cacheia** respostas em Redis usando as chaves de `CACHE_KEYS` (nunca strings literais inline)
- **Serve SDUI** — layout dinâmico configurável via MongoDB sem deploy
- **Normaliza** contratos — o mesmo conceito (ex: `services`) deve ter o mesmo shape em todos os endpoints

### O que o BFF NÃO FAZ

- **Não implementa circuit breaker** — isso é responsabilidade da infra (Kong, Istio, service mesh)
- **Não expõe `/metrics`** — observabilidade fica na camada de infraestrutura (APM, k8s)
- **Não valida JWT** — autenticação é feita pelo Kong que injeta `X-User-Id`, `X-User-Roles`, `X-User-Type`
- **Não escreve em PostgreSQL** nem publica em RabbitMQ — leitura/agregação apenas
- **Não duplica lógica de negócio** do Backend API — apenas transforma e agrega

### Regra de navegação mobile

O app mobile busca `GET /bff/app-config` **uma vez no startup** e cacheia localmente.
Nunca adicionar campo `navigation` em respostas de páginas individuais — isso é redundante e desperdiça bandwidth.
A navegação por tela é configurável via `PUT /bff/navigation/:screenId`.

### Cache — regras obrigatórias

1. **Sempre usar `CACHE_KEYS`** de `@modules/shared/constants/cache-keys.constant.ts`. Nunca escrever string de chave Redis inline.
2. **Invalidação em cascata**: ao mudar `navigation`, invalidar tanto `CACHE_KEYS.NAVIGATION(screenId)` quanto `CACHE_KEYS.APP_CONFIG` em `Promise.all`.
3. **Adicionar ao `CACHE_KEYS`** qualquer nova chave antes de usar.

```ts
// CORRETO — usar CACHE_KEYS + object param (Params/Result convention)
await this.cache.set({ key: CACHE_KEYS.HOME, value: response, ttlSeconds: ttl });

// ERRADO — string inline
await this.cache.set({ key: 'bff:home', value: response, ttlSeconds: ttl });

// ERRADO — positional params (violates Params/Result rule)
await this.cache.set('bff:home', response, ttl);
```

### SDUI — convenções obrigatórias

Cada componente SDUI **deve ter** o campo `action`:

```ts
// Componente interativo (toque navega para tela)
{ type: 'navigate', route: '/providers/{id}' }

// Componente não interativo
action: null
```

**Tipos de action válidos:** `navigate` | `open_modal` | `external_link` | `none`

O campo `route` suporta templates `{field}` que o frontend resolve com dados do item (ex: `{id}` → `provider.id`).

**DataSources disponíveis:** `featured_banners` | `categories` | `featured_providers` | `search_results` | `search_filters` | `static`

**ComponentTypes disponíveis:** `banner_carousel` | `category_list` | `category_grid` | `provider_grid` | `provider_list` | `section_header` | `search_bar` | `search_filters` | `promo_banner` | `empty_state`

### Shape unificado de `services`

O shape de `services` é **sempre** `Array<{ name, priceBase, priceType }>` em todos os endpoints.
Nunca retornar `services: string[]` — isso quebra o contrato do app.

```ts
// CORRETO — todos os endpoints usam este shape
services: [{ name: 'Limpeza', priceBase: 150, priceType: 'FIXED' }]

// ERRADO
services: ['Limpeza']
```

### Shapes de resposta — regras

- **Respostas de página** retornam só os dados daquela tela + layout SDUI. Nunca incluir `navigation` nas respostas de página.
- **Respostas paginadas** sempre incluem `meta: { page, limit, total, totalPages }` + `links` (construído pelo `CamelCaseResponseInterceptor` automaticamente).
- **Respostas de erro** usam o shape padrão `{ statusCode, timestamp, path, message, code? }` definido em `ErrorResponseDto`.

### Server-Driven UI (SDUI)

Módulos `home` e `search` retornam layout dinâmico configurado via MongoDB (`screen_configs`):

```json
{
  "screen_id": "home",
  "version": "1.1",
  "components": [
    {
      "id": "featured",
      "type": "provider_grid",
      "data_source": "featured_providers",
      "order": 1,
      "config": { "columns": 2 },
      "visible": true,
      "action": { "type": "navigate", "route": "/providers/{id}" }
    }
  ]
}
```

O BFF resolve cada `data_source` → chama API → injeta dados no campo `data`. Frontend renderiza com base no `type` e executa `action` no toque.

**Telas estáticas (contratos tipados):** `dashboard`, `chat`, `notification`.

### Chat WebSocket

- **Namespace:** `/chat`
- **Eventos client→server:** `join_room`, `leave_room`, `send_message`, `mark_read`
- **Eventos server→client:** `message_received`, `user_joined`, `user_left`, `messages_read`, `error`
- **Distribuição multi-instância:** Redis Pub/Sub `chat:<roomId>` via `psubscribe('chat:*')`

### Cache Strategy

| Módulo | Constante `CACHE_KEYS` | TTL |
|---|---|---|
| `app-config` | `APP_CONFIG` | 5min |
| `home` | `HOME` | 5min |
| `search` | `SEARCH(hash)` | 2min |
| `provider-profile` | `PROVIDER_PROFILE(id)` | 3min |
| `dashboard:contractor` | `DASHBOARD_CONTRACTOR(userId)` | 1min |
| `dashboard:provider` | `DASHBOARD_PROVIDER(userId)` | 1min |
| `navigation` | `NAVIGATION(screenId)` | 5min |

**Dependências de invalidação:**
- Ao mudar `navigation` → invalidar `NAVIGATION(screenId)` **e** `APP_CONFIG`

### Auth

Headers injetados pelo Kong: `X-User-Id`, `X-User-Roles`, `X-User-Type`. O BFF passa esses headers para o Backend API nas chamadas internas. O WebSocket extrai `X-User-Id` do handshake (header ou query `?user_id=`).

### Environment

Validado via Joi em `src/config/env.validation.ts`. Vars principais:
- `MONGO_URI` — MongoDB do BFF (padrão: `mongodb://localhost:27017/zolve-bff`)
- `CACHE_REDIS_HOST/PORT/PASSWORD` — Redis
- `API_BASE_URL` — URL interna do Backend API (padrão: `http://localhost:3000`)
- `CACHE_TTL_*` — TTLs configuráveis
- `APP_MIN_REQUIRED_VERSION` — versão mínima do app mobile
- `APP_LATEST_VERSION` — versão mais recente disponível

### TypeScript path aliases

```
@app/*      → src/*
@config/*   → src/config/*
@modules/*  → src/modules/*
```

### Internal libraries (`@adatechnology`)

These packages are **proprietary internal libraries** — do not search npm for their docs. Use the source in `node_modules/@adatechnology/` to understand their API.

| Package | Purpose | Used in |
|---|---|---|
| `@adatechnology/cache` | Redis cache with encryption support | `BffCacheService` wraps this pattern |
| `@adatechnology/http-client` | Internal HTTP client (fetch-based) | `ApiClientService` follows this interface |
| `@adatechnology/logger` | Structured logger (Winston-based) | Not directly used in BFF — uses NestJS `Logger` |
| `@adatechnology/auth-keycloak` | Keycloak JWT validation, guards, decorators | Not used in BFF — auth is at Kong level |

**Rules when using these libs:**
- Never mock their internals in unit tests — mock the service that wraps them (`BffCacheService`, `ApiClientService`)
- Never change their constructor signatures — they read from `process.env` directly
- When a new `@adatechnology/*` package appears in `package.json`, document it here

### Params/Result convention (mandatory)

**Any function or method with more than 1 parameter MUST use a single object parameter.**

The parameter type must be named `<MethodName>Params` and the return type `<MethodName>Result`, both defined in the module's `*.types.ts` file.

```ts
// CORRECT — object param, types in *.types.ts
async getProfile({ providerId, headers }: GetProfileParams): GetProfileResult { ... }

// WRONG — positional params
async getProfile(providerId: string, headers: Record<string, string>) { ... }
```

**Where to put types:**
- Each module has a `<module>.types.ts` file (e.g. `dashboard.types.ts`)
- The types file also contains **domain interfaces** (e.g. `ContractorDashboard`, `RequestSummary`) that were previously inlined in the service
- Services re-export domain interfaces with `export type { ... }` so controllers don't import from types file directly

**Applying the rule:**
- Public methods → controller callers must use `{ fieldName: value }` syntax
- Private methods → internal callers within the same class must use destructuring
- `Result` types are `Promise<T>` when async, `T` when sync

### Testing conventions

- Unit test files: `*.unit.spec.ts`
- Mock: `ApiClientService`, `BffCacheService`, Mongoose models, `ChatService`
- Coverage threshold: 50%

### Flow tests (Spec-Driven)

Todo módulo novo deve ter `scripts/flows/<module>.flow.ts`.

**Módulos e seus flows:**
- `health` → `health.flow.ts`
- `home` → `home.flow.ts`
- `search` → `search.flow.ts`
- `provider-profile` → `provider-profile.flow.ts`
- `dashboard` → `dashboard.flow.ts`
- `notification` → `notification.flow.ts`
- `chat` → `chat.flow.ts`
- `screens` → `screens.flow.ts`
- `app-config` + `navigation` → `app-config.flow.ts`

Registrar no `scripts/flows/index.ts` e adicionar script `flows:<module>` no `package.json`.

**Regras dos flows:**
- `setup` limpa estado de runs anteriores antes dos steps
- Dados fixos e legíveis — nunca usar `faker`
- Steps capturam IDs e passam via `ctx` para steps seguintes
- Steps opcionais (`required: false`) para operações destrutivas (DELETE)
