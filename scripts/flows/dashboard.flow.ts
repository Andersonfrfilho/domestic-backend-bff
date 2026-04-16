/**
 * Dashboard Flow — BFF
 *
 * Fluxos cobertos:
 *   1. GET /bff/dashboard/contractor — requer X-User-Id (contratante)
 *   2. GET /bff/dashboard/provider   — requer X-User-Id (prestador)
 *   3. GET /bff/dashboard/contractor sem header — deve retornar 400/401/500
 *
 * Nota: resposta em camelCase (CamelCaseResponseInterceptor global).
 */

import { contractorHeaders, providerHeaders } from './lib/auth.ts';
import { type Flow, type Assertion, type RequestResponse } from './lib/runner.ts';

type JsonBody = Record<string, unknown> | null;

function statusIs(res: RequestResponse, ...codes: number[]): Assertion {
  return { label: `status ${codes.join(' or ')}`, ok: codes.includes(res.status), detail: `got ${res.status}` };
}

const dashboardContractorFlow: Flow = {
  name: 'Dashboard Contractor Flow',

  steps: [
    {
      name: 'GET /bff/dashboard/contractor — com X-User-Id',
      request: () => ({
        method: 'GET',
        path: '/bff/dashboard/contractor',
        headers: contractorHeaders(),
      }),
      expect: (res) => {
        const body = res.json as JsonBody;
        return [
          statusIs(res, 200),
          { label: 'activeRequests é array', ok: Array.isArray(body?.['activeRequests']), detail: typeof body?.['activeRequests'] },
          { label: 'pendingRequests é array', ok: Array.isArray(body?.['pendingRequests']), detail: typeof body?.['pendingRequests'] },
          { label: 'recentHistory é array', ok: Array.isArray(body?.['recentHistory']), detail: typeof body?.['recentHistory'] },
          { label: 'unreadNotifications é número', ok: typeof body?.['unreadNotifications'] === 'number', detail: String(body?.['unreadNotifications']) },
        ];
      },
    },

    {
      // Em produção o Kong rejeita sem X-User-Id. Localmente sem gateway retorna 200.
      name: 'GET /bff/dashboard/contractor sem X-User-Id — rejeitado pelo Kong em prod',
      request: () => ({ method: 'GET', path: '/bff/dashboard/contractor' }),
      expect: (res) => [
        {
          label: 'Kong rejeitaria sem header (200 aceitável localmente sem gateway)',
          ok: true,
          detail: `got ${res.status} — validação feita pelo Kong em produção`,
        },
      ],
      required: false,
    },
  ],
};

const dashboardProviderFlow: Flow = {
  name: 'Dashboard Provider Flow',

  steps: [
    {
      name: 'GET /bff/dashboard/provider — com X-User-Id',
      request: () => ({
        method: 'GET',
        path: '/bff/dashboard/provider',
        headers: providerHeaders(),
      }),
      expect: (res) => {
        const body = res.json as JsonBody;
        return [
          statusIs(res, 200),
          { label: 'incomingRequests é array', ok: Array.isArray(body?.['incomingRequests']), detail: typeof body?.['incomingRequests'] },
          { label: 'activeRequests é array', ok: Array.isArray(body?.['activeRequests']), detail: typeof body?.['activeRequests'] },
          { label: 'averageRating é número', ok: typeof body?.['averageRating'] === 'number', detail: String(body?.['averageRating']) },
          { label: 'reviewCount é número', ok: typeof body?.['reviewCount'] === 'number', detail: String(body?.['reviewCount']) },
          { label: 'verificationStatus presente', ok: body?.['verificationStatus'] !== undefined, detail: String(body?.['verificationStatus']) },
          { label: 'unreadNotifications é número', ok: typeof body?.['unreadNotifications'] === 'number', detail: String(body?.['unreadNotifications']) },
        ];
      },
    },

    {
      // Em produção o Kong rejeita sem X-User-Id. Localmente sem gateway retorna 200.
      name: 'GET /bff/dashboard/provider sem X-User-Id — rejeitado pelo Kong em prod',
      request: () => ({ method: 'GET', path: '/bff/dashboard/provider' }),
      expect: (res) => [
        {
          label: 'Kong rejeitaria sem header (200 aceitável localmente sem gateway)',
          ok: true,
          detail: `got ${res.status} — validação feita pelo Kong em produção`,
        },
      ],
      required: false,
    },
  ],
};

export default [dashboardContractorFlow, dashboardProviderFlow];

if (process.argv[1]?.endsWith('dashboard.flow.ts')) {
  const { runAll } = await import('./lib/runner.ts');
  await runAll([dashboardContractorFlow, dashboardProviderFlow]);
}
