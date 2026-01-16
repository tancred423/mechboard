import { Router } from "@oak/oak";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "../db/index.ts";
import { generateId, generateShareCode, validateEncounterConfig } from "../utils.ts";

const router = new Router();

router.get("/encounters", async (ctx) => {
  const user = ctx.state.user;

  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Not authenticated" };
    return;
  }

  const db = await getDb();
  const userEncounters = await db
    .select()
    .from(schema.encounters)
    .where(eq(schema.encounters.userId, user.userId))
    .orderBy(schema.encounters.updatedAt);

  ctx.response.body = userEncounters.map((e) => ({
    id: e.id,
    name: e.name,
    description: e.description,
    config: e.config,
    shareCode: e.shareCode,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  }));
});

router.post("/encounters", async (ctx) => {
  const user = ctx.state.user;

  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Not authenticated" };
    return;
  }

  const body = await ctx.request.body.json();
  const { name, description, config } = body;

  if (!name || typeof name !== "string" || name.length > 128) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid name" };
    return;
  }

  if (!validateEncounterConfig(config)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid config" };
    return;
  }

  const db = await getDb();
  const id = generateId();
  const shareCode = generateShareCode();
  const now = new Date();

  await db.insert(schema.encounters).values({
    id,
    userId: user.userId,
    name,
    description: description || null,
    config,
    shareCode,
    createdAt: now,
    updatedAt: now,
  });

  ctx.response.status = 201;
  ctx.response.body = {
    id,
    name,
    description,
    config,
    shareCode,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
});

router.get("/encounters/:id", async (ctx) => {
  const user = ctx.state.user;
  const { id } = ctx.params;

  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Not authenticated" };
    return;
  }

  const db = await getDb();
  const [encounter] = await db
    .select()
    .from(schema.encounters)
    .where(eq(schema.encounters.id, id));

  if (!encounter || encounter.userId !== user.userId) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Encounter not found" };
    return;
  }

  ctx.response.body = {
    id: encounter.id,
    name: encounter.name,
    description: encounter.description,
    config: encounter.config,
    shareCode: encounter.shareCode,
    createdAt: encounter.createdAt,
    updatedAt: encounter.updatedAt,
  };
});

router.put("/encounters/:id", async (ctx) => {
  const user = ctx.state.user;
  const { id } = ctx.params;

  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Not authenticated" };
    return;
  }

  const body = await ctx.request.body.json();
  const { name, description, config } = body;

  if (name && (typeof name !== "string" || name.length > 128)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid name" };
    return;
  }

  if (config && !validateEncounterConfig(config)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid config" };
    return;
  }

  const db = await getDb();
  const [existing] = await db
    .select()
    .from(schema.encounters)
    .where(eq(schema.encounters.id, id));

  if (!existing || existing.userId !== user.userId) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Encounter not found" };
    return;
  }

  const updates: Partial<schema.NewEncounter> = {};
  if (name) updates.name = name;
  if (description !== undefined) updates.description = description || null;
  if (config) updates.config = config;

  if (Object.keys(updates).length > 0) {
    await db
      .update(schema.encounters)
      .set(updates)
      .where(eq(schema.encounters.id, id));
  }

  const [updated] = await db
    .select()
    .from(schema.encounters)
    .where(eq(schema.encounters.id, id));

  ctx.response.body = {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    config: updated.config,
    shareCode: updated.shareCode,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
});

router.delete("/encounters/:id", async (ctx) => {
  const user = ctx.state.user;
  const { id } = ctx.params;

  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Not authenticated" };
    return;
  }

  const db = await getDb();
  const [existing] = await db
    .select()
    .from(schema.encounters)
    .where(eq(schema.encounters.id, id));

  if (!existing || existing.userId !== user.userId) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Encounter not found" };
    return;
  }

  await db.delete(schema.encounters).where(eq(schema.encounters.id, id));

  ctx.response.status = 204;
});

router.get("/share/:code", async (ctx) => {
  const { code } = ctx.params;

  const db = await getDb();
  const [encounter] = await db
    .select()
    .from(schema.encounters)
    .where(eq(schema.encounters.shareCode, code));

  if (!encounter) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Encounter not found" };
    return;
  }

  ctx.response.body = {
    name: encounter.name,
    description: encounter.description,
    config: encounter.config,
  };
});

router.post("/encounters/:id/regenerate-code", async (ctx) => {
  const user = ctx.state.user;
  const { id } = ctx.params;

  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Not authenticated" };
    return;
  }

  const db = await getDb();
  const [existing] = await db
    .select()
    .from(schema.encounters)
    .where(eq(schema.encounters.id, id));

  if (!existing || existing.userId !== user.userId) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Encounter not found" };
    return;
  }

  const newCode = generateShareCode();
  await db
    .update(schema.encounters)
    .set({ shareCode: newCode })
    .where(eq(schema.encounters.id, id));

  ctx.response.body = { shareCode: newCode };
});

interface PresetData {
  name: string;
  description?: string;
  config: unknown;
}

router.get("/presets", async (ctx) => {
  const db = await getDb();
  const allPresets = await db
    .select()
    .from(schema.presets)
    .orderBy(asc(schema.presets.sortOrder));

  ctx.response.body = allPresets.map((p) => {
    const data = p.data as PresetData;
    return {
      id: p.id,
      name: data.name,
      description: data.description,
      config: data.config,
    };
  });
});

router.get("/presets/:id", async (ctx) => {
  const { id } = ctx.params;

  const db = await getDb();
  const [preset] = await db
    .select()
    .from(schema.presets)
    .where(eq(schema.presets.id, id));

  if (!preset) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Preset not found" };
    return;
  }

  const data = preset.data as PresetData;
  ctx.response.body = {
    id: preset.id,
    name: data.name,
    description: data.description,
    config: data.config,
  };
});

export default router;
