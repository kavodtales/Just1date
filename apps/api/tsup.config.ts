import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/server.ts", "src/worker.ts", "src/app.ts"],
  format: ["esm"],
  platform: "node",
  target: "node24",
  noExternal: [/@just1date\//],
  external: ["pg", "@supabase/supabase-js", "zod"],
  sourcemap: true,
  clean: true,
});
