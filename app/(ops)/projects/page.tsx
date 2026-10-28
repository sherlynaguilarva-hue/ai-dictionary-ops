"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { projectHealth } from "@/lib/engine";
import { addDays, daysBetween, fmt, parseDate, today } from "@/lib/dates";
import { INITIATIVE, type Event, type InitiativeKind, type Project } from "@/lib/types";
import { Entry, HealthChip, KindChip } from "@/components/ui";
import { NewProjectButton } from "@/components/NewProject";

export default function ProjectsPage() {
  const { state } = useStore();
  const [kind, setKind] = useState<InitiativeKind | "all">("all");
  const [view, setView] = useState<"list" | "timeline">("list");
  const t = today();
  const rows = state.projects
    .map((p) => ({ p, e: state.events.find((x) => x.id === p.eventId)! }))
    .filter(({ e }) => kind === "all" || e.kind === kind)
    .sort((a, b) => a.e.date.localeCompare(b.e.date));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-entry text-2xl">Projects</h1>
          <p className="text-sm text-ink/60">Client campaigns, our course launches and events — one place.</p>
        </div>
        <NewProjectButton />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="mr-2 inline-flex rounded-lg border border-ink-100 bg-white p-0.5">
          {(["list", "timeline"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1 text-sm ${view === v ? "bg-ink text-white" : "text-ink/60"}`}>
              {v === "list" ? "☰ List" : "▬ Timeline"}
            </button>
          ))}
        </div>
        {(["all", "campaign", "course", "event"] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`chip px-3 py-1 ${kind === k ? "bg-ink text-white" : "bg-white text-ink/60 ring-1 ring-ink-100"}`}>
            {k === "all" ? "All" : `${INITIATIVE[k].icon} ${INITIATIVE[k].label}s`}
          </button>
        ))}
      </div>

      {rows.length === 0 && (
        <div className="card p-6">
          <Entry word="emp·ty" pron="/ˈɛmpti/" pos="adjective">
            nothing here yet. Win a deal in the Pipeline, or start one with “New project”.
          </Entry>
        </div>
      )}
      {view === "timeline" && rows.length > 0 && <Portfolio rows={rows} />}
      {view === "list" && rows.map(({ p, e }) => {
        const tasks = state.tasks.filter((x) => x.projectId === p.id);
        const done = tasks.filter((x) => x.status === "done").length;
        const { health, reasons } = projectHealth(state, p.id, t);
        const days = daysBetween(t, e.date);
        return (
          <Link key={p.id} href={`/projects/${p.id}`} className="card block p-4 hover:border-cyan-600">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <KindChip kind={e.kind} />
                <div className="mt-1.5 font-medium">{p.name}</div>
                <div className="text-xs text-ink/50">
                  {INITIATIVE[e.kind].dateLabel} {fmt(e.date, { month: "long", day: "numeric", year: "numeric" })} · {days >= 0 ? `T-${days} days` : `${-days} days in`} · {done}/{tasks.length} tasks done
                </div>
              </div>
              <HealthChip health={health} />
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-50">
              <div className="h-full bg-cyan" style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }} />
            </div>
            {reasons.length > 0 && <div className="mt-2 text-xs text-ink/60">{reasons.join(" · ")}</div>}
          </Link>
        );
      })}
    </div>
  );
}

/** All projects on one timeline: from kickoff to launch / event day, coloured by health. */
function Portfolio({ rows }: { rows: { p: Project; e: Event }[] }) {
  const { state } = useStore();
  const t = today();
  const DAY = 9;
  const start = addDays([t, ...rows.map((r) => r.p.createdAt)].sort()[0], -3);
  const end = addDays([t, ...rows.map((r) => r.e.date)].sort().at(-1)!, 10);
  const total = daysBetween(start, end) + 1;
  const x = (d: string) => daysBetween(start, d) * DAY;
  const months: { label: string; left: number }[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) if (d === start || parseDate(d).getDate() === 1) months.push({ label: parseDate(d).toLocaleDateString("en-PH", { month: "short", year: "2-digit" }), left: x(d) });
  const fill = { green: "bg-emerald-500", yellow: "bg-amber-400", red: "bg-red-500" };
  return (
    <div className="card flex overflow-hidden">
      <div className="w-36 shrink-0 border-r border-ink-100 sm:w-56">
        <div className="h-8 border-b border-ink-100" />
        {rows.map(({ p }) => (
          <Link key={p.id} href={`/projects/${p.id}?view=timeline`} className="flex h-12 items-center border-b border-ink-100/60 px-3 text-xs hover:bg-ink-50">
            <span className="line-clamp-2">{p.name}</span>
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div className="relative" style={{ width: total * DAY }}>
          <div className="relative h-8 border-b border-ink-100 bg-paper text-[11px] font-semibold text-ink/60">
            {months.map((m) => (
              <span key={m.left} className="absolute top-2 border-l border-ink-100 pl-1" style={{ left: m.left }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="absolute bottom-0 top-8 z-10 w-0.5 bg-cyan-600" style={{ left: x(t) }} title="Today" />
          {rows.map(({ p, e }) => {
            const { health } = projectHealth(state, p.id, t);
            const tasks = state.tasks.filter((k) => k.projectId === p.id);
            const pct = tasks.length ? tasks.filter((k) => k.status === "done").length / tasks.length : 0;
            return (
              <div key={p.id} className="relative h-12 border-b border-ink-100/60">
                <Link
                  href={`/projects/${p.id}?view=timeline`}
                  title={`${p.name}: ${fmt(p.createdAt)} → ${fmt(e.date)} · ${Math.round(pct * 100)}% done`}
                  className="absolute top-3 h-6 overflow-hidden rounded-full bg-ink-100"
                  style={{ left: x(p.createdAt), width: Math.max(DAY * 2, x(e.date) - x(p.createdAt)) }}
                >
                  <span className={`block h-full ${fill[health]}`} style={{ width: `${Math.max(4, pct * 100)}%` }} />
                </Link>
                <span className="absolute top-2.5 z-10 -ml-2 text-lg leading-none" style={{ left: x(e.date) }} title={`${INITIATIVE[e.kind].dateLabel}: ${fmt(e.date)}`}>
                  {INITIATIVE[e.kind].icon}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
