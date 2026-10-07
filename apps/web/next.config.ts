import type { NextConfig } from "next";
const config: NextConfig = {
  transpilePackages: [
    "@just1date/ui",
    "@just1date/validation",
    "@just1date/config",
    "@just1date/types",
  ],
  output: "standalone",
  poweredByHeader: false,
  experimental: { cpus: 1 },
};
export default config;
