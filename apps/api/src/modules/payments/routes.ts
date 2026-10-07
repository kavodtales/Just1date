import { Router, raw } from "express";
import { createHash } from "node:crypto";
import { z } from "zod";
import { paymentSchema, uuid } from "@just1date/validation";
import type { Config } from "../../config";
import { Repository } from "../../lib/repository";
import { AppError, ok } from "../../lib/http";
import type { PaymentProvider } from "./provider";
export function webhookRoutes(repo: Repository, provider?: PaymentProvider) {
  const r = Router();
  r.post(
    "/payments/webhook",
    raw({ type: "application/json", limit: "256kb" }),
    async (req, res) => {
      if (!provider)
        throw new AppError(
          "PAYMENTS_UNAVAILABLE",
          503,
          "Payments are not configured.",
        );
      const rawBody = req.body as Buffer;
      const signature = req.get("x-paystack-signature") ?? "";
      if (
        !Buffer.isBuffer(rawBody) ||
        !provider.validSignature(rawBody, signature)
      )
        throw new AppError(
          "WEBHOOK_SIGNATURE_INVALID",
          401,
          "Invalid webhook signature.",
        );
      const event = z
        .object({ event: z.string(), data: z.record(z.string(), z.unknown()) })
        .parse(JSON.parse(rawBody.toString("utf8")));
      if (event.event !== "charge.success")
        return ok(res, { acknowledged: true, processed: false });
      const reference = z
        .string()
        .regex(/^j1d_[a-f0-9]{32}$/)
        .parse(event.data.reference);
      const verified = await provider.verify(reference);
      if (verified.status !== "success" || verified.reference !== reference)
        throw new AppError(
          "PAYMENT_NOT_CONFIRMED",
          409,
          "The payment is not confirmed.",
        );
      const eventKey = createHash("sha256")
        .update(`${event.event}:${reference}`)
        .digest("hex");
      const result = await repo.db.transaction(
        null,
        async (db) =>
          (
            await db.query<{ data: unknown }>(
              "select public.settle_payment($1,$2,$3,$4) data",
              [reference, verified.amount, verified.currency, eventKey],
            )
          ).rows[0].data,
      );
      ok(res, result);
    },
  );
  return r;
}
export function paymentsRoutes(
  repo: Repository,
  config: Config,
  provider?: PaymentProvider,
) {
  const r = Router();
  r.get("/subscriptions/plans", async (req, res) =>
    ok(
      res,
      await repo.read(
        req.actor.id,
        "select id,code,name,amount_minor::float8,currency,period_days,entitlements,purchasable from public.subscription_plans order by amount_minor,code",
      ),
    ),
  );
  r.get("/subscriptions/me", async (req, res) =>
    ok(
      res,
      await repo.read(
        req.actor.id,
        "select s.id,p.code,p.name,s.starts_at,s.ends_at,s.status,s.cancel_at_period_end from public.subscriptions s join public.subscription_plans p on p.id=s.plan_id order by s.ends_at desc limit 20",
      ),
    ),
  );
  r.post("/subscriptions/cancel", async (req, res) =>
    ok(res, await repo.call(req.actor.id, "cancelSubscription")),
  );
  r.post("/payments/initialize", async (req, res) => {
    if (!provider)
      throw new AppError(
        "PAYMENTS_UNAVAILABLE",
        503,
        "Payments are not configured yet.",
      );
    const p = paymentSchema.parse(req.body);
    const operation = uuid.parse(req.get("Idempotency-Key"));
    const payment = await repo.call<any>(req.actor.id, "startPayment", [
      p.plan_id,
      operation,
    ]);
    if (payment.status === "successful")
      return ok(res, { reference: payment.reference, status: "successful" });
    if (payment.status !== "initiated" && payment.status !== "pending")
      throw new AppError(
        "PAYMENT_STATE_CONFLICT",
        409,
        "Start a new checkout.",
      );
    let url = payment.checkout_url;
    if (!url) {
      url = await provider.initialize({
        email: req.actor.email,
        amount: Number(payment.amount_minor),
        currency: payment.currency,
        reference: payment.reference,
        callback_url:
          config.PAYSTACK_CALLBACK_URL ??
          `${config.APP_URL}/settings/subscription`,
      });
      await repo.db.transaction(req.actor.id, (db) =>
        db.query(
          "update public.payments set checkout_url=$1,status='pending' where id=$2 and user_id=$3 and status in ('initiated','pending')",
          [url, payment.id, req.actor.id],
        ),
      );
    }
    ok(res, {
      reference: payment.reference,
      authorization_url: url,
      status: "pending",
      renewal: "manual",
      message: "Access is granted only after payment verification.",
    });
  });
  r.get("/payments/:reference", async (req, res) => {
    const reference = z
      .string()
      .regex(/^j1d_[a-f0-9]{32}$/)
      .parse(req.params.reference);
    const rows = await repo.read(
      req.actor.id,
      "select reference,status,amount_minor::float8,currency,settled_at from public.payments where reference=$1",
      [reference],
    );
    if (!rows.length)
      throw new AppError(
        "PAYMENT_UNAVAILABLE",
        404,
        "This payment is unavailable.",
      );
    ok(res, rows[0]);
  });
  return r;
}
