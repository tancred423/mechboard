import { index, int, json, mysqlTable, text, timestamp, tinyint, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  discordId: varchar("discord_id", { length: 32 }).notNull().unique(),
  username: varchar("username", { length: 128 }).notNull(),
  avatar: varchar("avatar", { length: 256 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const folders = mysqlTable(
  "folders",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    sortOrder: int("sort_order").notNull().default(0),
    collapsed: tinyint("collapsed").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_folders_user_id").on(table.userId),
  }),
);

export const encounters = mysqlTable(
  "encounters",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    folderId: varchar("folder_id", { length: 36 }).references(() => folders.id, { onDelete: "set null" }),
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    config: json("config").notNull(),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdx: index("idx_encounters_user_id").on(table.userId),
    folderIdx: index("idx_encounters_folder_id").on(table.folderId),
  }),
);

export const presets = mysqlTable("presets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  data: json("data").notNull(),
  sortOrder: varchar("sort_order", { length: 10 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const syncSessions = mysqlTable(
  "sync_sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    encounterId: varchar("encounter_id", { length: 36 })
      .notNull()
      .references(() => encounters.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    state: json("state").notNull(),
    lastActivity: timestamp("last_activity").defaultNow().onUpdateNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    encounterIdx: index("idx_sync_sessions_encounter_id").on(table.encounterId),
    userIdx: index("idx_sync_sessions_user_id").on(table.userId),
    lastActivityIdx: index("idx_sync_sessions_last_activity").on(table.lastActivity),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
export type Encounter = typeof encounters.$inferSelect;
export type NewEncounter = typeof encounters.$inferInsert;
export type Preset = typeof presets.$inferSelect;
export type NewPreset = typeof presets.$inferInsert;
export type SyncSession = typeof syncSessions.$inferSelect;
export type NewSyncSession = typeof syncSessions.$inferInsert;
