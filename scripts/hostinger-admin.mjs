process.env.HOSTNAME ??= "0.0.0.0";
process.argv[2] = "admin";
await import("./start-next.mjs");
