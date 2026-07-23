import "dotenv/config";
import fs from "node:fs/promises";
import mysql from "mysql2/promise";
import { env } from "./config.js";

const url = new URL(env.DATABASE_URL);
const connection = await mysql.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.slice(1)),
  charset: "utf8mb4",
  ssl: env.DATABASE_SSL ? {} : undefined,
  multipleStatements: true
});
try {
  const sql = await fs.readFile(new URL("../migrations/001_initial.sql", import.meta.url), "utf8");
  await connection.query(sql);
  console.log("MySQL migration 001_initial applied successfully.");
} finally {
  await connection.end();
}
