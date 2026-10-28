"use client";

import Link from "next/link";
import { useState } from "react";
import { useCurrentUser, useStore } from "@/lib/store";
import { buildBrief, briefDateLabel, type Action } from "@/lib/risk";
import { addComment, notify } from "@/lib/engine";
import { draftGapPosts } from "@/lib/social";
import { now } from "@/lib/clock";
import { fmt, today } from "@/lib/dates";
import { Avatar, Entry, HealthChip } from "@/components/ui";

/** Sentinel's morning Risk Brief. */
export default function BriefPage() {
  const { state, act } = useStore();
  const me = useCurrentUser()!;
  const t = today();
  const brief = buildBrief(state, t);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const name = (id: string) => state.users.find((u) => u.id === id)?.name ?? "—";
  const hour = now().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  function run(a: Action, key: string) {
    if (a.kind === "nudge")
      act((s) => {
        const task = s.tasks.find((x) => x.id === a.taskId)!;
        notify(s, a.userId, "escalation", null, `👋 ${me.name} is asking about a late task`, `“${task.title}” — can you share an update or a new date?`, `/tasks/${task.id}`);
        addComment(s, task.id, { kind: "system", userId: me.id, text: `${me.name} sent a nudge from the Risk Brief` });
      });
    if (a.kind === "draft-posts") act((s) => draftGapPosts(s, a.projectId));
    setDone((d) => ({ ...d, [key]: true }));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <p className="label">✦ Sentinel · Morning Risk Brief · {briefDateLabel(t)}</p>
        <h1 className="h-entry mt-1 text-3xl">
          {greeting}, {me.name.split(" ")[0]}.
        </h1>
        <p className="mt-1 text-lg text-ink/70">{brief.headline}</p>
        <div className="mt-2">
          <Entry word="risk" pron="/rɪsk/" pos="noun">
            a problem you can still fix — if you see it early enough.
          </Entry>
        </div>
      </div>

      {brief.actions.length > 0 && (
        <section className="card border-ink p-4">
          <h2 className="h-entry text-lg">What to do next</h2>
          <ol className="mt-2 space-y-2">
            {brief.actions.map((a, i) => {
              const key = `${a.kind}-${i}-${a.text}`;
              return (
                <li key={key} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{i + 1}</span>
                  <span className="min-w-0 flex-1">{a.text}</span>
                  {a.kind === "open" ? (
                    <Link href={a.href} className="btn-outline px-2.5 py-1 text-xs">
                      Open →
                    </Link>
                  ) : done[key] ? (
                    <span className="chip bg-emerald-100 text-emerald-800">✓ {a.kind === "nudge" ? "Nudged" : "Drafted"}</span>
                  ) : (
                    <button className="btn-primary px-2.5 py-1 text-xs" onClick={() => run(a, key)}>
                      {a.kind === "nudge" ? "👋 Nudge" : "✦ Draft posts"}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section>
        <h2 className="h-entry mb-2 text-lg">Projects</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {brief.projects.map((p) => (
            <Link key={p.projectId} href={`/projects/${p.projectId}?view=timeline`} className="card min-w-0 p-3 hover:border-cyan-600">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-ink/50">{p.daysToLaunch >= 0 ? `T-${p.daysToLaunch} days` : `${-p.daysToLaunch} days in`}</div>
                </div>
                <HealthChip health={p.health} />
              </div>
              {p.reasons.length > 0 && <ul className="mt-2 space-y-0.5 text-xs text-ink/65">{p.reasons.map((r) => <li key={r}>• {r}</li>)}</ul>}
            </Link>
          ))}
        </div>
      </section>

      {brief.whatIfs.length > 0 && (
        <section className="card border-amber-200 bg-amber-50/50 p-4">
          <h2 className="h-entry text-lg">Delay predictions</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {brief.whatIfs.map((w) => (
              <li key={w.taskId}>
                <Link href={`/tasks/${w.taskId}`} className="hover:underline">
                  ⚠ {w.text}
                </Link>{" "}
                <span className="text-xs text-ink/45">— {w.projectName}</span>
              </li>
            ))}
          </ul>
          {brief.slipping.length > 0 && (
            <p className="mt-3 text-xs text-ink/60">
              Already forecast to slip:{" "}
              {brief.slipping.slice(0, 4).map((s, i) => (
                <span key={s.id}>
                  {i > 0 && ", "}
                  <Link href={`/tasks/${s.id}`} className={s.eventRisk ? "font-semibold text-red-700" : ""}>
                    {s.title} (+{s.slip}d{s.eventRisk ? ", hits the event" : ""})
                  </Link>
                </span>
              ))}
            </p>
          )}
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4">
          <h2 className="h-entry text-lg">Late tasks</h2>
          {brief.late.length === 0 ? (
            <p className="mt-1 text-sm text-emerald-800">Nothing late. ✓</p>
          ) : (
            <ul className="mt-2 divide-y divide-ink-100">
              {brief.late.slice(0, 6).map((x) => (
                <li key={x.id}>
                  <Link href={`/tasks/${x.id}`} className="flex items-center gap-2 py-2 text-sm hover:text-cyan-600">
                    <Avatar user={state.users.find((u) => u.id === x.assigneeId)} size={22} />
                    <span className="min-w-0 flex-1 truncate">{x.title}</span>
                    <span className="shrink-0 text-xs font-semibold text-red-600">{x.daysLate}d late</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h2 className="h-entry text-lg">Not updating</h2>
          {brief.silent.length === 0 ? (
            <p className="mt-1 text-sm text-emerald-800">Everyone checked in yesterday. ✓</p>
          ) : (
            <ul className="mt-2 divide-y divide-ink-100">
              {brief.silent.map(({ user, tasks }) => (
                <li key={user.id} className="flex items-center gap-2 py-2 text-sm">
                  <Avatar user={user} size={22} />
                  <span className="flex-1">{user.name}</span>
                  <span className="text-xs text-ink/50">
                    {tasks.length} task{tasks.length > 1 ? "s" : ""} without an update
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/check-in?tab=team" className="mt-2 inline-block text-xs text-cyan-600 hover:underline">
            Team check-in board →
          </Link>
        </section>
      </div>

      <section className="card p-4">
        <h2 className="h-entry text-lg">Social coverage</h2>
        {brief.gaps.length === 0 ? (
          <p className="mt-1 text-sm text-emerald-800">Every project has enough posts scheduled for the next 7 days. ✓</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {brief.gaps.map((g) => (
              <li key={g.projectId}>📣 {g.message}</li>
            ))}
          </ul>
        )}
        <Link href="/social" className="mt-2 inline-block text-xs text-cyan-600 hover:underline">
          Social calendar →
        </Link>
      </section>

      <p className="text-center text-xs text-ink/40">
        Sent to Owner and Admin every morning at 8:00 AM · generated {fmt(t, { month: "short", day: "numeric" })} for {name(me.id)}
      </p>
    </div>
  );
}
