import request from "supertest";
import express from "express";
import { expect, it, vi } from "vitest";

const initialization = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("../../apps/api/src/runtime", () => ({
  createRuntime: initialization.create,
}));

it("initializes once for concurrent requests and retries after provider startup failure", async () => {
  const handler = (await import("../../apps/api/src/app")).default;
  expect(initialization.create).not.toHaveBeenCalled();
  initialization.create.mockRejectedValueOnce(
    new Error("secret-provider-detail"),
  );
  const failed = await request(handler).get("/health");
  expect(failed.status).toBe(503);
  expect(JSON.stringify(failed.body)).not.toContain("secret-provider-detail");
  const runtimeApp = express();
  runtimeApp.get("/health", (_req, res) => res.json({ status: "ok" }));
  initialization.create.mockResolvedValue({ app: runtimeApp });
  const responses = await Promise.all([
    request(handler).get("/health"),
    request(handler).get("/health"),
  ]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  expect(initialization.create).toHaveBeenCalledTimes(2);
});
