"use client";

import type { Game } from "@/lib/useLobby";
import { Avatar, Btn, Chip, Confetti } from "@/components/ui/Bits";
import { DrawingView } from "@/components/DrawingView";
import { Panel, Scoreboard, SectionLabel } from "@/components/room/Parts";

export function ResultsPhase({ game }: { game: Game }) {
  const state = game.state!;
  const ranked = [...state.drawings].sort(
    (a, b) => b.voteCount - a.voteCount || a.displayOrder - b.displayOrder,
  );
  const top = ranked[0] ?? null;
  const topVotes = top?.voteCount ?? 0;
  const winners = ranked.filter((d) => d.voteCount === topVotes && topVotes > 0);
  const isHost = Boolean(state.you?.isHost);
  const iWon = winners.some((w) => w.isYours);

  return (
    <div className="space-y-5">
      {winners.length > 0 && <Confetti pieces={iWon ? 110 : 60} />}

      <header className="rise">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="sun" className="border-ink">
            round {state.round} · reveal
          </Chip>
          <Chip tone="ink" className="border-paper/30 bg-white/10 text-paper">
            {state.settings.promptPack}
          </Chip>
        </div>
        <h2 className="display mt-3 text-[clamp(2rem,6vw,4.2rem)] text-paper">
          {winners.length === 0
            ? "Nobody voted."
            : winners.length > 1
              ? `A tie. ${winners.length} winners.`
              : `${winners[0].authorName || "Someone"} takes it.`}
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-paper/65">
          Prompt: <span className="font-semibold text-sun">{state.prompt}</span>. Each vote is one
          point, and the round winner banks +{state.winnerBonus}. Nobody could vote for their own
          work, so these numbers are honest.
        </p>
      </header>

      {top && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="pop relative overflow-hidden rounded-[26px] border-[3px] border-ink bg-white p-3 shadow-[10px_10px_0_0_rgba(255,197,49,0.9)]">
            <span className="absolute left-5 top-5 z-10 rotate-[-8deg] rounded-xl border-[3px] border-ink bg-sun px-3 py-1.5 font-mono text-xs font-bold uppercase text-ink shadow-[3px_3px_0_0_var(--color-ink)]">
              ★ people's choice
            </span>
            <DrawingView strokes={top.strokes} className="block w-full rounded-[14px]" />
            <div className="mt-3 flex items-center gap-3 px-1 pb-1">
              <Avatar name={top.authorName || "?"} color={top.authorColor} size={40} />
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-extrabold text-ink">
                  {top.authorName || "Anonymous"}
                  {top.isYours && <span className="ml-2 font-mono text-[11px] uppercase text-flame">you</span>}
                </p>
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink/55">
                  {top.voteCount} vote{top.voteCount === 1 ? "" : "s"}
                  {top.voteCount > 0 && ` · +${top.voteCount + state.winnerBonus} pts`}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Panel className="bg-white/[0.07]">
              <SectionLabel>Round {state.round} breakdown</SectionLabel>
              <ol className="space-y-2">
                {ranked.map((d, i) => {
                  const pct = topVotes > 0 ? (d.voteCount / topVotes) * 100 : 0;
                  return (
                    <li
                      key={d.id}
                      className={`rounded-xl border-2 p-2.5 transition-colors ${
                        i === 0 && d.voteCount > 0
                          ? "border-sun/70 bg-sun/10"
                          : "border-paper/12 bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 font-mono text-xs font-bold text-paper/40">{i + 1}</span>
                        <Avatar name={d.authorName || "?"} color={d.authorColor} size={26} />
                        <span className="min-w-0 flex-1 truncate font-display text-[15px] font-extrabold text-paper">
                          {d.authorName || "Anonymous"}
                          {d.isYours && <span className="ml-1.5 font-mono text-[10px] uppercase text-sun">you</span>}
                        </span>
                        <span className="font-mono text-sm font-bold text-flame">{d.voteCount}</span>
                      </div>
                      <span className="mt-2 block h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-flame to-sun transition-[width] duration-700 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      {d.voters.length > 0 && (
                        <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-widest text-paper/40">
                          voted by {d.voters.join(", ")}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Panel>

            <Panel>
              <SectionLabel
                right={
                  <span className="font-mono text-[10px] uppercase tracking-widest text-paper/40">
                    total
                  </span>
                }
              >
                Scoreboard
              </SectionLabel>
              <Scoreboard game={game} />
            </Panel>
          </div>
        </div>
      )}

      {ranked.length > 1 && (
        <div>
          <SectionLabel>Every entry from round {state.round}</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {ranked.map((d, i) => (
              <figure
                key={d.id}
                className="pop overflow-hidden rounded-[18px] border-[3px] border-ink bg-white p-2 shadow-[5px_5px_0_0_rgba(23,19,15,0.9)] transition-transform duration-200 hover:-translate-y-1.5"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <DrawingView strokes={d.strokes} className="block w-full rounded-[10px]" />
                <figcaption className="mt-2 flex items-center gap-2 px-0.5 pb-0.5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border-2 border-ink"
                    style={{ background: `hsl(${(d.authorColor * 47) % 360} 90% 60%)` }}
                  />
                  <span className="min-w-0 flex-1 truncate font-display text-[13px] font-extrabold text-ink">
                    {d.authorName || "Anonymous"}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-flame">
                    {d.voteCount}♥
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      <div className="sticky bottom-4 z-30 flex flex-wrap items-center gap-3 rounded-[22px] border-2 border-paper/20 bg-night/90 p-3 backdrop-blur">
        <Btn
          tone="flame"
          size="lg"
          className="flex-1 text-sm sm:flex-none"
          disabled={game.pending === "next"}
          onClick={() => void game.act("next")}
        >
          {game.pending === "next" ? "Sharpening pencils…" : `Start round ${state.round + 1}`}
        </Btn>
        <p className="text-[12px] leading-snug text-paper/55">
          {isHost
            ? "You're the host — anyone at the table can also push this button."
            : "Anyone can kick off the next round; no need to wait for the host."}
        </p>
        {isHost && (
          <Btn
            tone="paper"
            size="sm"
            className="ml-auto"
            disabled={game.pending === "reset"}
            onClick={() => void game.act("reset")}
          >
            New game (clear scores)
          </Btn>
        )}
      </div>
    </div>
  );
}
