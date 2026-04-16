const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3335').replace(/\/$/, '');

const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

const pass = (msg: string) => `${GREEN}✓${RESET} ${msg}`;
const fail = (msg: string) => `${RED}✗${RESET} ${msg}`;
const info = (msg: string) => `${CYAN}→${RESET} ${msg}`;
const warn = (msg: string) => `${YELLOW}⚠${RESET}  ${msg}`;

export interface RequestResponse {
  status: number;
  json: unknown;
  text: string;
  ms: number;
}

export interface Assertion {
  label: string;
  ok: boolean;
  detail?: string;
}

export interface FlowStep<Ctx extends object = Record<string, unknown>> {
  name: string | ((ctx: Ctx) => string);
  request: (ctx: Ctx) => { method: string; path: string; body?: unknown; headers?: Record<string, string> };
  expect?: (res: RequestResponse, ctx: Ctx) => Assertion[];
  capture?: (res: RequestResponse, ctx: Ctx) => void;
  skip?: (ctx: Ctx) => boolean;
  required?: boolean;
}

export interface Flow<Ctx extends object = Record<string, unknown>> {
  name: string;
  setup?: (ctx: Ctx) => Promise<void>;
  steps: FlowStep<Ctx>[];
  teardown?: (ctx: Ctx) => Promise<void>;
}

export async function request(
  method: string,
  path: string,
  { body, headers = {} }: { body?: unknown; headers?: Record<string, string> } = {},
): Promise<RequestResponse> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;

  let reqBody: BodyInit | undefined;
  let baseHeaders: Record<string, string> = {};

  if (body instanceof FormData) {
    reqBody = body;
  } else if (body !== undefined) {
    reqBody = JSON.stringify(body);
    baseHeaders = { 'Content-Type': 'application/json' };
  }

  const opts: RequestInit = {
    method,
    headers: { ...baseHeaders, ...headers },
    body: reqBody,
  };

  const start = Date.now();
  const res = await fetch(url, opts);
  const ms = Date.now() - start;

  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }

  return { status: res.status, json, text, ms };
}

export async function runFlow<Ctx extends object>(flow: Flow<Ctx>): Promise<{ passed: number; failed: number }> {
  console.log(`\n${BOLD}${CYAN}▶ ${flow.name}${RESET}`);
  console.log('─'.repeat(50));

  const ctx = {} as Ctx;
  let passed = 0;
  let failed = 0;

  if (flow.setup) {
    console.log(info('Setup...'));
    try {
      await flow.setup(ctx);
      console.log(`  ${pass('Setup OK')}`);
    } catch (err) {
      console.log(`  ${fail(`Setup failed: ${(err as Error).message}`)}`);
      return { passed: 0, failed: 1 };
    }
  }

  for (const step of flow.steps) {
    const stepName = typeof step.name === 'function' ? step.name(ctx) : step.name;
    console.log(`\n  ${BOLD}${stepName}${RESET}`);

    if (step.skip?.(ctx)) {
      console.log(`  ${DIM}(skipped)${RESET}`);
      continue;
    }

    let res: RequestResponse;
    try {
      const req = step.request(ctx);
      const url = req.path.startsWith('http') ? req.path : `${BASE_URL}${req.path}`;
      console.log(`  ${DIM}${req.method} ${url}${RESET}`);
      res = await request(req.method, req.path, { body: req.body, headers: req.headers });
      console.log(`  ${DIM}${res.status} — ${res.ms}ms${RESET}`);
    } catch (err) {
      console.log(`    ${fail(`Request error: ${(err as Error).message}`)}`);
      failed++;
      if (step.required !== false) break;
      continue;
    }

    const assertions = step.expect?.(res, ctx) ?? [];
    for (const { label, ok, detail } of assertions) {
      if (ok) { console.log(`    ${pass(label)}`); passed++; }
      else { console.log(`    ${fail(label)}${detail ? `  ${DIM}${detail}${RESET}` : ''}`); failed++; }
    }

    const stepFailed = assertions.some(a => !a.ok);
    if (stepFailed && res.json) {
      console.log(`    ${DIM}response: ${JSON.stringify(res.json)}${RESET}`);
    }

    if (step.capture) {
      try { step.capture(res, ctx); }
      catch (err) { console.log(`    ${warn(`capture error: ${(err as Error).message}`)}`); }
    }

    if (stepFailed && step.required !== false) {
      console.log(`    ${warn('Step required — aborting flow')}`);
      failed++;
      break;
    }
  }

  if (flow.teardown) {
    try { await flow.teardown(ctx); }
    catch (err) { console.log(`  ${warn(`Teardown error: ${(err as Error).message}`)}`); }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`${BOLD}${passed > 0 && failed === 0 ? GREEN : RED}${passed} passed, ${failed} failed${RESET}\n`);

  return { passed, failed };
}

export async function runAll(flows: Flow[]): Promise<void> {
  let totalPassed = 0;
  let totalFailed = 0;

  for (const flow of flows) {
    const { passed, failed } = await runFlow(flow);
    totalPassed += passed;
    totalFailed += failed;
  }

  console.log(`${BOLD}${'═'.repeat(51)}`);
  console.log(`  Total: ${totalPassed + totalFailed} assertions`);
  console.log(`  ${GREEN}Passed: ${totalPassed}${RESET}  ${totalFailed > 0 ? RED : ''}${BOLD}Failed: ${totalFailed}${RESET}`);
  console.log(`${'═'.repeat(51)}${RESET}\n`);

  if (totalFailed > 0) process.exit(1);
}
