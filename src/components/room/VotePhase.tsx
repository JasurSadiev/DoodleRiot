"use client";

import type { Game } from "@/lib/useLobby";
import { Btn, Chip, useCountdown } from "@/components/ui/Bits";
import { DrawingView } from "@/components/DrawingView";
import { Panel, ProgressDots, PromptCard, SectionLabel } from "@/components/room/Parts";
import { formatClock } from "@/lib/game";

export function VotePhase({ game }: { game: Game }) {
  const state = game.state!;
  const left = useCountdown(state.phaseEndsAt, state.serverNow);
  const entries = [...state.drawings].sort((a, b) => a.displayOrder - b.displayOrder);
  const others = entries.filter((d) => !d.isYours);
  const voted = entries.find((d) => d.myVote) ?? null;
  const urgent = left <= 8_000;

  return (
    <div className="space-y-5">
      <div className="rise">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="cobalt" className="border-ink">
            round {state.round} · voting
          </Chip>
          <Chip tone={urgent ? "flame" : "ink"} className={`border-ink ${urgent ? "shake" : "border-paper/30 bg-white/10 text-paper"}`}>
            {formatClock(left)} left
          </Chip>
          <Chip tone={voted ? "mint" : "sun"} className="border-ink">
            {voted ? "ballot cast ✓" : "no vote yet"}
          </Chip>
        </div>

        <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <PromptCard
            compact
            prompt={state.prompt ?? "Draw something wild"}
            kicker="Judge these on the prompt above"
          />
          <div className="rounded-[22px] border-[3px] border-ink bg-flame p-4 text-white shadow-[6px_6px_0_0_rgba(23,19,15,0.85)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/70">
              the one rule
            </p>
            <p className="display mt-1 text-[clamp(1.1rem,2.6vw,1.7rem)] leading-[0.95]">
              Your own drawing is locked out of your ballot.
            </p>
            <p className="mt-2 text-[12px] leading-snug text-white/80">
              Names are hidden while voting. Tap a card to vote, tap again to take it back.
            </p>
          </div>
        </div>
      </div>

      {entries.length === 0 && (
        <Panel>
          <p className="display text-2xl text-paper">Nobody handed anything in.</p>
          <p className="mt-2 text-sm text-paper/60">
            The round collapsed. The host can start another from the lobby.
          </p>
        </Panel>
      )}

      <div
        className={`grid gap-4 ${
          entries.length === 1
            ? "sm:grid-cols-1"
            : entries.length === 2
              ? "sm:grid-cols-2"
              : "sm:grid-cols-2 xl:grid-cols-3"
        }`}
      >
        {entries.map((d, i) => {
          const isYours = d.isYours;
          return (
            <button
              key={d.id}
              type="button"
              disabled={isYours || game.pending === "vote"}
              onClick={() => void game.act("vote", { drawingId: d.id })}
              className={`pop group relative block overflow-hidden rounded-[22px] border-[3px] p-2.5 text-left transition-all duration-200 disabled:cursor-not-allowed ${
                isYours
                  ? "border-paper/25 bg-white/[0.03] opacity-80"
                  : d.myVote
                    ? "-translate-y-1 border-sun bg-sun/15 shadow-[0_0_0_4px_rgba(255,197,49,0.25)]"
                    : "border-paper/25 bg-white/[0.05] hover:-translate-y-1.5 hover:border-flame hover:shadow-[0_14px_30px_rgba(255,75,43,0.25)]"
              }`}
              style={{ animationDelay: `${i * 55}ms` }}
            >
              <span className="relative block overflow-hidden rounded-[14px] border-2 border-ink bg-white">
                <DrawingView
                  strokes={d.strokes}
                  animate
                  duration={900 + i * 120}
                  className="block w-full"
                />
                {isYours && (
                  <span className="hatch absolute inset-0 grid place-items-center bg-ink/45">
                    <span className="display rotate-[-6deg] rounded-xl border-[3px] border-ink bg-paper px-3 py-1.5 text-xl text-ink shadow-[4px_4px_0_0_var(--color-ink)]">
                      YOURS
                    </span>
                  </span>
                )}
                {d.myVote && !isYours && (
                  <span className="absolute right-2 top-2 rotate-[8deg] rounded-lg border-[3px] border-ink bg-sun px-2 py-1 font-mono text-[10px] font-bold uppercase text-ink shadow-[3px_3px_0_0_var(--color-ink)]">
                    your vote
                  </span>
                )}
              </span>

              <span className="mt-2.5 flex items-center gap-2 px-1 pb-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/45">
                  entry {String(i + 1).padStart(2, "0")}
                </span>
                <span className="ml-auto">
                  {isYours ? (
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-paper/40">
                      can't vote for this
                    </span>
                  ) : d.myVote ? (
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-sun">
                      tap to undo
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-flame transition-transform duration-200 group-hover:translate-x-0.5">
                      vote →
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Panel className="bg-white/[0.07]">
          <SectionLabel>Ballot box</SectionLabel>
          <ProgressDots
            done={state.votedCount}
            total={Math.max(state.playerCount, state.votedCount)}
            label="have voted"
          />
          <p className="mt-3 text-[12px] leading-relaxed text-paper/55">
            Tallies stay hidden until the reveal, so nobody pile-ons. When the clock hits zero the
            ballots are counted automatically.
          </p>
          <div className="mt-3">
            <Btn
              tone={voted ? "paper" : "sun"}
              size="sm"
              disabled={!voted}
              onClick={() => voted && void game.act("vote", { drawingId: voted.id })}
            >
              {voted ? "Withdraw vote" : "Pick a drawing above"}
            </Btn>
          </div>
        </Panel>

        <Panel>
          <SectionLabel>Who has voted</SectionLabel>
          <ul className="flex flex-wrap gap-2">
            {state.players.map((p) => (
              <li
                key={p.id}
                className={`flex items-center gap-2 rounded-full border-2 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wide transition-colors ${
                  p.voted
                    ? "border-mint bg-mint/15 text-mint"
                    : "border-paper/20 bg-white/5 text-paper/45"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${p.voted ? "bg-mint" : "bg-paper/30"}`} />
                {p.name}
                {p.isYou && <span className="text-sun">(you)</span>}
              </li>
            ))}
          </ul>
          {others.length === 0 && (
            <p className="mt-3 rounded-xl border-2 border-flame/50 bg-flame/10 p-3 text-[12.5px] leading-relaxed text-paper/80">
              You're the only one who handed a drawing in, so there's nothing on your ballot. Wait
              for friends to join before the next round.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
