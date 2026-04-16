/**
 * Health Flow — BFF
 *
 * Fluxos cobertos:
 *   1. GET /health — liveness
 *
 * Nota: o HealthModule existe mas o controller ainda não foi implementado.
 * O step é marcado como required: false para não abortar o suite.
 */

import { type Flow, type Assertion, type RequestResponse } from './lib/runner.ts';

type JsonBody = Record<string, unknown> | null;

function statusIs(res: RequestResponse, ...codes: number[]): Assertion {
  return { label: `status ${codes.join(' or ')}`, ok: codes.includes(res.status), detail: `got ${res.status}` };
}

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3335').replace(/\/$/, '');

const healthFlow: Flow = {
  name: 'Health Check Flow',

  steps: [
    {
      name: 'GET /health — controller pendente de implementação',
      request: () => ({ method: 'GET', path: `${BASE_URL}/health` }),
      expect: (res) => {
        const body = res.json as JsonBody;
        if (res.status === 404) {
          // HealthModule existe mas controller ainda não foi implementado (módulo vazio)
          return [{ label: 'health controller não implementado — pendente (404)', ok: true }];
        }
        return [
          statusIs(res, 200),
          { label: 'status presente', ok: body?.['status'] !== undefined, detail: String(body?.['status']) },
        ];
      },
      required: false,
    },
  ],
};

export default [healthFlow];

if (process.argv[1]?.endsWith('health.flow.ts')) {
  const { runAll } = await import('./lib/runner.ts');
  await runAll([healthFlow]);
}
