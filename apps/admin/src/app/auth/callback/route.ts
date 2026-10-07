import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../../../web/src/lib/supabase-server";
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    try {
      const auth = await supabaseServer();
      const { error } = await auth.auth.exchangeCodeForSession(code);
      if (!error) {
        const next = req.nextUrl.searchParams.get("next");
        return NextResponse.redirect(
          new URL(next === "/auth/reset" ? next : "/", req.url),
        );
      }
    } catch {
      /* Sign-in displays expired/unconfigured feedback. */
    }
  }
  return NextResponse.redirect(new URL("/auth/login", req.url));
}
