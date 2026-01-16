import { Router } from "@oak/oak";
import { and, eq, lt } from "drizzle-orm";
import { getDb, schema } from "../db/index.ts";
import { generateId } from "../utils.ts";
import { verifyToken } from "../auth.ts";

const router = new Router();

const activeSessions = new Map<string, Set<WebSocket>>();
const sessionOwnerSockets = new Map<string, WebSocket>();

const INACTIVITY_TIMEOUT_MS = 24 * 60 * 60 * 1000;

async function cleanupStaleSessions() {
  const db = await getDb();
  const cutoff = new Date(Date.now() - INACTIVITY_TIMEOUT_MS);

  const staleSessions = await db
    .select({ id: schema.syncSessions.id })
    .from(schema.syncSessions)
    .where(lt(schema.syncSessions.lastActivity, cutoff));

  for (const session of staleSessions) {
    const viewers = activeSessions.get(session.id);
    if (viewers) {
      for (const socket of viewers) {
        socket.close(1000, "Session expired");
      }
      activeSessions.delete(session.id);
    }
    sessionOwnerSockets.delete(session.id);
  }

  await db
    .delete(schema.syncSessions)
    .where(lt(schema.syncSessions.lastActivity, cutoff));

  if (staleSessions.length > 0) {
    console.log(`Cleaned up ${staleSessions.length} stale sync sessions`);
  }
}

router.get("/sync/active", async (ctx) => {
  const user = ctx.state.user;

  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Not authenticated" };
    return;
  }

  const db = await getDb();
  const sessions = await db
    .select({ encounterId: schema.syncSessions.encounterId })
    .from(schema.syncSessions)
    .where(eq(schema.syncSessions.userId, user.userId));

  ctx.response.body = sessions.map((s) => s.encounterId);
});

router.post("/sync/start", async (ctx) => {
  const user = ctx.state.user;

  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Not authenticated" };
    return;
  }

  await cleanupStaleSessions();

  const body = await ctx.request.body.json();
  const { encounterId, initialState } = body;

  if (!encounterId) {
    ctx.response.status = 400;
    ctx.response.body = { error: "encounterId is required" };
    return;
  }

  const db = await getDb();

  const [encounter] = await db
    .select()
    .from(schema.encounters)
    .where(eq(schema.encounters.id, encounterId));

  if (!encounter || encounter.userId !== user.userId) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Encounter not found" };
    return;
  }

  const [existingSession] = await db
    .select()
    .from(schema.syncSessions)
    .where(
      and(
        eq(schema.syncSessions.encounterId, encounterId),
        eq(schema.syncSessions.userId, user.userId),
      ),
    );

  if (existingSession) {
    await db
      .update(schema.syncSessions)
      .set({ state: initialState || encounter.config, lastActivity: new Date() })
      .where(eq(schema.syncSessions.id, existingSession.id));

    ctx.response.body = {
      sessionId: existingSession.id,
      shareUrl: `/sync/${existingSession.id}`,
    };
    return;
  }

  const sessionId = generateId();
  const now = new Date();

  await db.insert(schema.syncSessions).values({
    id: sessionId,
    encounterId,
    userId: user.userId,
    state: initialState || encounter.config,
    lastActivity: now,
    createdAt: now,
  });

  ctx.response.status = 201;
  ctx.response.body = {
    sessionId,
    shareUrl: `/sync/${sessionId}`,
  };
});

router.get("/sync/active/:encounterId", async (ctx) => {
  const user = ctx.state.user;
  const { encounterId } = ctx.params;

  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Not authenticated" };
    return;
  }

  const db = await getDb();
  const [session] = await db
    .select()
    .from(schema.syncSessions)
    .where(
      and(
        eq(schema.syncSessions.encounterId, encounterId),
        eq(schema.syncSessions.userId, user.userId),
      ),
    );

  if (!session) {
    ctx.response.status = 404;
    ctx.response.body = { error: "No active session" };
    return;
  }

  ctx.response.body = {
    sessionId: session.id,
    shareUrl: `/sync/${session.id}`,
    state: session.state,
  };
});

router.post("/sync/:sessionId/stop", async (ctx) => {
  const user = ctx.state.user;
  const { sessionId } = ctx.params;

  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Not authenticated" };
    return;
  }

  const db = await getDb();
  const [session] = await db
    .select()
    .from(schema.syncSessions)
    .where(eq(schema.syncSessions.id, sessionId));

  if (!session || session.userId !== user.userId) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Session not found" };
    return;
  }

  const viewers = activeSessions.get(sessionId);
  if (viewers) {
    for (const socket of viewers) {
      socket.close(1000, "Session ended by owner");
    }
    activeSessions.delete(sessionId);
  }
  sessionOwnerSockets.delete(sessionId);

  await db.delete(schema.syncSessions).where(eq(schema.syncSessions.id, sessionId));

  ctx.response.status = 204;
});

router.get("/sync/:sessionId", async (ctx) => {
  const { sessionId } = ctx.params;

  const db = await getDb();
  const [session] = await db
    .select({
      id: schema.syncSessions.id,
      state: schema.syncSessions.state,
      encounterName: schema.encounters.name,
      encounterDescription: schema.encounters.description,
      ownerUsername: schema.users.username,
    })
    .from(schema.syncSessions)
    .innerJoin(schema.encounters, eq(schema.syncSessions.encounterId, schema.encounters.id))
    .innerJoin(schema.users, eq(schema.syncSessions.userId, schema.users.id))
    .where(eq(schema.syncSessions.id, sessionId));

  if (!session) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Session not found or expired" };
    return;
  }

  ctx.response.body = {
    sessionId: session.id,
    name: session.encounterName,
    description: session.encounterDescription,
    state: session.state,
    owner: session.ownerUsername,
  };
});

router.get("/sync/:sessionId/ws", async (ctx) => {
  const { sessionId } = ctx.params;
  const isOwner = ctx.request.url.searchParams.get("owner") === "true";
  const token = ctx.request.url.searchParams.get("token");

  const db = await getDb();
  const [session] = await db
    .select()
    .from(schema.syncSessions)
    .where(eq(schema.syncSessions.id, sessionId));

  if (!session) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Session not found" };
    return;
  }

  if (isOwner && token) {
    const payload = await verifyToken(token);
    if (!payload || payload.userId !== session.userId) {
      ctx.response.status = 403;
      ctx.response.body = { error: "Not authorized" };
      return;
    }
  }

  if (!ctx.isUpgradable) {
    ctx.response.status = 400;
    ctx.response.body = { error: "WebSocket upgrade required" };
    return;
  }

  const socket = ctx.upgrade();

  if (!activeSessions.has(sessionId)) {
    activeSessions.set(sessionId, new Set());
  }

  if (isOwner) {
    sessionOwnerSockets.set(sessionId, socket);
    broadcastToViewers(sessionId, { type: "owner_connected" });
  } else {
    activeSessions.get(sessionId)!.add(socket);
  }

  socket.onopen = () => {
    const viewerCount = activeSessions.get(sessionId)?.size || 0;
    if (isOwner) {
      socket.send(JSON.stringify({ type: "viewers", count: viewerCount }));
    } else {
      const ownerOnline = sessionOwnerSockets.has(sessionId);
      socket.send(JSON.stringify({ type: "owner_status", online: ownerOnline }));
      broadcastToOwner(sessionId, { type: "viewers", count: viewerCount });
    }
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "update" && isOwner) {
        await db
          .update(schema.syncSessions)
          .set({ state: data.state, lastActivity: new Date() })
          .where(eq(schema.syncSessions.id, sessionId));

        broadcastToViewers(sessionId, { type: "state", state: data.state });
      }

      if (data.type === "ping") {
        socket.send(JSON.stringify({ type: "pong" }));
      }
    } catch (err) {
      console.error("WebSocket message error:", err);
    }
  };

  socket.onclose = () => {
    if (isOwner) {
      sessionOwnerSockets.delete(sessionId);
      broadcastToViewers(sessionId, { type: "owner_disconnected" });
    } else {
      activeSessions.get(sessionId)?.delete(socket);
      const newCount = activeSessions.get(sessionId)?.size || 0;
      broadcastToOwner(sessionId, { type: "viewers", count: newCount });
    }
  };

  socket.onerror = (err) => {
    console.error("WebSocket error:", err);
  };
});

function broadcastToViewers(sessionId: string, message: unknown) {
  const viewers = activeSessions.get(sessionId);
  if (!viewers) return;

  const data = JSON.stringify(message);
  for (const socket of viewers) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  }
}

function broadcastToOwner(sessionId: string, message: unknown) {
  const ownerSocket = sessionOwnerSockets.get(sessionId);
  if (ownerSocket && ownerSocket.readyState === WebSocket.OPEN) {
    ownerSocket.send(JSON.stringify(message));
  }
}

export default router;
