import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFbs } from "@/lib/firebase";
import type {
  DrawingState,
  LobbySettings,
  LobbyState,
  LobbyStatus,
  PlayerState,
  Stroke,
} from "@/lib/types";
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

/* ------------------------------------------------------------- data shapes */

type LobbyDoc = {
  code: string;
  status: LobbyStatus;
  round: number;
  prompt: string | null;
  phaseEndsAt: number | null;
  drawSeconds: number;
  voteSeconds: number;
  promptPack: string;
  customPrompts: string[];
  usedPrompts: string[];
  rev: number;
  createdAt: number;
  updatedAt: number;
};

type PlayerDoc = {
  id: string;
  token: string;
  name: string;
  isHost: boolean;
  score: number;
  colorIdx: number;
  lastSeenAt: number;
  createdAt: number;
};

type DrawingDoc = {
  id: string;
  playerId: string;
  round: number;
  prompt: string;
  strokes: Stroke[];
  displayOrder: number;
  submittedAt: number;
};

type VoteDoc = {
  id: string;
  drawingId: string;
  voterId: string;
  round: number;
  createdAt: number;
};

/* ----------------------------------------------------------------- helpers */

const now = () => Date.now();

const lobbyRef = (code: string) => doc(getFbs(), "lobbies", code);
const playersCol = (code: string) => collection(getFbs(), "lobbies", code, "players");
const playerRef = (code: string, pid: string) => doc(getFbs(), "lobbies", code, "players", pid);
const drawingsCol = (code: string) => collection(getFbs(), "lobbies", code, "drawings");
const drawingRef = (code: string, did: string) => doc(getFbs(), "lobbies", code, "drawings", did);
const votesCol = (code: string) => collection(getFbs(), "lobbies", code, "votes");
const voteRef = (code: string, vid: string) => doc(getFbs(), "lobbies", code, "votes", vid);

const roundDrawingsQuery = (code: string, round: number) =>
  query(drawingsCol(code), where("round", "==", round));
const roundVotesQuery = (code: string, round: number) => query(votesCol(code), where("round", "==", round));

export async function getLobby(code: string): Promise<LobbyDoc | null> {
  const snap = await getDoc(lobbyRef(code));
  return (snap.data() as LobbyDoc) ?? null;
}

async function readPlayers(code: string): Promise<PlayerDoc[]> {
  const snap = await getDocs(playersCol(code));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<PlayerDoc, "id">), id: d.id }))
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

async function readPlayer(code: string, pid: string): Promise<PlayerDoc | null> {
  const snap = await getDoc(playerRef(code, pid));
  if (!snap.exists()) return null;
  return { ...(snap.data() as Omit<PlayerDoc, "id">), id: snap.id };
}

export async function authenticate(
  code: string,
  playerId?: string | null,
  token?: string | null,
): Promise<PlayerDoc | null> {
  if (!playerId || !token) return null;
  const p = await readPlayer(code, playerId);
  return p && p.token === token ? p : null;
}

export async function touchPlayer(code: string, playerId: string): Promise<void> {
  try {
    await updateDoc(playerRef(code, playerId), { lastSeenAt: now() });
  } catch {
    /* offline moment — presence just stays stale for a while */
  }
}

async function readRoundDrawings(code: string, round: number): Promise<DrawingDoc[]> {
  const snap = await getDocs(roundDrawingsQuery(code, round));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<DrawingDoc, "id">), id: d.id }));
}

async function readRoundVotes(code: string, round: number): Promise<VoteDoc[]> {
  const snap = await getDocs(roundVotesQuery(code, round));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<VoteDoc, "id">), id: d.id }));
}

function hex(n: number): string {
  const bytes = new Uint8Array(n);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) crypto.getRandomValues(bytes);
  else for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const makePlayerId = () => `p${hex(10)}`;
const drawingIdFor = (round: number, pid: string) => `d-r${round}-${pid}`;
const voteIdFor = (round: number, pid: string) => `v-r${round}-${pid}`;

function packPrompts(packId: string): string[] {
  const pack = PROMPT_PACKS.find((p) => p.id === packId) ?? PROMPT_PACKS[0];
  return pack.prompts;
}

function chooseNext(lobby: LobbyDoc): { prompt: string; usedPrompts: string[] } {
  const customs = (lobby.customPrompts ?? []).map((c) => c.trim()).filter(Boolean);
  const poolSource = customs.length > 0 ? customs : packPrompts(lobby.promptPack);
  const used = lobby.usedPrompts ?? [];
  const remaining = poolSource.filter((p) => !used.includes(p));
  const pool = remaining.length > 0 ? remaining : poolSource;
  const prompt = pool[Math.floor(Math.random() * pool.length)] ?? "A very confused duck";
  const nextUsed = remaining.length > 0 ? [...used, prompt] : [prompt];
  return { prompt, usedPrompts: nextUsed.slice(-150) };
}

async function bump(code: string, rev: number): Promise<void> {
  await updateDoc(lobbyRef(code), { rev: rev + 1, updatedAt: now() });
}

/* --------------------------------------------------------- phase machine */

/**
 * Flips a phase using a guarded transaction (only the lobby doc inside the tx),
 * then applies the side effects — so double-runs never double-count anything.
 */
async function flipPhase(
  code: string,
  from: LobbyStatus,
  patch: (l: LobbyDoc) => Record<string, unknown>,
): Promise<boolean> {
  let flipped = false;
  try {
    await runTransaction(getFbs(), async (tx) => {
      const snap = await tx.get(lobbyRef(code));
      const l = snap.data() as LobbyDoc | undefined;
      if (!l || l.status !== from) return;
      tx.update(lobbyRef(code), { ...patch(l), rev: l.rev + 1, updatedAt: now() });
      flipped = true;
    });
  } catch {
    return false;
  }
  return flipped;
}

async function beginVoting(code: string): Promise<void> {
  const l = await getLobby(code);
  if (!l || l.status !== "drawing") return;
  const entries = await readRoundDrawings(code, l.round);
  const flipped = await flipPhase(code, "drawing", (cur) =>
    entries.length === 0
      ? { status: "lobby" as LobbyStatus, phaseEndsAt: null, prompt: null }
      : { status: "voting" as LobbyStatus, phaseEndsAt: now() + cur.voteSeconds * 1000 },
  );
  if (!flipped || entries.length === 0) return;

  const batch = writeBatch(getFbs());
  shuffle(entries.map((e) => e.id)).forEach((id, i) => batch.update(drawingRef(code, id), { displayOrder: i }));
  await batch.commit();
}

async function beginResults(code: string): Promise<void> {
  const l = await getLobby(code);
  if (!l || l.status !== "voting") return;
  const entries = await readRoundDrawings(code, l.round);
  const ballots = await readRoundVotes(code, l.round);

  const tally: Record<string, number> = {};
  for (const v of ballots) tally[v.drawingId] = (tally[v.drawingId] ?? 0) + 1;
  const top = entries.length > 0 ? Math.max(0, ...entries.map((e) => tally[e.id] ?? 0)) : 0;
  const winners = top > 0 ? entries.filter((e) => (tally[e.id] ?? 0) === top) : [];
  const awarded: Record<string, number> = {};
  for (const e of entries) {
    const points = (tally[e.id] ?? 0) + (winners.some((w) => w.id === e.id) ? WINNER_BONUS : 0);
    if (points > 0) awarded[e.playerId] = (awarded[e.playerId] ?? 0) + points;
  }

  const flipped = await flipPhase(code, "voting", () => ({
    status: "results" as LobbyStatus,
    phaseEndsAt: null,
  }));
  if (!flipped) return;

  if (Object.keys(awarded).length > 0) {
    const batch = writeBatch(getFbs());
    for (const [pid, points] of Object.entries(awarded)) {
      batch.update(playerRef(code, pid), { score: increment(points) });
    }
    await batch.commit();
  }
}

async function beginDrawing(code: string, nextRound: number, from: "start" | "next"): Promise<void> {
  const lobby = lobbyRef(code);
  await runTransaction(getFbs(), async (tx) => {
    const snap = await tx.get(lobby);
    const l = snap.data() as LobbyDoc | undefined;
    if (!l) throw new Error("This lobby just closed.");
    if (from === "start" && l.status !== "lobby" && l.status !== "results")
      throw new Error("A round is already running.");
    if (from === "next" && l.status !== "results") throw new Error("This round is still running.");

    const { prompt, usedPrompts } = chooseNext(l);
    tx.update(lobby, {
      status: "drawing" as LobbyStatus,
      round: nextRound,
      prompt,
      usedPrompts,
      phaseEndsAt: now() + l.drawSeconds * 1000,
      rev: l.rev + 1,
      updatedAt: now(),
    });
  });
}

/** Runs on every poll/action so timers never need a background worker. */
export async function advancePhase(code: string): Promise<LobbyDoc | null> {
  for (let i = 0; i < 4; i++) {
    const current = await getLobby(code);
    if (!current) return null;
    if (!current.phaseEndsAt || current.phaseEndsAt > now()) return current;
    if (current.status === "drawing") await beginVoting(code);
    else if (current.status === "voting") await beginResults(code);
    else return current;
  }
  return getLobby(code);
}

/* ------------------------------------------------------------------ state */

export async function buildState(code: string, me: PlayerDoc | null): Promise<LobbyState> {
  const lobby = (await getLobby(code)) as LobbyDoc;
  const roster = await readPlayers(code);
  const ts = now();

  let entries: DrawingDoc[] = [];
  let ballots: VoteDoc[] = [];
  if (lobby.status !== "lobby") {
    entries = await readRoundDrawings(code, lobby.round);
    if (lobby.status !== "drawing") ballots = await readRoundVotes(code, lobby.round);
  }

  const submitted = new Set(entries.map((d) => d.playerId));
  const voted = new Set(ballots.map((v) => v.voterId));
  const reveal = lobby.status === "results";

  const tally: Record<string, number> = {};
  for (const v of ballots) tally[v.drawingId] = (tally[v.drawingId] ?? 0) + 1;
  const top = entries.length > 0 ? Math.max(0, ...entries.map((d) => tally[d.id] ?? 0)) : 0;

  const nameOf = (id: string) => roster.find((p) => p.id === id)?.name ?? "Someone";
  const colorOf = (id: string) => roster.find((p) => p.id === id)?.colorIdx ?? 0;

  const ordered = [...entries].sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id));
  const drawingStates: DrawingState[] = ordered.map((d) => {
    const mine = me?.id === d.playerId;
    const forThis = ballots.filter((v) => v.drawingId === d.id);
    return {
      id: d.id,
      playerId: d.playerId,
      authorName: reveal || mine ? nameOf(d.playerId) : "",
      authorColor: colorOf(d.playerId),
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
    online: ts - p.lastSeenAt < ONLINE_WINDOW_MS,
    submitted: submitted.has(p.id),
    voted: voted.has(p.id),
    isYou: me?.id === p.id,
  }));

  const myDrawing = entries.find((d) => d.playerId === me?.id) ?? null;
  const myVote = ballots.find((v) => v.voterId === me?.id) ?? null;
  const winners = reveal && top > 0 ? entries.filter((d) => (tally[d.id] ?? 0) === top).map((d) => d.playerId) : [];

  return {
    code: lobby.code,
    status: lobby.status,
    round: lobby.round,
    rev: lobby.rev,
    prompt: lobby.status === "lobby" ? null : lobby.prompt,
    phaseEndsAt: lobby.phaseEndsAt,
    serverNow: ts,
    settings: {
      drawSeconds: lobby.drawSeconds,
      voteSeconds: lobby.voteSeconds,
      promptPack: lobby.promptPack,
      customPrompts: lobby.customPrompts ?? [],
    } satisfies LobbySettings,
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
      .sort((a, b) => b.score - a.score || a.playerId.localeCompare(b.playerId)),
    roundWinners: winners,
    playerCount: roster.length,
  };
}

/* ----------------------------------------------------------------- create */

export async function createLobby(input: {
  name: string;
  drawSeconds?: number;
  voteSeconds?: number;
  promptPack?: string;
  customPrompts?: string[];
}): Promise<{ code: string; player: PlayerDoc }> {
  const name = sanitizeName(input.name);
  const packs = packIds();
  const pack = packs.includes(input.promptPack ?? "") ? (input.promptPack as string) : "mixed";
  const ts = now();

  let code = "";
  for (let attempt = 0; attempt < 8 && !code; attempt++) {
    const candidate = makeCode();
    const exists = await getDoc(lobbyRef(candidate));
    if (!exists.exists()) code = candidate;
  }
  if (!code) throw new Error("Could not open a lobby right now, try again.");

  const player: Omit<PlayerDoc, "id"> & { id: string } = {
    id: makePlayerId(),
    token: makeToken(),
    name,
    isHost: true,
    score: 0,
    colorIdx: 0,
    lastSeenAt: ts,
    createdAt: ts,
  };

  const batch = writeBatch(getFbs());
  batch.set(lobbyRef(code), {
    code,
    status: "lobby" as LobbyStatus,
    round: 0,
    prompt: null,
    phaseEndsAt: null,
    drawSeconds: clamp(Math.round(input.drawSeconds ?? 90), 20, 300),
    voteSeconds: clamp(Math.round(input.voteSeconds ?? 30), 10, 120),
    promptPack: pack,
    customPrompts: (input.customPrompts ?? []).slice(0, 30).map((c) => sanitizeName(c).slice(0, 60)),
    usedPrompts: [],
    rev: 1,
    createdAt: ts,
    updatedAt: ts,
  });
  batch.set(playerRef(code, player.id), player);
  await batch.commit();

  return { code, player };
}

export async function joinLobby(code: string, name: string, existing?: PlayerDoc | null): Promise<PlayerDoc> {
  if (existing) return existing;
  const clean = sanitizeName(name);
  const roster = await readPlayers(code);
  let finalName = clean;
  let suffix = 2;
  while (roster.some((p) => p.name.toLowerCase() === finalName.toLowerCase())) {
    finalName = `${clean.slice(0, 14)} ${suffix}`;
    suffix += 1;
  }
  const ts = now();
  const player: PlayerDoc = {
    id: makePlayerId(),
    token: makeToken(),
    name: finalName,
    isHost: false,
    score: 0,
    colorIdx: roster.length % 12,
    lastSeenAt: ts,
    createdAt: ts,
  };
  await setDoc(playerRef(code, player.id), player);
  const lobby = (await getLobby(code)) as LobbyDoc;
  await bump(code, lobby.rev);
  return player;
}

/* ----------------------------------------------------------------- actions */

export type ActionResult = { ok: true; state: LobbyState } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });

export async function handleAction(
  codeIn: string,
  me: PlayerDoc | null,
  type: string,
  payload: Record<string, unknown>,
): Promise<ActionResult> {
  const code = codeIn;
  const lobby = await advancePhase(code);
  if (!lobby) return fail("This lobby just closed.");
  if (!me) return fail("Join the lobby first.");

  const str = (v: unknown) => (typeof v === "string" && v.length > 0 && v.length <= 160 ? v : "");

  switch (type) {
    case "ping": {
      await touchPlayer(code, me.id);
      return { ok: true, state: await buildState(code, me) };
    }

    case "rename": {
      const name = sanitizeName(String(payload.name ?? ""));
      await updateDoc(playerRef(code, me.id), { name });
      await bump(code, lobby.rev);
      const freshMe = await readPlayer(code, me.id);
      return { ok: true, state: await buildState(code, freshMe) };
    }

    case "leave": {
      const batch = writeBatch(getFbs());
      batch.delete(playerRef(code, me.id));
      const roster = (await readPlayers(code)).filter((p) => p.id !== me.id);
      if (roster.length === 0) {
        batch.delete(lobbyRef(code));
        for (const d of await readRoundDrawings(code, lobby.round)) batch.delete(drawingRef(code, d.id));
        for (const v of await readRoundVotes(code, lobby.round)) batch.delete(voteRef(code, v.id));
      } else if (me.isHost) {
        batch.update(playerRef(code, roster[0].id), { isHost: true });
      }
      await batch.commit();
      if (roster.length > 0) await bump(code, lobby.rev);
      return fail("You left the lobby.");
    }

    case "kick": {
      if (!me.isHost) return fail("Only the host can show someone the door.");
      const targetId = str(payload.playerId);
      if (!targetId || targetId === me.id) return fail("Pick someone else to remove.");
      const target = await readPlayer(code, targetId);
      if (!target) return fail("That player is already gone.");
      const batch = writeBatch(getFbs());
      batch.delete(playerRef(code, targetId));
      for (const d of await readRoundDrawings(code, lobby.round)) {
        if (d.playerId === targetId) batch.delete(drawingRef(code, d.id));
      }
      for (const v of await readRoundVotes(code, lobby.round)) {
        if (v.voterId === targetId) batch.delete(voteRef(code, v.id));
      }
      await batch.commit();
      await bump(code, lobby.rev);
      const freshMe = await readPlayer(code, me.id);
      return { ok: true, state: await buildState(code, freshMe) };
    }

    case "settings": {
      if (!me.isHost) return fail("Only the host can tweak the rules.");
      if (lobby.status === "drawing" || lobby.status === "voting")
        return fail("Wait for this round to finish.");
      const packs = packIds();
      const packRaw = str(payload.promptPack) || lobby.promptPack;
      const customs = Array.isArray(payload.customPrompts)
        ? (payload.customPrompts as unknown[])
            .map((c) => sanitizeName(String(c ?? "")))
            .filter((c) => c && c !== "Anonymous")
            .slice(0, 30)
        : lobby.customPrompts ?? [];
      await updateDoc(lobbyRef(code), {
        drawSeconds: clamp(Math.round(Number(payload.drawSeconds) || lobby.drawSeconds), 20, 300),
        voteSeconds: clamp(Math.round(Number(payload.voteSeconds) || lobby.voteSeconds), 10, 120),
        promptPack: packs.includes(packRaw) ? packRaw : "mixed",
        customPrompts: customs,
        usedPrompts: [],
        rev: lobby.rev + 1,
        updatedAt: now(),
      });
      const fresh = await readPlayer(code, me.id);
      return { ok: true, state: await buildState(code, fresh) };
    }

    case "start": {
      if (!me.isHost) return fail("Only the host can start the round.");
      try {
        await beginDrawing(code, lobby.round + 1, "start");
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Could not start the round.");
      }
      return { ok: true, state: await buildState(code, me) };
    }

    case "next": {
      try {
        await beginDrawing(code, lobby.round + 1, "next");
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Could not start the round.");
      }
      return { ok: true, state: await buildState(code, me) };
    }

    case "submit": {
      if (lobby.status !== "drawing") return fail("Pencils are down.");
      const { strokes, ok } = sanitizeStrokes(payload.strokes);
      if (!ok) return fail("Draw something first — an empty canvas cannot win votes.");
      const did = drawingIdFor(lobby.round, me.id);
      await setDoc(drawingRef(code, did), {
        playerId: me.id,
        round: lobby.round,
        prompt: lobby.prompt ?? "",
        strokes,
        displayOrder: 0,
        submittedAt: now(),
      });
      await bump(code, lobby.rev);

      const entries = await readRoundDrawings(code, lobby.round);
      const rosterSize = (await readPlayers(code)).length;
      if (entries.length >= rosterSize && entries.length > 0) await beginVoting(code);
      const fresh = await readPlayer(code, me.id);
      return { ok: true, state: await buildState(code, fresh) };
    }

    case "vote": {
      if (lobby.status !== "voting") return fail("Voting is not open right now.");
      const drawingId = str(payload.drawingId);
      const entries = await readRoundDrawings(code, lobby.round);
      const target = entries.find((d) => d.id === drawingId);
      if (!target) return fail("That drawing is not in this round.");
      if (target.playerId === me.id)
        return fail("Nice try — you cannot vote for your own drawing.");

      const vid = voteIdFor(lobby.round, me.id);
      const existing = await getDoc(voteRef(code, vid));
      if (existing.exists()) {
        const current = existing.data() as VoteDoc;
        if (current.drawingId === drawingId) {
          await deleteDoc(voteRef(code, vid));
        } else {
          await updateDoc(voteRef(code, vid), { drawingId, createdAt: now() });
        }
      } else {
        await setDoc(voteRef(code, vid), {
          drawingId,
          voterId: me.id,
          round: lobby.round,
          createdAt: now(),
        });
      }
      const freshLobby = await getLobby(code);
      await bump(code, freshLobby?.rev ?? lobby.rev);
      const fresh = await readPlayer(code, me.id);
      return { ok: true, state: await buildState(code, fresh) };
    }

    case "reset": {
      if (!me.isHost) return fail("Only the host can wipe the scoreboard.");
      const batch = writeBatch(getFbs());
      for (const v of await readRoundVotes(code, lobby.round)) batch.delete(voteRef(code, v.id));
      for (const d of await readRoundDrawings(code, lobby.round)) batch.delete(drawingRef(code, d.id));
      for (const p of await readPlayers(code)) batch.update(playerRef(code, p.id), { score: 0 });
      batch.update(lobbyRef(code), {
        status: "lobby" as LobbyStatus,
        round: 0,
        prompt: null,
        phaseEndsAt: null,
        usedPrompts: [],
        rev: lobby.rev + 1,
        updatedAt: now(),
      });
      await batch.commit();
      const fresh = await readPlayer(code, me.id);
      return { ok: true, state: await buildState(code, fresh) };
    }

    default:
      return fail(`Unknown action: ${type}`);
  }
}
