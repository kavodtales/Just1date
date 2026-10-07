import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  configured,
  supabaseServer,
} from "../../../../../web/src/lib/supabase-server";

const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("enroll") }).strict(),
  z
    .object({
      action: z.literal("verify"),
      factor_id: z.uuid(),
      code: z.string().regex(/^\d{6}$/),
    })
    .strict(),
]);
const response = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
export async function GET() {
  if (!configured())
    return response({ error: "Account services are not configured." }, 503);
  try {
    const auth = await supabaseServer();
    const user = await auth.auth.getUser();
    if (user.error || !user.data.user)
      return response({ error: "Sign in first." }, 401);
    const factors = await auth.auth.mfa.listFactors();
    if (factors.error)
      return response({ error: "Could not load authentication factors." }, 503);
    return response({
      factors: factors.data.totp.map((factor) => ({
        id: factor.id,
        name: factor.friendly_name,
      })),
    });
  } catch {
    return response(
      { error: "Authentication is temporarily unavailable." },
      503,
    );
  }
}
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin)
    return response({ error: "Use the staff application." }, 403);
  if (!configured())
    return response({ error: "Account services are not configured." }, 503);
  try {
    const input = inputSchema.safeParse(await req.json());
    if (!input.success)
      return response({ error: "Check the authentication code." }, 400);
    const auth = await supabaseServer();
    const user = await auth.auth.getUser();
    if (user.error || !user.data.user || !user.data.user.email_confirmed_at)
      return response({ error: "Sign in with a confirmed email first." }, 401);
    if (input.data.action === "enroll") {
      const result = await auth.auth.mfa.enroll({
        factorType: "totp",
        issuer: "JUST1DATE",
        friendlyName: `Staff authenticator ${Date.now()}`,
      });
      if (result.error)
        return response(
          {
            error:
              "Authenticator setup could not start. Try again or contact the operator.",
          },
          400,
        );
      return response({
        factor_id: result.data.id,
        qr_code: result.data.totp.qr_code,
        secret: result.data.totp.secret,
      });
    }
    const result = await auth.auth.mfa.challengeAndVerify({
      factorId: input.data.factor_id,
      code: input.data.code,
    });
    if (result.error)
      return response(
        {
          error:
            "That code could not be verified. Enter the current code from your authenticator.",
        },
        400,
      );
    return response({ verified: true });
  } catch {
    return response(
      { error: "Authentication is temporarily unavailable." },
      503,
    );
  }
}
