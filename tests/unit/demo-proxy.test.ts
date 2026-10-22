import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../../apps/web/src/app/api/demo/route";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("reports an unavailable non-JSON upstream as a service failure", async () => {
  vi.stubEnv("API_URL", "https://api.example.test");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("<html>Unavailable</html>", {
          status: 502,
          headers: { "Content-Type": "text/html" },
        }),
      ),
  );
  const r = await POST(
    new NextRequest("http://localhost:3000/api/demo", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: JSON.stringify({ action: "start" }),
    }),
  );
  expect(r.status).toBe(503);
  expect((await r.json()).error.message).toContain("couldn’t connect");
});
it("rejects malformed visitor JSON before contacting the service", async () => {
  vi.stubEnv("API_URL", "https://api.example.test");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const r = await POST(
    new NextRequest("http://localhost:3000/api/demo", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: "{",
    }),
  );
  expect(r.status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});
