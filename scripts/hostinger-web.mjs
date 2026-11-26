// Hostinger starts a Node app through an entry file and supplies PORT.
process.env.HOSTNAME ??= "0.0.0.0";
process.argv[2] = "web";
await import("./start-next.mjs");
