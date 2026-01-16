import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

async function runMigrations() {
  console.log("Running migrations...");

  const connection = await mysql.createConnection({
    host: Deno.env.get("DB_HOST") || "localhost",
    port: parseInt(Deno.env.get("DB_PORT") || "3306"),
    user: Deno.env.get("DB_USER") || "mechboard",
    password: Deno.env.get("DB_PASSWORD") || "mechboard",
    database: Deno.env.get("DB_NAME") || "mechboard",
    multipleStatements: true,
  });

  const db = drizzle(connection);

  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("Migrations completed");
  await connection.end();
  Deno.exit(0);
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  Deno.exit(1);
});
