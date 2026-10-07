import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { AppError } from "../../lib/http";
export interface PaymentProvider {
  initialize(input: {
    email: string;
    amount: number;
    currency: string;
    reference: string;
    callback_url: string;
  }): Promise<string>;
  verify(reference: string): Promise<{
    reference: string;
    amount: number;
    currency: string;
    status: string;
  }>;
  validSignature(body: Buffer, signature: string): boolean;
}
export function validPaystackSignature(
  body: Buffer,
  signature: string,
  secret: string,
): boolean {
  if (!/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = createHmac("sha512", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export class PaystackProvider implements PaymentProvider {
  constructor(private secret: string) {}
  private async request(path: string, body?: unknown) {
    const response = await fetch(`https://api.paystack.co${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${this.secret}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(12000),
    });
    const result = z
      .object({ status: z.boolean(), data: z.unknown() })
      .parse(await response.json());
    if (!response.ok || !result.status)
      throw new AppError(
        "PAYMENT_PROVIDER_FAILED",
        503,
        "The payment service is unavailable. Please try again.",
      );
    return result.data;
  }
  async initialize(input: {
    email: string;
    amount: number;
    currency: string;
    reference: string;
    callback_url: string;
  }) {
    const result = z
      .object({ authorization_url: z.url(), reference: z.string() })
      .parse(await this.request("/transaction/initialize", input));
    const url = new URL(result.authorization_url);
    if (
      result.reference !== input.reference ||
      url.protocol !== "https:" ||
      !["checkout.paystack.com", "paystack.com"].includes(url.hostname)
    )
      throw new AppError(
        "PAYMENT_PROVIDER_INVALID",
        502,
        "The checkout could not be validated.",
      );
    return result.authorization_url;
  }
  async verify(reference: string) {
    return z
      .object({
        reference: z.string(),
        amount: z.number().int().positive(),
        currency: z.string().length(3),
        status: z.string(),
      })
      .parse(
        await this.request(
          `/transaction/verify/${encodeURIComponent(reference)}`,
        ),
      );
  }
  validSignature(body: Buffer, signature: string) {
    return validPaystackSignature(body, signature, this.secret);
  }
}
