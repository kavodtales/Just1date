import express from "express";
import { createRuntime } from "./runtime";
import { log } from "./lib/http";

export { createApp } from "./application";
// Build/import never opens provider connections. Warm instances share initialization.
const app = express();
app.disable("x-powered-by");
let runtime: ReturnType<typeof createRuntime> | undefined;
app.use(async (req, res, next) => {
  try {
    runtime ??= createRuntime().catch((error) => {
      runtime = undefined;
      throw error;
    });
    const initialized = await runtime;
    initialized.app(req, res, next);
  } catch {
    log.error({ code: "API_STARTUP_FAILED" }, "api_startup_failed");
    res.status(503).json({
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "The service is temporarily unavailable. Please try again.",
        status: 503,
      },
    });
  }
});
export default app;
