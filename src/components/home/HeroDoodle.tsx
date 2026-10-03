"use client";

import { useEffect, useState } from "react";
import { DrawingView } from "@/components/DrawingView";
import { DOODLES } from "@/lib/doodles";

export function HeroDoodle() {
  const [i, setI] = useState(0);
  const [votes, setVotes] = useState(4);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setI((v) => (v + 1) % DOODLES.length);
      setVotes(2 + Math.floor(Math.random() * 6));
    }, 6200);
    return () => window.clearTimeout(t);
  }, [i]);

  const d = DOODLES[i];

  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div
        className="float absolute -left-4 -top-6 z-20 rotate-[-8deg] rounded-xl border-[3px] border-ink bg-mint px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink shadow-[4px_4px_0_0_var(--color-ink)] sm:-left-8"
        style={{ ["--tilt" as string]: "-8deg" }}
      >
        voting is live
      </div>

      <div className="relative rotate-[-1.6deg] rounded-[28px] border-[3px] border-ink bg-white p-3.5 shadow-[14px_14px_0_0_var(--color-flame)] transition-transform duration-500 hover:rotate-0 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="flex -space-x-2">
            {["#ffc531", "#2440ff", "#f05bb5"].map((c, k) => (
              <span
                key={c}
                className="h-6 w-6 rounded-full border-[3px] border-ink"
                style={{ background: c }}
              />
            ))}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/50">
            6 players · round 4
          </span>
          <span className="ml-auto flex items-center gap-1.5 rounded-full border-2 border-ink bg-flame px-2.5 py-1 font-mono text-[10px] font-bold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white blink" />
            0:07
          </span>
        </div>

        <div className="relative mt-3 overflow-hidden rounded-[16px] border-[3px] border-ink bg-[#fffdf7]">
          <DrawingView key={i} strokes={d.strokes} animate duration={2600} className="block w-full" quality={0.8} />
          <span className="absolute left-3 top-3 rounded-lg border-2 border-ink bg-paper px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ink/70">
            anonymous entry
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <p className="display min-w-0 flex-1 truncate text-lg text-ink">{d.prompt}</p>
          <span className="rounded-lg border-[3px] border-ink bg-sun px-3 py-2 font-mono text-[11px] font-bold uppercase text-ink shadow-[3px_3px_0_0_var(--color-ink)]">
            {votes} votes
          </span>
          <span className="rounded-lg border-[3px] border-ink bg-cobalt px-3 py-2 font-mono text-[11px] font-bold uppercase text-white shadow-[3px_3px_0_0_var(--color-ink)]">
            vote
          </span>
        </div>
      </div>

      <div
        className="wiggle absolute -bottom-7 -right-2 z-20 rotate-[9deg] rounded-2xl border-[3px] border-ink bg-ink px-3.5 py-2.5 text-paper shadow-[5px_5px_0_0_var(--color-sun)] sm:-right-8"
        aria-hidden
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-sun">house rule</p>
        <p className="display text-lg leading-none">no self-votes</p>
      </div>

      <span className="absolute -bottom-3 left-6 z-10 rotate-[-3deg] rounded-lg border-2 border-ink bg-paper px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink/60 shadow-[3px_3px_0_0_var(--color-ink)]">
        {d.caption}
      </span>
    </div>
  );
}
