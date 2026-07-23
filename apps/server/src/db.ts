import mysql, { type PoolConnection } from "mysql2/promise";
import { env } from "./config.js";

export const pool = mysql.createPool({
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  user: env.DATABASE_USERNAME,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60_000,
  queueLimit: 0,
  charset: "utf8mb4",
  timezone: "Z",
  ssl: env.DATABASE_SSL ? {} : undefined
});

export async function transaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function checkDatabase() {
  await pool.query("SELECT 1");
}
