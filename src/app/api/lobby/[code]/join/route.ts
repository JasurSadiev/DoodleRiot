import {
  advancePhase,
  authenticate,
  buildState,
  findLobby,
  joinLobby,
  touchPlayer,
} from "@/lib/server/engine";
import { normalizeCode, sanitizeName } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const lobbyRow = await findLobby(normalizeCode(code));
  if (!lobbyRow) {
    return Response.json({ ok: false, error: "No lobby with that code." }, { status: 404 });
  }
  const lobby = await advancePhase(lobbyRow);

  // Reconnect with an existing seat if the browser still remembers it.
  const existing = await authenticate(
    lobby.id,
    body.playerId ? Number(body.playerId) : null,
    body.token ? String(body.token) : null,
  );
  if (existing) {
    await touchPlayer(existing.id);
    return Response.json({
      ok: true,
      session: {
        code: lobby.code,
        playerId: existing.id,
        token: existing.token,
        name: existing.name,
      },
      state: await buildState(lobby, existing),
    });
  }

  const name = sanitizeName(String(body.name ?? ""));
  if (!name || name === "Anonymous") {
    return Response.json(
      { ok: false, error: "We need a name for the scoreboard." },
      { status: 400 },
    );
  }

  const player = await joinLobby(lobby, name, null);
  const fresh = (await findLobby(lobby.code)) ?? lobby;
  return Response.json({
    ok: true,
    session: { code: lobby.code, playerId: player.id, token: player.token, name: player.name },
    state: await buildState(fresh, player),
  });
}
