import { AsyncLocalStorage } from 'async_hooks';

type RequestContext = {
  requestId: string | undefined;
  traceparent: string | undefined;
  authorization: string | undefined;
};

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

export function getTraceparent(): string | undefined {
  return requestContext.getStore()?.traceparent;
}

export function getAuthorization(): string | undefined {
  return requestContext.getStore()?.authorization;
}
