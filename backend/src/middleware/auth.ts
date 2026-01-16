import { Context, Next } from "@oak/oak";
import { verifyToken } from "../auth.ts";

export async function authMiddleware(ctx: Context, next: Next) {
  const authHeader = ctx.request.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = await verifyToken(token);

    if (payload) {
      ctx.state.user = payload;
    }
  }

  await next();
}
