import { advancePhase, authenticate, buildState, touchPlayer } from "@/lib/server/engine";
import { normalizeCode, PRESENCE_BUCKET_MS } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = normalizeCode(code);
  const url = new URL(req.url);

  const lobby = await advancePhase(clean);
  if (!lobby) {
    return Response.json({ ok: false, error: "No lobby with that code." }, { status: 404 });
  }

  const playerId = url.searchParams.get("playerId");
  const token = url.searchParams.get("token");
  const me = await authenticate(clean, playerId, token);
  if (me) await touchPlayer(clean, me.id);

  const clientRev = Number(url.searchParams.get("rev") ?? 0);
  const clientBucket = Number(url.searchParams.get("t") ?? 0);
  const bucket = Math.floor(Date.now() / PRESENCE_BUCKET_MS);
  const credsGiven = Boolean(playerId && token);

  if (
    clientRev > 0 &&
    clientRev === lobby.rev &&
    clientBucket === bucket &&
    (!credsGiven || Boolean(me))
  ) {
    return Response.json({ ok: true, rev: lobby.rev, unchanged: true });
  }

  const state = await buildState(clean, me);
  return Response.json({ ok: true, rev: lobby.rev, state, bucket });
}
