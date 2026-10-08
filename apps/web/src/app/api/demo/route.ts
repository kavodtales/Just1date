import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const cookie = "j1d_demo";
async function proxy(req: NextRequest) {
  if (req.method === "POST" && req.headers.get("origin") !== req.nextUrl.origin)
    return NextResponse.json(
      { error: { message: "Please use this application to try the preview." } },
      { status: 403 },
    );
  if (!process.env.API_URL)
    return NextResponse.json(
      { error: { message: "The preview is temporarily unavailable." } },
      { status: 503 },
    );
  try {
    const payload = req.method === "POST" ? await req.text() : "";
    if (payload.length > 4096)
      return NextResponse.json(
        { error: { message: "This request is too large." } },
        { status: 413 },
      );
    const input = payload ? JSON.parse(payload) : {};
    if (!input || typeof input !== "object" || Array.isArray(input))
      return NextResponse.json(
        { error: { message: "Please send a valid request." } },
        { status: 400 },
      );
    const path =
      req.method === "GET"
        ? "state"
        : input.action === "start"
          ? "session"
          : "action";
    const token = req.cookies.get(cookie)?.value;
    const upstream = await fetch(
      new URL(`/v1/demo/${path}`, process.env.API_URL),
      {
        method: req.method,
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-Demo-Session": token } : {}),
        },
        body:
          req.method === "POST"
            ? JSON.stringify(path === "session" ? {} : input)
            : undefined,
      },
    );
    const result = await upstream.json();
    const sessionToken = result.data?.token;
    const maxAge = result.data?.maxAge;
    if (result.data) {
      delete result.data.token;
      delete result.data.maxAge;
    }
    const response = NextResponse.json(result, {
      status: upstream.status,
      headers: { "Cache-Control": "no-store" },
    });
    if (sessionToken)
      response.cookies.set(cookie, sessionToken, {
        httpOnly: true,
        secure: req.nextUrl.protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge,
      });
    if (upstream.status === 401 || upstream.status === 410)
      response.cookies.set(cookie, "", { maxAge: 0, path: "/" });
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          message:
            error instanceof SyntaxError
              ? "Please send a valid request."
              : "We couldn’t connect. Please try again.",
        },
      },
      { status: error instanceof SyntaxError ? 400 : 503 },
    );
  }
}
export { proxy as GET, proxy as POST };
