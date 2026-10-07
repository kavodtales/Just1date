// Vercel loads the same compiled ESM bundle used by the production server.
// This keeps its function compiler from reinterpreting TypeScript dependency imports.
import express from "express";
import handler from "./dist/app.js";

const app = express();
app.disable("x-powered-by");
app.use(handler);
export default app;
