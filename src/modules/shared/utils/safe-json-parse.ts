export async function safeJsonParse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text || text.trim().length === 0) {
    return undefined as unknown as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as unknown as T;
  }
}
