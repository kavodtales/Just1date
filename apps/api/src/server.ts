import { createRuntime } from "./runtime";
import { log } from "./lib/http";

const runtime = await createRuntime();
const server = runtime.app.listen(runtime.config.PORT, () =>
  log.info({ port: runtime.config.PORT }, "api_started"),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    server.close(async () => {
      await runtime.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
