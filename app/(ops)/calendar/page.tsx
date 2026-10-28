"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCurrentUser, useStore } from "@/lib/store";
import { addDays, fmt, parseDate, toISODate, today } from "@/lib/dates";
import { INITIATIVE, type Role } from "@/lib/types";
import { Avatar } from "@/components/ui";

type Item = {
  id: string;
  date: string;
  kind: "task" | "post" | "milestone";
  title: string;
  href: string;
  projectId: string;
  assigneeId?: string;
  role?: Role;
  done?: boolean;
  overdue?: boolean;
};

const ROLE_BAR: Record<Role, string> = {
  owner: "bg-ink text-white",
  admin: "bg-violet-100 text-violet-900",
  sales: "bg-cyan-100 text-cyan-900",
  creative: "bg-pink-100 text-pink-900",
  social: "bg-amber-100 text-amber-900",
  eventops: "bg-emerald-100 text-emerald-900",
  instructor: "bg-orange-100 text-orange-900",
};

function itemClass(i: Item) {
  if (i.kind === "milestone") return "bg-ink text-gold font-semibold";
  if (i.kind === "post") return "bg-gold/25 text-ink";
  return `${ROLE_BAR[i.role!]} ${i.overdue ? "ring-1 ring-red-500" : ""} ${i.done ? "line-through opacity-50" : ""}`;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const { state } = useStore();
  const me = useCurrentUser()!;
  const t = today();
  const isLead = me.roles.includes("owner") || me.roles.includes("admin");
  const [month, setMonth] = useState(t.slice(0, 7) + "-01");
  const [selected, setSelected] = useState(t);
  const [scope, setScope] = useState<"mine" | "team">(isLead ? "team" : "mine");
  const [projectId, setProjectId] = useState("all");
  const [show, setShow] = useState({ task: true, post: true, milestone: true });

  const items = useMemo(() => {
    const out: Item[] = [];
    for (const task of state.tasks)
      out.push({ id: task.id, date: task.due, kind: "task", title: task.title, href: `/tasks/${task.id}`, projectId: task.projectId, assigneeId: task.assigneeId, role: task.role, done: task.status === "done", overdue: task.status !== "done" && task.due < t });
    for (const p of state.posts) {
      const ownerTask = state.tasks.find((x) => x.deliverableId && x.deliverableId === p.deliverableId && x.role === "social");
      out.push({ id: p.id, date: p.date, kind: "post", title: `📣 ${p.title}`, href: ownerTask ? `/tasks/${ownerTask.id}` : `/projects/${p.projectId}`, projectId: p.projectId, assigneeId: ownerTask?.assigneeId });
    }
    for (const e of state.events)
      if (e.projectId) out.push({ id: e.id, date: e.date, kind: "milestone", title: `${INITIATIVE[e.kind].icon} ${e.name}`, href: `/projects/${e.projectId}`, projectId: e.projectId });
    return out
      .filter((i) => show[i.kind])
      .filter((i) => projectId === "all" || i.projectId === projectId)
      .filter((i) => scope === "team" || i.kind === "milestone" || i.assigneeId === me.id);
  }, [state, t, show, projectId, scope, me.id]);

  const byDate = useMemo(() => {
    const m: Record<string, Item[]> = {};
    for (const i of items) (m[i.date] ??= []).push(i);
    const order = { milestone: 0, task: 1, post: 2 };
    for (const k in m) m[k].sort((a, b) => order[a.kind] - order[b.kind]);
    return m;
  }, [items]);

  // Grid: Monday-start weeks covering the whole month.
  const first = parseDate(month);
  const start = addDays(month, -((first.getDay() + 6) % 7));
  const lastOfMonth = toISODate(new Date(first.getFullYear(), first.getMonth() + 1, 0));
  const days: string[] = [];
  for (let d = start; d <= lastOfMonth || days.length % 7 !== 0; d = addDays(d, 1)) days.push(d);
  const shiftMonth = (n: number) => setMonth(toISODate(new Date(first.getFullYear(), first.getMonth() + n, 1)));
  const dayItems = byDate[selected] ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-entry text-2xl">Calendar</h1>
          <p className="text-sm text-ink/60">Every task, post slot and launch date — in one place.</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn-outline px-2.5" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            ←
          </button>
          <button className="btn-outline" onClick={() => (setMonth(t.slice(0, 7) + "-01"), setSelected(t))}>
            Today
          </button>
          <button className="btn-outline px-2.5" onClick={() => shiftMonth(1)} aria-label="Next month">
            →
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-ink-100 bg-white p-1">
          {(["mine", "team"] as const).map((s) => (
            <button key={s} onClick={() => setScope(s)} className={`rounded-md px-3 py-1 text-sm ${scope === s ? "bg-ink text-white" : "text-ink/60"}`}>
              {s === "mine" ? "Mine" : "Whole team"}
            </button>
          ))}
        </div>
        <select className="input w-auto py-1.5" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="all">All projects</option>
          {state.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {(
          [
            ["task", "Tasks"],
            ["post", "Post slots"],
            ["milestone", "Launch / event days"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex items-center gap-1.5 text-sm text-ink/70">
            <input type="checkbox" checked={show[k]} onChange={(e) => setShow({ ...show, [k]: e.target.checked })} />
            {label}
          </label>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <section className="card overflow-hidden">
          <div className="border-b border-ink-100 px-4 py-3 font-serif text-lg font-semibold">{first.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}</div>
          <div className="grid grid-cols-7 border-b border-ink-100 bg-paper text-center text-[11px] font-semibold uppercase tracking-wide text-ink/50">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1.5">
                <span className="hidden sm:inline">{w}</span>
                <span className="sm:hidden">{w[0]}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const list = byDate[d] ?? [];
              const inMonth = d.slice(0, 7) === month.slice(0, 7);
              const isToday = d === t;
              const isSel = d === selected;
              const overdue = list.some((i) => i.overdue);
              return (
                <button
                  key={d}
                  onClick={() => setSelected(d)}
                  className={`flex min-h-16 flex-col items-stretch border-b border-r border-ink-100 p-1 text-left align-top transition sm:min-h-28 ${inMonth ? "bg-white" : "bg-paper/60 text-ink/40"} ${isSel ? "ring-2 ring-inset ring-cyan-600" : "hover:bg-ink-50/60"}`}
                >
                  <span className={`mb-1 inline-flex h-6 w-6 items-center justify-center self-start rounded-full text-xs ${isToday ? "bg-ink font-bold text-white" : ""}`}>{parseDate(d).getDate()}</span>
                  {/* Phones: dots. Larger screens: titles. */}
                  <span className="flex flex-wrap gap-0.5 sm:hidden">
                    {list.slice(0, 4).map((i) => (
                      <span key={i.id} className={`h-1.5 w-1.5 rounded-full ${i.kind === "milestone" ? "bg-ink" : i.kind === "post" ? "bg-gold" : overdue && i.overdue ? "bg-red-500" : "bg-cyan-600"}`} />
                    ))}
                  </span>
                  <span className="hidden space-y-0.5 sm:block">
                    {list.slice(0, 3).map((i) => (
                      <span key={i.id} className={`block truncate rounded px-1 py-0.5 text-[10px] leading-tight ${itemClass(i)}`}>
                        {i.title}
                      </span>
                    ))}
                    {list.length > 3 && <span className="block px-1 text-[10px] text-ink/50">+{list.length - 3} more</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="card self-start p-4">
          <div className="label">{selected === t ? "Today" : fmt(selected, { weekday: "long" })}</div>
          <div className="font-serif text-xl font-semibold">{fmt(selected, { month: "long", day: "numeric", year: "numeric" })}</div>
          {dayItems.length === 0 ? (
            <p className="mt-3 text-sm text-ink/50">Nothing scheduled.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {dayItems.map((i) => (
                <li key={i.id}>
                  <Link href={i.href} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-ink-50">
                    <span className={`h-8 w-1 shrink-0 rounded-full ${i.kind === "milestone" ? "bg-ink" : i.kind === "post" ? "bg-gold" : i.overdue ? "bg-red-500" : "bg-cyan-600"}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${i.done ? "text-ink/40 line-through" : ""}`}>{i.title}</span>
                      <span className="block truncate text-[11px] text-ink/50">
                        {state.projects.find((p) => p.id === i.projectId)?.name}
                        {i.overdue && <span className="text-red-600"> · overdue</span>}
                      </span>
                    </span>
                    {i.assigneeId && <Avatar user={state.users.find((u) => u.id === i.assigneeId)} size={22} />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 space-y-1 border-t border-ink-100 pt-3 text-[11px] text-ink/50">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-600" /> Task (colour = role)
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Overdue
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-gold" /> Social post slot
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-ink" /> Launch / event day
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
