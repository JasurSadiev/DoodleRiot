"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeCode } from "@/lib/game";
import type { Session } from "@/lib/types";

const NAME_KEY = "doodle-riot:name";
const SESSION_KEY = "doodle-riot:session";

export function CreateJoin() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedName = window.localStorage.getItem(NAME_KEY);
      if (savedName) setName(savedName);
    } catch {
      /* ignore */
    }
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("join") ?? window.location.hash.replace("#", "");
    if (joinCode) setCode(normalizeCode(joinCode));
  }, []);

  const rememberName = () => {
    try {
      window.localStorage.setItem(NAME_KEY, name.trim());
    } catch {
      /* ignore */
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("You need a name before you can host.");
      return;
    }
    setBusy("create");
    try {
      rememberName();
      const res = await fetch("/api/lobby", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; session?: Session };
      if (!data.ok || !data.session) {
        setError(data.error ?? "Could not open that lobby.");
        return;
      }
      try {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(data.session));
      } catch {
        /* ignore */
      }
      router.push(`/play/${data.session.code}`);
    } catch {
      setError("Network hiccup — try again.");
    } finally {
      setBusy(null);
    }
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean = normalizeCode(code);
    if (clean.length < 4) {
      setError("Lobby codes are five characters.");
      return;
    }
    rememberName();
    router.push(`/play/${clean}`);
  };

  return (
    <div className="relative mt-8 max-w-xl">
      <div className="absolute -inset-2 -rotate-1 rounded-[30px] border-[3px] border-ink bg-sun/60" aria-hidden />
      <div className="relative rounded-[26px] border-[3px] border-ink bg-paper p-5 shadow-[8px_8px_0_0_var(--color-ink)]">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/55">
            Your name at the table
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={18}
            placeholder="e.g. Marta"
            className="field mt-1.5 w-full text-lg"
          />
        </label>

        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <button
            type="button"
            onClick={create}
            disabled={busy !== null}
            className="press group flex items-center justify-between gap-3 rounded-2xl border-[3px] border-ink bg-flame px-5 py-4 text-left text-white shadow-[5px_5px_0_0_var(--color-ink)] disabled:opacity-60"
          >
            <span>
              <span className="display block text-2xl leading-none">
                {busy === "create" ? "Opening…" : "Create a lobby"}
              </span>
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-white/75">
                you host · you get the code
              </span>
            </span>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-[3px] border-white bg-ink text-lg transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </button>
        </div>

        <form onSubmit={join} className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(normalizeCode(e.target.value))}
            placeholder="CODE"
            maxLength={7}
            aria-label="Lobby code"
            className="field w-full font-mono text-lg uppercase tracking-[0.22em]"
          />
          <button
            type="submit"
            disabled={busy !== null}
            className="press shrink-0 rounded-2xl border-[3px] border-ink bg-cobalt px-5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-white shadow-[5px_5px_0_0_var(--color-ink)] disabled:opacity-60"
          >
            Join
          </button>
        </form>

        {error && (
          <p className="pop mt-3 rounded-xl border-2 border-flame bg-flame/10 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wide text-flame">
            {error}
          </p>
        )}

        <div className="mt-4 border-t-2 border-dashed border-ink/20 pt-4">
          <a href="/practice" className="press group flex items-center justify-between gap-3 rounded-2xl border-[3px] border-ink bg-mint px-4 py-3 text-ink shadow-[4px_4px_0_0_var(--color-ink)]">
            <span>
              <span className="display block text-xl">Practice solo</span>
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink/65">your canvas · timer or no timer · all the colors</span>
            </span>
            <span className="text-xl transition-transform group-hover:translate-x-1">→</span>
          </a>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-ink/45">
          Free · runs in the browser · your seat survives a refresh
        </p>
      </div>
    </div>
  );
}
