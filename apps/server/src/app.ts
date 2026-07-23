import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "node:path";
import { ZodError } from "zod";
import { env } from "./config.js";
import { authRouter } from "./auth.js";
import { usersRouter } from "./users.js";
import { trainingRouter } from "./training.js";

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: env.FRONTEND_URL, credentials: true, methods: ["GET", "POST", "PATCH"] }));
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.get("/health", (_req, res) => res.json({ status: "ok", version: "1.0.0" }));
app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/training", trainingRouter);

// In production the same Node process serves the compiled Vite application.
// This keeps HTTP, WebSocket and frontend under one origin and one Hostinger app.
if (env.NODE_ENV === "production") {
  const webDist = path.resolve(process.cwd(), "public");
  app.use(express.static(webDist, { index: false, maxAge: "1y", immutable: true }));
  app.use((req, res, next) => {
    if (req.method !== "GET" || !req.accepts("html")) return next();
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Rota não encontrada." } }));
const errors: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Confira os campos informados.", fields: Object.fromEntries(error.issues.map(i => [i.path.join("."), i.message])) } });
  console.error("request_failed", { name: error instanceof Error ? error.name : "Unknown", message: error instanceof Error ? error.message : "Unknown" });
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "A partida saiu do ritmo. Tente novamente." } });
};
app.use(errors);
