/**
 * BFF usa headers injetados pelo Kong — não Bearer token.
 * Em testes locais (sem Kong), simulamos os headers diretamente.
 *
 * Env vars:
 *   FLOW_USER_ID       UUID do usuário simulado  (default: uuid fixo de teste)
 *   FLOW_USER_TYPE     contractor | provider      (default: contractor)
 *   FLOW_USER_ROLES    roles CSV                  (default: USER)
 *   FLOW_PROVIDER_ID   UUID do provider simulado  (default: uuid fixo de teste)
 */

export const FAKE_CONTRACTOR_ID  = process.env.FLOW_USER_ID      ?? '00000000-0000-0000-0000-000000000001';
export const FAKE_PROVIDER_ID    = process.env.FLOW_PROVIDER_ID  ?? '00000000-0000-0000-0000-000000000002';
export const FAKE_USER_TYPE      = process.env.FLOW_USER_TYPE    ?? 'contractor';
export const FAKE_USER_ROLES     = process.env.FLOW_USER_ROLES   ?? 'USER';

/** Headers Kong para um contratante */
export function contractorHeaders(): Record<string, string> {
  return {
    'x-user-id':    FAKE_CONTRACTOR_ID,
    'x-user-type':  'contractor',
    'x-user-roles': FAKE_USER_ROLES,
  };
}

/** Headers Kong para um prestador */
export function providerHeaders(): Record<string, string> {
  return {
    'x-user-id':    FAKE_PROVIDER_ID,
    'x-user-type':  'provider',
    'x-user-roles': FAKE_USER_ROLES,
  };
}

/** Headers Kong genérico com user-id customizado */
export function userHeaders(userId: string, type = 'contractor'): Record<string, string> {
  return {
    'x-user-id':    userId,
    'x-user-type':  type,
    'x-user-roles': FAKE_USER_ROLES,
  };
}
