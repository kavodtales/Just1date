import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
    maxWorkers: 1,
    isolate: true,
    // Forward low-memory WASM flags to PGlite's worker processes as well.
    execArgv: process.execArgv.filter((arg) =>
      ["--liftoff-only", "--no-wasm-tier-up"].includes(arg),
    ),
  },
});
