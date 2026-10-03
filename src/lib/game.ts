import { PACK_BY_ID, PROMPT_PACKS } from "@/lib/prompts";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 5;

export const WINNER_BONUS = 3;
export const LOGICAL_W = 1000;
export const LOGICAL_H = 625;

export const ONLINE_WINDOW_MS = 30_000;
/** Polls reuse the payload while the lobby revision and this bucket are unchanged. */
export const PRESENCE_BUCKET_MS = 10_000;

export const PLAYER_COLORS = [
  "#FF4B2B",
  "#1F3CFF",
  "#FFC531",
  "#16C79A",
  "#F05BB5",
  "#8A5CFF",
  "#FF8A00",
  "#00B3D6",
  "#7BD44B",
  "#FF2D6F",
  "#3E7BFA",
  "#E0A800",
];

export function makeCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH + 2);
}

export function sanitizeName(raw: string): string {
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
  return cleaned.length > 0 ? cleaned : "Anonymous";
}

export function makeToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function shuffle<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function promptsForPack(packId: string): string[] {
  const pack = PACK_BY_ID[packId] ?? PROMPT_PACKS[0];
  return pack.prompts;
}

/** Choose the next prompt, avoiding repeats until the pool is exhausted. */
export function choosePrompt(opts: {
  packId: string;
  customPrompts: string[];
  usedPrompts: string[];
}): { prompt: string; usedPrompts: string[] } {
  const customs = opts.customPrompts.map((c) => c.trim()).filter(Boolean);
  if (customs.length > 0) {
    const remaining = customs.filter((c) => !opts.usedPrompts.includes(c));
    const pool = remaining.length > 0 ? remaining : customs;
    const prompt = pool[Math.floor(Math.random() * pool.length)];
    const used = remaining.length > 0 ? [...opts.usedPrompts, prompt] : [prompt];
    return { prompt, usedPrompts: used.slice(-80) };
  }

  const all = promptsForPack(opts.packId);
  const remaining = all.filter((p) => !opts.usedPrompts.includes(p));
  const pool = remaining.length > 0 ? remaining : all;
  const prompt = pool[Math.floor(Math.random() * pool.length)];
  const used = remaining.length > 0 ? [...opts.usedPrompts, prompt] : [prompt];
  return { prompt, usedPrompts: used.slice(-120) };
}

/** Trim a stroke payload so a wild scribbler cannot blow up the request. */
export function sanitizeStrokes(input: unknown): { strokes: import("@/lib/types").Stroke[]; ok: boolean } {
  if (!Array.isArray(input)) return { strokes: [], ok: false };
  const strokes = [];
  for (const raw of input.slice(0, 500)) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    const pts = Array.isArray(s.p) ? s.p : [];
    const numbers: number[] = [];
    for (const v of pts.slice(0, 4000)) {
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) continue;
      numbers.push(Math.round(clamp(n, -200, 1200) * 10) / 10);
    }
    if (numbers.length < 2) continue;
    const color = typeof s.c === "string" && /^#[0-9a-fA-F]{3,8}$/.test(s.c) ? s.c : "#171310";
    const width = clamp(Number(s.w) || 6, 1, 80);
    strokes.push({ c: color, w: width, p: numbers, e: s.e === true });
  }
  return { strokes, ok: strokes.length > 0 };
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const DRAW_TIME_OPTIONS = [45, 60, 90, 120, 180];
export const VOTE_TIME_OPTIONS = [20, 30, 45, 60];
