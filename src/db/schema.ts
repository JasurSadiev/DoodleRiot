import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Stroke } from "@/lib/types";

export const lobbies = pgTable(
  "lobbies",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    status: text("status")
      .$type<"lobby" | "drawing" | "voting" | "results">()
      .notNull()
      .default("lobby"),
    round: integer("round").notNull().default(0),
    prompt: text("prompt"),
    phaseEndsAt: timestamp("phase_ends_at", { withTimezone: true }),
    drawSeconds: integer("draw_seconds").notNull().default(90),
    voteSeconds: integer("vote_seconds").notNull().default(30),
    promptPack: text("prompt_pack").notNull().default("mixed"),
    customPrompts: jsonb("custom_prompts").$type<string[]>().notNull().default([]),
    usedPrompts: jsonb("used_prompts").$type<string[]>().notNull().default([]),
    rev: integer("rev").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("lobbies_code_uq").on(t.code)],
);

export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    lobbyId: integer("lobby_id")
      .notNull()
      .references(() => lobbies.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    name: text("name").notNull(),
    isHost: boolean("is_host").notNull().default(false),
    score: integer("score").notNull().default(0),
    colorIdx: integer("color_idx").notNull().default(0),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("players_lobby_token_uq").on(t.lobbyId, t.token),
    index("players_lobby_idx").on(t.lobbyId),
  ],
);

export const drawings = pgTable(
  "drawings",
  {
    id: serial("id").primaryKey(),
    lobbyId: integer("lobby_id")
      .notNull()
      .references(() => lobbies.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    prompt: text("prompt").notNull().default(""),
    strokes: jsonb("strokes").$type<Stroke[]>().notNull().default([]),
    displayOrder: integer("display_order").notNull().default(0),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("drawings_lobby_round_player_uq").on(t.lobbyId, t.round, t.playerId),
    index("drawings_lobby_idx").on(t.lobbyId),
  ],
);

export const votes = pgTable(
  "votes",
  {
    id: serial("id").primaryKey(),
    lobbyId: integer("lobby_id")
      .notNull()
      .references(() => lobbies.id, { onDelete: "cascade" }),
    drawingId: integer("drawing_id")
      .notNull()
      .references(() => drawings.id, { onDelete: "cascade" }),
    voterId: integer("voter_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    round: integer("round").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("votes_drawing_voter_uq").on(t.drawingId, t.voterId),
    index("votes_lobby_round_idx").on(t.lobbyId, t.round),
  ],
);

export type LobbyRow = typeof lobbies.$inferSelect;
export type PlayerRow = typeof players.$inferSelect;
export type DrawingRow = typeof drawings.$inferSelect;
export type VoteRow = typeof votes.$inferSelect;
