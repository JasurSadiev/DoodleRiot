"use client";

import { useEffect, useState } from "react";
import type { Game } from "@/lib/useLobby";
import { Avatar, Btn, Chip } from "@/components/ui/Bits";
import { PROMPT_PACKS } from "@/lib/prompts";

const NAME_KEY = "doodle-riot:name";

export function JoinGate({ code, game }: { code: string; game: Game }) {
  const state = game.state;
  const [name, setName] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(NAME_KEY);
      if (saved) setName(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim().slice(0, 18);
    if (!clean) {
      game.notify("Type a name so the scoreboard knows who to blame.", "error");
      return;
    }
    try {
      window.localStorage.setItem(NAME_KEY, clean);
    } catch {
      /* ignore */
    }
    const ok = await game.join(clean);
    if (ok) game.notify("Pencils ready. Good luck out there.", "info");
  };

  const pack = PROMPT_PACKS.find((p) => p.id === state?.settings.promptPack) ?? PROMPT_PACKS[0];

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="rise">
        <a href="/" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/45 hover:text-sun">
          ← Doodle Riot
        </a>
        <p className="eyebrow mt-6 text-flame">you've been summoned</p>
        <h1 className="display mt-3 text-[clamp(2.6rem,9vw,6rem)] text-paper">
          Lobby
          <br />
          <span className="font-mono text-[0.62em] tracking-[0.06em] text-sun">{code}</span>
        </h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-paper/65">
          Put your name on the list and take a seat. When the host starts the round you'll get{" "}
          {state ? `${state.settings.drawSeconds}s` : "a minute or so"} to draw the prompt — then
          everybody votes, and <span className="font-semibold text-flame">nobody can vote for their
          own drawing</span>.
        </p>

        {state && (
          <div className="mt-7 flex flex-wrap items-center gap-3 rounded-[22px] border-2 border-paper/15 bg-white/[0.04] p-4">
            <div className="flex -space-x-2">
              {state.players.slice(0, 8).map((p) => (
                <span key={p.id} className="ring-[3px] ring-night rounded-full">
                  <Avatar name={p.name} color={p.color} size={38} />
                </span>
              ))}
              {state.players.length === 0 && (
                <span className="font-mono text-xs uppercase tracking-widest text-paper/40">
                  you'd be first
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-display text-lg font-extrabold text-paper">
                {state.players.length} at the table
              </p>
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">
                pack: {pack.label} · status: {state.status}
              </p>
            </div>
            {state.status !== "lobby" && (
              <Chip tone="sun" className="border-ink ml-auto">
                round {state.round} running
              </Chip>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={submit}
        className="pop relative overflow-hidden rounded-[26px] border-[3px] border-ink bg-paper p-6 text-ink shadow-[10px_10px_0_0_var(--color-flame)]"
      >
        <div className="hatch pointer-events-none absolute inset-x-0 top-0 h-16 opacity-40" aria-hidden />
        <p className="relative eyebrow text-flame">take a seat</p>
        <h2 className="relative display mt-2 text-4xl">Who's drawing?</h2>

        <label className="relative mt-6 block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/55">
            Display name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={18}
            autoFocus
            placeholder="e.g. Marta"
            className="field mt-1.5 w-full text-lg"
          />
        </label>

        <Btn
          type="submit"
          tone="ink"
          size="lg"
          className="relative mt-5 w-full text-sm"
          disabled={game.pending === "join"}
        >
          {game.pending === "join" ? "Pulling up a chair…" : `Join lobby ${code}`}
        </Btn>

        <ul className="relative mt-5 space-y-1.5 border-t-2 border-dashed border-ink/20 pt-4 text-[12px] leading-snug text-ink/65">
          <li>· Names can be anything, duplicates get numbered.</li>
          <li>· Your seat is remembered in this browser, so a refresh won't drop you.</li>
          <li>· Joining mid-round is fine — you can draw with the time that's left.</li>
        </ul>
      </form>

      {game.toast && (
        <div className="fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4">
          <div className="pop max-w-md rounded-2xl border-[3px] border-ink bg-flame px-4 py-3 text-center font-mono text-xs font-bold uppercase tracking-wide text-white shadow-[5px_5px_0_0_var(--color-ink)]">
            {game.toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
