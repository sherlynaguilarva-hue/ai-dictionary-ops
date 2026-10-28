"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useOptionalStore } from "@/lib/store";
import { ROLE_LABEL } from "@/lib/types";
import { Mascot } from "@/components/Mascot";
import { Avatar } from "@/components/ui";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-paper lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper font-serif text-lg font-bold text-ink">Ai</span>
          <span className="font-serif text-xl font-semibold">AI Dictionary</span>
        </Link>
        <div className="my-auto max-w-md">
          <p className="smallcaps text-sm text-cyan">Team workspace</p>
          <p className="mt-4 font-serif text-6xl font-black leading-none tracking-tight">
            log·in
          </p>
          <p className="mt-3 text-paper/55">
            /ˈlɒɡ ɪn/ <em>verb</em>
          </p>
          <p className="mt-6 text-xl leading-relaxed text-paper/80">
            <b className="text-paper">1.</b> to tell the app who you are, so it can tell you what to do today.
          </p>
          <p className="mt-2 text-xl leading-relaxed text-paper/80">
            <b className="text-paper">2.</b> the moment the work starts doing itself.
          </p>
        </div>
        <div className="flex items-end gap-3">
          {([1, 2, 3, 4, 5] as const).map((l, i) => (
            <div key={l} style={{ transform: `translateY(${[8, 0, 12, 4, 10][i]}px)` }}>
              <Mascot level={l} size={64} />
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[40px] border-paper/5" />
      </aside>

      <main className="paper-grain flex items-center justify-center p-4 sm:p-8">
        <Suspense>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}

function LoginForm() {
  const store = useOptionalStore();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  function signIn(e?: React.FormEvent, asEmail = email) {
    e?.preventDefault();
    if (!store) return;
    const user = store.state.users.find((u) => u.email.toLowerCase() === asEmail.trim().toLowerCase());
    if (!user) {
      const learner = store.state.subscribers.some((s) => s.email.toLowerCase() === asEmail.trim().toLowerCase());
      setMessage(
        learner
          ? { tone: "info", text: "That's a learner account. The learner portal (lessons, exams, certificates) opens with the first courses — we'll email you." }
          : { tone: "error", text: "We couldn't find a team account with that email." },
      );
      return;
    }
    if (asEmail === email && !password) {
      setMessage({ tone: "error", text: "Enter your password." });
      return;
    }
    store.act((s) => void (s.currentUserId = user.id));
    router.push(next.startsWith("/") ? next : "/dashboard");
  }

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="mb-10 flex items-center gap-2.5 lg:hidden">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink font-serif text-lg font-bold text-cyan">Ai</span>
        <span className="font-serif text-xl font-semibold">AI Dictionary</span>
      </Link>

      <h1 className="font-serif text-4xl font-bold tracking-tight">Welcome back.</h1>
      <p className="mt-2 text-ink/60">Sign in to your team workspace.</p>

      <form onSubmit={signIn} className="mt-8 space-y-4" noValidate>
        <label className="block">
          <span className="label">Work email</span>
          <input className="input mt-1 py-2.5" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@aidictionary.example" />
        </label>
        <label className="block">
          <span className="flex items-center justify-between">
            <span className="label">Password</span>
            <button type="button" className="text-xs text-cyan-600 hover:underline" onClick={() => setMessage({ tone: "info", text: "Ask the Owner or Admin to send you a reset link (arrives with real accounts)." })}>
              Forgot password?
            </button>
          </span>
          <span className="relative mt-1 block">
            <input className="input py-2.5 pr-14" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-3 text-xs text-ink/50 hover:text-ink">
              {show ? "Hide" : "Show"}
            </button>
          </span>
        </label>
        {message && <p className={`rounded-lg p-2.5 text-sm ${message.tone === "error" ? "bg-red-50 text-red-800" : "bg-cyan/10 text-ink/80"}`}>{message.text}</p>}
        <button className="btn-primary w-full py-3 text-base" disabled={!store}>
          Sign in
        </button>
      </form>

      <div className="mt-10">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-ink/10" />
          <span className="smallcaps text-xs text-ink/40">prototype · one-tap demo accounts</span>
          <span className="h-px flex-1 bg-ink/10" />
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {store?.state.users.map((u) => (
            <li key={u.id}>
              <button onClick={() => signIn(undefined, u.email)} className="flex w-full items-center gap-2 rounded-lg border border-ink/10 bg-white px-2 py-1.5 text-left hover:border-ink/40">
                <Avatar user={u} size={26} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{u.name.split(" ")[0]}</span>
                  <span className="block truncate text-[11px] text-ink/50">{ROLE_LABEL[u.roles[0]]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-10 text-center text-sm text-ink/50">
        Looking for courses?{" "}
        <Link href="/#join" className="text-cyan-600 hover:underline">
          Subscribe free
        </Link>
      </p>
    </div>
  );
}
