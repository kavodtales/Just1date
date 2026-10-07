import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { registerSchema, loginSchema, isAdult } from "@just1date/validation";
import type { Config } from "../config";
import { AppError, ok } from "../lib/http";
export function authRoutes(config: Config) {
  const r = Router();
  const fresh = () =>
    createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  r.post("/register", async (req, res) => {
    const p = registerSchema.parse(req.body);
    if (!isAdult(p.date_of_birth, config.MINIMUM_AGE))
      throw new AppError(
        "AGE_REQUIREMENT",
        400,
        `You must be at least ${config.MINIMUM_AGE} to join.`,
      );
    const { error } = await fresh().auth.signUp({
      email: p.email,
      password: p.password,
      options: {
        data: { date_of_birth: p.date_of_birth },
        emailRedirectTo: `${config.APP_URL}/auth/callback`,
      },
    });
    if (error)
      throw new AppError(
        "REGISTRATION_FAILED",
        400,
        "Unable to create the account. Check your details or use account recovery.",
      );
    ok(res, { message: "Check your email to confirm your account." }, 201);
  });
  r.post("/login", async (req, res) => {
    const p = loginSchema.parse(req.body);
    const { data, error } = await fresh().auth.signInWithPassword(p);
    if (error)
      throw new AppError(
        "LOGIN_FAILED",
        401,
        "Check your email and password, and confirm your email if needed.",
      );
    ok(res, data.session);
  });
  r.post("/refresh", async (req, res) => {
    const p = z
      .object({ refresh_token: z.string().min(1).max(4096) })
      .strict()
      .parse(req.body);
    const { data, error } = await fresh().auth.refreshSession(p);
    if (error)
      throw new AppError("SESSION_EXPIRED", 401, "Please sign in again.");
    ok(res, data.session);
  });
  r.post("/recovery", async (req, res) => {
    const { email } = z.object({ email: z.email() }).strict().parse(req.body);
    await fresh().auth.resetPasswordForEmail(email, {
      redirectTo:
        `config.APP_URL/auth/callback`.replace(
          "config.APP_URL",
          config.APP_URL,
        ) + "?next=/auth/reset",
    });
    ok(res, {
      message: "If an account exists, a recovery email will arrive shortly.",
    });
  });
  r.post("/otp", async (req, res) => {
    const { phone } = z
      .object({ phone: z.string().regex(/^\+[1-9]\d{7,14}$/) })
      .strict()
      .parse(req.body);
    const { error } = await fresh().auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: false },
    });
    if (error)
      throw new AppError(
        "OTP_UNAVAILABLE",
        503,
        "Phone sign-in is unavailable. Use email sign-in.",
      );
    ok(res, {
      message: "If this phone is registered, an OTP has been requested.",
    });
  });
  r.post("/otp/verify", async (req, res) => {
    const p = z
      .object({
        phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
        token: z.string().regex(/^\d{6}$/),
      })
      .strict()
      .parse(req.body);
    const { data, error } = await fresh().auth.verifyOtp({ ...p, type: "sms" });
    if (error)
      throw new AppError("OTP_INVALID", 400, "The code is invalid or expired.");
    ok(res, data.session);
  });
  return r;
}
