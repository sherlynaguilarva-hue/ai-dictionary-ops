"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { projectHealth } from "@/lib/engine";
import { daysBetween, fmt, today } from "@/lib/dates";
import { INITIATIVE, type InitiativeKind } from "@/lib/types";
import { Entry, HealthChip, KindChip } from "@/components/ui";
import { NewProjectButton } from "@/components/NewProject";

export default function ProjectsPage() {
  const { state } = useStore();
  const [kind, setKind] = useState<InitiativeKind | "all">("all");
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

      <div className="flex flex-wrap gap-1.5">
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
      {rows.map(({ p, e }) => {
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
