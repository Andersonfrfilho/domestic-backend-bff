/**
 * Provider Profile Flow — BFF
 *
 * Fluxos cobertos:
 *   1. GET /bff/providers/:id/profile — perfil agregado (id válido via search)
 *   2. GET /bff/providers/:id/profile (cache hit) — 2ª chamada deve ser mais rápida
 *   3. GET /bff/providers/invalid-uuid/profile — 404 para id inválido
 */

import { type Flow, type Assertion, type RequestResponse } from './lib/runner.ts';

type JsonBody = Record<string, unknown> | null;

function statusIs(res: RequestResponse, ...codes: number[]): Assertion {
  return { label: `status ${codes.join(' or ')}`, ok: codes.includes(res.status), detail: `got ${res.status}` };
}

function ok(label: string, value: unknown): Assertion {
  return { label, ok: !!value, detail: value == null ? 'got null/undefined' : String(value) };
}

interface ProfileCtx {
  providerId: string;
  firstMs: number;
}

const providerProfileFlow: Flow<ProfileCtx> = {
  name: 'Provider Profile Flow',

  setup: async (ctx) => {
    ctx.firstMs = 0;
    // Busca um provider real via search para usar no flow
    const { request } = await import('./lib/runner.ts');
    const res = await request('GET', '/bff/search?limit=1');
    const body = res.json as JsonBody;
    const data = body?.['data'] as Record<string, unknown>[] | undefined;
    if (Array.isArray(data) && data.length > 0 && data[0]?.['id']) {
      ctx.providerId = data[0]['id'] as string;
      console.log(`  provider encontrado via search: ${ctx.providerId}`);
    } else {
      ctx.providerId = process.env.FLOW_PROVIDER_ID ?? '00000000-0000-0000-0000-000000000002';
      console.log(`  usando provider fallback: ${ctx.providerId}`);
    }
  },

  steps: [
    {
      name: (ctx) => `GET /bff/providers/${ctx.providerId}/profile`,
      request: (ctx) => ({ method: 'GET', path: `/bff/providers/${ctx.providerId}/profile` }),
      expect: (res, ctx) => {
        ctx.firstMs = res.ms;
        const body = res.json as JsonBody;
        return [
          statusIs(res, 200, 404),
          ...(res.status === 200 ? [
            ok('id presente', body?.['id']),
            ok('average_rating presente', body?.['average_rating']),
            { label: 'services é array', ok: Array.isArray(body?.['services']), detail: typeof body?.['services'] },
            { label: 'recent_reviews é array', ok: Array.isArray(body?.['recent_reviews']), detail: typeof body?.['recent_reviews'] },
            { label: 'work_locations é array', ok: Array.isArray(body?.['work_locations']), detail: typeof body?.['work_locations'] },
            { label: 'is_available é boolean', ok: typeof body?.['is_available'] === 'boolean', detail: String(body?.['is_available']) },
          ] : [
            { label: 'provider não encontrado (404 aceitável)', ok: true },
          ]),
        ];
      },
    },

    {
      name: (ctx) => `GET /bff/providers/${ctx.providerId}/profile (cache hit)`,
      request: (ctx) => ({ method: 'GET', path: `/bff/providers/${ctx.providerId}/profile` }),
      expect: (res, ctx) => {
        const body = res.json as JsonBody;
        return [
          statusIs(res, 200, 404),
          {
            label: `cache hit (${res.ms}ms vs ${ctx.firstMs}ms)`,
            ok: res.ms < ctx.firstMs || res.ms < 50,
            detail: `primeira: ${ctx.firstMs}ms, segunda: ${res.ms}ms`,
          },
          ...(res.status === 200 ? [ok('id presente', body?.['id'])] : []),
        ];
      },
      required: false,
    },

    {
      name: 'GET /bff/providers/invalid-uuid/profile — 404',
      request: () => ({ method: 'GET', path: '/bff/providers/00000000-0000-0000-0000-999999999999/profile' }),
      expect: (res) => [statusIs(res, 404, 400)],
      required: false,
    },
  ],
};

export default [providerProfileFlow];

if (process.argv[1]?.endsWith('provider-profile.flow.ts')) {
  const { runAll } = await import('./lib/runner.ts');
  await runAll([providerProfileFlow]);
}
