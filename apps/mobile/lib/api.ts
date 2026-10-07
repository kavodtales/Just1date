import { auth } from "./auth";
export async function api<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!auth || !process.env.EXPO_PUBLIC_API_URL)
    throw new Error("Connect Supabase and the API to use your account.");
  const { data, error } = await auth.auth.getSession();
  if (error || !data.session) throw new Error("Sign in to continue.");
  let response: Response;
  try {
    response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/v1/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        ...(init.body && !init.headers
          ? { "Content-Type": "application/json" }
          : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new Error("You're offline. We'll reconnect automatically.");
  }
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error?.message ?? "This action could not finish. Try again.",
    );
  return result.data;
}
