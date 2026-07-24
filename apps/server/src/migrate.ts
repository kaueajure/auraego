import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { env } from "./config.js";

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
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
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(120) PRIMARY KEY,
      applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    )
  `);
  const files = (await fs.readdir(migrationsDir))
    .filter(name => name.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM schema_migrations WHERE id = ? LIMIT 1",
      [file]
    );
    if (rows.length) {
      console.log(`skip ${file}`);
      continue;
    }
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await connection.beginTransaction();
    try {
      await connection.query(sql);
      await connection.query("INSERT INTO schema_migrations (id) VALUES (?)", [file]);
      await connection.commit();
      console.log(`applied ${file}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
  console.log("MySQL migrations complete.");
} finally {
  await connection.end();
}
