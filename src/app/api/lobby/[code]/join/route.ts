import { advancePhase, authenticate, buildState, joinLobby, touchPlayer } from "@/lib/server/engine";
import { normalizeCode, sanitizeName } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = normalizeCode(code);
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const lobby = await advancePhase(clean);
  if (!lobby) {
    return Response.json({ ok: false, error: "No lobby with that code." }, { status: 404 });
  }

  // Reconnect with an existing seat if the browser still remembers it.
  const existing = await authenticate(
    clean,
    body.playerId ? String(body.playerId) : null,
    body.token ? String(body.token) : null,
  );
  if (existing) {
    await touchPlayer(clean, existing.id);
    return Response.json({
      ok: true,
      session: {
        code: clean,
        playerId: existing.id,
        token: existing.token,
        name: existing.name,
      },
      state: await buildState(clean, existing),
    });
  }

  const name = sanitizeName(String(body.name ?? ""));
  if (!name || name === "Anonymous") {
    return Response.json(
      { ok: false, error: "We need a name for the scoreboard." },
      { status: 400 },
    );
  }

  const player = await joinLobby(clean, name, null);
  return Response.json({
    ok: true,
    session: { code: clean, playerId: player.id, token: player.token, name: player.name },
    state: await buildState(clean, player),
  });
}
