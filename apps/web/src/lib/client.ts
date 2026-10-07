export class ClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/service/${path}`, {
      ...options,
      headers: {
        ...(options.body && !options.headers
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new ClientError(
      "You're offline. We'll reconnect automatically.",
      "OFFLINE",
      0,
    );
  }
  const value = await response.json();
  if (!response.ok)
    throw new ClientError(
      value.error?.message ?? "This action could not finish. Try again.",
      value.error?.code ?? "REQUEST_FAILED",
      response.status,
    );
  return value.data;
}
export const json = (value: unknown) => JSON.stringify(value);
