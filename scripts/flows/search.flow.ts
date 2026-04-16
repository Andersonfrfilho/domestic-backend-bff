/**
 * Search Flow — BFF
 *
 * Fluxos cobertos:
 *   1. GET /bff/search — sem filtros (padrão)
 *   2. GET /bff/search?category=limpeza — filtro por categoria
 *   3. GET /bff/search?city=São Paulo&rating_min=4 — filtro composto
 *   4. GET /bff/search?page=2 — paginação
 *   5. GET /bff/search (cache hit) — 2ª chamada com mesmos params deve ser mais rápida
 */

import { type Flow, type Assertion, type RequestResponse } from './lib/runner.ts';

type JsonBody = Record<string, unknown> | null;

function statusIs(res: RequestResponse, ...codes: number[]): Assertion {
  return { label: `status ${codes.join(' or ')}`, ok: codes.includes(res.status), detail: `got ${res.status}` };
}

function ok(label: string, value: unknown): Assertion {
  return { label, ok: !!value, detail: value == null ? 'got null/undefined' : String(value) };
}

function isArray(label: string, value: unknown): Assertion {
  return { label, ok: Array.isArray(value), detail: `got ${typeof value}` };
}

interface SearchCtx {
  baseMs: number;
}

const searchFlow: Flow<SearchCtx> = {
  name: 'Search Flow',

  setup: async (ctx) => {
    ctx.baseMs = 0;
  },

  steps: [
    {
      name: 'GET /bff/search — sem filtros',
      request: () => ({ method: 'GET', path: '/bff/search' }),
      expect: (res, ctx) => {
        ctx.baseMs = res.ms;
        const body = res.json as JsonBody;
        const meta = body?.['meta'] as Record<string, unknown> | undefined;
        return [
          statusIs(res, 200),
          isArray('layout é array', body?.['layout']),
          isArray('filters é array', body?.['filters']),
          isArray('data é array', body?.['data']),
          ok('meta presente', body?.['meta']),
          { label: 'meta.page é número', ok: typeof meta?.['page'] === 'number', detail: String(meta?.['page']) },
          { label: 'meta.total é número', ok: typeof meta?.['total'] === 'number', detail: String(meta?.['total']) },
        ];
      },
    },

    {
      name: 'GET /bff/search?category=limpeza — filtro por categoria',
      request: () => ({ method: 'GET', path: '/bff/search?category=limpeza' }),
      expect: (res) => {
        const body = res.json as JsonBody;
        return [
          statusIs(res, 200),
          isArray('data é array', body?.['data']),
          ok('meta presente', body?.['meta']),
        ];
      },
      required: false,
    },

    {
      name: 'GET /bff/search?city=São Paulo&rating_min=4 — filtros compostos',
      request: () => ({ method: 'GET', path: `/bff/search?city=${encodeURIComponent('São Paulo')}&rating_min=4` }),
      expect: (res) => {
        const body = res.json as JsonBody;
        return [
          statusIs(res, 200),
          isArray('data é array', body?.['data']),
        ];
      },
      required: false,
    },

    {
      name: 'GET /bff/search?page=2 — paginação',
      request: () => ({ method: 'GET', path: '/bff/search?page=2' }),
      expect: (res) => {
        const body = res.json as JsonBody;
        const meta = body?.['meta'] as Record<string, unknown> | undefined;
        return [
          statusIs(res, 200),
          ok('meta presente', body?.['meta']),
          { label: 'meta.page é número', ok: typeof meta?.['page'] === 'number', detail: String(meta?.['page']) },
        ];
      },
      required: false,
    },

    {
      name: 'GET /bff/search (cache hit)',
      request: () => ({ method: 'GET', path: '/bff/search' }),
      expect: (res, ctx) => {
        const body = res.json as JsonBody;
        return [
          statusIs(res, 200),
          ok('data presente', body?.['data']),
          {
            label: `cache hit — resposta rápida (${res.ms}ms vs ${ctx.baseMs}ms)`,
            ok: res.ms < ctx.baseMs || res.ms < 50,
            detail: `primeira: ${ctx.baseMs}ms, segunda: ${res.ms}ms`,
          },
        ];
      },
      required: false,
    },
  ],
};

export default [searchFlow];

if (process.argv[1]?.endsWith('search.flow.ts')) {
  const { runAll } = await import('./lib/runner.ts');
  await runAll([searchFlow]);
}
