import { create, verify } from "djwt";
import type { DiscordTokenResponse, DiscordUser, JWTPayload } from "./types.ts";

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "dev-secret-change-in-production";

async function getKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(JWT_SECRET);
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createToken(payload: Omit<JWTPayload, "exp">): Promise<string> {
  const key = await getKey();
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  return await create({ alg: "HS256", typ: "JWT" }, { ...payload, exp }, key);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const key = await getKey();
    const payload = await verify(token, key);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function exchangeCodeForToken(code: string): Promise<DiscordTokenResponse> {
  const clientId = Deno.env.get("DISCORD_CLIENT_ID");
  const clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET");
  const redirectUri = Deno.env.get("DISCORD_REDIRECT_URI");

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Discord OAuth not configured");
  }

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for token");
  }

  return await response.json();
}

export async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get Discord user");
  }

  return await response.json();
}

export function getDiscordOAuthUrl(): string {
  const clientId = Deno.env.get("DISCORD_CLIENT_ID");
  const redirectUri = Deno.env.get("DISCORD_REDIRECT_URI");

  if (!clientId || !redirectUri) {
    throw new Error("Discord OAuth not configured");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}
