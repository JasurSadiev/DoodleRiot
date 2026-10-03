"use client";

import { useLobby } from "@/lib/useLobby";
import { Avatar, Btn, Chip, TimerRing, Toast, CopyCode } from "@/components/ui/Bits";
import { WaitingRoom } from "@/components/room/WaitingRoom";
import { DrawPhase } from "@/components/room/DrawPhase";
import { VotePhase } from "@/components/room/VotePhase";
import { ResultsPhase } from "@/components/room/ResultsPhase";
import { JoinGate } from "@/components/room/JoinGate";
import { PLAYER_COLORS, formatClock } from "@/lib/game";
import type { LobbyState } from "@/lib/types";

export function RoomShell({ code }: { code: string }) {
  const game = useLobby(code);

  if (game.phase === "missing") {
    return (
      <Backdrop>
        <div className="mx-auto grid min-h-screen max-w-lg place-items-center px-5">
          <div className="pop w-full rounded-[26px] border-[3px] border-ink bg-paper p-7 text-ink shadow-[8px_8px_0_0_var(--color-ink)]">
            <p className="eyebrow text-flame">404 · empty table</p>
            <h1 className="display mt-2 text-5xl">No lobby called {code}.</h1>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              Lobbies live as long as somebody is sitting at them. Start a fresh one and send the
              code around again.
            </p>
            <div className="mt-5">
              <Btn tone="ink" size="md" onClick={() => (window.location.href = "/")}>
                ← Back to the start
              </Btn>
            </div>
          </div>
        </div>
      </Backdrop>
    );
  }

  if (game.phase === "loading" && !game.state) {
    return (
      <Backdrop>
        <div className="grid min-h-screen place-items-center px-5">
          <div className="text-center">
            <p className="display text-3xl text-paper">
              Walking to the table<span className="blink text-sun">…</span>
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/40">
              lobby {code}
            </p>
          </div>
        </div>
      </Backdrop>
    );
  }

  if (game.phase === "need-name" || !game.state || !game.state.you) {
    return (
      <Backdrop>
        <JoinGate code={code} game={game} />
        {game.toast && <Toast message={game.toast.message} kind={game.toast.kind} />}
      </Backdrop>
    );
  }

  return (
    <Backdrop>
      <Room game={game} state={game.state} />
      {game.toast && <Toast message={game.toast.message} kind={game.toast.kind} />}
    </Backdrop>
  );
}

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain grain-light relative min-h-screen bg-night text-paper">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(58rem 38rem at 10% -12%, rgba(255,75,43,0.22), transparent 62%), radial-gradient(52rem 40rem at 96% -6%, rgba(36,64,255,0.26), transparent 60%), radial-gradient(44rem 34rem at 50% 112%, rgba(22,199,154,0.16), transparent 62%)",
        }}
        aria-hidden
      />
      <div className="dots pointer-events-none fixed inset-0 opacity-[0.06]" aria-hidden />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

const PHASE_META: Record<LobbyState["status"], { label: string; tone: "flame" | "cobalt" | "sun" | "mint" }> = {
  lobby: { label: "lobby open", tone: "mint" },
  drawing: { label: "drawing", tone: "sun" },
  voting: { label: "voting", tone: "cobalt" },
  results: { label: "reveal", tone: "flame" },
};

function Room({ game, state }: { game: ReturnType<typeof useLobby>; state: LobbyState }) {
  const meta = PHASE_META[state.status];
  const timerTotal =
    state.status === "drawing"
      ? state.settings.drawSeconds * 1000
      : state.status === "voting"
        ? state.settings.voteSeconds * 1000
        : 0;

  return (
    <div className="mx-auto min-h-screen max-w-[1440px] px-3 pb-10 sm:px-5">
      <header className="sticky top-0 z-40 -mx-3 mb-5 border-b-2 border-paper/15 bg-night/85 px-3 py-3 backdrop-blur-md sm:-mx-5 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <a href="/" className="group flex items-center gap-2.5">
            <BrandMark />
            <span className="display text-xl leading-none text-paper transition-colors group-hover:text-sun">
              Doodle <span className="text-flame">Riot</span>
            </span>
          </a>

          <span className="hidden h-8 w-px bg-paper/15 sm:block" />

          <div className="hidden sm:block">
            <CopyCode code={state.code} />
          </div>

          <Chip tone={meta.tone} className="border-ink">
            <span className={`h-1.5 w-1.5 rounded-full ${state.status === "lobby" ? "bg-ink blink" : "bg-ink"}`} />
            {meta.label}
            {state.round > 0 && <span className="opacity-60">· r{state.round}</span>}
          </Chip>

          <div className="ml-auto flex items-center gap-3">
            {state.status === "drawing" || state.status === "voting" ? (
              <TimerRing
                endsAt={state.phaseEndsAt}
                serverNow={state.serverNow}
                totalMs={timerTotal}
                label={state.status === "drawing" ? "until voting" : "until reveal"}
                onExpire={() => void game.poll()}
              />
            ) : (
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-paper/45 md:block">
                {state.status === "results" ? "clock stopped" : "no clock"}
              </span>
            )}
            <Btn
              tone="paper"
              size="sm"
              disabled={game.pending === "leave"}
              onClick={() => void game.act("leave")}
            >
              Leave
            </Btn>
          </div>
        </div>

        <div className="mt-3 sm:hidden">
          <CopyCode code={state.code} />
        </div>

        <TableStrip state={state} />
      </header>

      <main>
        {state.status === "lobby" && <WaitingRoom game={game} />}
        {state.status === "drawing" && <DrawPhase key={`draw-${state.round}`} game={game} />}
        {state.status === "voting" && <VotePhase game={game} />}
        {state.status === "results" && <ResultsPhase game={game} />}
      </main>

      <footer className="mt-12 flex flex-wrap items-center gap-3 border-t-2 border-paper/12 pt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/35">
        <span>lobby {state.code}</span>
        <span>·</span>
        <span>round {state.round}</span>
        <span>·</span>
        <span>{state.playerCount} players</span>
        <span className="ml-auto normal-case tracking-normal">
          Draw timer {formatClock(state.settings.drawSeconds * 1000)} · vote timer{" "}
          {formatClock(state.settings.voteSeconds * 1000)} · no self-votes, ever
        </span>
      </footer>
    </div>
  );
}

function TableStrip({ state }: { state: LobbyState }) {
  return (
    <div className="scroll-slim -mx-1 mt-3 flex items-center gap-2 overflow-x-auto px-1 pb-1">
      <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.2em] text-paper/35">
        at the table
      </span>
      {state.players.map((p) => {
        const statusText =
          state.status === "drawing"
            ? p.submitted
              ? "in"
              : "…"
            : state.status === "voting"
              ? p.voted
                ? "voted"
                : "…"
              : `${p.score}pt`;
        return (
          <span
            key={p.id}
            title={`${p.name} · ${p.online ? "online" : "idle"} · ${p.score} points`}
            className={`flex shrink-0 items-center gap-2 rounded-full border-2 py-1 pl-1 pr-2.5 transition-colors ${
              p.isYou ? "border-sun bg-sun/15" : "border-paper/15 bg-white/[0.04]"
            } ${p.online ? "" : "opacity-45"}`}
          >
            <Avatar name={p.name} color={p.color} size={24} />
            <span className="max-w-[8rem] truncate font-display text-[13px] font-extrabold text-paper">
              {p.name}
            </span>
            {p.isHost && <span className="font-mono text-[8px] uppercase text-flame">host</span>}
            <span
              className="font-mono text-[9px] font-bold uppercase tracking-widest"
              style={{ color: PLAYER_COLORS[p.color % PLAYER_COLORS.length] }}
            >
              {statusText}
            </span>
          </span>
        );
      })}
      {state.players.length === 0 && (
        <span className="font-mono text-[11px] uppercase tracking-widest text-paper/35">
          nobody here yet
        </span>
      )}
    </div>
  );
}

function BrandMark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl border-[3px] border-ink bg-sun shadow-[3px_3px_0_0_var(--color-flame)]">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#17130f" strokeWidth="2.4">
        <path d="M3 17c4-9 7 3 10-5s5 1 8-2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
