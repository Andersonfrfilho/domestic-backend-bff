/**
 * Chat Flow — BFF
 *
 * Fluxos cobertos:
 *   1. POST /bff/chat/rooms              — criar sala (ou retornar existente)
 *   2. GET  /bff/chat/rooms              — listar salas do usuário
 *   3. GET  /bff/chat/rooms/:roomId      — detalhe da sala
 *   4. POST /bff/chat/rooms/:roomId/messages — enviar mensagem
 *   5. GET  /bff/chat/rooms/:roomId/messages — histórico paginado
 *
 * Nota: resposta em camelCase (CamelCaseResponseInterceptor global).
 *       IDs das salas/mensagens usam 'id' (MongoDB ObjectId serializado).
 */

import { contractorHeaders, FAKE_PROVIDER_ID } from './lib/auth.ts';
import { type Flow, type Assertion, type RequestResponse } from './lib/runner.ts';

type JsonBody = Record<string, unknown> | null;

function statusIs(res: RequestResponse, ...codes: number[]): Assertion {
  return { label: `status ${codes.join(' or ')}`, ok: codes.includes(res.status), detail: `got ${res.status}` };
}

function ok(label: string, value: unknown): Assertion {
  return { label, ok: !!value, detail: value == null ? 'got null/undefined' : String(value) };
}

interface ChatCtx {
  roomId: string;
  serviceRequestId: string;
}

const chatFlow: Flow<ChatCtx> = {
  name: 'Chat Flow',

  setup: async (ctx) => {
    ctx.roomId = '';
    ctx.serviceRequestId = process.env.FLOW_SERVICE_REQUEST_ID ?? '00000000-0000-0000-0000-000000000010';
  },

  steps: [
    {
      name: 'POST /bff/chat/rooms — criar sala',
      request: (ctx) => ({
        method: 'POST',
        path: '/bff/chat/rooms',
        headers: contractorHeaders(),
        body: {
          service_request_id: ctx.serviceRequestId,
          provider_id: FAKE_PROVIDER_ID,
        },
      }),
      expect: (res) => {
        const body = res.json as JsonBody;
        return [
          statusIs(res, 200, 201),
          ok('id presente', body?.['id']),
          ok('serviceRequestId presente', body?.['serviceRequestId']),
          ok('contractorId presente', body?.['contractorId']),
          ok('providerId presente', body?.['providerId']),
        ];
      },
      capture: (res, ctx) => {
        const body = res.json as JsonBody;
        if (body?.['id']) ctx.roomId = String(body['id']);
      },
      required: false,
    },

    {
      name: 'GET /bff/chat/rooms — listar salas do usuário',
      request: () => ({
        method: 'GET',
        path: '/bff/chat/rooms',
        headers: contractorHeaders(),
      }),
      expect: (res, ctx) => {
        const rooms = res.json as Record<string, unknown>[] | null;
        if (Array.isArray(rooms) && rooms.length > 0 && !ctx.roomId) {
          ctx.roomId = String(rooms[0]?.['id'] ?? '');
        }
        return [
          statusIs(res, 200),
          { label: 'retorna array', ok: Array.isArray(rooms), detail: typeof rooms },
        ];
      },
    },

    {
      name: (ctx) => `GET /bff/chat/rooms/${ctx.roomId} — detalhe da sala`,
      request: (ctx) => ({
        method: 'GET',
        path: `/bff/chat/rooms/${ctx.roomId}`,
        headers: contractorHeaders(),
      }),
      skip: (ctx) => !ctx.roomId,
      expect: (res) => {
        const body = res.json as JsonBody;
        return [
          statusIs(res, 200, 404),
          ...(res.status === 200 ? [
            ok('id presente', body?.['id']),
            ok('contractorId presente', body?.['contractorId']),
            ok('providerId presente', body?.['providerId']),
          ] : []),
        ];
      },
    },

    {
      name: (ctx) => `POST /bff/chat/rooms/${ctx.roomId}/messages — enviar mensagem`,
      request: (ctx) => ({
        method: 'POST',
        path: `/bff/chat/rooms/${ctx.roomId}/messages`,
        headers: contractorHeaders(),
        body: { content: 'Olá! Consegue atender amanhã às 10h?' },
      }),
      skip: (ctx) => !ctx.roomId,
      expect: (res) => {
        const body = res.json as JsonBody;
        return [
          statusIs(res, 200, 201),
          ok('id presente', body?.['id']),
          ok('content presente', body?.['content']),
          ok('senderId presente', body?.['senderId']),
          { label: 'read = false', ok: body?.['read'] === false, detail: String(body?.['read']) },
        ];
      },
      required: false,
    },

    {
      name: (ctx) => `GET /bff/chat/rooms/${ctx.roomId}/messages — histórico`,
      request: (ctx) => ({
        method: 'GET',
        path: `/bff/chat/rooms/${ctx.roomId}/messages?page=1&limit=20`,
        headers: contractorHeaders(),
      }),
      skip: (ctx) => !ctx.roomId,
      expect: (res) => {
        const body = res.json as JsonBody;
        const meta = body?.['meta'] as Record<string, unknown> | undefined;
        return [
          statusIs(res, 200, 404),
          ...(res.status === 200 ? [
            { label: 'data é array', ok: Array.isArray(body?.['data']), detail: typeof body?.['data'] },
            ok('meta presente', body?.['meta']),
            { label: 'meta.page é número', ok: typeof meta?.['page'] === 'number', detail: String(meta?.['page']) },
            { label: 'meta.total é número', ok: typeof meta?.['total'] === 'number', detail: String(meta?.['total']) },
          ] : []),
        ];
      },
      required: false,
    },
  ],
};

export default [chatFlow];

if (process.argv[1]?.endsWith('chat.flow.ts')) {
  const { runAll } = await import('./lib/runner.ts');
  await runAll([chatFlow]);
}
