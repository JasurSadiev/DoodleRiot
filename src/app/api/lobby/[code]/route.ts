import { advancePhase, authenticate, buildState, findLobby, touchPlayer } from "@/lib/server/engine";
import { normalizeCode, PRESENCE_BUCKET_MS } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = new URL(req.url);
  const lobbyRow = await findLobby(normalizeCode(code));
  if (!lobbyRow) {
    return Response.json({ ok: false, error: "No lobby with that code." }, { status: 404 });
  }

  const lobby = await advancePhase(lobbyRow);
  const playerIdRaw = url.searchParams.get("playerId");
  const token = url.searchParams.get("token");
  const playerId = playerIdRaw ? Number(playerIdRaw) : null;
  const me = await authenticate(lobby.id, playerId, token);
  if (me) await touchPlayer(me.id);

  const clientRev = Number(url.searchParams.get("rev") ?? 0);
  const clientBucket = Number(url.searchParams.get("t") ?? 0);
  const bucket = Math.floor(Date.now() / PRESENCE_BUCKET_MS);
  const credsGiven = Boolean(playerIdRaw && token);

  if (
    clientRev > 0 &&
    clientRev === lobby.rev &&
    clientBucket === bucket &&
    (!credsGiven || Boolean(me))
  ) {
    return Response.json({ ok: true, rev: lobby.rev, unchanged: true });
  }

  const state = await buildState(lobby, me);
  return Response.json({ ok: true, rev: lobby.rev, state, bucket });
}
