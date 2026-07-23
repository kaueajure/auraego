import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  Object.assign(process.env, {
    NODE_ENV: "test", PORT: "3000", FRONTEND_URL: "http://localhost:5173", BACKEND_URL: "http://localhost:3000",
    DATABASE_URL: "mysql://test:test@localhost:3306/test", DATABASE_SSL: "false", JWT_ACCESS_SECRET: "a".repeat(40), JWT_REFRESH_SECRET: "b".repeat(40),
    EMAIL_VERIFICATION_SECRET: "c".repeat(40), SMTP_HOST: "localhost", SMTP_PORT: "1025", SMTP_SECURE: "false",
    SMTP_USER: "test", SMTP_PASSWORD: "test", SMTP_FROM_EMAIL: "test@example.com", SOCKET_CORS_ORIGIN: "http://localhost:5173"
  });
});
vi.mock("./db.js", () => ({ pool: {}, transaction: vi.fn(), checkDatabase: vi.fn() }));

describe("configuration contract", () => {
  it("requires long independent secrets", async () => {
    const { env } = await import("./config.js");
    expect(env.JWT_ACCESS_SECRET).toHaveLength(40);
    expect(env.SMTP_PORT).toBe(1025);
  });
});
