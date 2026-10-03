"use client";

import { useCallback, useEffect, useState } from "react";
import { SketchPad } from "@/components/SketchPad";
import { DrawingView } from "@/components/DrawingView";
import { Btn, Chip } from "@/components/ui/Bits";
import { PROMPT_PACKS } from "@/lib/prompts";
import { DRAW_TIME_OPTIONS, formatClock } from "@/lib/game";
import { LOGICAL_H, LOGICAL_W, renderStrokes } from "@/lib/sketch";
import type { Stroke } from "@/lib/types";

const STORE = "doodle-riot:practice-v1";
const TIMER_OPTIONS: (number | null)[] = [null, ...DRAW_TIME_OPTIONS];

type PracticeSession = {
  id: number;
  prompt: string;
  pack: string;
  duration: number | null;
  startedAt: number;
  endsAt: number | null;
  strokes: Stroke[];
  finished: boolean;
};

function loadSession(): PracticeSession | null {
  try {
    const value = window.localStorage.getItem(STORE);
    if (!value) return null;
    const data = JSON.parse(value) as PracticeSession;
    if (
      !data ||
      typeof data.id !== "number" ||
      typeof data.prompt !== "string" ||
      !Array.isArray(data.strokes) ||
      typeof data.startedAt !== "number" ||
      (data.duration !== null && (typeof data.duration !== "number" || !Number.isFinite(data.duration))) ||
      (data.endsAt !== null && (typeof data.endsAt !== "number" || !Number.isFinite(data.endsAt)))
    ) return null;
    return { ...data, finished: Boolean(data.finished || (data.endsAt && Date.now() >= data.endsAt)) };
  } catch {
    return null;
  }
}

export function PracticeStudio() {
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pack, setPack] = useState(PROMPT_PACKS[0].id);
  const [promptMode, setPromptMode] = useState<"random" | "custom" | "blank">("random");
  const [customPrompt, setCustomPrompt] = useState("");
  const [duration, setDuration] = useState<number | null>(90);
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const restored = loadSession();
    if (restored) {
      setSession(restored);
      if (PROMPT_PACKS.some((p) => p.id === restored.pack)) setPack(restored.pack);
      setDuration(restored.duration);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (session) window.localStorage.setItem(STORE, JSON.stringify(session));
      else window.localStorage.removeItem(STORE);
    } catch {
      setNotice("Browser storage is full or blocked. Download your drawing to keep it.");
    }
  }, [session, hydrated]);

  useEffect(() => {
    if (!session || session.finished) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (session.endsAt && current >= session.endsAt) {
        setSession((prev) =>
          prev && prev.id === session.id && !prev.finished ? { ...prev, finished: true } : prev,
        );
      }
    };
    tick();
    const interval = window.setInterval(tick, 200);
    return () => window.clearInterval(interval);
  }, [session?.id, session?.finished, session?.endsAt]);

  const handleCommit = useCallback((strokes: Stroke[]) => {
    setSession((prev) => {
      if (!prev || prev.finished || (prev.endsAt && Date.now() >= prev.endsAt)) return prev;
      return { ...prev, strokes: strokes.slice() };
    });
  }, []);

  const start = () => {
    if (promptMode === "custom" && !customPrompt.trim()) {
      setNotice("Write a prompt first, or choose a random one.");
      return;
    }
    setNotice("");
    const selected = PROMPT_PACKS.find((p) => p.id === pack) ?? PROMPT_PACKS[0];
    const prompt =
      promptMode === "blank"
        ? ""
        : promptMode === "custom"
          ? customPrompt.trim().slice(0, 120)
          : selected.prompts[Math.floor(Math.random() * selected.prompts.length)];
    const startedAt = Date.now();
    setNow(startedAt);
    setSession({
      id: startedAt,
      prompt,
      pack,
      duration,
      startedAt,
      endsAt: duration === null ? null : startedAt + duration * 1000,
      strokes: [],
      finished: false,
    });
  };

  const retry = () => {
    if (!session) return;
    const startedAt = Date.now();
    setNow(startedAt);
    setNotice("");
    setSession({
      ...session,
      id: startedAt,
      startedAt,
      endsAt: session.duration === null ? null : startedAt + session.duration * 1000,
      strokes: [],
      finished: false,
    });
  };

  const newSession = () => {
    if (session && !session.finished && session.strokes.length > 0) {
      if (!window.confirm("Start something new? Your current drawing will be replaced. Download it first if you want to keep it.")) return;
    }
    setSession(null);
    setNotice("");
  };

  const download = () => {
    if (!session) return;
    const canvas = document.createElement("canvas");
    canvas.width = LOGICAL_W * 2;
    canvas.height = LOGICAL_H * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    renderStrokes(ctx, session.strokes);
    // Flatten transparent eraser marks onto white paper, not a transparent PNG.
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    const link = document.createElement("a");
    link.download = `doodle-riot-practice-${new Date(session.startedAt).toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="grain grain-light relative min-h-screen overflow-hidden bg-night text-paper">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(46rem 35rem at 4% 0%, rgba(255,75,43,.24), transparent 67%), radial-gradient(40rem 35rem at 100% 20%, rgba(36,64,255,.24), transparent 70%), radial-gradient(50rem 25rem at 50% 100%, rgba(22,199,154,.14), transparent 70%)",
        }}
      />
      <div className="dots pointer-events-none fixed inset-0 opacity-[0.07]" />
      <div className="relative z-10 mx-auto max-w-[1360px] px-4 pb-16 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-paper/15 py-5">
          <a href="/" className="group flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl border-[3px] border-ink bg-sun font-display text-2xl font-extrabold text-ink shadow-[3px_3px_0_0_var(--color-flame)] transition-transform group-hover:-rotate-6">✳</span>
            <span className="display text-xl text-paper">Doodle <span className="text-flame">Riot</span></span>
          </a>
          <div className="flex items-center gap-3">
            <Chip tone="mint" className="border-ink">solo studio</Chip>
            <a href="/" className="font-mono text-[11px] font-bold uppercase tracking-widest text-paper/55 transition-colors hover:text-sun">← Home</a>
          </div>
        </header>

        {!hydrated ? (
          <div className="grid min-h-[65vh] place-items-center">
            <p className="display text-3xl">Opening the sketchbook<span className="blink text-sun">…</span></p>
          </div>
        ) : !session ? (
          <Setup
            pack={pack}
            setPack={setPack}
            promptMode={promptMode}
            setPromptMode={setPromptMode}
            customPrompt={customPrompt}
            setCustomPrompt={setCustomPrompt}
            duration={duration}
            setDuration={setDuration}
            start={start}
            notice={notice}
          />
        ) : (
          <Workspace
            session={session}
            now={now}
            onCommit={handleCommit}
            finish={() => setSession((prev) => (prev ? { ...prev, finished: true } : prev))}
            retry={retry}
            newSession={newSession}
            download={download}
            notice={notice}
          />
        )}
      </div>
    </div>
  );
}

type SetupProps = {
  pack: string;
  setPack: (p: string) => void;
  promptMode: "random" | "custom" | "blank";
  setPromptMode: (m: "random" | "custom" | "blank") => void;
  customPrompt: string;
  setCustomPrompt: (p: string) => void;
  duration: number | null;
  setDuration: (n: number | null) => void;
  start: () => void;
  notice: string;
};

function Setup({ pack, setPack, promptMode, setPromptMode, customPrompt, setCustomPrompt, duration, setDuration, start, notice }: SetupProps) {
  return (
    <main className="rise pt-10 sm:pt-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:items-start">
        <div>
          <p className="eyebrow text-mint">your own corner of the riot</p>
          <h1 className="display mt-3 text-[clamp(3.5rem,8vw,7rem)] leading-[0.89]">
            PRACTICE<br/><span className="text-sun">MAKES</span><br/>A MESS.
          </h1>
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-paper/65">
            Just you and a blank page. Pick a prompt or go completely off-script. Race the clock,
            or switch it off and draw for as long as you like — same pens, colors and tools as the party game.
          </p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            {[
              ["01", "Pick a challenge", "Or bring your own idea."],
              ["02", "Set the clock", "Or take it easy, no timer."],
              ["03", "Keep your art", "Download a full-size PNG."],
            ].map(([n, title, body], i) => (
              <div key={n} className="rounded-2xl border-2 border-paper/20 bg-white/[0.05] p-3">
                <span className={`font-mono text-xs font-bold ${i === 1 ? "text-flame" : "text-sun"}`}>{n} /</span>
                <p className="display mt-2 text-[17px]">{title}</p>
                <p className="mt-1 text-xs text-paper/50">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 inline-block rotate-[-2deg] rounded-xl border-[3px] border-ink bg-flame px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-white shadow-[5px_5px_0_0_var(--color-sun)]">No lobby. No voting. Just drawing.</div>
        </div>

        <div className="relative rounded-[26px] border-[3px] border-ink bg-paper p-5 text-ink shadow-[9px_9px_0_0_var(--color-flame)] sm:p-7">
          <div className="hatch pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-[24px] opacity-25" />
          <p className="relative eyebrow text-flame">set up a session</p>
          <h2 className="relative display mt-2 text-3xl sm:text-4xl">What are we drawing?</h2>

          <div className="relative mt-6">
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink/55">Your canvas</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["random", "🎲", "Surprise me"],
                ["custom", "✏️", "My prompt"],
                ["blank", "◻", "Blank page"],
              ] as const).map(([value, icon, label]) => (
                <button key={value} type="button" onClick={() => setPromptMode(value)} className={`rounded-xl border-[3px] px-2 py-3 text-center transition-all ${promptMode === value ? "border-ink bg-sun shadow-[3px_3px_0_0_var(--color-ink)]" : "border-ink/20 bg-white hover:border-ink"}`}>
                  <span className="block text-lg leading-none">{icon}</span>
                  <span className="mt-1.5 block font-mono text-[10px] font-bold uppercase leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {promptMode === "random" && (
            <div className="mt-5">
              <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink/55">Prompt pack</p>
              <div className="grid grid-cols-2 gap-2">
                {PROMPT_PACKS.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPack(p.id)} className={`flex items-center gap-2 rounded-xl border-[3px] p-2.5 text-left transition-all ${pack === p.id ? "border-ink bg-mint shadow-[3px_3px_0_0_var(--color-ink)]" : "border-ink/20 bg-white hover:border-ink"}`}>
                    <span className="text-xl">{p.emoji}</span>
                    <span className="font-display text-sm font-extrabold leading-tight">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {promptMode === "custom" && (
            <div className="mt-5">
              <label htmlFor="solo-prompt" className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink/55">Your prompt</label>
              <input id="solo-prompt" value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} maxLength={120} placeholder="A penguin running a bakery…" className="field w-full text-sm" />
            </div>
          )}
          {promptMode === "blank" && <p className="mt-5 rounded-xl border-2 border-dashed border-ink/30 p-3 text-sm text-ink/60">No prompt. No rules. Draw whatever you feel like.</p>}

          <div className="mt-6 border-t-2 border-dashed border-ink/25 pt-5">
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink/55">The clock</p>
            <div className="flex flex-wrap gap-2">
              {TIMER_OPTIONS.map((s) => (
                <button key={s ?? "off"} type="button" onClick={() => setDuration(s)} className={`rounded-lg border-[3px] px-3 py-2 font-mono text-xs font-bold transition-all ${duration === s ? "border-ink bg-cobalt text-white shadow-[3px_3px_0_0_var(--color-ink)]" : "border-ink/20 bg-white text-ink hover:border-ink"}`}>
                  {s === null ? "∞ No timer" : `${s}s`}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink/55">{duration === null ? "Your canvas stays open until you finish it." : "The canvas locks when the countdown reaches zero. The timer keeps running if you refresh."}</p>
          </div>

          {notice && <p role="alert" className="mt-4 rounded-lg border-2 border-flame bg-flame/10 p-2 font-mono text-xs font-bold text-flame">{notice}</p>}
          <Btn tone="flame" size="lg" className="mt-6 w-full text-sm" onClick={start}>Let's draw →</Btn>
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wider text-ink/45">No sign-up · saved in this browser</p>
        </div>
      </div>
    </main>
  );
}

type WorkspaceProps = {
  session: PracticeSession;
  now: number;
  onCommit: (strokes: Stroke[]) => void;
  finish: () => void;
  retry: () => void;
  newSession: () => void;
  download: () => void;
  notice: string;
};

function Workspace({ session, now, onCommit, finish, retry, newSession, download, notice }: WorkspaceProps) {
  const left = session.endsAt === null ? null : Math.max(0, session.endsAt - now);
  const elapsed = Math.max(0, now - session.startedAt);
  const timedOut = Boolean(session.endsAt && now >= session.endsAt);
  const percent = left !== null && session.duration ? Math.max(0, Math.min(100, (left / (session.duration * 1000)) * 100)) : 100;

  return (
    <main className="rise pt-7 sm:pt-10">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="mint" className="border-ink">solo practice</Chip>
        <Chip tone={session.finished ? "sun" : left !== null && left < 10_000 ? "flame" : "cobalt"} className="border-ink">
          {session.finished ? "session finished" : left === null ? "∞ no timer" : `${formatClock(left)} remaining`}
        </Chip>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-paper/50">{session.finished ? "sketch saved in browser" : "drawing saved as you go"}</span>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-[22px] border-[3px] border-ink bg-sun px-5 py-4 text-ink shadow-[6px_6px_0_0_var(--color-ink)]">
            <div className="hatch pointer-events-none absolute inset-0 opacity-30" />
            <p className="relative font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink/55">{session.prompt ? "your drawing prompt" : "free draw"}</p>
            <h1 className="relative display mt-1 text-[clamp(1.6rem,4vw,3rem)]">{session.prompt || "Your canvas. Your rules."}</h1>
          </div>
          {left !== null && !session.finished && (
            <div className="h-2.5 overflow-hidden rounded-full border-2 border-paper/20 bg-white/10"><div className={`h-full rounded-full transition-[width] duration-200 ${left < 10_000 ? "bg-flame" : "bg-mint"}`} style={{ width: `${percent}%` }} /></div>
          )}
          {session.finished ? (
            <div className="overflow-hidden rounded-[22px] border-[3px] border-ink bg-white p-2.5 shadow-[6px_6px_0_0_var(--color-ink)]">
              <DrawingView key={session.id} strokes={session.strokes} animate duration={1900} className="block w-full rounded-xl bg-white" />
            </div>
          ) : (
            <SketchPad key={session.id} initialStrokes={session.strokes} onCommit={onCommit} />
          )}
          {session.finished && <p className="font-mono text-xs uppercase tracking-wider text-paper/55">Pencils down. Your drawing is saved here — download it, try again, or start a new challenge.</p>}
          {notice && <p role="alert" className="rounded-lg border-2 border-flame bg-flame/10 p-2 font-mono text-xs text-flame">{notice}</p>}
          <div className="flex flex-wrap gap-2.5 pb-6">
            {!session.finished && <Btn tone="mint" size="md" onClick={finish}>Finish drawing ✓</Btn>}
            <Btn tone="sun" size="md" onClick={download} disabled={session.strokes.length === 0}>↓ Download PNG</Btn>
            {session.finished && <Btn tone="cobalt" size="md" onClick={retry}>Try again</Btn>}
            <Btn tone="paper" size="md" onClick={newSession}>New challenge →</Btn>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[22px] border-2 border-paper/20 bg-white/[0.05] p-4">
            <p className="eyebrow text-paper/50">your clock</p>
            <p className={`display mt-3 text-5xl ${session.finished ? "text-sun" : left !== null && left < 10_000 ? "text-flame" : "text-paper"}`} aria-live="off">
              {left === null ? formatClock(elapsed) : formatClock(left)}
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-paper/50">
              {session.finished ? timedOut ? "time's up · pencils down" : "finished on your terms" : left === null ? "elapsed · no deadline" : "until pencils down"}
            </p>
            {session.duration !== null && <p className="mt-3 border-t border-paper/15 pt-3 text-xs leading-relaxed text-paper/55">{session.finished ? "Want another shot? Try again with the same prompt and a fresh timer." : "The clock keeps ticking even if you leave this tab. Finish early whenever you like."}</p>}
          </div>
          <div className="rounded-[22px] border-2 border-paper/20 bg-white/[0.05] p-4">
            <p className="eyebrow text-paper/50">your toolkit</p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-paper/70">
              <li><span className="text-sun">✳</span> Eight preset inks + a color picker for any shade.</li>
              <li><span className="text-sun">✳</span> Four pen sizes from fine lines to big shapes.</li>
              <li><span className="text-sun">✳</span> Erase, undo, redo, and clear. Ctrl/⌘ + Z works too.</li>
              <li><span className="text-sun">✳</span> Your drawing stays here after a refresh.</li>
            </ul>
          </div>
          <div className="rotate-[1deg] rounded-[22px] border-[3px] border-ink bg-flame p-4 text-white shadow-[4px_4px_0_0_var(--color-sun)]">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/70">good to know</p>
            <p className="display mt-2 text-xl">No audience. No pressure.</p>
            <p className="mt-2 text-xs leading-relaxed text-white/85">Download your masterpiece before starting another. Each new session replaces the last sketch stored in this browser.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
