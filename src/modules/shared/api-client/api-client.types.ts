export interface ApiClientGetParams {
  path: string;
  headers?: Record<string, string>;
}

export interface ApiClientPostParams {
  path: string;
  body: unknown;
  headers?: Record<string, string>;
}

export interface ApiClientPutParams {
  path: string;
  body: unknown;
  headers?: Record<string, string>;
}

export type ApiClientGetResult<T> = Promise<T>;
export type ApiClientPostResult<T> = Promise<T>;
export type ApiClientPutResult<T> = Promise<T>;
