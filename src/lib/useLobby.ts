"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LobbyState, Session } from "@/lib/types";
import { PRESENCE_BUCKET_MS } from "@/lib/game";

const STORAGE_KEY = "doodle-riot:session";

export type LobbyPhase = "loading" | "need-name" | "ready" | "missing";
export type Toast = { id: number; message: string; kind: "error" | "info" };

function readSession(code: string): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed || parsed.code !== code || !parsed.playerId || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked, we keep the seat in memory only */
  }
}

export function useLobby(code: string) {
  const [phase, setPhase] = useState<LobbyPhase>("loading");
  const [state, setState] = useState<LobbyState | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const revRef = useRef(0);
  const lostSeatNotified = useRef(false);
  const toastTimer = useRef<number | null>(null);

  const notify = useCallback((message: string, kind: "error" | "info" = "info") => {
    setToast({ id: Date.now(), message, kind });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const poll = useCallback(async () => {
    const s = sessionRef.current;
    const q = new URLSearchParams();
    q.set("rev", String(revRef.current));
    q.set("t", String(Math.floor(Date.now() / PRESENCE_BUCKET_MS)));
    if (s) {
      q.set("playerId", String(s.playerId));
      q.set("token", s.token);
    }
    try {
      const res = await fetch(`/api/lobby/${code}?${q.toString()}`, { cache: "no-store" });
      if (res.status === 404) {
        setPhase("missing");
        return;
      }
      const data = (await res.json()) as {
        ok: boolean;
        rev?: number;
        unchanged?: boolean;
        state?: LobbyState;
      };
      if (!data.ok) return;
      if (data.rev) revRef.current = data.rev;
      if (data.unchanged || !data.state) return;

      const next = data.state;
      setState(next);
      if (next.you === null) {
        if (s && !lostSeatNotified.current) {
          lostSeatNotified.current = true;
          writeSession(null);
          sessionRef.current = null;
          notify("Your seat in this lobby disappeared. Rejoin to keep playing.", "error");
        }
        setPhase("need-name");
      } else {
        lostSeatNotified.current = false;
        setPhase("ready");
      }
    } catch {
      /* transient network blip: keep the last known state */
    }
  }, [code, notify]);

  useEffect(() => {
    const existing = readSession(code);
    sessionRef.current = existing;
    revRef.current = 0;
    if (!existing) setPhase("need-name");
    else setPhase("loading");
    void poll();
    const id = window.setInterval(poll, 1200);
    const onVisible = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [code, poll]);

  const join = useCallback(
    async (name: string) => {
      setPending("join");
      try {
        const current = sessionRef.current;
        const res = await fetch(`/api/lobby/${code}/join`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            playerId: current?.playerId,
            token: current?.token,
          }),
        });
        const data = (await res.json()) as { ok: boolean; error?: string; session?: Session; state?: LobbyState };
        if (!data.ok || !data.session) {
          notify(data.error ?? "Could not join that lobby.", "error");
          return false;
        }
        writeSession(data.session);
        sessionRef.current = data.session;
        lostSeatNotified.current = false;
        if (data.state) {
          revRef.current = data.state.rev;
          setState(data.state);
        }
        setPhase("ready");
        notify(`You're in, ${data.session.name}.`, "info");
        return true;
      } catch {
        notify("Network hiccup — try again.", "error");
        return false;
      } finally {
        setPending(null);
      }
    },
    [code, notify],
  );

  const act = useCallback(
    async (type: string, payload: Record<string, unknown> = {}) => {
      const s = sessionRef.current;
      if (!s) {
        setPhase("need-name");
        return false;
      }
      setPending(type);
      try {
        const res = await fetch(`/api/lobby/${code}/action`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type, payload, playerId: s.playerId, token: s.token }),
        });
        const data = (await res.json()) as { ok: boolean; error?: string; state?: LobbyState };
        if (!data.ok) {
          notify(data.error ?? "That did not work.", "error");
          return false;
        }
        if (data.state) {
          revRef.current = data.state.rev;
          setState(data.state);
        }
        if (type === "leave") {
          writeSession(null);
          sessionRef.current = null;
          window.location.href = "/";
        }
        return true;
      } catch {
        notify("Network hiccup — try again.", "error");
        return false;
      } finally {
        setPending(null);
      }
    },
    [code, notify],
  );

  return { phase, state, toast, pending, notify, join, act, poll, session: sessionRef.current };
}

export type Game = ReturnType<typeof useLobby>;
