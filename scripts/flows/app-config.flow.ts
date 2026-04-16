/**
 * App Config Flow — BFF
 *
 * Fluxos cobertos:
 *   1. GET  /bff/app-config                   — config global (navigation + features + version)
 *   2. GET  /bff/navigation                   — lista configs de navegação
 *   3. PUT  /bff/navigation/:screenId         — upsert de navegação
 *   4. GET  /bff/navigation/:screenId         — confirma upsert
 *   5. DELETE /bff/navigation/:screenId       — desativa
 *   6. GET  /bff/navigation/:screenId         — confirma desativação (404)
 *
 * Nota: respostas em camelCase (CamelCaseResponseInterceptor global).
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
  return { label, ok: Array.isArray(value), detail: typeof value };
}

const TEST_SCREEN_ID = 'flow-test-navigation';

const NAV_PAYLOAD = {
  tabBar: {
    visible: true,
    items: [
      { id: 'home', label: 'Início', icon: 'home', route: '/home', visible: true },
      { id: 'search', label: 'Buscar', icon: 'search', route: '/search', visible: true },
    ],
  },
  header: { title: null, showBack: false, actions: [] },
};

const appConfigFlow: Flow = {
  name: 'App Config Flow',

  setup: async (request) => {
    // Limpa navegação de teste de execuções anteriores
    await request({ method: 'DELETE', path: `/bff/navigation/${TEST_SCREEN_ID}` });
  },

  steps: [
    {
      name: 'GET /bff/app-config — config global do app',
      request: () => ({ method: 'GET', path: '/bff/app-config' }),
      expect: (res) => {
        const body = res.json as JsonBody;
        const nav = body?.['navigation'] as Record<string, unknown> | undefined;
        const features = body?.['features'] as Record<string, unknown> | undefined;
        const version = body?.['version'] as Record<string, unknown> | undefined;

        return [
          statusIs(res, 200),
          ok('navigation presente', nav),
          ok('navigation.tabBar presente', nav?.['tabBar']),
          isArray('navigation.tabBar.items é array', (nav?.['tabBar'] as Record<string, unknown>)?.['items']),
          ok('navigation.header presente', nav?.['header']),
          ok('features presente', features),
          { label: 'features.chatEnabled é boolean', ok: typeof features?.['chatEnabled'] === 'boolean', detail: typeof features?.['chatEnabled'] },
          { label: 'features.notificationsEnabled é boolean', ok: typeof features?.['notificationsEnabled'] === 'boolean', detail: typeof features?.['notificationsEnabled'] },
          ok('version presente', version),
          ok('version.minRequired presente', version?.['minRequired']),
          { label: 'version.forceUpdate é boolean', ok: typeof version?.['forceUpdate'] === 'boolean', detail: typeof version?.['forceUpdate'] },
        ];
      },
    },

    {
      name: 'GET /bff/navigation — lista configs de navegação',
      request: () => ({ method: 'GET', path: '/bff/navigation' }),
      expect: (res) => [
        statusIs(res, 200),
        isArray('retorna array', res.json),
      ],
    },

    {
      name: `PUT /bff/navigation/${TEST_SCREEN_ID} — upsert`,
      request: () => ({
        method: 'PUT',
        path: `/bff/navigation/${TEST_SCREEN_ID}`,
        body: NAV_PAYLOAD,
      }),
      expect: (res) => {
        const body = res.json as JsonBody;
        return [
          statusIs(res, 200, 201),
          ok('tabBar presente', body?.['tabBar']),
          isArray('tabBar.items é array', (body?.['tabBar'] as Record<string, unknown>)?.['items']),
          {
            label: 'tabBar tem 2 itens',
            ok: Array.isArray((body?.['tabBar'] as Record<string, unknown>)?.['items']) &&
              ((body?.['tabBar'] as Record<string, unknown>)?.['items'] as unknown[]).length === 2,
            detail: String(((body?.['tabBar'] as Record<string, unknown>)?.['items'] as unknown[] | undefined)?.length),
          },
        ];
      },
    },

    {
      name: `GET /bff/navigation/${TEST_SCREEN_ID} — confirma upsert`,
      request: () => ({ method: 'GET', path: `/bff/navigation/${TEST_SCREEN_ID}` }),
      expect: (res) => {
        const body = res.json as JsonBody;
        return [
          statusIs(res, 200),
          ok('tabBar presente', body?.['tabBar']),
        ];
      },
    },

    {
      name: `DELETE /bff/navigation/${TEST_SCREEN_ID} — desativar`,
      request: () => ({ method: 'DELETE', path: `/bff/navigation/${TEST_SCREEN_ID}` }),
      expect: (res) => [statusIs(res, 200, 204)],
      required: false,
    },

    {
      name: `GET /bff/navigation/${TEST_SCREEN_ID} — confirma desativação (404)`,
      request: () => ({ method: 'GET', path: `/bff/navigation/${TEST_SCREEN_ID}` }),
      expect: (res) => [
        {
          label: 'retorna 404 após desativação',
          ok: res.status === 404,
          detail: `got ${res.status}`,
        },
      ],
      required: false,
    },
  ],
};

export default [appConfigFlow];

if (process.argv[1]?.endsWith('app-config.flow.ts')) {
  const { runAll } = await import('./lib/runner.ts');
  await runAll([appConfigFlow]);
}
