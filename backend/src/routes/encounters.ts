import { Router } from "@oak/oak";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "../db/index.ts";
import { generateId, validateEncounterConfig } from "../utils.ts";

const router = new Router();

router.get("/folders", async (ctx) => {
  const user = ctx.state.user;

  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Not authenticated" };
    return;
  }

  const db = await getDb();
  const userFolders = await db
    .select()
    .from(schema.folders)
    .where(eq(schema.folders.userId, user.userId))
    .orderBy(asc(schema.folders.sortOrder));

  ctx.response.body = userFolders.map((f) => ({
    id: f.id,
    name: f.name,
    sortOrder: f.sortOrder,
    collapsed: f.collapsed === 1,
    createdAt: f.createdAt,
  }));
});

router.post("/folders", async (ctx) => {
  const user = ctx.state.user;

  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Not authenticated" };
    return;
  }

  const body = await ctx.request.body.json();
  const { name, sortOrder } = body;

  if (!name || typeof name !== "string" || name.length > 128) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid name" };
    return;
  }

  const db = await getDb();
  const id = generateId();
  const now = new Date();

  await db.insert(schema.folders).values({
    id,
    userId: user.userId,
    name,
    sortOrder: sortOrder ?? 0,
    collapsed: 0,
    createdAt: now,
  });

  ctx.response.status = 201;
  ctx.response.body = {
    id,
    name,
    sortOrder: sortOrder ?? 0,
    collapsed: false,
    createdAt: now.toISOString(),
  };
});

router.put("/folders/reorder", async (ctx) => {
  const user = ctx.state.user;

  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Not authenticated" };
    return;
  }

  const body = await ctx.request.body.json();
  const { folders } = body;

  if (!Array.isArray(folders)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid folders array" };
    return;
  }

  const db = await getDb();

  for (const folder of folders) {
    if (folder.id && typeof folder.sortOrder === "number") {
      await db
        .update(schema.folders)
        .set({ sortOrder: folder.sortOrder })
        .where(eq(schema.folders.id, folder.id));
    }
  }

  ctx.response.status = 204;
});

router.put("/folders/:id", async (ctx) => {
  const user = ctx.state.user;
  const { id } = ctx.params;

  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Not authenticated" };
    return;
  }

  const body = await ctx.request.body.json();
  const { name, sortOrder, collapsed } = body;

  const db = await getDb();
  const [existing] = await db.select().from(schema.folders).where(eq(schema.folders.id, id));

  if (!existing || existing.userId !== user.userId) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Folder not found" };
    return;
  }

  const updates: Partial<schema.NewFolder> = {};
  if (name !== undefined) updates.name = name;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  if (collapsed !== undefined) updates.collapsed = collapsed ? 1 : 0;

  if (Object.keys(updates).length > 0) {
    await db.update(schema.folders).set(updates).where(eq(schema.folders.id, id));
  }

  const [updated] = await db.select().from(schema.folders).where(eq(schema.folders.id, id));

  ctx.response.body = {
    id: updated.id,
    name: updated.name,
    sortOrder: updated.sortOrder,
    collapsed: updated.collapsed === 1,
    createdAt: updated.createdAt,
  };
});

router.delete("/folders/:id", async (ctx) => {
  const user = ctx.state.user;
  const { id } = ctx.params;

  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Not authenticated" };
    return;
  }

  const db = await getDb();
  const [existing] = await db.select().from(schema.folders).where(eq(schema.folders.id, id));

  if (!existing || existing.userId !== user.userId) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Folder not found" };
    return;
  }

  await db.delete(schema.folders).where(eq(schema.folders.id, id));

  ctx.response.status = 204;
});

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
    .orderBy(asc(schema.encounters.sortOrder));

  ctx.response.body = userEncounters.map((e) => ({
    id: e.id,
    folderId: e.folderId,
    name: e.name,
    description: e.description,
    config: e.config,
    sortOrder: e.sortOrder,
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
  const { name, description, config, folderId, sortOrder } = body;

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
  const now = new Date();

  await db.insert(schema.encounters).values({
    id,
    userId: user.userId,
    folderId: folderId || null,
    name,
    description: description || null,
    config,
    sortOrder: sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  });

  ctx.response.status = 201;
  ctx.response.body = {
    id,
    folderId: folderId || null,
    name,
    description,
    config,
    sortOrder: sortOrder ?? 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
});

router.put("/encounters/reorder", async (ctx) => {
  const user = ctx.state.user;

  if (!user) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Not authenticated" };
    return;
  }

  const body = await ctx.request.body.json();
  const { encounters } = body;

  if (!Array.isArray(encounters)) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Invalid encounters array" };
    return;
  }

  const db = await getDb();

  for (const encounter of encounters) {
    if (encounter.id) {
      const updates: Partial<schema.NewEncounter> = {};
      if (typeof encounter.sortOrder === "number") updates.sortOrder = encounter.sortOrder;
      if (encounter.folderId !== undefined) updates.folderId = encounter.folderId || null;

      if (Object.keys(updates).length > 0) {
        await db.update(schema.encounters).set(updates).where(eq(schema.encounters.id, encounter.id));
      }
    }
  }

  ctx.response.status = 204;
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
  const [encounter] = await db.select().from(schema.encounters).where(eq(schema.encounters.id, id));

  if (!encounter || encounter.userId !== user.userId) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Encounter not found" };
    return;
  }

  ctx.response.body = {
    id: encounter.id,
    folderId: encounter.folderId,
    name: encounter.name,
    description: encounter.description,
    config: encounter.config,
    sortOrder: encounter.sortOrder,
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
  const { name, description, config, folderId, sortOrder } = body;

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
  const [existing] = await db.select().from(schema.encounters).where(eq(schema.encounters.id, id));

  if (!existing || existing.userId !== user.userId) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Encounter not found" };
    return;
  }

  const updates: Partial<schema.NewEncounter> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description || null;
  if (config !== undefined) updates.config = config;
  if (folderId !== undefined) updates.folderId = folderId || null;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;

  if (Object.keys(updates).length > 0) {
    await db.update(schema.encounters).set(updates).where(eq(schema.encounters.id, id));
  }

  const [updated] = await db.select().from(schema.encounters).where(eq(schema.encounters.id, id));

  ctx.response.body = {
    id: updated.id,
    folderId: updated.folderId,
    name: updated.name,
    description: updated.description,
    config: updated.config,
    sortOrder: updated.sortOrder,
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
  const [existing] = await db.select().from(schema.encounters).where(eq(schema.encounters.id, id));

  if (!existing || existing.userId !== user.userId) {
    ctx.response.status = 404;
    ctx.response.body = { error: "Encounter not found" };
    return;
  }

  await db.delete(schema.encounters).where(eq(schema.encounters.id, id));

  ctx.response.status = 204;
});

interface PresetData {
  name: string;
  description?: string;
  config: unknown;
}

router.get("/presets", async (ctx) => {
  const db = await getDb();
  const allPresets = await db.select().from(schema.presets).orderBy(asc(schema.presets.sortOrder));

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
  const [preset] = await db.select().from(schema.presets).where(eq(schema.presets.id, id));

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
