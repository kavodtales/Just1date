import { z } from "zod";
export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().min(1),
    DATABASE_SSL: z.string().default("true"),
    DATABASE_SSL_CA: z.string().optional(),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(15).default(3),
    SUPABASE_URL: z.url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    APP_URL: z.url(),
    ADMIN_URL: z.url(),
    CORS_ORIGINS: z.string().min(1),
    REDIS_URL: z.string().optional(),
    MINIMUM_AGE: z.coerce.number().int().min(18).max(25).default(18),
    PAYSTACK_SECRET_KEY: z.string().optional(),
    PAYSTACK_CALLBACK_URL: z.url().optional(),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().optional(),
    AI_ENABLED: z.enum(["true", "false"]).default("false"),
  })
  .superRefine((config, ctx) => {
    if (config.NODE_ENV !== "production") return;
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    if (config.DATABASE_SSL !== "true")
      issue("DATABASE_SSL", "Production database TLS is required.");
    try {
      if (
        !["postgres:", "postgresql:"].includes(
          new URL(config.DATABASE_URL).protocol,
        )
      )
        throw new Error();
    } catch {
      issue("DATABASE_URL", "A PostgreSQL connection URL is required.");
    }
    try {
      if (config.REDIS_URL && new URL(config.REDIS_URL).protocol !== "rediss:")
        throw new Error();
    } catch {
      issue(
        "REDIS_URL",
        "Optional Redis must use a TLS TCP URL in production.",
      );
    }
    for (const path of ["APP_URL", "ADMIN_URL"] as const) {
      try {
        const origin = new URL(config[path]);
        if (origin.protocol !== "https:" || origin.origin !== config[path])
          throw new Error();
      } catch {
        issue(path, "Use an exact HTTPS origin without a trailing slash.");
      }
    }
    const origins = config.CORS_ORIGINS.split(",");
    if (
      origins.length < 1 ||
      origins.some((value) => {
        try {
          const url = new URL(value);
          return url.protocol !== "https:" || url.origin !== value;
        } catch {
          return true;
        }
      }) ||
      !origins.includes(config.APP_URL) ||
      !origins.includes(config.ADMIN_URL)
    ) {
      issue(
        "CORS_ORIGINS",
        "Exact HTTPS member and staff origins are required.",
      );
    }
  });
export type Config = z.infer<typeof envSchema>;
