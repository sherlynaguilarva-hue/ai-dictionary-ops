"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { projectHealth } from "@/lib/engine";
import { daysBetween, fmt, tMinus, today } from "@/lib/dates";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { HealthChip } from "@/components/ui";
import { TaskRow } from "@/components/TaskRow";
import { NewTaskButton } from "@/components/NewTask";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useStore();
  const [role, setRole] = useState<Role | "all">("all");
  const [hideDone, setHideDone] = useState(false);
  const t = today();

  const project = state.projects.find((p) => p.id === id);
  if (!project) return <p className="text-sm text-ink/60">Project not found.</p>;
  const event = state.events.find((e) => e.id === project.eventId)!;
  const { health, reasons } = projectHealth(state, id, t);
  const all = state.tasks.filter((x) => x.projectId === id);
  const tasks = all
    .filter((x) => role === "all" || x.role === role)
    .filter((x) => !hideDone || x.status !== "done")
    .sort((a, b) => a.due.localeCompare(b.due));
  const posts = state.posts.filter((p) => p.projectId === id).sort((a, b) => a.date.localeCompare(b.date));
  const sponsors = state.deals.filter((d) => d.eventId === event.id && d.stage === "won");
  const roles = Array.from(new Set(all.map((x) => x.role)));
  const done = all.filter((x) => x.status === "done").length;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link href="/projects" className="text-sm text-ink/50 hover:text-ink">
        ← Projects
      </Link>
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="h-entry text-2xl">{project.name}</h1>
            <div className="text-sm text-ink/60">
              {fmt(event.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · {event.venue}
            </div>
          </div>
          <div className="text-right">
            <HealthChip health={health} />
            <div className="mt-1 font-serif text-xl font-semibold">T-{daysBetween(t, event.date)}</div>
          </div>
        </div>
        {reasons.length > 0 && <div className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">⚠ {reasons.join(" · ")}</div>}
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-paper p-2">
            <div className="font-serif text-lg font-semibold">
              {done}/{all.length}
            </div>
            <div className="text-[11px] text-ink/50">tasks done</div>
          </div>
          <div className="rounded-lg bg-paper p-2">
            <div className="font-serif text-lg font-semibold">{sponsors.length}</div>
            <div className="text-[11px] text-ink/50">sponsors / partners</div>
          </div>
          <div className="rounded-lg bg-paper p-2">
            <div className="font-serif text-lg font-semibold">{posts.length}</div>
            <div className="text-[11px] text-ink/50">post slots</div>
          </div>
        </div>
        {sponsors.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {sponsors.map((d) => (
              <Link key={d.id} href={`/deals/${d.id}`} className="chip bg-gold/20 text-gold-600 hover:underline">
                {state.companies.find((c) => c.id === d.companyId)!.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto" value={role} onChange={(e) => setRole(e.target.value as Role | "all")}>
          <option value="all">All roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink/60">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Hide done
        </label>
        <span className="flex-1" />
        <NewTaskButton projectId={id} />
      </div>

      <section className="card overflow-hidden">
        <ul className="divide-y divide-ink-100">
          {tasks.map((x) => (
            <TaskRow key={x.id} task={x} />
          ))}
        </ul>
      </section>

      {posts.length > 0 && (
        <section>
          <h2 className="h-entry mb-2 text-lg">Social post slots</h2>
          <ul className="card divide-y divide-ink-100">
            {posts.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <span>📣</span>
                <span className="flex-1">{p.title}</span>
                <span className="chip bg-amber-50 text-amber-900">{p.status}</span>
                <span className="w-20 text-right text-xs text-ink/60">
                  {fmt(p.date)} <span className="block text-[10px] text-ink/40">{tMinus(p.date, event.date)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
