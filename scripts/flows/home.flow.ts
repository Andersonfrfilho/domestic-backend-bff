/**
 * Home Flow — BFF
 *
 * Fluxos cobertos:
 *   1. GET /bff/home — retorna layout SDUI + categorias + providers destaque
 *   2. GET /bff/home (2ª chamada) — deve responder mais rápido via cache Redis
 *
 * Nota: resposta em camelCase (CamelCaseResponseInterceptor global).
 */

import { type Flow, type Assertion, type RequestResponse } from './lib/runner.ts';

type JsonBody = Record<string, unknown> | null;

function statusIs(res: RequestResponse, ...codes: number[]): Assertion {
  return { label: `status ${codes.join(' or ')}`, ok: codes.includes(res.status), detail: `got ${res.status}` };
}

function ok(label: string, value: unknown): Assertion {
  return { label, ok: !!value, detail: value == null ? 'got null/undefined' : String(value) };
}

interface HomeFlowCtx {
  firstResponseMs: number;
}

const homeFlow: Flow<HomeFlowCtx> = {
  name: 'Home SDUI Flow',

  setup: async (ctx) => {
    ctx.firstResponseMs = 0;
  },

  steps: [
    {
      name: 'GET /bff/home — dados da tela inicial',
      request: () => ({ method: 'GET', path: '/bff/home' }),
      expect: (res, ctx) => {
        ctx.firstResponseMs = res.ms;
        const body = res.json as JsonBody;
        return [
          statusIs(res, 200),
          ok('layout presente', body?.['layout']),
          { label: 'layout é array', ok: Array.isArray(body?.['layout']), detail: typeof body?.['layout'] },
          ok('featuredCategories presente', body?.['featuredCategories']),
          { label: 'featuredCategories é array', ok: Array.isArray(body?.['featuredCategories']) },
          ok('featuredProviders presente', body?.['featuredProviders']),
          { label: 'featuredProviders é array', ok: Array.isArray(body?.['featuredProviders']) },
        ];
      },
    },

    {
      name: 'GET /bff/home (cache hit) — 2ª chamada mais rápida',
      request: () => ({ method: 'GET', path: '/bff/home' }),
      expect: (res, ctx) => {
        const body = res.json as JsonBody;
        return [
          statusIs(res, 200),
          ok('layout presente', body?.['layout']),
          {
            label: `cache hit — resposta rápida (${res.ms}ms vs ${ctx.firstResponseMs}ms)`,
            ok: res.ms < ctx.firstResponseMs || res.ms < 50,
            detail: `primeira: ${ctx.firstResponseMs}ms, segunda: ${res.ms}ms`,
          },
        ];
      },
      required: false,
    },
  ],
};

export default [homeFlow];

if (process.argv[1]?.endsWith('home.flow.ts')) {
  const { runAll } = await import('./lib/runner.ts');
  await runAll([homeFlow]);
}
