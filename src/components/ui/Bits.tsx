"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PLAYER_COLORS, formatClock } from "@/lib/game";

/* ------------------------------------------------------------------ buttons */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "flame" | "cobalt" | "sun" | "mint" | "ink" | "paper";
  size?: "sm" | "md" | "lg";
};

const TONES: Record<string, string> = {
  flame: "bg-flame text-white",
  cobalt: "bg-cobalt text-white",
  sun: "bg-sun text-ink",
  mint: "bg-mint text-ink",
  ink: "bg-ink text-paper",
  paper: "bg-paper text-ink",
};

const SIZES: Record<string, string> = {
  sm: "px-3 py-2 text-[11px] rounded-lg",
  md: "px-4 py-3 text-xs rounded-xl",
  lg: "px-6 py-4 text-sm rounded-2xl",
};

export function Btn({ tone = "flame", size = "md", className = "", ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={`press inline-flex items-center justify-center gap-2 border-[3px] border-ink font-mono font-bold uppercase tracking-[0.12em] shadow-[4px_4px_0_0_var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:transform-none ${TONES[tone]} ${SIZES[size]} ${className}`}
    />
  );
}

/* ------------------------------------------------------------------- chips */

export function Chip({
  children,
  tone = "paper",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "paper" | "ink" | "flame" | "sun" | "mint" | "cobalt";
  className?: string;
}) {
  const tones: Record<string, string> = {
    paper: "bg-paper text-ink",
    ink: "bg-ink text-paper",
    flame: "bg-flame text-white",
    sun: "bg-sun text-ink",
    mint: "bg-mint text-ink",
    cobalt: "bg-cobalt text-white",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ avatars */

export function Avatar({
  name,
  color,
  size = 40,
  ring = false,
  dim = false,
}: {
  name: string;
  color: number;
  size?: number;
  ring?: boolean;
  dim?: boolean;
}) {
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
  }, [name]);
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border-[3px] border-ink font-display font-extrabold text-ink transition-opacity ${
        ring ? "ring-[3px] ring-sun ring-offset-2 ring-offset-night" : ""
      } ${dim ? "opacity-35 grayscale" : ""}`}
      style={{
        width: size,
        height: size,
        background: PLAYER_COLORS[color % PLAYER_COLORS.length],
        fontSize: size * 0.38,
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/* --------------------------------------------------------------- timer ring */

export function TimerRing({
  endsAt,
  serverNow,
  totalMs,
  label,
  onExpire,
}: {
  endsAt: number | null;
  serverNow: number;
  totalMs: number;
  label: string;
  onExpire?: () => void;
}) {
  const offsetRef = useRef(serverNow - Date.now());
  offsetRef.current = serverNow - Date.now();
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;
  const [left, setLeft] = useState(() => (endsAt ? endsAt - (Date.now() + offsetRef.current) : 0));
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
    setLeft(endsAt ? endsAt - (Date.now() + offsetRef.current) : 0);
  }, [endsAt]);

  useEffect(() => {
    if (!endsAt) return;
    const id = window.setInterval(() => {
      const next = endsAt - (Date.now() + offsetRef.current);
      setLeft(next);
      if (next <= 0 && !fired.current) {
        fired.current = true;
        expireRef.current?.();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [endsAt]);

  const remaining = Math.max(0, left);
  const progress = totalMs > 0 ? Math.min(1, Math.max(0, remaining / totalMs)) : 0;
  const danger = remaining <= 10_000 && remaining > 0;
  const r = 26;
  const c = 2 * Math.PI * r;

  return (
    <div className={`flex items-center gap-2.5 ${danger ? "shake" : ""}`}>
      <div className="relative h-[62px] w-[62px] shrink-0">
        <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,247,232,0.18)" strokeWidth="7" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={danger ? "#FF4B2B" : "#FFC531"}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - progress)}
            style={{ transition: "stroke-dashoffset 200ms linear, stroke 200ms ease" }}
          />
        </svg>
        <span
          className={`absolute inset-0 grid place-items-center font-mono text-sm font-bold ${
            danger ? "text-flame" : "text-paper"
          }`}
        >
          {endsAt ? formatClock(remaining) : "—"}
        </span>
      </div>
      <span className="font-mono text-[10px] uppercase leading-tight tracking-[0.18em] text-paper/60">
        {label}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- copy code */

export function CopyCode({ code, tone = "dark" }: { code: string; tone?: "dark" | "light" }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}/play/${code}`;

  const copy = async (what: "code" | "link") => {
    const text = what === "code" ? code : shareUrl;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(what);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const isDark = tone === "dark";
  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-2xl border-[3px] p-2.5 ${
        isDark ? "border-paper/25 bg-white/5" : "border-ink bg-paper shadow-[4px_4px_0_0_var(--color-ink)]"
      }`}
    >
      <div className="pl-1">
        <p className={`font-mono text-[9px] uppercase tracking-[0.2em] ${isDark ? "text-paper/50" : "text-ink/50"}`}>
          Lobby code
        </p>
        <p
          className={`font-mono text-2xl font-bold leading-none tracking-[0.18em] ${
            isDark ? "text-sun" : "text-ink"
          }`}
        >
          {code}
        </p>
      </div>
      <div className="ml-auto flex gap-1.5">
        <button
          type="button"
          onClick={() => copy("code")}
          className={`press rounded-lg border-2 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase ${
            isDark
              ? "border-paper/30 bg-paper text-ink hover:bg-sun"
              : "border-ink bg-white text-ink hover:bg-sun"
          }`}
        >
          {copied === "code" ? "Copied!" : "Code"}
        </button>
        <button
          type="button"
          onClick={() => copy("link")}
          className={`press rounded-lg border-2 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase ${
            isDark ? "border-sun bg-sun text-ink" : "border-ink bg-ink text-paper hover:bg-cobalt"
          }`}
        >
          {copied === "link" ? "Copied!" : "Link"}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- confetti */

export function Confetti({ pieces = 70 }: { pieces?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        dx: `${Math.round((Math.random() - 0.5) * 220)}px`,
        dur: `${2.2 + Math.random() * 2.4}s`,
        delay: `${Math.random() * 2.5}s`,
        spin: `${Math.round(360 + Math.random() * 900)}deg`,
        bg: PLAYER_COLORS[i % PLAYER_COLORS.length],
        round: Math.random() > 0.6,
      })),
    [pieces],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {bits.map((b) => (
        <span
          key={b.id}
          className="confetti-bit"
          style={
            {
              left: `${b.left}%`,
              background: b.bg,
              borderRadius: b.round ? "999px" : "2px",
              "--dx": b.dx,
              "--dur": b.dur,
              "--delay": b.delay,
              "--spin": b.spin,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ toast */

export function Toast({ message, kind }: { message: string; kind: "error" | "info" }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4">
      <div
        className={`pop max-w-md rounded-2xl border-[3px] border-ink px-4 py-3 text-center font-mono text-xs font-bold uppercase tracking-wide shadow-[5px_5px_0_0_var(--color-ink)] ${
          kind === "error" ? "bg-flame text-white" : "bg-sun text-ink"
        }`}
      >
        {message}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- live clock */

export function useCountdown(endsAt: number | null, serverNow: number) {
  const offsetRef = useRef(serverNow - Date.now());
  offsetRef.current = serverNow - Date.now();
  const [left, setLeft] = useState(() =>
    endsAt ? Math.max(0, endsAt - (Date.now() + offsetRef.current)) : 0,
  );
  useEffect(() => {
    if (!endsAt) {
      setLeft(0);
      return;
    }
    setLeft(Math.max(0, endsAt - (Date.now() + offsetRef.current)));
    const id = window.setInterval(
      () => setLeft(Math.max(0, endsAt - (Date.now() + offsetRef.current))),
      250,
    );
    return () => window.clearInterval(id);
  }, [endsAt]);
  return left;
}
