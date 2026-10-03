import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  drawings,
  lobbies,
  players,
  votes,
  type DrawingRow,
  type LobbyRow,
  type PlayerRow,
  type VoteRow,
} from "@/db/schema";
import type { DrawingState, LobbyState, LobbyStatus, PlayerState, Stroke } from "@/lib/types";
import {
  clamp,
  makeCode,
  makeToken,
  ONLINE_WINDOW_MS,
  sanitizeName,
  sanitizeStrokes,
  shuffle,
  WINNER_BONUS,
} from "@/lib/game";
import { packIds, PROMPT_PACKS } from "@/lib/prompts";

async function reloadLobby(id: number): Promise<LobbyRow | null> {
  const rows = await db.select().from(lobbies).where(eq(lobbies.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findLobby(code: string): Promise<LobbyRow | null> {
  const rows = await db
    .select()
    .from(lobbies)
    .where(eq(lobbies.code, code.trim().toUpperCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function authenticate(
  lobbyId: number,
  playerId?: number | null,
  token?: string | null,
): Promise<PlayerRow | null> {
  if (!playerId || !token) return null;
  const rows = await db
    .select()
    .from(players)
    .where(and(eq(players.id, playerId), eq(players.lobbyId, lobbyId), eq(players.token, token)))
    .limit(1);
  return rows[0] ?? null;
}

export async function touchPlayer(playerId: number | null | undefined): Promise<void> {
  if (!playerId) return;
  await db.update(players).set({ lastSeenAt: new Date() }).where(eq(players.id, playerId));
}

async function claim(
  lobby: LobbyRow,
  from: LobbyStatus,
  patch: Partial<LobbyRow>,
): Promise<LobbyRow | null> {
  const rows = await db
    .update(lobbies)
    .set({ ...patch, rev: lobby.rev + 1, updatedAt: new Date() })
    .where(and(eq(lobbies.id, lobby.id), eq(lobbies.status, from), eq(lobbies.rev, lobby.rev)))
    .returning();
  return rows[0] ?? null;
}

async function bump(lobbyId: number): Promise<void> {
  await db
    .update(lobbies)
    .set({ rev: sql`${lobbies.rev} + 1`, updatedAt: new Date() })
    .where(eq(lobbies.id, lobbyId));
}

function roundDrawings(lobbyId: number, round: number) {
  return db
    .select()
    .from(drawings)
    .where(and(eq(drawings.lobbyId, lobbyId), eq(drawings.round, round)))
    .orderBy(asc(drawings.displayOrder), asc(drawings.id));
}

function roundVotes(lobbyId: number, round: number) {
  return db
    .select()
    .from(votes)
    .where(and(eq(votes.lobbyId, lobbyId), eq(votes.round, round)));
}

/** Drawing time is up: pencils down, ballots out. */
async function beginVoting(lobby: LobbyRow): Promise<LobbyRow> {
  const entries = await roundDrawings(lobby.id, lobby.round);
  if (entries.length === 0) {
    const claimed = await claim(lobby, "drawing", {
      status: "lobby",
      phaseEndsAt: null,
      prompt: null,
    });
    return claimed ?? (await reloadLobby(lobby.id)) ?? lobby;
  }

  const order = shuffle(entries.map((d) => d.id));
  for (let i = 0; i < order.length; i++) {
    await db.update(drawings).set({ displayOrder: i }).where(eq(drawings.id, order[i]));
  }

  const claimed = await claim(lobby, "drawing", {
    status: "voting",
    phaseEndsAt: new Date(Date.now() + lobby.voteSeconds * 1000),
  });
  return claimed ?? (await reloadLobby(lobby.id)) ?? lobby;
}

/** Voting closed: tally up, award points. */
async function beginResults(lobby: LobbyRow): Promise<LobbyRow> {
  const entries = await roundDrawings(lobby.id, lobby.round);
  const ballots = await roundVotes(lobby.id, lobby.round);

  const claimed = await claim(lobby, "voting", { status: "results", phaseEndsAt: null });
  if (!claimed) return (await reloadLobby(lobby.id)) ?? lobby;

  const tally = new Map<number, number>();
  for (const v of ballots) tally.set(v.drawingId, (tally.get(v.drawingId) ?? 0) + 1);

  const top = Math.max(0, ...entries.map((d) => tally.get(d.id) ?? 0));
  const winners = top > 0 ? entries.filter((d) => (tally.get(d.id) ?? 0) === top) : [];

  const awarded = new Map<number, number>();
  for (const d of entries) {
    const points = (tally.get(d.id) ?? 0) + (winners.some((w) => w.id === d.id) ? WINNER_BONUS : 0);
    if (points > 0) awarded.set(d.playerId, (awarded.get(d.playerId) ?? 0) + points);
  }
  for (const [playerId, points] of awarded) {
    await db
      .update(players)
      .set({ score: sql`${players.score} + ${points}` })
      .where(eq(players.id, playerId));
  }

  return (await reloadLobby(lobby.id)) ?? claimed;
}

/** Runs on every poll/action so timers never need a background worker. */
export async function advancePhase(lobby: LobbyRow): Promise<LobbyRow> {
  let current = lobby;
  for (let i = 0; i < 4; i++) {
    if (!current.phaseEndsAt) return current;
    if (current.phaseEndsAt.getTime() > Date.now()) return current;
    if (current.status === "drawing") current = await beginVoting(current);
    else if (current.status === "voting") current = await beginResults(current);
    else return current;
  }
  return current;
}

async function beginDrawing(lobby: LobbyRow, nextRound: number): Promise<LobbyRow> {
  const { prompt, usedPrompts } = chooseNext(lobby);
  const rows = await db
    .update(lobbies)
    .set({
      status: "drawing",
      round: nextRound,
      prompt,
      usedPrompts,
      phaseEndsAt: new Date(Date.now() + lobby.drawSeconds * 1000),
      rev: lobby.rev + 1,
      updatedAt: new Date(),
    })
    .where(eq(lobbies.id, lobby.id))
    .returning();
  return rows[0] ?? lobby;
}

function chooseNext(lobby: LobbyRow): { prompt: string; usedPrompts: string[] } {
  const customs = (lobby.customPrompts ?? []).map((c) => c.trim()).filter(Boolean);
  const poolSource = customs.length > 0 ? customs : packPrompts(lobby.promptPack);
  const used = lobby.usedPrompts ?? [];
  const remaining = poolSource.filter((p) => !used.includes(p));
  const pool = remaining.length > 0 ? remaining : poolSource;
  const prompt = pool[Math.floor(Math.random() * pool.length)] ?? "A very confused duck";
  const nextUsed = remaining.length > 0 ? [...used, prompt] : [prompt];
  return { prompt, usedPrompts: nextUsed.slice(-150) };
}

function packPrompts(packId: string): string[] {
  const pack = PROMPT_PACKS.find((p) => p.id === packId) ?? PROMPT_PACKS[0];
  return pack.prompts;
}

export async function createLobby(input: {
  name: string;
  drawSeconds?: number;
  voteSeconds?: number;
  promptPack?: string;
  customPrompts?: string[];
}): Promise<{ lobby: LobbyRow; player: PlayerRow }> {
  const name = sanitizeName(input.name);
  const packs = packIds();
  const pack = packs.includes(input.promptPack ?? "") ? (input.promptPack as string) : "mixed";

  let lobby: LobbyRow | null = null;
  for (let attempt = 0; attempt < 8 && !lobby; attempt++) {
    const code = makeCode();
    try {
      const rows = await db
        .insert(lobbies)
        .values({
          code,
          drawSeconds: clamp(Math.round(input.drawSeconds ?? 90), 20, 300),
          voteSeconds: clamp(Math.round(input.voteSeconds ?? 30), 10, 120),
          promptPack: pack,
          customPrompts: (input.customPrompts ?? []).slice(0, 30).map((c) => c.slice(0, 60)),
        })
        .returning();
      lobby = rows[0] ?? null;
    } catch {
      lobby = null;
    }
  }
  if (!lobby) throw new Error("Could not open a lobby right now, try again.");

  const playerRows = await db
    .insert(players)
    .values({ lobbyId: lobby.id, token: makeToken(), name, isHost: true, colorIdx: 0 })
    .returning();
  const player = playerRows[0];
  if (!player) throw new Error("Could not seat you at the table.");

  return { lobby, player };
}

export async function joinLobby(
  lobby: LobbyRow,
  name: string,
  existing?: PlayerRow | null,
): Promise<PlayerRow> {
  if (existing) return existing;
  const clean = sanitizeName(name);
  const roster = await db.select().from(players).where(eq(players.lobbyId, lobby.id));
  let finalName = clean;
  let suffix = 2;
  while (roster.some((p) => p.name.toLowerCase() === finalName.toLowerCase())) {
    finalName = `${clean.slice(0, 14)} ${suffix}`;
    suffix += 1;
  }
  const colorIdx = roster.length % 12;
  const rows = await db
    .insert(players)
    .values({ lobbyId: lobby.id, token: makeToken(), name: finalName, colorIdx })
    .returning();
  const player = rows[0];
  if (!player) throw new Error("Could not join that lobby.");
  await bump(lobby.id);
  return player;
}

export async function buildState(lobby: LobbyRow, me: PlayerRow | null): Promise<LobbyState> {
  const roster = await db
    .select()
    .from(players)
    .where(eq(players.lobbyId, lobby.id))
    .orderBy(asc(players.id));
  const now = Date.now();

  let entries: DrawingRow[] = [];
  let ballots: VoteRow[] = [];
  if (lobby.status !== "lobby") {
    entries = await roundDrawings(lobby.id, lobby.round);
    if (lobby.status !== "drawing") ballots = await roundVotes(lobby.id, lobby.round);
  }

  const submitted = new Set(entries.map((d) => d.playerId));
  const voted = new Set(ballots.map((v) => v.voterId));
  const reveal = lobby.status === "results";

  const tally = new Map<number, number>();
  for (const v of ballots) tally.set(v.drawingId, (tally.get(v.drawingId) ?? 0) + 1);
  const top = entries.length > 0 ? Math.max(0, ...entries.map((d) => tally.get(d.id) ?? 0)) : 0;

  const nameOf = (id: number) => roster.find((p) => p.id === id)?.name ?? "Someone";

  const drawingStates: DrawingState[] = entries.map((d) => {
    const mine = me?.id === d.playerId;
    const forThis = ballots.filter((v) => v.drawingId === d.id);
    return {
      id: d.id,
      playerId: d.playerId,
      authorName: reveal || mine ? nameOf(d.playerId) : "",
      authorColor: roster.find((p) => p.id === d.playerId)?.colorIdx ?? 0,
      strokes: (reveal || lobby.status === "voting" || mine ? d.strokes : []) as Stroke[],
      isYours: mine,
      displayOrder: d.displayOrder,
      voteCount: reveal ? forThis.length : 0,
      voters: reveal ? forThis.map((v) => nameOf(v.voterId)) : [],
      myVote: forThis.some((v) => v.voterId === me?.id),
    };
  });

  const playerStates: PlayerState[] = roster.map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    score: p.score,
    color: p.colorIdx,
    online: now - p.lastSeenAt.getTime() < ONLINE_WINDOW_MS,
    submitted: submitted.has(p.id),
    voted: voted.has(p.id),
    isYou: me?.id === p.id,
  }));

  const myDrawing = entries.find((d) => d.playerId === me?.id) ?? null;
  const myVote = ballots.find((v) => v.voterId === me?.id) ?? null;
  const winners =
    reveal && top > 0
      ? entries.filter((d) => (tally.get(d.id) ?? 0) === top).map((d) => d.playerId)
      : [];

  return {
    code: lobby.code,
    status: lobby.status,
    round: lobby.round,
    rev: lobby.rev,
    prompt: lobby.status === "lobby" ? null : lobby.prompt,
    phaseEndsAt: lobby.phaseEndsAt ? lobby.phaseEndsAt.getTime() : null,
    serverNow: now,
    settings: {
      drawSeconds: lobby.drawSeconds,
      voteSeconds: lobby.voteSeconds,
      promptPack: lobby.promptPack,
      customPrompts: lobby.customPrompts ?? [],
    },
    you: me ? { id: me.id, name: me.name, isHost: me.isHost, color: me.colorIdx } : null,
    players: playerStates,
    drawings: drawingStates,
    myDrawingId: myDrawing?.id ?? null,
    myVoteId: myVote?.id ?? null,
    submittedCount: submitted.size,
    votedCount: voted.size,
    winnerBonus: WINNER_BONUS,
    totals: roster
      .map((p) => ({ playerId: p.id, name: p.name, score: p.score, color: p.colorIdx }))
      .sort((a, b) => b.score - a.score || a.playerId - b.playerId),
    roundWinners: winners,
    playerCount: roster.length,
  };
}

export type ActionResult = { ok: true; state: LobbyState } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

export async function handleAction(
  lobbyIn: LobbyRow,
  me: PlayerRow | null,
  type: string,
  payload: Record<string, unknown>,
): Promise<ActionResult> {
  const lobby = await advancePhase(lobbyIn);

  if (!me) return fail("Join the lobby first.");

  const num = (v: unknown, fallback: number) =>
    Number.isFinite(Number(v)) && v !== null && v !== undefined && v !== "" ? Number(v) : fallback;

  if (type === "ping") {
    await touchPlayer(me.id);
    return { ok: true, state: await buildState(lobby, me) };
  }

  if (type === "rename") {
    const name = sanitizeName(String(payload.name ?? ""));
    await db.update(players).set({ name }).where(eq(players.id, me.id));
    await bump(lobby.id);
    const fresh = await reloadLobby(lobby.id);
    const freshMe = await authenticate(lobby.id, me.id, me.token);
    return { ok: true, state: await buildState(fresh ?? lobby, freshMe) };
  }

  if (type === "leave") {
    await db.delete(players).where(eq(players.id, me.id));
    const remaining = await db
      .select()
      .from(players)
      .where(eq(players.lobbyId, lobby.id))
      .orderBy(asc(players.id));
    if (remaining.length === 0) {
      await db.delete(lobbies).where(eq(lobbies.id, lobby.id));
    } else if (me.isHost) {
      await db
        .update(players)
        .set({ isHost: true })
        .where(eq(players.id, remaining[0].id));
      await bump(lobby.id);
    } else {
      await bump(lobby.id);
    }
    return fail("You left the lobby.");
  }

  if (type === "kick") {
    if (!me.isHost) return fail("Only the host can show someone the door.");
    const targetId = num(payload.playerId, 0);
    if (!targetId || targetId === me.id) return fail("Pick someone else to remove.");
    await db.delete(players).where(and(eq(players.id, targetId), eq(players.lobbyId, lobby.id)));
    await bump(lobby.id);
    const fresh = await reloadLobby(lobby.id);
    return { ok: true, state: await buildState(fresh ?? lobby, me) };
  }

  if (type === "settings") {
    if (!me.isHost) return fail("Only the host can tweak the rules.");
    if (lobby.status === "drawing" || lobby.status === "voting")
      return fail("Wait for this round to finish.");
    const packs = packIds();
    const packRaw = String(payload.promptPack ?? lobby.promptPack);
    const customs = Array.isArray(payload.customPrompts)
      ? (payload.customPrompts as unknown[])
          .map((c) => sanitizeName(String(c ?? "")))
          .filter((c) => c && c !== "Anonymous")
          .slice(0, 30)
      : lobby.customPrompts ?? [];
    await db
      .update(lobbies)
      .set({
        drawSeconds: clamp(Math.round(num(payload.drawSeconds, lobby.drawSeconds)), 20, 300),
        voteSeconds: clamp(Math.round(num(payload.voteSeconds, lobby.voteSeconds)), 10, 120),
        promptPack: packs.includes(packRaw) ? packRaw : "mixed",
        customPrompts: customs,
        usedPrompts: [],
        rev: lobby.rev + 1,
        updatedAt: new Date(),
      })
      .where(eq(lobbies.id, lobby.id));
    const fresh = await reloadLobby(lobby.id);
    return { ok: true, state: await buildState(fresh ?? lobby, me) };
  }

  if (type === "start") {
    if (!me.isHost) return fail("Only the host can start the round.");
    if (lobby.status !== "lobby" && lobby.status !== "results")
      return fail("A round is already running.");
    const nextRound = lobby.status === "results" ? lobby.round + 1 : Math.max(1, lobby.round + 1);
    const fresh = await beginDrawing(lobby, nextRound);
    return { ok: true, state: await buildState(fresh, me) };
  }

  if (type === "next") {
    if (lobby.status !== "results") return fail("This round is still running.");
    const fresh = await beginDrawing(lobby, lobby.round + 1);
    return { ok: true, state: await buildState(fresh, me) };
  }

  if (type === "submit") {
    if (lobby.status !== "drawing") return fail("Pencils are down.");
    const { strokes, ok } = sanitizeStrokes(payload.strokes);
    if (!ok) return fail("Draw something first — an empty canvas cannot win votes.");
    await db
      .insert(drawings)
      .values({
        lobbyId: lobby.id,
        playerId: me.id,
        round: lobby.round,
        prompt: lobby.prompt ?? "",
        strokes,
      })
      .onConflictDoUpdate({
        target: [drawings.lobbyId, drawings.round, drawings.playerId],
        set: { strokes, submittedAt: new Date() },
      });
    await bump(lobby.id);

    const entries = await roundDrawings(lobby.id, lobby.round);
    const rosterSize = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(players)
      .where(eq(players.lobbyId, lobby.id));
    const total = rosterSize[0]?.n ?? 0;
    let fresh = await reloadLobby(lobby.id);
    if (fresh && fresh.status === "drawing" && entries.length >= total && entries.length > 0) {
      fresh = await beginVoting(fresh);
    }
    return { ok: true, state: await buildState(fresh ?? lobby, me) };
  }

  if (type === "vote") {
    if (lobby.status !== "voting") return fail("Voting is not open right now.");
    const drawingId = num(payload.drawingId, 0);
    const entries = await roundDrawings(lobby.id, lobby.round);
    const target = entries.find((d) => d.id === drawingId);
    if (!target) return fail("That drawing is not in this round.");
    if (target.playerId === me.id)
      return fail("Nice try — you cannot vote for your own drawing.");

    const existing = await db
      .select()
      .from(votes)
      .where(and(eq(votes.voterId, me.id), eq(votes.lobbyId, lobby.id), eq(votes.round, lobby.round)))
      .limit(1);
    const current = existing[0];

    if (current && current.drawingId === drawingId) {
      await db.delete(votes).where(eq(votes.id, current.id));
    } else if (current) {
      await db.update(votes).set({ drawingId }).where(eq(votes.id, current.id));
    } else {
      await db.insert(votes).values({
        lobbyId: lobby.id,
        drawingId,
        voterId: me.id,
        round: lobby.round,
      });
    }
    await bump(lobby.id);

    const fresh = await reloadLobby(lobby.id);
    return { ok: true, state: await buildState(fresh ?? lobby, me) };
  }

  if (type === "reset") {
    if (!me.isHost) return fail("Only the host can wipe the scoreboard.");
    await db.delete(votes).where(eq(votes.lobbyId, lobby.id));
    await db.delete(drawings).where(eq(drawings.lobbyId, lobby.id));
    await db.update(players).set({ score: 0 }).where(eq(players.lobbyId, lobby.id));
    await db
      .update(lobbies)
      .set({
        status: "lobby",
        round: 0,
        prompt: null,
        phaseEndsAt: null,
        usedPrompts: [],
        rev: lobby.rev + 1,
        updatedAt: new Date(),
      })
      .where(eq(lobbies.id, lobby.id));
    const fresh = await reloadLobby(lobby.id);
    return { ok: true, state: await buildState(fresh ?? lobby, me) };
  }

  return fail(`Unknown action: ${type}`);
}
