import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_URL: z.url(),
  BACKEND_URL: z.url(),
  DATABASE_URL: z.string().startsWith("postgresql://"),
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
