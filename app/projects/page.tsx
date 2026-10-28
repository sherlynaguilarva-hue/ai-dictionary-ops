"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { projectHealth } from "@/lib/engine";
import { daysBetween, fmt, today } from "@/lib/dates";
import { Entry, HealthChip } from "@/components/ui";

export default function ProjectsPage() {
  const { state } = useStore();
  const t = today();
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="h-entry text-2xl">Projects</h1>
      {state.projects.length === 0 && (
        <div className="card p-6">
          <Entry word="emp·ty" pron="/ˈɛmpti/" pos="adjective">
            what this page is until a deal is marked Won. Go to the Pipeline to start one.
          </Entry>
        </div>
      )}
      {state.projects.map((p) => {
        const e = state.events.find((x) => x.id === p.eventId)!;
        const tasks = state.tasks.filter((x) => x.projectId === p.id);
        const done = tasks.filter((x) => x.status === "done").length;
        const { health, reasons } = projectHealth(state, p.id, t);
        return (
          <Link key={p.id} href={`/projects/${p.id}`} className="card block p-4 hover:border-cyan-600">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-ink/50">
                  {fmt(e.date, { month: "long", day: "numeric", year: "numeric" })} · T-{daysBetween(t, e.date)} days · {done}/{tasks.length} tasks done
                </div>
              </div>
              <HealthChip health={health} />
            </div>
            {reasons.length > 0 && <div className="mt-2 text-xs text-ink/60">{reasons.join(" · ")}</div>}
          </Link>
        );
      })}
    </div>
  );
}
