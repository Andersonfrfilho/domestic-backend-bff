/**
 * Flow runner — BFF Spec-Driven integration tests
 *
 * Usage:
 *   node scripts/flows/index.ts                   # roda todos os flows
 *   node scripts/flows/index.ts home              # roda só o módulo home
 *
 * Env vars (opcionais, defaults para local):
 *   BASE_URL                http://localhost:3335
 *   FLOW_USER_ID            UUID do usuário simulado (contractor)
 *   FLOW_PROVIDER_ID        UUID do provider simulado
 *   FLOW_USER_TYPE          contractor | provider
 *   FLOW_SERVICE_REQUEST_ID UUID de service_request para o chat
 */

import { runAll, type Flow } from './lib/runner.ts';
import healthFlows from './health.flow.ts';
import homeFlows from './home.flow.ts';
import searchFlows from './search.flow.ts';
import providerProfileFlows from './provider-profile.flow.ts';
import dashboardFlows from './dashboard.flow.ts';
import notificationFlows from './notification.flow.ts';
import chatFlows from './chat.flow.ts';
import screensFlows from './screens.flow.ts';
import appConfigFlows from './app-config.flow.ts';

const MODULES: Record<string, Flow[]> = {
  health:           healthFlows,
  home:             homeFlows,
  search:           searchFlows,
  'provider-profile': providerProfileFlows,
  dashboard:        dashboardFlows,
  notification:     notificationFlows,
  chat:             chatFlows,
  screens:          screensFlows,
  'app-config':     appConfigFlows,
};

async function main(): Promise<void> {
  const target = process.argv[2];

  let flows: Flow[];
  if (target) {
    if (!MODULES[target]) {
      console.error(`Unknown module: "${target}". Available: ${Object.keys(MODULES).join(', ')}`);
      process.exit(1);
    }
    flows = MODULES[target];
  } else {
    flows = Object.values(MODULES).flat();
  }

  await runAll(flows);
}

main().catch((err: unknown) => {
  console.error('Fatal:', err);
  process.exit(1);
});
