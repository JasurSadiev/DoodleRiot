"use client";

import { useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/useLobby";
import { Btn, Chip, CopyCode } from "@/components/ui/Bits";
import { Panel, Roster, SectionLabel, Stepper } from "@/components/room/Parts";
import { DRAW_TIME_OPTIONS, VOTE_TIME_OPTIONS } from "@/lib/game";
import { PROMPT_PACKS } from "@/lib/prompts";

const FLOW = [
  { n: "01", title: "Pencils out", body: "Everyone gets the same prompt and a hard timer.", tone: "bg-sun" },
  { n: "02", title: "Ballots out", body: "Drawings appear anonymously, shuffled. Vote for the best.", tone: "bg-flame" },
  { n: "03", title: "Names revealed", body: "Authors unmasked, points banked. Winner takes +3.", tone: "bg-mint" },
];

export function WaitingRoom({ game }: { game: Game }) {
  const state = game.state;
  if (!state) return null;
  const isHost = Boolean(state.you?.isHost);
  return isHost ? <HostView game={game} /> : <GuestView game={game} />;
}

function HostView({ game }: { game: Game }) {
  const state = game.state!;
  const [pack, setPack] = useState(state.settings.promptPack);
  const [draw, setDraw] = useState(state.settings.drawSeconds);
  const [vote, setVote] = useState(state.settings.voteSeconds);
  const [customText, setCustomText] = useState(state.settings.customPrompts.join("\n"));
  const customDirty = useRef(false);
  const timer = useRef<number | null>(null);
  const pushing = useRef(false);

  // Adopt whatever the server says, unless we are mid-push (avoids flicker).
  useEffect(() => {
    if (pushing.current) return;
    setPack(state.settings.promptPack);
    setDraw(state.settings.drawSeconds);
    setVote(state.settings.voteSeconds);
    if (!customDirty.current) setCustomText(state.settings.customPrompts.join("\n"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.rev]);

  const push = (patch: Record<string, unknown>) => {
    pushing.current = true;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      await game.act("settings", patch);
      pushing.current = false;
    }, 350);
  };

  const saveCustom = async () => {
    const list = customText
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 30);
    pushing.current = true;
    const ok = await game.act("settings", { customPrompts: list });
    pushing.current = false;
    if (ok) {
      customDirty.current = false;
      game.notify(`${list.length} custom prompts queued.`, "info");
    }
  };

  const canStart = state.players.length >= 1 && game.pending !== "start";

  return (
    <div className="space-y-5">
      <header className="rise">
        <Chip tone="ink" className="border-paper/30 bg-white/10 text-paper">
          lobby open · round 0
        </Chip>
        <h2 className="display mt-3 text-[clamp(2.4rem,7vw,5rem)] text-paper">
          The table is set.
          <br />
          <span className="text-flame">Riot on your signal.</span>
        </h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-paper/65">
          Share the code below. When the last friend lands, hit start — the draw timer begins
          immediately and the moment it hits zero, voting opens on its own.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel>
          <SectionLabel
            right={
              <span className="font-mono text-[10px] uppercase tracking-widest text-paper/40">
                {state.players.length} seated
              </span>
            }
          >
            Round rules
          </SectionLabel>

          <div className="space-y-4">
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">
                Prompt pack
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PROMPT_PACKS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPack(p.id);
                      push({ promptPack: p.id });
                    }}
                    className={`press rounded-xl border-[3px] p-3 text-left shadow-[3px_3px_0_0_rgba(23,19,15,0.9)] ${
                      pack === p.id ? "border-sun bg-sun text-ink" : "border-paper/20 bg-white/5 text-paper"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{p.emoji}</span>
                      <span className="font-display text-base font-extrabold">{p.label}</span>
                    </span>
                    <span
                      className={`mt-1 block text-[11px] leading-snug ${
                        pack === p.id ? "text-ink/70" : "text-paper/55"
                      }`}
                    >
                      {p.blurb} · {p.prompts.length} prompts
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Stepper
                label="Draw time"
                value={draw}
                options={DRAW_TIME_OPTIONS}
                onChange={(v) => {
                  setDraw(v);
                  push({ drawSeconds: v });
                }}
              />
              <Stepper
                label="Vote time"
                value={vote}
                options={VOTE_TIME_OPTIONS}
                onChange={(v) => {
                  setVote(v);
                  push({ voteSeconds: v });
                }}
              />
            </div>

            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">
                Your own prompts (one per line — overrides the pack)
              </p>
              <textarea
                value={customText}
                onChange={(e) => {
                  customDirty.current = true;
                  setCustomText(e.target.value);
                }}
                rows={4}
                placeholder={"A cat filing its taxes\nYour fridge at 3am"}
                className="w-full resize-none rounded-xl border-[3px] border-paper/25 bg-night/70 p-3 font-mono text-xs text-paper placeholder:text-paper/30 focus:border-sun"
              />
              <div className="mt-2 flex items-center gap-2">
                <Btn tone="mint" size="sm" onClick={saveCustom} disabled={!customDirty.current}>
                  Save prompts
                </Btn>
                {state.settings.customPrompts.length > 0 && (
                  <Chip tone="mint" className="border-ink">
                    {state.settings.customPrompts.length} queued
                  </Chip>
                )}
                {customDirty.current && (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-sun blink">
                    unsaved
                  </span>
                )}
              </div>
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel className="bg-white/[0.07]">
            <SectionLabel>Invite</SectionLabel>
            <CopyCode code={state.code} />
            <p className="mt-3 text-[12px] leading-relaxed text-paper/60">
              Friends open <span className="font-mono text-sun">/play/{state.code}</span> or type the
              code on the home page. Late joiners can still play the next round.
            </p>
          </Panel>

          <Panel>
            <SectionLabel
              right={
                <span className="font-mono text-[10px] uppercase tracking-widest text-paper/40">
                  {state.players.filter((p) => p.online).length} online
                </span>
              }
            >
              Seated
            </SectionLabel>
            <Roster game={game} showKick />
          </Panel>

          <Btn
            tone="flame"
            size="lg"
            className="w-full pulse-ring text-base"
            disabled={!canStart}
            onClick={() => void game.act("start")}
          >
            {game.pending === "start" ? "Dealing prompts…" : "Start round 1"}
          </Btn>

          <div className="space-y-2">
            {FLOW.map((f) => (
              <div
                key={f.n}
                className="flex items-start gap-3 rounded-xl border-2 border-paper/12 bg-white/[0.03] p-3 transition-colors hover:border-paper/30"
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 border-ink font-mono text-[11px] font-bold text-ink ${f.tone}`}
                >
                  {f.n}
                </span>
                <span>
                  <span className="block font-display text-[15px] font-extrabold text-paper">
                    {f.title}
                  </span>
                  <span className="block text-[12px] leading-snug text-paper/55">{f.body}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GuestView({ game }: { game: Game }) {
  const state = game.state!;
  const [name, setName] = useState(state.you?.name ?? "");

  return (
    <div className="space-y-5">
      <header className="rise">
        <Chip tone="mint" className="border-ink">
          you're in
        </Chip>
        <h2 className="display mt-3 text-[clamp(2.2rem,6.5vw,4.4rem)] text-paper">
          Seat taken.
          <br />
          <span className="text-sun">Waiting on the host.</span>
        </h2>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-paper/65">
          {state.settings.customPrompts.length > 0
            ? "The host wrote custom prompts for this game."
            : `Prompt pack: ${PROMPT_PACKS.find((p) => p.id === state.settings.promptPack)?.label ?? "House Mix"}.`}{" "}
          {state.settings.drawSeconds}s to draw, {state.settings.voteSeconds}s to vote.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel>
          <SectionLabel>How this round will run</SectionLabel>
          <div className="space-y-2">
            {FLOW.map((f) => (
              <div
                key={f.n}
                className="flex items-start gap-3 rounded-xl border-2 border-paper/12 bg-white/[0.03] p-3 transition-transform duration-200 hover:-translate-y-0.5 hover:border-paper/30"
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 border-ink font-mono text-xs font-bold text-ink ${f.tone}`}
                >
                  {f.n}
                </span>
                <span>
                  <span className="block font-display text-base font-extrabold text-paper">
                    {f.title}
                  </span>
                  <span className="block text-[12.5px] leading-snug text-paper/55">{f.body}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-xl border-2 border-flame/50 bg-flame/10 p-3 text-[12.5px] leading-relaxed text-paper/80">
            <strong className="font-display text-flame">House rule:</strong> your own drawing is
            locked out of your ballot. Every vote you cast goes to somebody else.
          </p>
        </Panel>

        <div className="space-y-4">
          <Panel className="bg-white/[0.07]">
            <SectionLabel>Lobby</SectionLabel>
            <CopyCode code={state.code} />
            <p className="mt-3 text-[12px] leading-relaxed text-paper/60">
              Send this to the rest of the group — more drawings means more chaos.
            </p>
          </Panel>

          <Panel>
            <SectionLabel
              right={
                <span className="font-mono text-[10px] uppercase tracking-widest text-paper/40">
                  {state.players.length} seated
                </span>
              }
            >
              At the table
            </SectionLabel>
            <Roster game={game} />
          </Panel>

          <Panel>
            <SectionLabel>Your name tag</SectionLabel>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={18}
                className="field w-full bg-white/95 text-sm"
                placeholder="Your name"
              />
              <Btn
                tone="cobalt"
                size="sm"
                disabled={!name.trim() || name.trim() === state.you?.name}
                onClick={() => void game.act("rename", { name: name.trim() })}
              >
                Save
              </Btn>
            </div>
          </Panel>

          <div className="rounded-[22px] border-2 border-paper/15 bg-white/[0.03] p-4 text-center">
            <p className="display text-lg text-paper">
              Host is picking prompts
              <span className="blink text-sun">…</span>
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/45">
              keep this tab open
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
