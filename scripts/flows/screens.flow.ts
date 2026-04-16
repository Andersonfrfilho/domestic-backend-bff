/**
 * Screens (SDUI Admin) Flow — BFF
 *
 * Fluxos cobertos:
 *   1. GET    /bff/screens               — lista todas as screen_configs
 *   2. PUT    /bff/screens/:screenId     — upsert (cria ou atualiza)
 *   3. GET    /bff/screens/:screenId     — confirma upsert
 *   4. DELETE /bff/screens/:screenId     — desativar screen
 *   5. GET    /bff/screens/:screenId     — confirma desativação
 *
 * Nota: resposta em camelCase (CamelCaseResponseInterceptor global).
 *       Campo 'screen_id' da entidade → 'screenId' no response.
 */

import { type Flow, type Assertion, type RequestResponse } from './lib/runner.ts';

type JsonBody = Record<string, unknown> | null;

function statusIs(res: RequestResponse, ...codes: number[]): Assertion {
  return { label: `status ${codes.join(' or ')}`, ok: codes.includes(res.status), detail: `got ${res.status}` };
}

function ok(label: string, value: unknown): Assertion {
  return { label, ok: !!value, detail: value == null ? 'got null/undefined' : String(value) };
}

const TEST_SCREEN_ID = 'flow-test-screen';

const SCREEN_PAYLOAD = {
  version: '1.0',
  components: [
    { id: 'cats', type: 'category_list', data_source: 'categories', order: 0, config: {} },
    { id: 'featured', type: 'provider_grid', data_source: 'featured_providers', order: 1, config: { columns: 2 } },
  ],
};

const screensFlow: Flow = {
  name: 'Screens SDUI Admin Flow',

  steps: [
    {
      name: 'GET /bff/screens — lista todas as screens',
      request: () => ({ method: 'GET', path: '/bff/screens' }),
      expect: (res) => {
        const body = res.json as unknown;
        return [
          statusIs(res, 200),
          {
            label: 'retorna array ou objeto',
            ok: Array.isArray(body) || (typeof body === 'object' && body !== null),
            detail: typeof body,
          },
        ];
      },
    },

    {
      name: `PUT /bff/screens/${TEST_SCREEN_ID} — upsert`,
      request: () => ({
        method: 'PUT',
        path: `/bff/screens/${TEST_SCREEN_ID}`,
        body: SCREEN_PAYLOAD,
      }),
      expect: (res) => {
        const body = res.json as JsonBody;
        return [
          statusIs(res, 200, 201),
          ok('screenId presente', body?.['screenId']),
          ok('version presente', body?.['version']),
          { label: 'components é array', ok: Array.isArray(body?.['components']), detail: typeof body?.['components'] },
          { label: 'isActive = true', ok: body?.['isActive'] === true, detail: String(body?.['isActive']) },
        ];
      },
    },

    {
      name: `GET /bff/screens/${TEST_SCREEN_ID} — confirma upsert`,
      request: () => ({ method: 'GET', path: `/bff/screens/${TEST_SCREEN_ID}` }),
      expect: (res) => {
        const body = res.json as JsonBody;
        return [
          statusIs(res, 200),
          {
            label: 'screenId correto',
            ok: body?.['screenId'] === TEST_SCREEN_ID,
            detail: String(body?.['screenId']),
          },
          {
            label: 'version correta',
            ok: body?.['version'] === SCREEN_PAYLOAD.version,
            detail: String(body?.['version']),
          },
          {
            label: '2 componentes',
            ok: Array.isArray(body?.['components']) && (body['components'] as unknown[]).length === 2,
            detail: `got ${Array.isArray(body?.['components']) ? (body['components'] as unknown[]).length : 'not array'}`,
          },
        ];
      },
    },

    {
      name: `DELETE /bff/screens/${TEST_SCREEN_ID} — desativar`,
      request: () => ({ method: 'DELETE', path: `/bff/screens/${TEST_SCREEN_ID}` }),
      expect: (res) => [statusIs(res, 200, 204)],
      required: false,
    },

    {
      // Após DELETE: a screen pode retornar 404, isActive=false, ou isActive ausente (soft delete).
      name: `GET /bff/screens/${TEST_SCREEN_ID} — screen desativada após delete`,
      request: () => ({ method: 'GET', path: `/bff/screens/${TEST_SCREEN_ID}` }),
      expect: (res) => {
        const body = res.json as JsonBody;
        const isInactive  = body?.['isActive'] === false;
        const isAbsent    = body?.['isActive'] === undefined; // soft delete remove o campo
        const isNotFound  = res.status === 404;
        return [
          {
            label: 'screen desativada (404 | isActive=false | isActive ausente)',
            ok: isNotFound || isInactive || isAbsent,
            detail: `status=${res.status}, isActive=${body?.['isActive']}`,
          },
        ];
      },
      required: false,
    },
  ],
};

export default [screensFlow];

if (process.argv[1]?.endsWith('screens.flow.ts')) {
  const { runAll } = await import('./lib/runner.ts');
  await runAll([screensFlow]);
}
