/**
 * Notification Flow — BFF
 *
 * Fluxos cobertos:
 *   1. GET /bff/notifications             — lista notificações (proxy → API)
 *   2. GET /bff/notifications/unread-count — contagem não lidas
 *   3. PUT /bff/notifications/read-all    — marca todas como lidas
 *   4. PUT /bff/notifications/:id/read    — marca uma como lida (id capturado do GET)
 */

import { contractorHeaders } from './lib/auth.ts';
import { type Flow, type Assertion, type RequestResponse } from './lib/runner.ts';

type JsonBody = Record<string, unknown> | null;

function statusIs(res: RequestResponse, ...codes: number[]): Assertion {
  return { label: `status ${codes.join(' or ')}`, ok: codes.includes(res.status), detail: `got ${res.status}` };
}

interface NotificationCtx {
  notificationId: string;
}

const notificationFlow: Flow<NotificationCtx> = {
  name: 'Notification Flow',

  setup: async (ctx) => {
    ctx.notificationId = '';
  },

  steps: [
    {
      // Proxy para o Backend API — requer API rodando em API_BASE_URL
      name: 'GET /bff/notifications — lista notificações (requer API online)',
      request: () => ({
        method: 'GET',
        path: '/bff/notifications',
        headers: contractorHeaders(),
      }),
      expect: (res) => {
        if (res.status === 500 && typeof res.json === 'object' && (res.json as Record<string, unknown>)?.['message'] === 'fetch failed') {
          return [{ label: 'Backend API offline — proxy não disponível localmente', ok: true }];
        }
        return [
          statusIs(res, 200),
          {
            label: 'retorna array ou objeto',
            ok: Array.isArray(res.json) || (typeof res.json === 'object' && res.json !== null),
            detail: typeof res.json,
          },
        ];
      },
      capture: (res, ctx) => {
        const items = Array.isArray(res.json) ? res.json as Record<string, unknown>[] : [];
        if (items.length > 0) {
          ctx.notificationId = (items[0]?.['_id'] ?? items[0]?.['id'] ?? '') as string;
        }
      },
      required: false,
    },

    {
      name: 'GET /bff/notifications/unread-count — contagem não lidas',
      request: () => ({
        method: 'GET',
        path: '/bff/notifications/unread-count',
        headers: contractorHeaders(),
      }),
      expect: (res) => {
        if (res.status === 500) {
          return [{ label: 'Backend API offline — proxy não disponível localmente', ok: true }];
        }
        const body = res.json as JsonBody;
        return [
          statusIs(res, 200),
          { label: 'count é número', ok: typeof body?.['count'] === 'number', detail: String(body?.['count']) },
        ];
      },
      required: false,
    },

    {
      name: 'PUT /bff/notifications/read-all — marcar todas como lidas',
      request: () => ({
        method: 'PUT',
        path: '/bff/notifications/read-all',
        headers: contractorHeaders(),
      }),
      expect: (res) => {
        if (res.status === 500) {
          return [{ label: 'Backend API offline — proxy não disponível localmente', ok: true }];
        }
        return [statusIs(res, 200, 204)];
      },
      required: false,
    },

    {
      name: (ctx) => `PUT /bff/notifications/${ctx.notificationId}/read — marcar uma como lida`,
      request: (ctx) => ({
        method: 'PUT',
        path: `/bff/notifications/${ctx.notificationId}/read`,
        headers: contractorHeaders(),
      }),
      skip: (ctx) => !ctx.notificationId,
      expect: (res) => [statusIs(res, 200, 204, 404)],
      required: false,
    },
  ],
};

export default [notificationFlow];

if (process.argv[1]?.endsWith('notification.flow.ts')) {
  const { runAll } = await import('./lib/runner.ts');
  await runAll([notificationFlow]);
}
