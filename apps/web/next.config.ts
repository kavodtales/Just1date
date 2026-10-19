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
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
  experimental: { cpus: 1 },
};
export default config;
