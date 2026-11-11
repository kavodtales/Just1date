import { afterEach, expect, it, vi } from "vitest";
import { api, ClientError } from "../../apps/web/src/lib/client";
afterEach(() => vi.unstubAllGlobals());
it("turns a host HTML error page into a recoverable service error", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(new Response("<h1>Unavailable</h1>", { status: 503 })),
  );
  await expect(api("matches")).rejects.toMatchObject({
    code: "SERVICE_UNAVAILABLE",
    status: 503,
  });
});
it("does not treat malformed success responses as saved member actions", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("invalid", { status: 200 })),
  );
  await expect(api("dates", { method: "POST" })).rejects.toBeInstanceOf(
    ClientError,
  );
});
it("preserves structured identity and revision errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          {
            error: {
              code: "DATE_CONFLICT",
              message: "The plan changed. Refresh it.",
            },
          },
          { status: 409 },
        ),
      ),
  );
  await expect(api("dates")).rejects.toMatchObject({
    code: "DATE_CONFLICT",
    status: 409,
    message: "The plan changed. Refresh it.",
  });
});
