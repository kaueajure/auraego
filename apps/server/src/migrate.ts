import "dotenv/config";
import fs from "node:fs/promises";
import mysql from "mysql2/promise";
import { env } from "./config.js";

const connection = await mysql.createConnection({
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  user: env.DATABASE_USERNAME,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
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
