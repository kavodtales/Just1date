import type { RequestHandler } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "./http";
export function authenticate(auth: SupabaseClient): RequestHandler {
  return async (req, _res, next) => {
    try {
      const value = req.headers.authorization;
      if (!value?.startsWith("Bearer "))
        throw new AppError(
          "UNAUTHENTICATED",
          401,
          "Please sign in to continue.",
        );
      const token = value.slice(7);
      const { data, error } = await auth.auth.getUser(token);
      if (error || !data.user)
        throw new AppError(
          "SESSION_EXPIRED",
          401,
          "Your session has expired. Please sign in again.",
        );
      let aal = "aal1";
      try {
        aal =
          JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString())
            .aal ?? "aal1";
      } catch {
        /* Remote validation already rejects malformed tokens. */
      }
      req.actor = { id: data.user.id, email: data.user.email ?? "", aal };
      next();
    } catch (e) {
      next(e);
    }
  };
}
