"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { addComment } from "@/lib/engine";
import { BAR_DAYS, barStart, forecastProject, whatIfs } from "@/lib/schedule";
import { addDays, daysBetween, fmt, parseDate, today } from "@/lib/dates";
import { INITIATIVE } from "@/lib/types";

const DAY = 26;
const ROW = 38;

/** Gantt chart: bars end on the due date; arrows show "waits on"; red = forecast to slip. Drag a bar to move its due date. */
export function Timeline({ projectId }: { projectId: string }) {
  const { state, act } = useStore();
  const router = useRouter();
  const t = today();
  const event = state.events.find((e) => e.projectId === projectId)!;
  const project = state.projects.find((p) => p.id === projectId)!;
  const tasks = useMemo(
    () => state.tasks.filter((x) => x.projectId === projectId).sort((a, b) => barStart(a).localeCompare(barStart(b)) || a.due.localeCompare(b.due)),
    [state.tasks, projectId],
  );
  const forecast = useMemo(() => forecastProject(state, projectId, t), [state, projectId, t]);
  const prompts = whatIfs(state, projectId, t, 4);
  const [drag, setDrag] = useState<{ id: string; x: number; delta: number } | null>(null);
  const moved = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const todayX = useRef(0);

  // Open with today in view (a little in from the left edge).
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = Math.max(0, todayX.current - 5 * DAY);
  }, [projectId]);

  if (!tasks.length) return <p className="text-sm text-ink/50">No tasks yet.</p>;

  const ends = tasks.map((x) => forecast[x.id]?.end ?? x.due);
  const start = addDays([project.createdAt, ...tasks.map(barStart), t].sort()[0], -2);
  const finish = addDays([event.date, ...ends, ...tasks.map((x) => x.due), t].sort().at(-1)!, 4);
  const days: string[] = [];
  for (let d = start; d <= finish; d = addDays(d, 1)) days.push(d);
  const col = (d: string) => daysBetween(start, d);
  const row = new Map(tasks.map((x, i) => [x.id, i]));
  const width = days.length * DAY;
  todayX.current = col(t) * DAY;
  const height = tasks.length * ROW;

  const months: { label: string; span: number }[] = [];
  for (const d of days) {
    const label = parseDate(d).toLocaleDateString("en-PH", { month: "short", year: "numeric" });
    if (months.at(-1)?.label === label) months.at(-1)!.span++;
    else months.push({ label, span: 1 });
  }

  function commit(id: string, delta: number) {
    if (!delta) return;
    act((s) => {
      const task = s.tasks.find((x) => x.id === id)!;
      const from = task.due;
      task.due = addDays(task.due, delta);
      const me = s.users.find((u) => u.id === s.currentUserId);
      addComment(s, id, { kind: "system", userId: me?.id, text: `${me?.name ?? "Someone"} moved the due date ${fmt(from)} → ${fmt(task.due)} on the timeline` });
    });
  }

  return (
    <div className="space-y-4">
      {prompts.length > 0 && (
        <div className="card space-y-1.5 border-amber-200 bg-amber-50/60 p-4">
          <div className="label text-amber-800">✦ Sentinel — delay predictions</div>
          {prompts.map((p) => (
            <p key={p.taskId} className="text-sm text-ink/80">
              ⚠ {p.text}
            </p>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex">
          {/* Task names */}
          <div className="w-36 shrink-0 border-r border-ink-100 bg-white sm:w-60">
            <div className="flex h-[52px] items-end border-b border-ink-100 px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/50">Task</div>
            {tasks.map((x) => {
              const f = forecast[x.id];
              return (
                <button key={x.id} onClick={() => router.push(`/tasks/${x.id}`)} style={{ height: ROW }} className="flex w-full items-center gap-1.5 border-b border-ink-100/60 px-3 text-left text-xs hover:bg-ink-50" title={x.title}>
                  {f?.eventRisk ? <span className="text-red-600">⚠</span> : f?.slip ? <span className="text-orange-500">●</span> : null}
                  <span className={`truncate ${x.status === "done" ? "text-ink/40 line-through" : ""}`}>{x.title}</span>
                </button>
              );
            })}
          </div>

          {/* Chart */}
          <div ref={scroller} className="overflow-x-auto">
            <div style={{ width }} className="relative select-none">
              <div className="flex h-[26px] border-b border-ink-100 bg-paper text-[11px] font-semibold text-ink/60">
                {months.map((m) => (
                  <div key={m.label} style={{ width: m.span * DAY }} className="truncate border-r border-ink-100 px-2 py-1">
                    {m.label}
                  </div>
                ))}
              </div>
              <div className="flex h-[26px] border-b border-ink-100 text-[10px] text-ink/45">
                {days.map((d) => {
                  const dow = parseDate(d).getDay();
                  return (
                    <div key={d} style={{ width: DAY }} className={`flex items-center justify-center ${dow === 0 || dow === 6 ? "bg-ink-50/60" : ""} ${d === t ? "font-bold text-cyan-600" : ""}`}>
                      {parseDate(d).getDate()}
                    </div>
                  );
                })}
              </div>

              <div className="relative" style={{ height }}>
                {/* Weekend shading + row lines */}
                {days.map((d, i) => {
                  const dow = parseDate(d).getDay();
                  return dow === 0 || dow === 6 ? <div key={d} className="absolute inset-y-0 bg-ink-50/50" style={{ left: i * DAY, width: DAY }} /> : null;
                })}
                {tasks.map((x, i) => (
                  <div key={x.id} className="absolute inset-x-0 border-b border-ink-100/60" style={{ top: (i + 1) * ROW - 1 }} />
                ))}

                {/* Today + event day */}
                <div className="absolute inset-y-0 z-10 w-0.5 bg-cyan-600" style={{ left: col(t) * DAY + DAY / 2 }} title="Today" />
                <div className="absolute inset-y-0 z-10 w-0.5 bg-gold" style={{ left: col(event.date) * DAY + DAY / 2 }} />
                <div className="absolute z-20 -translate-x-1/2 rounded bg-gold px-1.5 py-0.5 text-[10px] font-semibold text-ink" style={{ left: col(event.date) * DAY + DAY / 2, top: 2 }}>
                  {INITIATIVE[event.kind].icon} {INITIATIVE[event.kind].dateLabel}
                </div>

                {/* "Waits on" arrows */}
                <svg className="pointer-events-none absolute inset-0 z-10" width={width} height={height}>
                  <defs>
                    <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 z" fill="#94a3b8" />
                    </marker>
                    <marker id="arrow-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 z" fill="#dc2626" />
                    </marker>
                  </defs>
                  {tasks.flatMap((x) =>
                    x.dependsOn
                      .filter((d) => row.has(d))
                      .map((d) => {
                        const dep = tasks[row.get(d)!];
                        const shift = drag?.id === dep.id ? drag.delta : 0;
                        const shiftX = drag?.id === x.id ? drag.delta : 0;
                        const x1 = (col(dep.due) + 1 + shift) * DAY;
                        const y1 = row.get(d)! * ROW + ROW / 2;
                        const x2 = (col(barStart(x)) + shiftX) * DAY + 2;
                        const y2 = row.get(x.id)! * ROW + ROW / 2;
                        const red = forecast[x.id]?.slip > 0 && forecast[dep.id]?.slip > 0;
                        return <path key={`${d}-${x.id}`} d={`M${x1},${y1} H${x1 + 6} V${y2} H${x2}`} fill="none" stroke={red ? "#dc2626" : "#94a3b8"} strokeWidth={red ? 1.5 : 1} markerEnd={`url(#${red ? "arrow-red" : "arrow"})`} />;
                      }),
                  )}
                </svg>

                {/* Bars */}
                {tasks.map((x, i) => {
                  const f = forecast[x.id];
                  const delta = drag?.id === x.id ? drag.delta : 0;
                  const left = (col(barStart(x)) + delta) * DAY + 2;
                  const color =
                    x.status === "done" ? "bg-emerald-500" : f?.eventRisk ? "bg-red-600" : f?.slip ? "bg-orange-500" : x.status === "blocked" ? "bg-red-400" : "bg-cyan-600";
                  const slipWidth = f && f.slip > 0 && x.status !== "done" ? daysBetween(x.due, f.end) * DAY : 0;
                  return (
                    <div key={x.id}>
                      {slipWidth > 0 && (
                        <div
                          className="absolute z-0 rounded-r border-2 border-dashed border-red-400 bg-red-100/60"
                          style={{ left: left + BAR_DAYS * DAY - 4, width: slipWidth, top: i * ROW + 9, height: ROW - 18 }}
                          title={`Forecast: finishes ${fmt(f.end)} (${f.slip} day${f.slip > 1 ? "s" : ""} late)`}
                        />
                      )}
                      <div
                        role="button"
                        tabIndex={0}
                        title={`${x.title}\nDue ${fmt(x.due)}${f?.slip ? ` · forecast ${fmt(f.end)} (+${f.slip}d)` : ""}${f?.critical ? " · critical path" : ""}\nDrag to move · click to open`}
                        onPointerDown={(e) => {
                          if (x.status === "done") return;
                          e.currentTarget.setPointerCapture(e.pointerId);
                          moved.current = false;
                          setDrag({ id: x.id, x: e.clientX, delta: 0 });
                        }}
                        onPointerMove={(e) => {
                          if (drag?.id !== x.id) return;
                          const d = Math.round((e.clientX - drag.x) / DAY);
                          if (d !== drag.delta) {
                            moved.current = true;
                            setDrag({ ...drag, delta: d });
                          }
                        }}
                        onPointerUp={() => {
                          if (drag?.id === x.id) commit(x.id, drag.delta);
                          setDrag(null);
                        }}
                        onClick={() => {
                          if (!moved.current) router.push(`/tasks/${x.id}`);
                        }}
                        className={`absolute z-20 flex items-center overflow-hidden rounded-md px-1.5 text-[10px] font-semibold text-white shadow-sm ${color} ${f?.critical ? "ring-2 ring-ink ring-offset-1" : ""} ${x.status === "done" ? "cursor-pointer opacity-70" : "cursor-grab active:cursor-grabbing"} ${drag?.id === x.id ? "opacity-90 shadow-lg" : ""}`}
                        style={{ left, width: BAR_DAYS * DAY - 4, top: i * ROW + 8, height: ROW - 16, touchAction: "none" }}
                      >
                        <span className="truncate">{drag?.id === x.id && delta ? `${delta > 0 ? "+" : ""}${delta}d → ${fmt(addDays(x.due, delta))}` : state.users.find((u) => u.id === x.assigneeId)?.name.split(" ")[0]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-ink/60">
        <Legend cls="bg-cyan-600" label="On track" />
        <Legend cls="bg-orange-500" label="Forecast to miss its own due date" />
        <Legend cls="bg-red-600" label="⚠ Puts the event / launch at risk" />
        <Legend cls="bg-emerald-500" label="Done" />
        <Legend cls="bg-white ring-2 ring-ink" label="Critical path (no spare days)" />
        <Legend cls="border-2 border-dashed border-red-400 bg-red-100" label="Forecast delay" />
        <span>Drag a bar to move its due date · click to open</span>
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-4 rounded-sm ${cls}`} /> {label}
    </span>
  );
}
