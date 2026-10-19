import { afterEach, expect, it, vi } from "vitest";
import { startPollingWorker } from "../../apps/api/src/lib/polling-worker";
afterEach(() => {
  vi.useRealTimers();
});
it("keeps call safety running while notification delivery is blocked", async () => {
  vi.useFakeTimers();
  let finish!: () => void;
  const slow = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const safety = vi.fn(async () => {});
  const stopSlow = startPollingWorker(slow, vi.fn());
  const stopSafety = startPollingWorker(safety, vi.fn());
  await vi.advanceTimersByTimeAsync(15000);
  expect(slow).toHaveBeenCalledTimes(1);
  expect(safety).toHaveBeenCalledTimes(4);
  finish();
  await Promise.all([stopSlow(), stopSafety()]);
});
it("waits for in-flight work when stopping and never starts another tick", async () => {
  vi.useFakeTimers();
  let finish!: () => void;
  const work = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const stop = startPollingWorker(work, vi.fn());
  await vi.advanceTimersByTimeAsync(0);
  let stopped = false;
  const shutdown = stop().then(() => {
    stopped = true;
  });
  await vi.advanceTimersByTimeAsync(15000);
  expect(stopped).toBe(false);
  expect(work).toHaveBeenCalledTimes(1);
  finish();
  await shutdown;
  expect(stopped).toBe(true);
});
it("reports failed ticks and retries without an overlapping job", async () => {
  vi.useFakeTimers();
  const report = vi.fn();
  const work = vi
    .fn()
    .mockRejectedValueOnce(new Error("test-only failure"))
    .mockResolvedValue(undefined);
  const stop = startPollingWorker(work, report);
  await vi.advanceTimersByTimeAsync(5000);
  expect(report).toHaveBeenCalledTimes(1);
  expect(work).toHaveBeenCalledTimes(2);
  await stop();
});
