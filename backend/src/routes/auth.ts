import { Router } from "@oak/oak";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db/index.ts";
import { createToken, exchangeCodeForToken, getDiscordOAuthUrl, getDiscordUser } from "../auth.ts";
import { generateId } from "../utils.ts";

const router = new Router();

router.get("/auth/discord", (ctx) => {
  try {
    const url = getDiscordOAuthUrl();
    ctx.response.redirect(url);
  } catch (_error) {
    ctx.response.status = 500;
    ctx.response.body = { error: "Discord OAuth not configured" };
  }
});

router.get("/auth/discord/callback", async (ctx) => {
  const code = ctx.request.url.searchParams.get("code");

  if (!code) {
    ctx.response.status = 400;
    ctx.response.body = { error: "No code provided" };
    return;
  }

  try {
    const tokenData = await exchangeCodeForToken(code);
    const discordUser = await getDiscordUser(tokenData.access_token);

    const db = await getDb();
    const [existingUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.discordId, discordUser.id));

    let userId: string;
    const username = discordUser.global_name || discordUser.username;

    if (existingUser) {
      userId = existingUser.id;
      await db
        .update(schema.users)
        .set({
          username,
          avatar: discordUser.avatar,
        })
        .where(eq(schema.users.discordId, discordUser.id));
    } else {
      userId = generateId();
      await db.insert(schema.users).values({
        id: userId,
        discordId: discordUser.id,
        username,
        avatar: discordUser.avatar,
      });
    }

    const token = await createToken({
      userId,
      discordId: discordUser.id,
      username,
    });

    const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
    ctx.response.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (error) {
    console.error("OAuth error:", error);
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
    ctx.response.redirect(`${frontendUrl}/auth/callback?error=auth_failed`);
  }
});

router.get("/auth/me", async (ctx) => {
  const user = ctx.state.user;

  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Not authenticated" };
    return;
  }

  const db = await getDb();
  const [dbUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, user.userId));

  if (!dbUser) {
    ctx.response.status = 404;
    ctx.response.body = { error: "User not found" };
    return;
  }

  ctx.response.body = {
    id: dbUser.id,
    discordId: dbUser.discordId,
    username: dbUser.username,
    avatar: dbUser.avatar,
    createdAt: dbUser.createdAt,
  };
});

export default router;
