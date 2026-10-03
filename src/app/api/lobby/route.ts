import { createLobby, buildState } from "@/lib/server/engine";
import { sanitizeName } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const name = sanitizeName(String(body.name ?? ""));
  if (!name || name === "Anonymous") {
    return Response.json(
      { ok: false, error: "Give yourself a name so friends know who to boo." },
      { status: 400 },
    );
  }

  try {
    const { lobby, player } = await createLobby({
      name,
      drawSeconds: Number(body.drawSeconds) || undefined,
      voteSeconds: Number(body.voteSeconds) || undefined,
      promptPack: body.promptPack ? String(body.promptPack) : undefined,
      customPrompts: Array.isArray(body.customPrompts)
        ? (body.customPrompts as unknown[]).map((c) => String(c))
        : undefined,
    });
    const state = await buildState(lobby, player);
    return Response.json({
      ok: true,
      state,
      session: { code: lobby.code, playerId: player.id, token: player.token, name: player.name },
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Could not create the lobby." },
      { status: 500 },
    );
  }
}
