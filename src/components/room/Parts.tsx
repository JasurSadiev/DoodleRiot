"use client";

import type { Game } from "@/lib/useLobby";
import { Avatar } from "@/components/ui/Bits";
import { PLAYER_COLORS } from "@/lib/game";

export function Panel({
  children,
  className = "",
  tilt = 0,
}: {
  children: React.ReactNode;
  className?: string;
  tilt?: number;
}) {
  return (
    <section
      className={`rounded-[22px] border-2 border-paper/15 bg-white/[0.045] p-4 backdrop-blur-[2px] ${className}`}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      {children}
    </section>
  );
}

export function SectionLabel({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-paper/50">
        {children}
      </h3>
      <span className="h-px flex-1 bg-gradient-to-r from-paper/25 to-transparent" />
      {right}
    </div>
  );
}

export function PromptCard({
  prompt,
  kicker,
  compact = false,
}: {
  prompt: string;
  kicker: string;
  compact?: boolean;
}) {
  return (
    <div className="relative">
      <div className="absolute -inset-1 rounded-[26px] bg-flame/20 blur-xl" aria-hidden />
      <div className="relative overflow-hidden rounded-[22px] border-[3px] border-ink bg-sun px-5 py-4 text-ink shadow-[7px_7px_0_0_rgba(23,19,15,0.85)]">
        <div className="hatch pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <p className="relative font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-ink/60">
          {kicker}
        </p>
        <p
          className={`relative display mt-1 ${
            compact ? "text-[clamp(1.2rem,3vw,1.9rem)]" : "text-[clamp(1.7rem,5.2vw,3.4rem)]"
          }`}
        >
          {prompt}
        </p>
      </div>
    </div>
  );
}

export function Roster({ game, showKick = false }: { game: Game; showKick?: boolean }) {
  const state = game.state;
  if (!state) return null;
  const isHost = Boolean(state.you?.isHost);

  return (
    <ul className="space-y-1.5">
      {state.players.map((p) => {
        const flag =
          state.status === "drawing"
            ? p.submitted
              ? { text: "in", tone: "bg-mint text-ink" }
              : { text: "drawing", tone: "bg-white/10 text-paper/60" }
            : state.status === "voting"
              ? p.voted
                ? { text: "voted", tone: "bg-mint text-ink" }
                : { text: "deciding", tone: "bg-white/10 text-paper/60" }
              : null;
        return (
          <li
            key={p.id}
            className={`group flex items-center gap-2.5 rounded-xl border-2 px-2.5 py-2 transition-colors ${
              p.isYou
                ? "border-sun/70 bg-sun/15"
                : "border-transparent bg-white/[0.04] hover:border-paper/20"
            }`}
          >
            <span className="relative">
              <Avatar name={p.name} color={p.color} size={34} dim={!p.online} />
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-night ${
                  p.online ? "bg-mint" : "bg-paper/25"
                }`}
                title={p.online ? "online" : "idle"}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate font-display text-[15px] font-extrabold text-paper">
                  {p.name}
                </span>
                {p.isHost && (
                  <span className="rounded border-2 border-ink bg-flame px-1 font-mono text-[8px] font-bold uppercase text-white">
                    host
                  </span>
                )}
                {p.isYou && (
                  <span className="font-mono text-[9px] uppercase tracking-widest text-sun">you</span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-paper/45">
                  {p.score} pt{p.score === 1 ? "" : "s"}
                </span>
                {flag && (
                  <span
                    className={`rounded px-1.5 font-mono text-[9px] font-bold uppercase tracking-widest ${flag.tone}`}
                  >
                    {flag.text}
                  </span>
                )}
              </span>
            </span>
            {showKick && isHost && !p.isYou && (
              <button
                type="button"
                onClick={() => void game.act("kick", { playerId: p.id })}
                className="rounded-lg border-2 border-transparent px-2 py-1 font-mono text-[9px] font-bold uppercase text-paper/30 opacity-0 transition-all hover:border-flame hover:text-flame group-hover:opacity-100"
                title={`Remove ${p.name}`}
              >
                kick
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function Scoreboard({ game }: { game: Game }) {
  const state = game.state;
  if (!state) return null;
  const max = Math.max(1, ...state.totals.map((t) => t.score));
  return (
    <ol className="space-y-1.5">
      {state.totals.map((t, i) => (
        <li key={t.playerId} className="flex items-center gap-2.5">
          <span className="w-5 font-mono text-xs font-bold text-paper/40">{i + 1}</span>
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-ink"
            style={{ background: PLAYER_COLORS[t.color % PLAYER_COLORS.length] }}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-sm font-extrabold text-paper">
              {t.name}
            </span>
            <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-flame to-sun transition-[width] duration-700 ease-out"
                style={{ width: `${(t.score / max) * 100}%` }}
              />
            </span>
          </span>
          <span className="font-mono text-sm font-bold text-sun">{t.score}</span>
        </li>
      ))}
    </ol>
  );
}

export function Stepper({
  label,
  value,
  options,
  onChange,
  suffix = "s",
  readOnly = false,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (v: number) => void;
  suffix?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            disabled={readOnly}
            onClick={() => onChange(o)}
            className={`rounded-lg border-2 px-2.5 py-1.5 font-mono text-[11px] font-bold transition-all disabled:cursor-default ${
              value === o
                ? "border-sun bg-sun text-ink"
                : "border-paper/25 bg-white/5 text-paper/70 hover:border-paper/60 hover:text-paper"
            }`}
          >
            {o}
            {suffix}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProgressDots({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">{label}</span>
        <span className="font-mono text-xs font-bold text-paper">
          {done}/{total}
        </span>
      </div>
      <span className="block h-2.5 w-full overflow-hidden rounded-full border-2 border-ink/40 bg-white/10">
        <span
          className="block h-full rounded-full bg-mint transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}


