import { authenticate, findLobby, handleAction } from "@/lib/server/engine";
import { normalizeCode } from "@/lib/game";

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

  const me = await authenticate(
    lobbyRow.id,
    body.playerId ? Number(body.playerId) : null,
    body.token ? String(body.token) : null,
  );
  if (!me && body.type !== "leave") {
    return Response.json({ ok: false, error: "Join the lobby first." }, { status: 401 });
  }

  const type = String(body.type ?? "");
  const payload = (body.payload ?? {}) as Record<string, unknown>;

  try {
    const result = await handleAction(lobbyRow, me, type, payload);
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 400 });
    }
    return Response.json({ ok: true, state: result.state });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Something went wrong." },
      { status: 500 },
    );
  }
}
