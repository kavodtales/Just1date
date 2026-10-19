import { NextRequest, NextResponse } from "next/server";
export function proxy(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  let provider = "";
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL)
      provider = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
  } catch {
    /* Invalid setup is handled by the service connection state. */
  }
  const realtime = provider.replace("https:", "wss:").replace("http:", "ws:");
  const dev = process.env.NODE_ENV !== "production";
  const isCall = req.nextUrl.pathname.startsWith("/calls/");
  let media = "";
  try {
    if (process.env.LIVEKIT_URL) {
      const url = new URL(process.env.LIVEKIT_URL);
      media = `${url.origin} ${url.origin.replace("wss:", "https:")}`;
      if (url.hostname.endsWith(".livekit.cloud"))
        media += " wss://*.livekit.cloud https://*.livekit.cloud";
    }
  } catch {
    /* Configuration errors are handled server-side. */
  }
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}'${dev ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: ${provider}; connect-src 'self' ${provider} ${realtime} ${isCall ? media : ""}${dev ? " ws:" : ""}; font-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';`;
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    isCall
      ? "geolocation=(), microphone=(self), camera=(self)"
      : "geolocation=(), microphone=(), camera=()",
  );
  if (!dev)
    response.headers.set("Strict-Transport-Security", "max-age=31536000");
  return response;
}
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
