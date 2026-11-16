export async function api<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const r = await fetch(path, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
  });
  const data = await r.json();
  if (!r.ok)
    throw new Error(data.error || 'No se pudo completar la operación.');
  return data as T;
}
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : 'Ocurrió un error.';
