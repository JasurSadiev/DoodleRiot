import type { Metadata } from "next";
import { RoomShell } from "@/components/room/Room";
import { normalizeCode } from "@/lib/game";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const clean = normalizeCode(code);
  return {
    title: `Lobby ${clean} · Doodle Riot`,
    description: `Join doodle lobby ${clean} — draw the prompt, then vote. No self-votes allowed.`,
  };
}

export default async function PlayPage({ params }: Props) {
  const { code } = await params;
  const clean = normalizeCode(code);

  if (clean.length < 4) {
    return (
      <main className="grain grid min-h-screen place-items-center bg-night px-5">
        <div className="max-w-md rounded-[26px] border-[3px] border-ink bg-paper p-7 text-ink shadow-[8px_8px_0_0_var(--color-flame)]">
          <p className="eyebrow text-flame">bad code</p>
          <h1 className="display mt-2 text-4xl">That code is too short.</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            Lobby codes are five characters, like <span className="font-mono font-bold">K7PQM</span>.
            Check the link your friend sent.
          </p>
          <a
            href="/"
            className="press mt-5 inline-flex items-center rounded-xl border-[3px] border-ink bg-ink px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-paper shadow-[4px_4px_0_0_var(--color-flame)]"
          >
            ← Back to the start
          </a>
        </div>
      </main>
    );
  }

  return <RoomShell code={clean} />;
}
