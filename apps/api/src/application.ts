import express from "express";
import cors from "cors";
import helmet from "helmet";
import { ipKeyGenerator, rateLimit, type Store } from "express-rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestHandler } from "express";
import type { Database } from "@just1date/database";
import type { Config } from "./config";
import { authenticate } from "./lib/auth";
import { AppError, errorHandler, ok, requestContext } from "./lib/http";
import { Repository } from "./lib/repository";
import { authRoutes } from "./modules/auth";
import { profilesRoutes } from "./modules/profiles";
import { socialRoutes } from "./modules/social";
import { paymentsRoutes, webhookRoutes } from "./modules/payments/routes";
import type { PaymentProvider } from "./modules/payments/provider";
import { safetyRoutes } from "./modules/safety";
import { accountRoutes } from "./modules/account";
import { adminRoutes } from "./modules/admin";
import { aiRoutes } from "./modules/ai";
import { openapi } from "./openapi";
import { DemoService, demoRoutes } from "./modules/demo";
export function createApp(deps: {
  db: Database;
  auth: SupabaseClient;
  config: Config;
  payments?: PaymentProvider;
  rateStore?: Store;
  authRateStore?: Store;
  authenticate?: RequestHandler;
}) {
  const app = express(),
    repo = new Repository(deps.db),
    config = deps.config;
  app.disable("x-powered-by");
  if (config.NODE_ENV === "production") app.set("trust proxy", 1);
  app.use(requestContext, helmet());
  const allowed = config.CORS_ORIGINS.split(",");
  app.use(
    cors({
      origin: (origin, cb) =>
        cb(
          origin && !allowed.includes(origin)
            ? new AppError("ORIGIN_DENIED", 403, "This origin is not allowed.")
            : null,
          !origin || allowed.includes(origin),
        ),
      credentials: false,
    }),
  );
  app.get("/health", (_req, res) => ok(res, { status: "ok" }));
  app.get("/ready", async (_req, res) => {
    await deps.db.query("select 1");
    ok(res, { status: "ready" });
  });
  app.get("/openapi.json", (_req, res) => res.json(openapi()));
  app.use("/v1", webhookRoutes(repo, deps.payments));
  app.use(express.json({ limit: "64kb" }));
  const apiLimiter = rateLimit({
    windowMs: 60000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    store: deps.rateStore,
    // Authenticated members may share a Vercel BFF's outbound IP.
    // Only use the identity set by the validated Auth middleware.
    keyGenerator: (req) =>
      req.actor
        ? `user:${req.actor.id}`
        : req.demoSession
          ? `demo:${req.demoSession}`
          : ipKeyGenerator(req.ip ?? ""),
    handler: (req, res) =>
      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: "Please wait a moment and try again.",
          status: 429,
          request_id: req.requestId,
        },
      }),
  });
  app.use(
    "/v1/auth",
    apiLimiter,
    rateLimit({
      windowMs: 15 * 60000,
      limit: 15,
      store: deps.authRateStore,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
    authRoutes(config),
  );
  app.get("/v1/catalog/interests", apiLimiter, async (_req, res) => {
    const rows = await deps.db.transaction(null, async (db) => {
      await db.query("set local role anon");
      return (
        await db.query(
          "select code,name from public.interests where active order by name",
        )
      ).rows;
    });
    ok(res, rows);
  });
  const demo = new DemoService(deps.db, config.SUPABASE_SERVICE_ROLE_KEY);
  app.use("/v1/demo", demo.middleware, apiLimiter, demoRoutes(demo));
  app.use("/v1", deps.authenticate ?? authenticate(deps.auth));
  app.use("/v1", apiLimiter);
  app.use("/v1/profiles", profilesRoutes(repo, deps.auth));
  app.use(
    "/v1",
    socialRoutes(repo, deps.auth),
    accountRoutes(repo, deps.auth, config),
    paymentsRoutes(repo, config, deps.payments),
    aiRoutes(repo, config),
  );
  app.use("/v1/safety", safetyRoutes(repo));
  app.use(
    "/v1/admin",
    adminRoutes(repo, deps.auth, config.NODE_ENV === "production", demo),
  );
  app.use((_req, _res, next) =>
    next(new AppError("NOT_FOUND", 404, "This route does not exist.")),
  );
  app.use(errorHandler);
  return app;
}
