import { Application, Router } from "@oak/oak";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { getDb } from "./db/index.ts";
import { authMiddleware } from "./middleware/auth.ts";
import authRoutes from "./routes/auth.ts";
import encounterRoutes from "./routes/encounters.ts";
import syncRoutes from "./routes/sync.ts";

async function runMigrations(retries = 10, delay = 3000) {
  console.log("Running database migrations...");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
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
      await connection.end();

      console.log("Migrations completed");
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Migration attempt ${attempt}/${retries} failed: ${message}`);
      if (attempt < retries) {
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

const app = new Application();
const port = parseInt(Deno.env.get("PORT") || "8000");

// CORS middleware
app.use(async (ctx, next) => {
  const origin = ctx.request.headers.get("Origin");
  const allowedOrigins = (
    Deno.env.get("CORS_ORIGINS") || "http://localhost:5173"
  ).split(",");

  if (origin && allowedOrigins.includes(origin)) {
    ctx.response.headers.set("Access-Control-Allow-Origin", origin);
  }

  ctx.response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  ctx.response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  ctx.response.headers.set("Access-Control-Allow-Credentials", "true");

  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204;
    return;
  }

  await next();
});

// Auth middleware
app.use(authMiddleware);

// API routes
const apiRouter = new Router({ prefix: "/api" });
apiRouter.use(authRoutes.routes(), authRoutes.allowedMethods());
apiRouter.use(encounterRoutes.routes(), encounterRoutes.allowedMethods());
apiRouter.use(syncRoutes.routes(), syncRoutes.allowedMethods());

apiRouter.get("/health", (ctx) => {
  ctx.response.body = { status: "ok", timestamp: new Date().toISOString() };
});

app.use(apiRouter.routes());
app.use(apiRouter.allowedMethods());

// Start server
app.addEventListener("listen", ({ hostname, port }) => {
  console.log(`MechBoard API running at http://${hostname}:${port}`);
});

// Run migrations and initialize database
await runMigrations();
await getDb();
console.log("Database initialized");

await app.listen({ port });
