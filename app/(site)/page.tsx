"use client";

import Link from "next/link";
import { useState } from "react";
import { LEVELS, TIERS, WORD_OF_THE_DAY } from "@/lib/courses";
import { useOptionalStore } from "@/lib/store";
import { uid } from "@/lib/id";
import type { LevelId, Tier } from "@/lib/types";
import { Mascot } from "@/components/Mascot";

const THUMB_INDEX = [
  { letter: "L", label: "Levels", href: "#levels" },
  { letter: "W", label: "Word", href: "#word" },
  { letter: "H", label: "How", href: "#how" },
  { letter: "P", label: "Pricing", href: "#pricing" },
  { letter: "J", label: "Join", href: "#join" },
];

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg font-serif text-lg font-bold ${light ? "bg-paper text-ink" : "bg-ink text-cyan"}`}>Ai</span>
      <span className={`font-serif text-xl font-semibold tracking-tight ${light ? "text-paper" : "text-ink"}`}>AI Dictionary</span>
    </span>
  );
}

/** Dictionary-entry heading used for every section. */
function EntryHead({ word, pron, pos, children, id }: { word: string; pron: string; pos: string; children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="scroll-mt-24">
      <p className="font-serif text-4xl font-bold tracking-tight text-ink md:text-5xl">
        {word} <span className="align-middle font-sans text-base font-normal text-ink/45 md:text-lg">{pron}</span>{" "}
        <em className="align-middle font-serif text-lg font-normal text-ink/55 md:text-xl">{pos}</em>
      </p>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink/70">{children}</p>
    </div>
  );
}

export default function Home() {
  const [level, setLevel] = useState<LevelId>(1);
  const [joinLevel, setJoinLevel] = useState<LevelId>(1);
  const [joinTier, setJoinTier] = useState<Tier>("reader");

  const choose = (l: LevelId, t?: Tier) => {
    setJoinLevel(l);
    if (t) setJoinTier(t);
    document.getElementById("join")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="paper-grain min-h-screen text-ink">
      {/* Guide words, like the top of a dictionary page */}
      <div className="border-b border-ink/10 bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1.5 text-[11px] md:px-6">
          <span className="smallcaps text-paper/70">a·i — dic·tion·ar·y</span>
          <span className="hidden text-paper/70 sm:inline">Words, explained by AI. Wisdom, made simple.</span>
          <span className="smallcaps text-cyan">courses · ages 4 to adult</span>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/" aria-label="AI Dictionary home">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-ink/70 md:flex">
            <a href="#levels" className="hover:text-ink">Levels</a>
            <a href="#word" className="hover:text-ink">Word of the Day</a>
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost hidden sm:inline-flex">
              Log in
            </Link>
            <a href="#join" className="btn-primary">
              Subscribe free
            </a>
          </div>
        </div>
      </header>

      {/* Thumb index — the tabs cut into a printed dictionary's edge */}
      <nav aria-label="Sections" className="fixed right-0 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-1 xl:flex">
        {THUMB_INDEX.map((t) => (
          <a key={t.letter} href={t.href} className="group flex items-center justify-end" title={t.label}>
            <span className="mr-2 rounded bg-ink px-2 py-0.5 text-[11px] text-paper opacity-0 transition group-hover:opacity-100">{t.label}</span>
            <span className="flex h-11 w-9 items-center justify-center rounded-l-lg bg-ink font-serif text-lg font-bold text-paper shadow-md transition group-hover:w-11 group-hover:bg-cyan group-hover:text-ink">
              {t.letter}
            </span>
          </a>
        ))}
      </nav>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 md:px-6 md:pt-20 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="smallcaps text-sm text-cyan-600">The AI Dictionary · Courses</p>
            <h1 className="mt-4 font-serif text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
              Every word, <em className="font-medium text-cyan-600">explained.</em>
              <br />
              Every learner, <em className="font-medium text-gold-600">leveled.</em>
            </h1>
            <div className="mt-8 max-w-xl border-l-2 border-ink/15 pl-5 text-[17px] leading-relaxed text-ink/75">
              <p>
                <span className="font-serif text-xl font-semibold text-ink">dic·tion·ar·y</span> <span className="text-ink/45">/ˈdɪk.ʃə.ner.i/</span> <em className="text-ink/55">noun</em>
              </p>
              <p className="mt-1.5">
                <b className="text-ink">1.</b> a book of words and what they mean.
              </p>
              <p className="mt-1">
                <b className="text-ink">2.</b> <span className="text-ink/50">(here)</span> a school where AI explains every word at <i>your</i> level — from a child&apos;s first <i>“apple”</i> to a leader&apos;s best speech.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#join" className="btn-primary px-5 py-3 text-base">
                Start free →
              </a>
              <a href="#levels" className="btn-outline px-5 py-3 text-base">
                Explore the 5 levels
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/60">
              <li>✦ Ages 4 to adult</li>
              <li>✦ Exams & verified certificates</li>
              <li>✦ A new word every morning</li>
            </ul>
          </div>

          <WordOfTheDay level={level} setLevel={setLevel} />
        </section>

        {/* Levels */}
        <section className="rule-double border-ink/20 bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
            <EntryHead id="levels" word="lev·el" pron="/ˈlɛv.əl/" pos="noun">
              a step on the way up. Five of them here, each with its own robot guide, lessons, final exam, and certificate.
            </EntryHead>

            <ol className="mt-12 divide-y divide-ink/10 border-y border-ink/10">
              {LEVELS.map((l) => (
                <li key={l.id} className="group grid items-center gap-5 py-8 transition md:grid-cols-[64px_120px_1fr_auto] md:gap-8">
                  <span className="hidden font-serif text-6xl font-black text-ink/10 transition group-hover:text-ink/25 md:block">{l.id}</span>
                  <div className="flex items-center gap-4 md:block">
                    <div className="flex h-28 w-28 items-center justify-center rounded-2xl transition group-hover:-rotate-3" style={{ background: l.tint }}>
                      <Mascot level={l.id} size={88} />
                    </div>
                    <div className="md:hidden">
                      <span className="smallcaps text-xs text-ink/50">Level {l.id}</span>
                      <p className="font-serif text-3xl font-bold">{l.name}</p>
                    </div>
                  </div>
                  <div>
                    <p className="hidden md:block">
                      <span className="font-serif text-3xl font-bold">{l.name}</span> <span className="text-ink/45">{l.pron}</span> <em className="text-ink/55">noun</em>
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="chip px-2.5 py-1 text-white" style={{ background: l.color }}>
                        {l.ages}
                      </span>
                      <span className="font-serif text-lg italic text-ink/70">{l.tagline}</span>
                    </p>
                    <ol className="mt-3 space-y-1 text-[15px] text-ink/75">
                      {l.senses.map((s, i) => (
                        <li key={s}>
                          <b className="text-ink">{i + 1}.</b> {s}
                        </li>
                      ))}
                    </ol>
                    <p className="mt-3 text-sm text-ink/50">
                      <span className="smallcaps">e.g.</span> <i>{l.sampleWords.join(" · ")}</i>
                    </p>
                  </div>
                  <button onClick={() => choose(l.id, "learner")} className="btn-outline justify-self-start whitespace-nowrap group-hover:border-ink md:justify-self-end">
                    Start with {l.name} →
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <EntryHead id="how" word="learn" pron="/lɜːrn/" pos="verb">
            to read a little, try a little, and prove it. Three steps, the same at every level.
          </EntryHead>
          <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
            <ol className="space-y-8">
              {[
                { w: "read", p: "/riːd/", d: "Bite-size lessons, written by AI and checked by our teachers. Five minutes a day is enough." },
                { w: "test", p: "/tɛst/", d: "Quizzes as you go, then a final exam. Pass with 75% — you get three tries." },
                { w: "earn", p: "/ɜːrn/", d: "A certificate with your name, your level, and a QR code anyone can scan to verify it." },
              ].map((s, i) => (
                <li key={s.w} className="flex gap-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-ink font-serif text-xl font-bold">{i + 1}</span>
                  <div>
                    <p>
                      <span className="font-serif text-2xl font-bold">{s.w}</span> <span className="text-ink/45">{s.p}</span> <em className="text-ink/55">verb</em>
                    </p>
                    <p className="mt-1 text-ink/70">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Certificate />
          </div>
        </section>

        {/* Pricing */}
        <section className="rule-double border-ink/20 bg-ink text-paper">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
            <div id="pricing" className="scroll-mt-24">
              <p className="font-serif text-4xl font-bold tracking-tight md:text-5xl">
                sub·scrip·tion <span className="align-middle font-sans text-base font-normal text-paper/45 md:text-lg">/səbˈskrɪp.ʃən/</span> <em className="align-middle font-serif text-lg font-normal text-paper/55 md:text-xl">noun</em>
              </p>
              <p className="mt-3 max-w-2xl text-lg text-paper/70">a small promise to yourself, renewed monthly. Cancel anytime.</p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {TIERS.map((t) => (
                <div key={t.id} className={`relative flex flex-col rounded-2xl p-6 ${t.highlight ? "bg-paper text-ink shadow-xl ring-4 ring-cyan" : "border border-paper/15 bg-white/5"}`}>
                  {t.highlight && <span className="chip absolute -top-3 left-6 bg-cyan px-3 py-1 text-ink">Recommended</span>}
                  <p>
                    <span className="font-serif text-2xl font-bold">{t.name}</span> <span className={t.highlight ? "text-ink/45" : "text-paper/45"}>{t.pron}</span>
                  </p>
                  <p className={`mt-1 text-sm ${t.highlight ? "text-ink/60" : "text-paper/60"}`}>{t.blurb}</p>
                  <p className="mt-5">
                    <span className="font-serif text-5xl font-black">{t.price}</span> <span className={t.highlight ? "text-ink/50" : "text-paper/50"}>{t.period}</span>
                  </p>
                  <ol className={`mt-5 flex-1 space-y-2 text-sm ${t.highlight ? "text-ink/75" : "text-paper/75"}`}>
                    {t.includes.map((x, i) => (
                      <li key={x}>
                        <b>{i + 1}.</b> {x}
                      </li>
                    ))}
                  </ol>
                  <button onClick={() => choose(joinLevel, t.id)} className={`btn mt-6 py-2.5 ${t.highlight ? "bg-ink text-white hover:bg-ink-700" : "bg-paper text-ink hover:bg-white"}`}>
                    {t.id === "reader" ? "Subscribe free" : `Choose ${t.name}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Join */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:px-6 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <EntryHead id="join" word="sub·scrib·er" pron="/səbˈskraɪ.bər/" pos="noun">
              someone who wakes up to a new word every morning.
            </EntryHead>
            <p className="mt-3 text-ink/50">
              <span className="smallcaps">see also:</span> <i>you, in about thirty seconds.</i>
            </p>
            <blockquote className="mt-10 border-l-2 border-gold pl-5 font-serif text-xl italic leading-relaxed text-ink/80">
              “The limits of my language mean the limits of my world.”
              <footer className="mt-2 font-sans text-sm not-italic text-ink/50">— Ludwig Wittgenstein</footer>
            </blockquote>
          </div>
          <JoinForm level={joinLevel} setLevel={setJoinLevel} tier={joinTier} setTier={setJoinTier} />
        </section>
      </main>

      <footer className="border-t border-ink/10 bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.5fr_1fr_1fr] md:px-6">
          <div>
            <Wordmark light />
            <p className="mt-3 max-w-sm text-sm text-paper/60">Words, explained by AI. Wisdom, made simple. Quotes marked “AI-original” are written by our AI; all others are public domain or licensed.</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="smallcaps text-paper/40">Learn</p>
            <a href="#levels" className="block text-paper/75 hover:text-paper">The 5 levels</a>
            <a href="#pricing" className="block text-paper/75 hover:text-paper">Pricing</a>
            <a href="#join" className="block text-paper/75 hover:text-paper">Subscribe</a>
          </div>
          <div className="space-y-2 text-sm">
            <p className="smallcaps text-paper/40">Follow</p>
            <a href="https://facebook.com/aidictionary1" target="_blank" rel="noreferrer" className="block text-paper/75 hover:text-paper">
              Facebook ↗
            </a>
            <Link href="/login" className="block text-paper/75 hover:text-paper">
              Team log in
            </Link>
          </div>
        </div>
        <div className="border-t border-paper/10 py-4 text-center text-xs text-paper/40">© {new Date().getFullYear()} AI Dictionary</div>
      </footer>
    </div>
  );
}

function WordOfTheDay({ level, setLevel }: { level: LevelId; setLevel: (l: LevelId) => void }) {
  const w = WORD_OF_THE_DAY;
  const current = LEVELS.find((l) => l.id === level)!;
  const entry = w.byLevel[level];
  return (
    <div id="word" className="relative scroll-mt-24">
      <div className="absolute -inset-3 -z-10 rotate-2 rounded-3xl bg-ink/5" />
      <article className="rounded-2xl border border-ink/15 bg-white p-6 shadow-[0_20px_60px_-20px_rgba(27,42,74,0.35)] md:p-8">
        <div className="flex items-center justify-between">
          <span className="smallcaps text-xs text-ink/50">Word of the Day</span>
          <span className="smallcaps text-xs text-ink/40">{new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric" })}</span>
        </div>
        <div className="rule-double mt-3 pt-4">
          <p className="font-serif text-6xl font-black tracking-tight">{w.word}</p>
          <p className="mt-1 text-ink/55">
            {w.syllables} · {w.pron} · <em>{w.pos}</em>
          </p>
        </div>

        <p className="smallcaps mt-6 text-xs text-ink/50">Explained for</p>
        <div className="mt-2 grid grid-cols-5 gap-1.5" role="tablist">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              role="tab"
              aria-selected={l.id === level}
              onClick={() => setLevel(l.id)}
              className={`flex flex-col items-center rounded-xl border px-1 py-2 text-[11px] font-medium transition ${l.id === level ? "border-ink bg-ink text-paper" : "border-ink/10 hover:border-ink/40"}`}
            >
              <Mascot level={l.id} size={34} />
              <span className="mt-1">{l.name}</span>
            </button>
          ))}
        </div>

        <div key={level} className="mt-5 min-h-[150px] rounded-xl p-4 transition" style={{ background: current.tint }}>
          <p className="text-xs font-semibold" style={{ color: current.color }}>
            {current.name} · {current.ages}
          </p>
          <p className="mt-2 text-lg leading-snug">
            <b>1.</b> {entry.def}
          </p>
          <p className="mt-2 font-serif italic text-ink/70">{entry.example}</p>
        </div>
        <p className="mt-4 border-t border-ink/10 pt-3 text-xs text-ink/50">
          <span className="smallcaps">origin</span> {w.etymology}
        </p>
      </article>
    </div>
  );
}

function Certificate() {
  // Decorative QR-like grid (prototype — real certificates get a scannable code).
  const cells = Array.from({ length: 81 }, (_, i) => (i * 37 + (i % 7) * 11) % 5 < 2 || [0, 1, 2, 9, 11, 18, 19, 20].includes(i) || [6, 7, 8, 15, 17, 24, 25, 26].includes(i));
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="absolute -inset-2 -z-10 -rotate-2 rounded-2xl bg-gold/30" />
      <div className="rounded-xl bg-white p-2 shadow-xl">
        <div className="rounded-lg border-[3px] border-double border-ink/40 p-6 text-center md:p-8">
          <p className="smallcaps text-xs tracking-[0.25em] text-ink/50">AI Dictionary</p>
          <p className="mt-3 font-serif text-3xl font-bold md:text-4xl">Certificate of Mastery</p>
          <p className="mt-4 text-sm text-ink/60">This certifies that</p>
          <p className="mt-1 font-serif text-2xl italic">Juana dela Cruz</p>
          <p className="mt-3 text-sm text-ink/60">has completed</p>
          <p className="mt-1 flex items-center justify-center gap-2 font-semibold">
            <Mascot level={4} size={28} /> Level 4 · Nova
          </p>
          <div className="mt-6 flex items-end justify-between text-left text-[10px] text-ink/50">
            <div>
              <p className="font-serif text-sm italic text-ink">Sherlyn Aguilar</p>
              <p className="border-t border-ink/30 pt-0.5">Founder</p>
            </div>
            <div className="text-right">
              <svg width="54" height="54" viewBox="0 0 9 9" className="ml-auto" aria-label="Verification code">
                {cells.map((on, i) => on && <rect key={i} x={i % 9} y={Math.floor(i / 9)} width="1" height="1" fill="#1B2A4A" />)}
              </svg>
              <p className="mt-1">ID AID-L4-0001 · scan to verify</p>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-ink/40">Sample certificate</p>
    </div>
  );
}

function JoinForm({ level, setLevel, tier, setTier }: { level: LevelId; setLevel: (l: LevelId) => void; tier: Tier; setTier: (t: Tier) => void }) {
  const store = useOptionalStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [parent, setParent] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const minor = level <= 2;
  const lv = LEVELS.find((l) => l.id === level)!;
  const tierInfo = TIERS.find((t) => t.id === tier)!;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Please enter a valid email.");
    if (!consent) return setError("Please agree to receive emails so we can send your words.");
    if (minor && !parent) return setError("Levels 1–2 are for children — a parent or guardian must give consent.");
    if (store?.state.subscribers.some((s) => s.email.toLowerCase() === email.trim().toLowerCase())) return setError("That email is already subscribed. 🎉");
    store?.act((s) => {
      s.subscribers.unshift({ id: uid("sub"), name: name.trim() || email.split("@")[0], email: email.trim(), level, tier, parentConsent: parent, newsletterConsent: consent, source: "website", createdAt: new Date().toISOString() });
      s.activity.unshift({ id: uid("act"), at: new Date().toISOString(), agent: "Herald", message: `New subscriber from the website: ${name.trim() || email} — ${tierInfo.name}, Level ${level} (${lv.name}).`, href: "/subscribers" });
    });
    setError(null);
    setDone(name.trim() || "friend");
  }

  if (done)
    return (
      <div className="rounded-2xl border border-ink/15 bg-white p-8 shadow-xl">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl" style={{ background: lv.tint }}>
          <Mascot level={level} size={76} />
        </div>
        <p className="mt-6 text-center font-serif text-4xl font-bold">wel·come, {done}.</p>
        <p className="mt-2 text-center text-ink/65">
          <em>interjection</em> — what {lv.name} says when a new learner arrives. Your first word lands in your inbox tomorrow morning.
        </p>
        {tier !== "reader" && <p className="mt-4 rounded-lg bg-gold/15 p-3 text-center text-sm text-ink/75">We&apos;ve saved your {tierInfo.name} spot. We&apos;ll email you a payment link to unlock the full course.</p>}
        <button className="btn-outline mx-auto mt-6 flex" onClick={() => (setDone(null), setName(""), setEmail(""), setConsent(false), setParent(false))}>
          Subscribe someone else
        </button>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-ink/15 bg-white p-6 shadow-xl md:p-8" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">{minor ? "Child's first name" : "Your name"}</span>
          <input className="input mt-1 py-2.5" value={name} onChange={(e) => setName(e.target.value)} placeholder={minor ? "e.g. Mika" : "e.g. Juana"} autoComplete="given-name" />
        </label>
        <label className="block">
          <span className="label">{minor ? "Parent's email" : "Email"}</span>
          <input className="input mt-1 py-2.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" required />
        </label>
      </div>

      <div>
        <span className="label">Level</span>
        <div className="mt-1.5 grid grid-cols-5 gap-1.5">
          {LEVELS.map((l) => (
            <button
              type="button"
              key={l.id}
              onClick={() => setLevel(l.id)}
              className={`flex flex-col items-center rounded-xl border px-1 py-2 text-[11px] transition ${l.id === level ? "border-ink bg-ink text-paper" : "border-ink/10 hover:border-ink/40"}`}
            >
              <Mascot level={l.id} size={30} />
              <span className="mt-1 font-medium">{l.name}</span>
              <span className={l.id === level ? "text-paper/60" : "text-ink/40"}>{l.ages.replace("Ages ", "")}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Plan</span>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
          {TIERS.map((t) => (
            <label key={t.id} className={`cursor-pointer rounded-xl border p-3 transition ${t.id === tier ? "border-ink ring-1 ring-ink" : "border-ink/10 hover:border-ink/40"}`}>
              <input type="radio" name="tier" className="sr-only" checked={t.id === tier} onChange={() => setTier(t.id)} />
              <span className="block font-serif text-lg font-bold">{t.name}</span>
              <span className="block text-sm text-ink/60">
                {t.price}
                {t.period}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2 text-sm text-ink/70">
        <label className="flex items-start gap-2.5">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-ink" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>Send me the Word of the Day and newsletter. I can unsubscribe anytime.</span>
        </label>
        {minor && (
          <label className="flex items-start gap-2.5 rounded-lg bg-gold/15 p-2.5">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-ink" checked={parent} onChange={(e) => setParent(e.target.checked)} />
            <span>I am the parent or guardian and I consent to my child&apos;s data being used for lessons and progress reports.</span>
          </label>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{error}</p>}

      <button className="btn-primary w-full py-3 text-base">
        {tier === "reader" ? "Subscribe free" : `Continue with ${tierInfo.name}`} — Level {level} · {lv.name}
      </button>
      <p className="text-center text-xs text-ink/40">Handled under the Philippine Data Privacy Act. See our privacy notice.</p>
    </form>
  );
}
