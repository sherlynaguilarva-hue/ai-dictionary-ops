"use client";

import Link from "next/link";
import { useCurrentUser, useStore } from "@/lib/store";
import { isOverdue, projectHealth } from "@/lib/engine";
import { daysBetween, fmt, relative, today } from "@/lib/dates";
import { AgentBadge, Entry, HealthChip, KindChip } from "@/components/ui";
import { INITIATIVE } from "@/lib/types";
import { checkInFor, noUpdateList, tasksNeedingUpdate } from "@/lib/automations";
import { addDays } from "@/lib/dates";
import { Avatar } from "@/components/ui";

export default function Dashboard() {
  const { state } = useStore();
  const user = useCurrentUser()!;
  const t = today();

  const openDeals = state.deals.filter((d) => !["won", "active", "completed"].includes(d.stage));
  const pipelineValue = openDeals.reduce((n, d) => n + d.value, 0);
  const mine = state.tasks.filter((x) => x.assigneeId === user.id && x.status !== "done");
  const dueToday = mine.filter((x) => x.due <= t);
  const overdue = state.tasks.filter((x) => isOverdue(x, t));

  const stats = [
    { label: "Open pipeline", value: `₱${(pipelineValue / 1000).toFixed(0)}k`, sub: `${openDeals.length} deals` },
    { label: "Active projects", value: state.projects.length, sub: `${state.events.filter((e) => !e.projectId).length} more in pipeline` },
    { label: "Subscribers", value: state.subscribers.length, sub: `${state.subscribers.filter((x) => x.tier !== "reader").length} paid plans` },
    { label: "My tasks due", value: dueToday.length, sub: `${mine.length} open` },
    { label: "Overdue (team)", value: overdue.length, sub: overdue.length ? "needs attention" : "all clear" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="h-entry text-2xl md:text-3xl">Good day, {user.name.split(" ")[0]}.</h1>
        <div className="mt-2">
          <Entry word="au·to·pi·lot" pron="/ˈɔːtəʊˌpaɪlət/" pos="noun">
            when a won deal turns into tasks, dates and reminders without anyone typing them.
          </Entry>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="label">{s.label}</div>
            <div className="mt-1 font-serif text-2xl font-semibold">{s.value}</div>
            <div className="text-xs text-ink/50">{s.sub}</div>
          </div>
        ))}
      </div>

      <NoUpdateCard />

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="space-y-3 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="h-entry text-lg">Coming up</h2>
            <Link href="/pipeline" className="text-sm text-cyan-600 hover:underline">
              Pipeline →
            </Link>
          </div>
          {[...state.events]
            .filter((e) => e.projectId || state.deals.some((d) => d.eventId === e.id && ["proposal", "negotiation"].includes(d.stage)))
            .filter((e) => daysBetween(t, e.date) >= -7)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((e) => {
              const p = state.projects.find((x) => x.id === e.projectId);
              const tasks = p ? state.tasks.filter((x) => x.projectId === p.id) : [];
              const done = tasks.filter((x) => x.status === "done").length;
              const h = p ? projectHealth(state, p.id, t) : null;
              const sponsors = state.deals.filter((d) => d.eventId === e.id && d.stage === "won").length;
              const inPipe = state.deals.filter((d) => d.eventId === e.id && !["won", "active", "completed"].includes(d.stage)).length;
              return (
                <div key={e.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <KindChip kind={e.kind} />
                      <div className="mt-1.5 font-medium">{e.name}</div>
                      <div className="text-xs text-ink/50">
                        {INITIATIVE[e.kind].dateLabel} {fmt(e.date, { weekday: "short", month: "short", day: "numeric" })} · {e.venue} · {daysBetween(t, e.date) >= 0 ? `T-${daysBetween(t, e.date)} days` : `${-daysBetween(t, e.date)} days in`}
                      </div>
                    </div>
                    {h ? <HealthChip health={h.health} /> : <span className="chip bg-ink-50 text-ink/60">Deal not won yet</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/60">
                    {(sponsors > 0 || inPipe > 0) && <span>{sponsors} deal{sponsors === 1 ? "" : "s"} won</span>}
                    {inPipe > 0 && <span>{inPipe} in pipeline</span>}
                    {p && (
                      <span>
                        {done}/{tasks.length} tasks done
                      </span>
                    )}
                  </div>
                  {p && (
                    <>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-50">
                        <div className="h-full bg-cyan" style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }} />
                      </div>
                      <Link href={`/projects/${p.id}`} className="mt-3 inline-block text-sm text-cyan-600 hover:underline">
                        Open project →
                      </Link>
                    </>
                  )}
                </div>
              );
            })}
        </section>

        <section className="space-y-3 lg:col-span-2">
          <h2 className="h-entry text-lg">AI team activity</h2>
          <div className="card divide-y divide-ink-100">
            {state.activity.length === 0 && <p className="p-4 text-sm text-ink/50">Nothing yet.</p>}
            {state.activity.slice(0, 12).map((a) => (
              <div key={a.id} className="flex gap-3 p-3 text-sm">
                <div className="pt-0.5">{a.agent ? <AgentBadge name={a.agent} /> : <span className="chip bg-ink-50 text-ink/60">You</span>}</div>
                <div className="min-w-0 flex-1">
                  {a.href ? (
                    <Link href={a.href} className="hover:underline">
                      {a.message}
                    </Link>
                  ) : (
                    a.message
                  )}
                  <div className="text-[11px] text-ink/40">{relative(a.at.slice(0, 10))} · {new Date(a.at).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/** For Owner / Admin: who didn't check in yesterday, and today's progress. */
function NoUpdateCard() {
  const { state } = useStore();
  const me = useCurrentUser()!;
  if (!me.roles.includes("owner") && !me.roles.includes("admin")) return null;
  const t = today();
  const missed = noUpdateList(state, addDays(t, -1));
  const due = state.users.filter((u) => tasksNeedingUpdate(state, u.id, t).length || checkInFor(state, u.id, t));
  const done = due.filter((u) => checkInFor(state, u.id, t));
  return (
    <Link href="/check-in?tab=team" className={`card flex flex-wrap items-center gap-4 p-4 hover:border-cyan-600 ${missed.length ? "border-red-200" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="label">{missed.length ? "No update yesterday" : "Daily check-in"}</div>
        {missed.length ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {missed.map((m) => (
              <span key={m.user.id} className="chip gap-1.5 bg-red-50 py-0.5 pl-0.5 pr-2.5 text-red-800">
                <Avatar user={m.user} size={20} /> {m.user.name.split(" ")[0]} · {m.tasks.length}
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-1 text-sm text-emerald-800">Everyone with tasks updated yesterday ✓</div>
        )}
      </div>
      <div className="text-right">
        <div className="font-serif text-2xl font-semibold">
          {done.length}/{due.length}
        </div>
        <div className="text-[11px] text-ink/50">checked in today</div>
      </div>
    </Link>
  );
}
