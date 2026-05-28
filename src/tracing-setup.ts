/**
 * Setup explícito de auto-instrumentação para HTTP e Fetch.
 * Isso garante que todas as chamadas HTTP (outbound) sejam rastreadas.
 * DEVE ser importado ANTES de qualquer outro código.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
try {
  // Instrumentar HTTP nativo (modules: http, https)
  const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
  // HttpInstrumentation é auto-registrado na inicialização
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _httpInstrumentation = new HttpInstrumentation({
    enabled: true,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    requestHook: (span: any, request: any) => {
      // Adiciona atributos customizados se necessário
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    responseHook: (span: any, response: any) => {
      // Adiciona atributos customizados se necessário
    },
  });

  // Instrumentar Fetch nativo (Node.js 18+)
  try {
    const { FetchInstrumentation } = require('@opentelemetry/instrumentation-fetch');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _fetchInstrumentation = new FetchInstrumentation();
    console.log('[tracing-setup] Fetch instrumentation registered');
  } catch (err) {
    console.log('[tracing-setup] Fetch instrumentation not available', (err as Error).message);
  }

  console.log('[tracing-setup] HTTP and Fetch instrumentation configured');
} catch (err) {
  console.warn('[tracing-setup] Failed to setup instrumentations:', (err as Error).message);
}
/* eslint-enable @typescript-eslint/no-require-imports */
