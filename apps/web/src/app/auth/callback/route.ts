import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase-server";
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    try {
      const auth = await supabaseServer();
      const { error } = await auth.auth.exchangeCodeForSession(code);
      if (!error) {
        const next = req.nextUrl.searchParams.get("next");
        return NextResponse.redirect(
          new URL(next === "/auth/reset" ? next : "/onboarding", req.url),
        );
      }
    } catch {
      /* configuration and expired links are visible on the auth screen */
    }
  }
  return NextResponse.redirect(new URL("/auth/login?expired=true", req.url));
}
