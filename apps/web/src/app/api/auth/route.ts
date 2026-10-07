import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { registerSchema, loginSchema, isAdult } from "@just1date/validation";
import { supabaseServer, configured } from "../../../lib/supabase-server";
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin)
    return NextResponse.json(
      { error: "Please use the application to sign in." },
      { status: 403 },
    );
  if (!configured())
    return NextResponse.json(
      {
        error: "Account services are being prepared. Please try again later.",
      },
      { status: 503 },
    );
  try {
    const { mode, ...input } = await req.json();
    const auth = await supabaseServer();
    let result: any;
    if (mode === "login")
      result = await auth.auth.signInWithPassword(loginSchema.parse(input));
    else if (mode === "register") {
      const p = registerSchema.parse(input);
      if (!isAdult(p.date_of_birth))
        return NextResponse.json(
          { error: "You must be at least 18 to join." },
          { status: 400 },
        );
      result = await auth.auth.signUp({
        email: p.email,
        password: p.password,
        options: {
          data: { date_of_birth: p.date_of_birth },
          emailRedirectTo: `${req.nextUrl.origin}/auth/callback`,
        },
      });
    } else if (mode === "recovery") {
      const { email } = z.object({ email: z.email() }).parse(input);
      await auth.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.nextUrl.origin}/auth/callback?next=/auth/reset`,
      });
      return NextResponse.json({
        message:
          "If the account exists, check your email for recovery instructions.",
      });
    } else if (mode === "reset") {
      const p = z
        .object({ password: z.string().min(12).max(128) })
        .parse(input);
      const { data, error } = await auth.auth.getUser();
      if (error || !data.user)
        return NextResponse.json(
          { error: "Open the recovery link from your email first." },
          { status: 401 },
        );
      result = await auth.auth.updateUser(p);
    } else if (mode === "phone_send") {
      const p = z
        .object({ phone: z.string().regex(/^\+[1-9]\d{7,14}$/) })
        .strict()
        .parse(input);
      result = await auth.auth.signInWithOtp({
        phone: p.phone,
        options: { shouldCreateUser: false },
      });
    } else if (mode === "phone_verify") {
      const p = z
        .object({
          phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
          token: z.string().regex(/^\d{6}$/),
        })
        .strict()
        .parse(input);
      result = await auth.auth.verifyOtp({ ...p, type: "sms" });
    } else if (mode === "logout") result = await auth.auth.signOut();
    else
      return NextResponse.json(
        { error: "Unknown account action." },
        { status: 400 },
      );
    if (result.error)
      return NextResponse.json(
        {
          error:
            mode === "login"
              ? "Check your credentials and email verification."
              : "This action could not finish. Check your details and try again.",
        },
        { status: 400 },
      );
    return NextResponse.json({
      message:
        mode === "register"
          ? "Check your email to verify your account."
          : mode === "phone_send"
            ? "Check your phone for the verification code."
            : mode === "reset"
              ? "Your password has been updated."
              : "Signed in.",
      verified: Boolean(result.data?.session),
    });
  } catch {
    return NextResponse.json(
      { error: "Please check the fields and try again." },
      { status: 400 },
    );
  }
}
