import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import pino from "pino";
export const log = pino({
  redact: [
    "password",
    "authorization",
    "token",
    "email",
    "body",
    "secret",
    "*.password",
    "*.authorization",
  ],
  level: process.env.NODE_ENV === "test" ? "silent" : "info",
});
export class AppError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export type Actor = { id: string; email: string; aal: string };
// Express request augmentation follows its upstream namespace contract.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
      actor: Actor;
      demoSession?: string;
      rawBody?: Buffer;
    }
  }
}
export function requestContext(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.requestId = randomUUID();
  res.setHeader("X-Request-ID", req.requestId);
  const start = Date.now();
  res.on("finish", () =>
    log.info(
      {
        request_id: req.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: Date.now() - start,
      },
      "request",
    ),
  );
  next();
}
export function ok(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ data, request_id: res.req.requestId });
}
const domain: Record<string, [number, string]> = {
  ACCOUNT_UNAVAILABLE: [
    403,
    "Your account is unavailable. Contact support for help.",
  ],
  ONBOARDING_REQUIRED: [
    409,
    "Complete your profile, confirm your email and have a photo approved to continue.",
  ],
  PROFILE_UNAVAILABLE: [404, "This profile is unavailable."],
  CONVERSATION_UNAVAILABLE: [404, "This conversation is unavailable."],
  MESSAGE_UNAVAILABLE: [404, "This message is unavailable."],
  SESSION_UNAVAILABLE: [404, "This date session is unavailable."],
  MATCH_UNAVAILABLE: [404, "This connection is unavailable."],
  USER_UNAVAILABLE: [404, "This account is unavailable."],
  PHOTO_UNAVAILABLE: [404, "This photo is unavailable."],
  CONTACT_UNAVAILABLE: [404, "Choose one of your confirmed trusted contacts."],
  INVALID_CURSOR: [400, "Use a valid page cursor."],
  INVALID_REPLY: [400, "Choose a message in this conversation to reply to."],
  FORBIDDEN: [403, "You do not have permission to perform this action."],
  ADMIN_TARGET_RESTRICTED: [
    403,
    "Staff accounts require the separate staff review process.",
  ],
  SELF_REVIEW_FORBIDDEN: [403, "Another reviewer must review your photo."],
  REPORT_LIMIT: [
    429,
    "You have reached the daily report limit. Contact support for urgent concerns.",
  ],
  PAYMENT_LIMIT: [429, "Please wait before creating another checkout."],
  RECURRING_CANCEL_REQUIRES_PROVIDER: [
    503,
    "This recurring subscription needs provider cancellation. Contact support.",
  ],
  ADMIN_FORBIDDEN: [403, "You do not have permission to perform this action."],
  PREMIUM_REQUIRED: [403, "This feature requires a paid membership."],
  DAILY_LIMIT: [
    429,
    "You have reached today’s like limit. Come back tomorrow.",
  ],
  MESSAGE_LIMIT: [429, "Please wait a moment before sending more messages."],
  IDEMPOTENCY_CONFLICT: [
    409,
    "This operation key has already been used for a different action.",
  ],
  PLAN_UNAVAILABLE: [409, "This plan is not available for purchase yet."],
  FEATURE_UNAVAILABLE: [503, "This feature is not enabled yet."],
  AGE_REQUIREMENT: [400, "You must meet the minimum age requirement to join."],
  ALERT_DELIVERY_UNAVAILABLE: [
    503,
    "Automatic emergency delivery is not connected. Call local emergency services or your trusted contact directly.",
  ],
  LOCATION_SHARING_UNAVAILABLE: [
    503,
    "Live location sharing is not connected yet.",
  ],
  PAYMENT_MISMATCH: [400, "The payment could not be verified."],
  PAYMENT_STATE_CONFLICT: [
    409,
    "This payment cannot be settled in its current state.",
  ],
};
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  let status = 500,
    code = "INTERNAL_ERROR",
    message = "Something went wrong. Please try again.";
  if (err instanceof AppError) {
    ({ status, code, message } = err);
  } else if (err instanceof ZodError) {
    status = 400;
    code = "VALIDATION_ERROR";
    message = err.issues
      .map((i) => `${i.path.join(".") || "Input"}: ${i.message}`)
      .join(" ")
      .slice(0, 500);
  } else if (err instanceof SyntaxError || err.type === "entity.parse.failed") {
    status = 400;
    code = "INVALID_JSON";
    message = "Please send a valid request.";
  } else if (err.type === "entity.too.large") {
    status = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "This file or request is too large.";
  } else if (domain[err.message]) {
    [status, message] = domain[err.message];
    code = err.message;
  } else if (err.code === "P0001" && /^[A-Z][A-Z_]+$/.test(err.message)) {
    status = 400;
    code = err.message;
    message = "Please check the details and try again.";
  } else if (err.code === "23505") {
    status = 409;
    code = "CONFLICT";
    message = "This record already exists.";
  } else if (
    err.code === "23514" ||
    err.code === "22P02" ||
    err.code === "23503"
  ) {
    status = 400;
    code = "INVALID_INPUT";
    message = "Please check the details and try again.";
  }
  log.error(
    {
      request_id: req.requestId,
      code,
      status,
      error_type: err.constructor?.name,
      db_code: err.code,
    },
    "request_failed",
  );
  res
    .status(status)
    .json({ error: { code, message, status, request_id: req.requestId } });
}
