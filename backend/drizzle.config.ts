import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: Deno.env.get("DB_HOST") || "localhost",
    port: parseInt(Deno.env.get("DB_PORT") || "3306"),
    user: Deno.env.get("DB_USER") || "mechboard",
    password: Deno.env.get("DB_PASSWORD") || "mechboard",
    database: Deno.env.get("DB_NAME") || "mechboard",
  },
});
