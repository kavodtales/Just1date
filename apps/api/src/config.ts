import { z } from "zod";
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: z.string().default("true"),
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
});
export type Config = z.infer<typeof envSchema>;
