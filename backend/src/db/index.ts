import { drizzle } from "drizzle-orm/mysql2";
import type { MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema.ts";

let pool: mysql.Pool | null = null;
let db: MySql2Database<typeof schema> | null = null;

export async function getDb(): Promise<MySql2Database<typeof schema>> {
  if (db) return db;

  const maxRetries = 10;
  const retryDelay = 3000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      pool = mysql.createPool({
        host: Deno.env.get("DB_HOST") || "localhost",
        port: parseInt(Deno.env.get("DB_PORT") || "3306"),
        user: Deno.env.get("DB_USER") || "mechboard",
        password: Deno.env.get("DB_PASSWORD") || "mechboard",
        database: Deno.env.get("DB_NAME") || "mechboard",
        waitForConnections: true,
        connectionLimit: 10,
      });

      // Test connection
      const connection = await pool.getConnection();
      connection.release();

      db = drizzle(pool, { schema, mode: "default" });
      console.log("Database connected");
      return db;
    } catch (error) {
      console.log(`Database connection attempt ${attempt}/${maxRetries} failed`);
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error("Failed to connect to database");
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

export { schema };
