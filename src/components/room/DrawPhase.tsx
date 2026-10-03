"use client";

import { useRef, useState } from "react";
import type { Game } from "@/lib/useLobby";
import type { Stroke } from "@/lib/types";
import { Btn, Chip, useCountdown } from "@/components/ui/Bits";
import { Panel, ProgressDots, PromptCard, SectionLabel } from "@/components/room/Parts";
import { SketchPad } from "@/components/SketchPad";
import { formatClock } from "@/lib/game";

export function DrawPhase({ game }: { game: Game }) {
  const state = game.state!;
  const mine = state.drawings.find((d) => d.isYours) ?? null;
  const strokesRef = useRef<Stroke[]>(mine?.strokes ?? []);
  const [submitted, setSubmitted] = useState(Boolean(mine));
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const left = useCountdown(state.phaseEndsAt, state.serverNow);
  const total = state.settings.drawSeconds * 1000;
  const pct = total > 0 ? Math.max(0, Math.min(100, (left / total) * 100)) : 0;
  const urgent = left <= 10_000;

  const submit = async () => {
    if (strokesRef.current.length === 0) {
      game.notify("Draw something first — blank canvases cannot win votes.", "error");
      return;
    }
    const ok = await game.act("submit", { strokes: strokesRef.current });
    if (ok) {
      setSubmitted(true);
      setLastSaved(Date.now());
      game.notify("Locked in. Waiting for the rest of the table.", "info");
    }
  };

  return (
    <div className="space-y-5">
      <div className="rise">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="flame" className="border-ink">
            round {state.round} · drawing
          </Chip>
          <Chip tone="ink" className="border-paper/30 bg-white/10 text-paper">
            {formatClock(left)} left
          </Chip>
          {submitted && (
            <Chip tone="mint" className="border-ink pop">
              submitted ✓
            </Chip>
          )}
          {urgent && (
            <Chip tone="sun" className="border-ink shake">
              hurry up
            </Chip>
          )}
        </div>
        <div className="mt-3">
          <PromptCard prompt={state.prompt ?? "Draw something wild"} kicker="Draw this · nobody sees it until voting" />
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full border-2 border-paper/20 bg-white/10">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ease-linear ${
              urgent ? "bg-flame" : "bg-gradient-to-r from-mint via-sun to-flame"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <SketchPad
            key={`round-${state.round}`}
            initialStrokes={mine?.strokes ?? []}
            disabled={false}
            onCommit={(s) => {
              strokesRef.current = s;
              if (submitted) setSubmitted(false);
            }}
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Btn
              tone={submitted ? "mint" : "flame"}
              size="lg"
              className="text-sm"
              disabled={game.pending === "submit"}
              onClick={() => void submit()}
            >
              {game.pending === "submit"
                ? "Handing it in…"
                : submitted
                  ? "Update my drawing"
                  : "Submit drawing"}
            </Btn>
            <p className="max-w-xs text-[12px] leading-snug text-paper/55">
              {submitted
                ? `In the pile since ${new Date(lastSaved).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}. Keep going and submit again to replace it.`
                : "Submissions close automatically when the timer hits zero — then voting starts."}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Panel>
            <SectionLabel
              right={
                <span className="font-mono text-[10px] uppercase tracking-widest text-paper/40">
                  live
                </span>
              }
            >
              The table
            </SectionLabel>
            <ProgressDots
              done={state.submittedCount}
              total={Math.max(state.playerCount, state.submittedCount)}
              label="handed in"
            />
            <p className="mt-3 text-[12px] leading-relaxed text-paper/55">
              If everybody submits early, voting opens immediately. Otherwise it opens the second
              the clock runs out.
            </p>
          </Panel>

          <Panel className="bg-white/[0.07]">
            <SectionLabel>Artist tips</SectionLabel>
            <ul className="space-y-2 text-[12.5px] leading-snug text-paper/70">
              {[
                "Big shapes first, details later — you have seconds, not minutes.",
                "Use the ink pen for outlines, then block colour with XL.",
                "One obvious feature sells the joke. Lean into it.",
                "Judges are anonymous, but you always know which one is yours.",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-sun" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
