import { CreateJoin } from "@/components/home/CreateJoin";
import { HeroDoodle } from "@/components/home/HeroDoodle";
import { PROMPT_PACKS } from "@/lib/prompts";

const STEPS = [
  {
    n: "01",
    title: "Open a lobby",
    body: "Type a name, hit create. You get a five-character code and a shareable link. Nothing to install, nobody needs an account, the whole thing lives in a browser tab.",
    tone: "bg-sun",
    tilt: "-1.2deg",
  },
  {
    n: "02",
    title: "Friends drop in",
    body: "They open the link or punch in the code, choose a name and take a seat. You can see who's online, who's idle, and the host can kick whoever keeps drawing the same stick figure.",
    tone: "bg-mint",
    tilt: "0.9deg",
  },
  {
    n: "03",
    title: "The timer runs, pencils fly",
    body: "The host starts the round: same prompt, same clock, 45 to 180 seconds. Hand in early and keep editing until the buzzer. If everybody submits, voting opens ahead of schedule.",
    tone: "bg-flame",
    tilt: "-0.7deg",
  },
  {
    n: "04",
    title: "Blind vote, honest count",
    body: "When the draw clock hits zero, voting starts by itself. Entries appear shuffled and anonymous. Your own drawing is greyed out and locked — the server refuses a self-vote even if you forge the request.",
    tone: "bg-cobalt",
    tilt: "1.4deg",
  },
];

const RULES = [
  {
    h: "Self-votes are impossible",
    b: "The ballot for your own entry is disabled in the UI and rejected by the API. Ties are allowed and both winners bank the bonus.",
  },
  {
    h: "Votes stay secret until the buzzer",
    b: "Tallies are hidden while voting is open, so nobody pile-ons onto the early favourite.",
  },
  {
    h: "Drawings replay stroke by stroke",
    b: "Everything is stored as vector pen strokes rather than a flat image, so the reveal re-draws each masterpiece in front of you.",
  },
  {
    h: "One entry per player per round",
    b: "Resubmit as often as you like before the clock ends — the last version is the one that goes on the ballot.",
  },
  {
    h: "Late joiners are welcome",
    b: "Drop into a running lobby and you'll be seated for the next round, timer be damned.",
  },
  {
    h: "Your seat survives a refresh",
    b: "The browser remembers your player token per lobby, so an accidental reload puts you back in the same chair with your score intact.",
  },
];

export default function HomePage() {
  const totalPrompts = PROMPT_PACKS.reduce((n, p) => n + p.prompts.length, 0);

  return (
    <main className="grain relative min-h-screen overflow-hidden bg-paper">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(48rem 32rem at 8% -6%, rgba(255,197,49,0.42), transparent 60%), radial-gradient(44rem 30rem at 92% 4%, rgba(36,64,255,0.16), transparent 62%), radial-gradient(40rem 28rem at 60% 100%, rgba(255,75,43,0.14), transparent 60%)",
        }}
        aria-hidden
      />
      <div className="dots pointer-events-none fixed inset-0 opacity-[0.5]" aria-hidden />

      <div className="relative z-10">
        <TopBar />
        <Hero />
        <Marquee />
        <HowItWorks />
        <Packs totalPrompts={totalPrompts} />
        <Rules />
        <Footer />
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ top bar */

function TopBar() {
  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-ink bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 sm:px-6">
        <a href="/" className="group flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl border-[3px] border-ink bg-sun shadow-[3px_3px_0_0_var(--color-flame)] transition-transform duration-200 group-hover:-rotate-6">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#17130f" strokeWidth="2.4">
              <path d="M3 17c4-9 7 3 10-5s5 1 8-2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="display text-2xl leading-none">
            Doodle <span className="text-flame">Riot</span>
          </span>
        </a>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {[
            ["#how", "How it runs"],
            ["#packs", "Prompt packs"],
            ["#rules", "The rules"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-lg px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink/65 transition-colors hover:bg-ink hover:text-paper"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <a href="/practice" className="rounded-xl border-2 border-ink bg-mint px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-sun sm:text-[11px]">
            Practice solo
          </a>
          <a
            href="#create"
            className="press rounded-xl border-[3px] border-ink bg-flame px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-[4px_4px_0_0_var(--color-ink)] sm:px-4 sm:text-[11px]"
          >
            Create a lobby
          </a>
        </div>
      </div>
    </header>
  );
}

/* --------------------------------------------------------------------- hero */

function Hero() {
  return (
    <section id="create" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 pb-16 pt-10 sm:px-6 lg:pb-24 lg:pt-16">
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-8">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="wiggle inline-flex items-center gap-2 rounded-full border-[3px] border-ink bg-mint px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink shadow-[3px_3px_0_0_var(--color-ink)]">
              <span className="h-2 w-2 rounded-full bg-ink blink" />
              2–12 players · browser only
            </span>
            <span className="rounded-full border-[3px] border-ink bg-paper px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink/70">
              draw · vote · reveal
            </span>
          </div>

          <h1 className="display mt-6 text-[clamp(3rem,10.5vw,7.4rem)] text-ink">
            DRAW IT.
            <br />
            <span className="relative inline-block text-flame">
              JUDGE IT.
              <svg
                viewBox="0 0 320 22"
                className="absolute -bottom-1 left-0 h-4 w-[92%] text-cobalt"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M4 15c60-11 130-13 312-6" className="dash-run" />
              </svg>
            </span>
            <br />
            <span
              className="text-transparent"
              style={{ WebkitTextStroke: "3px #17130f" } as React.CSSProperties}
            >
              NEVER YOUR
            </span>
            <br />
            OWN DOODLE.
          </h1>

          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-ink/70 sm:text-[17px]">
            A party drawing game with a hard timer and an honest ballot. Open a lobby, send the code
            to your friends, sketch the prompt before the clock runs out — then everybody votes on
            the pile of masterpieces.{" "}
            <strong className="font-semibold text-ink">
              Your own drawing is locked out of your vote, on the server, every time.
            </strong>
          </p>

          <CreateJoin />
        </div>

        <div className="lg:pl-6">
          <HeroDoodle />
        </div>
      </div>

      <dl className="mt-16 grid gap-px overflow-hidden rounded-[22px] border-[3px] border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["5 chars", "every lobby code"],
          [`${totalPromptsLabel()}`, "built-in prompts"],
          ["0:00", "voting starts itself"],
          ["+3", "round winner bonus"],
        ].map(([k, v]) => (
          <div key={v} className="bg-paper px-5 py-4 transition-colors duration-200 hover:bg-sun">
            <dt className="display text-3xl text-ink">{k}</dt>
            <dd className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/55">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function totalPromptsLabel() {
  return String(PROMPT_PACKS.reduce((n, p) => n + p.prompts.length, 0));
}

/* ------------------------------------------------------------------ marquee */

function Marquee() {
  const items = PROMPT_PACKS.flatMap((p) => p.prompts).slice(0, 22);
  const row = [...items, ...items];
  return (
    <div className="relative -rotate-[1.1deg] border-y-[3px] border-ink bg-ink py-3">
      <div className="marquee-track gap-6">
        {row.map((item, i) => (
          <span key={`${item}-${i}`} className="flex items-center gap-6 whitespace-nowrap">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-paper/85">
              {item}
            </span>
            <span className="text-flame">✳</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- how it works */

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-14">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow text-flame">the whole game</p>
          <h2 className="display mt-3 text-[clamp(2.4rem,6vw,4.4rem)] text-ink">
            Four steps
            <br />
            to a riot.
          </h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink/65">
            One tab per player, one lobby code for the group. The server owns the clock, so the
            phase flips the instant the timer ends — even if someone's laptop is asleep.
          </p>
          <div className="mt-6 inline-flex rotate-[-2deg] items-center gap-2 rounded-2xl border-[3px] border-ink bg-cobalt px-4 py-3 text-white shadow-[5px_5px_0_0_var(--color-ink)]">
            <span className="display text-lg leading-none">timer ends → ballots open</span>
          </div>
        </div>

        <ol className="space-y-5">
          {STEPS.map((s, i) => (
            <li
              key={s.n}
              className="group relative flex gap-5 rounded-[26px] border-[3px] border-ink bg-paper p-5 shadow-[6px_6px_0_0_var(--color-ink)] transition-transform duration-300 hover:-translate-y-1.5 sm:p-7"
              style={{ transform: `rotate(${s.tilt})`, marginLeft: i % 2 === 0 ? 0 : "clamp(0px, 3vw, 42px)" }}
            >
              <span
                className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-[3px] border-ink font-mono text-xl font-bold text-ink shadow-[3px_3px_0_0_var(--color-ink)] transition-transform duration-300 group-hover:rotate-6 ${s.tone}`}
              >
                {s.n}
              </span>
              <span className="min-w-0">
                <span className="display block text-[clamp(1.5rem,3.4vw,2.3rem)] text-ink">
                  {s.title}
                </span>
                <span className="mt-2 block max-w-2xl text-[14.5px] leading-relaxed text-ink/70">
                  {s.body}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- packs */

function Packs({ totalPrompts }: { totalPrompts: number }) {
  return (
    <section id="packs" className="relative scroll-mt-24 border-y-[3px] border-ink bg-ink py-20 text-paper">
      <div className="hatch-light pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="eyebrow text-sun">prompt packs</p>
            <h2 className="display mt-3 text-[clamp(2.4rem,6.4vw,4.6rem)]">
              {totalPrompts} prompts
              <br />
              <span className="text-flame">ready to go.</span>
            </h2>
          </div>
          <p className="max-w-md text-[15px] leading-relaxed text-paper/65 lg:ml-auto">
            The host picks a pack before the first round, or writes their own list — one prompt per
            line. Prompts don't repeat until the pool runs out, so nobody gets the same duck twice.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {PROMPT_PACKS.map((p, i) => (
            <article
              key={p.id}
              className="group relative overflow-hidden rounded-[26px] border-[3px] border-paper/25 bg-white/[0.05] p-6 transition-all duration-300 hover:-translate-y-2 hover:border-sun hover:bg-white/[0.09]"
              style={{ transform: `rotate(${i % 2 === 0 ? -0.6 : 0.8}deg)` }}
            >
              <div className="flex items-start gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-[3px] border-ink bg-sun text-2xl shadow-[3px_3px_0_0_var(--color-flame)] transition-transform duration-300 group-hover:-rotate-12">
                  {p.emoji}
                </span>
                <div className="min-w-0">
                  <h3 className="display text-[clamp(1.6rem,3.4vw,2.2rem)] text-paper">{p.label}</h3>
                  <p className="mt-1 text-[13.5px] leading-snug text-paper/60">{p.blurb}</p>
                </div>
                <span className="ml-auto shrink-0 rounded-full border-2 border-paper/30 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-paper/60">
                  {p.prompts.length}
                </span>
              </div>
              <ul className="mt-5 space-y-1.5 border-t-2 border-dashed border-paper/20 pt-4">
                {p.prompts.slice(0, 4).map((prompt) => (
                  <li key={prompt} className="flex items-center gap-2.5 font-mono text-[11.5px] text-paper/70">
                    <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-flame" />
                    {prompt}
                  </li>
                ))}
                <li className="pl-4 font-mono text-[10px] uppercase tracking-[0.16em] text-paper/35">
                  + {Math.max(0, p.prompts.length - 4)} more
                </li>
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- rules */

function Rules() {
  return (
    <section id="rules" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
        <div>
          <p className="eyebrow text-flame">house rules</p>
          <blockquote className="display mt-4 text-[clamp(2rem,5vw,3.4rem)] leading-[0.94] text-ink">
            “The best part of a drawing game isn't the good drawings. It's watching your friend
            defend a potato.”
          </blockquote>
          <div className="mt-8 rotate-[-1.4deg] rounded-[22px] border-[3px] border-ink bg-flame p-5 text-white shadow-[7px_7px_0_0_var(--color-ink)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/75">
              rule number one
            </p>
            <p className="display mt-1.5 text-[clamp(1.5rem,3.6vw,2.2rem)] leading-[0.98]">
              You cannot vote for your own drawing.
            </p>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-white/85">
              Not in the UI, not through a crafted request. The ballot is checked against the author
              of every entry before it's counted.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {RULES.map((r, i) => (
            <article
              key={r.h}
              className="rounded-[22px] border-[3px] border-ink bg-paper p-5 transition-all duration-200 hover:-translate-y-1 hover:bg-sun hover:shadow-[6px_6px_0_0_var(--color-ink)]"
              style={{ marginTop: i % 2 === 1 ? "clamp(0px, 2.5vw, 28px)" : undefined }}
            >
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink/45">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="display mt-1.5 text-xl leading-tight text-ink">{r.h}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink/70">{r.b}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- footer */

function Footer() {
  return (
    <footer className="border-t-[3px] border-ink bg-night text-paper">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h2 className="display text-[clamp(2.6rem,8vw,6rem)] leading-[0.86]">
              GO ON.
              <br />
              <span className="text-sun">OPEN A LOBBY.</span>
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-paper/60">
              It takes about four seconds. You'll get a code, your friends will get a prompt, and
              somebody will definitely draw a questionable horse.
            </p>
          </div>
          <a
            href="#create"
            className="press inline-flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-flame px-7 py-5 font-mono text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[6px_6px_0_0_var(--color-sun)]"
          >
            Create a lobby
            <span className="text-lg">→</span>
          </a>
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-2 border-t-2 border-paper/15 pt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/40">
          <span>Doodle Riot</span>
          <span>·</span>
          <span>draw → vote → reveal</span>
          <span>·</span>
          <span>no self-votes, ever</span>
          <span className="ml-auto">built with next.js + postgres</span>
        </div>
      </div>
    </footer>
  );
}
