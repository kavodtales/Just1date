import { z } from "zod";
import {
  registerSchema,
  loginSchema,
  profileSchema,
  preferencesSchema,
  interactionSchema,
  messageSchema,
  reportSchema,
  safetySchema,
  paymentSchema,
  moderationSchema,
} from "@just1date/validation";
import { passwordSchema } from "./modules/account";
const routes: [string, string, z.ZodType?, boolean?][] = [
  ["post", "/auth/register", registerSchema, true],
  ["post", "/auth/login", loginSchema, true],
  ["post", "/auth/recovery", z.object({ email: z.email() }), true],
  ["post", "/auth/refresh", z.object({ refresh_token: z.string() }), true],
  ["post", "/auth/otp", z.object({ phone: z.string() }), true],
  [
    "post",
    "/auth/otp/verify",
    z.object({ phone: z.string(), token: z.string() }),
    true,
  ],
  ["post", "/auth/logout"],
  ["post", "/auth/password", passwordSchema],
  ["get", "/profiles/me"],
  ["patch", "/profiles/me", profileSchema],
  ["patch", "/profiles/me/preferences", preferencesSchema],
  ["get", "/profiles/discover"],
  ["get", "/profiles/{id}"],
  ["post", "/profiles/me/photos"],
  ["post", "/likes", interactionSchema],
  ["get", "/likes"],
  ["post", "/passes", interactionSchema],
  ["post", "/super-likes", interactionSchema],
  ["get", "/matches"],
  ["delete", "/matches/{id}"],
  ["get", "/conversations"],
  ["get", "/conversations/{id}/messages"],
  ["post", "/conversations/{id}/messages", messageSchema],
  ["post", "/conversations/{id}/read"],
  ["delete", "/messages/{id}"],
  ["post", "/messages/{id}/reactions", z.object({ emoji: z.string() })],
  ["post", "/reports", reportSchema],
  ["post", "/blocks", z.object({ target_id: z.uuid() })],
  ["get", "/blocks"],
  [
    "patch",
    "/privacy",
    z.object({
      visible: z.boolean().optional(),
      paused: z.boolean().optional(),
      show_online: z.boolean().optional(),
    }),
  ],
  ["get", "/account/export"],
  [
    "post",
    "/account/deletion",
    z.object({ confirmation: z.literal("DELETE") }),
  ],
  ["get", "/notifications"],
  ["post", "/notifications/{id}/read"],
  ["patch", "/notifications/preferences"],
  ["post", "/notifications/devices"],
  ["get", "/subscriptions/plans"],
  ["get", "/subscriptions/me"],
  ["post", "/subscriptions/cancel"],
  ["post", "/payments/initialize", paymentSchema],
  ["get", "/payments/{reference}"],
  ["post", "/payments/webhook", undefined, true],
  ["get", "/safety/sessions"],
  ["post", "/safety/sessions", safetySchema],
  ["post", "/safety/sessions/{id}/{action}"],
  ["get", "/safety/contacts"],
  ["post", "/safety/contacts"],
  ["get", "/safety/verification"],
  ["post", "/safety/verification"],
  ["get", "/compatibility/{id}"],
  ["post", "/ai/suggestions"],
  ["get", "/admin/me"],
  ["get", "/admin/metrics"],
  ["get", "/admin/moderation"],
  ["post", "/admin/moderation", moderationSchema],
  ["get", "/admin/photos"],
  ["post", "/admin/photos/{id}/review"],
];
export function openapi() {
  const paths: Record<string, any> = {};
  for (const [method, path, schema, isPublic] of routes) {
    const parameters = [...path.matchAll(/\{(\w+)\}/g)].map((m) => ({
      in: "path",
      name: m[1],
      required: true,
      schema: { type: "string" },
    }));
    if (path === "/payments/initialize")
      parameters.push({
        in: "header",
        name: "Idempotency-Key",
        required: true,
        schema: { type: "string" },
      });
    paths[path] ??= {};
    paths[path][method] = {
      operationId: `${method}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`,
      security: isPublic ? [] : [{ bearerAuth: [] }],
      parameters,
      requestBody: schema
        ? {
            required: true,
            content: {
              "application/json": {
                schema: z.toJSONSchema(schema, { unrepresentable: "any" }),
              },
            },
          }
        : undefined,
      responses: {
        "200": {
          description: "Successful response",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Success" },
            },
          },
        },
        "400": {
          description: "Validation or business rule failure",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        "401": { description: "Session required" },
        "403": { description: "Permission or entitlement denied" },
        "409": { description: "Lifecycle or idempotency conflict" },
        "429": { description: "Rate or quota exceeded" },
        "503": { description: "Provider or feature unavailable" },
      },
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "JUST1DATE API",
      version: "0.1.0",
      description:
        "Service-connected implementation. See docs/STATUS.md for integration and launch gates.",
    },
    servers: [{ url: "/v1" }],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "Supabase JWT",
        },
      },
      schemas: {
        Success: {
          type: "object",
          required: ["data", "request_id"],
          properties: {
            data: {},
            request_id: { type: "string", format: "uuid" },
          },
        },
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message", "status", "request_id"],
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                status: { type: "integer" },
                request_id: { type: "string", format: "uuid" },
              },
            },
          },
        },
      },
    },
  };
}
