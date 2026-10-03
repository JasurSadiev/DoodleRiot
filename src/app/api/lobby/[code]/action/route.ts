import { advancePhase, authenticate, handleAction } from "@/lib/server/engine";
import { normalizeCode } from "@/lib/game";

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

  const me = await authenticate(
    clean,
    body.playerId ? String(body.playerId) : null,
    body.token ? String(body.token) : null,
  );
  const type = String(body.type ?? "");
  if (!me && type !== "leave") {
    return Response.json({ ok: false, error: "Join the lobby first." }, { status: 401 });
  }

  const payload = (body.payload ?? {}) as Record<string, unknown>;

  try {
    const result = await handleAction(clean, me, type, payload);
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
