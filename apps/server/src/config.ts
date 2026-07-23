import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

// npm workspaces execute scripts from apps/server, while Hostinger starts app.js
// from the repository root. Load both locations without overriding injected
// production environment variables.
dotenv.config({ quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env"), override: false, quiet: true });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_URL: z.url(),
  BACKEND_URL: z.url(),
  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().positive().default(3306),
  DATABASE_NAME: z.string().min(1),
  DATABASE_USERNAME: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_SSL: z.enum(["true", "false"]).default("false").transform(v => v === "true"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  EMAIL_VERIFICATION_SECRET: z.string().min(32),
  EMAIL_VERIFICATION_EXPIRES_IN: z.string().default("24h"),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: z.enum(["true", "false"]).transform(v => v === "true"),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM_NAME: z.string().default("Aura & Ego"),
  SMTP_FROM_EMAIL: z.email(),
  SOCKET_CORS_ORIGIN: z.url(),
  MAX_LATENCY_COMPENSATION_MS: z.coerce.number().default(150),
  RECONNECT_WINDOW_MS: z.coerce.number().default(15000)
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const names = parsed.error.issues.map(i => i.path.join(".")).join(", ");
  throw new Error(`Configuração inválida. Variáveis ausentes ou incorretas: ${names}. Consulte .env.example.`);
}
export const env = parsed.data;
export function durationMs(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match) throw new Error(`Duração inválida em variável de ambiente: use 15m, 24h ou 7d.`);
  const units = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(match[1]) * units[match[2] as keyof typeof units];
}
