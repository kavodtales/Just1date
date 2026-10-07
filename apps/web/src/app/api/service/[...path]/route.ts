import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, configured } from "../../../../lib/supabase-server";
export const runtime = "nodejs";
async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!configured() || !process.env.API_URL)
    return NextResponse.json(
      {
        error: {
          code: "SERVICE_NOT_CONFIGURED",
          message:
            "Account services are being prepared. Please check back shortly.",
        },
      },
      { status: 503 },
    );
  if (
    !["GET", "HEAD"].includes(req.method) &&
    req.headers.get("origin") !== req.nextUrl.origin
  )
    return NextResponse.json(
      {
        error: {
          code: "ORIGIN_DENIED",
          message: "Please use this application to perform the action.",
        },
      },
      { status: 403 },
    );
  try {
    const auth = await supabaseServer();
    const { data: user, error } = await auth.auth.getUser();
    if (error || !user.user)
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } },
        { status: 401 },
      );
    const { data } = await auth.auth.getSession();
    const { path } = await params;
    const target = new URL(
      `/v1/${path.map(encodeURIComponent).join("/")}`,
      process.env.API_URL,
    );
    target.search = req.nextUrl.search;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${data.session!.access_token}`,
    };
    for (const name of ["content-type", "idempotency-key"]) {
      const v = req.headers.get(name);
      if (v) headers[name] = v;
    }
    const body = ["GET", "HEAD"].includes(req.method)
      ? undefined
      : Buffer.from(await req.arrayBuffer());
    if (body && body.length > 5242880)
      return NextResponse.json(
        {
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "Use a file smaller than 5 MB.",
          },
        },
        { status: 413 },
      );
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "We could not reach the service. Please try again.",
        },
      },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
