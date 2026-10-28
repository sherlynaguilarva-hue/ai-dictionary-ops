"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { canComplete, isOverdue } from "@/lib/engine";
import { fmt, relative, tMinus, today } from "@/lib/dates";
import type { Task } from "@/lib/types";
import { Avatar, RoleChip, SourceChip, StatusChip } from "./ui";

export function TaskRow({ task, showProject = false }: { task: Task; showProject?: boolean }) {
  const { state, act } = useStore();
  const [open, setOpen] = useState(false);
  const t = today();
  const project = state.projects.find((p) => p.id === task.projectId);
  const event = state.events.find((e) => e.projectId === task.projectId);
  const assignee = state.users.find((u) => u.id === task.assigneeId);
  const deps = state.tasks.filter((x) => task.dependsOn.includes(x.id));
  const waiting = deps.filter((d) => d.status !== "done");
  const overdue = isOverdue(task, t);

  const update = (fn: (x: Task) => void) =>
    act((s) => {
      fn(s.tasks.find((x) => x.id === task.id)!);
    });

  return (
    <li className={`${task.status === "done" ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          aria-label="Mark done"
          title={canComplete(task) ? "Mark done" : `Needs: ${task.requiredAttachment}`}
          disabled={!canComplete(task) && task.status !== "done"}
          onClick={() => update((x) => void (x.status = x.status === "done" ? "todo" : "done"))}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${task.status === "done" ? "border-emerald-600 bg-emerald-600 text-white" : "border-ink/30 hover:border-cyan-600 disabled:cursor-not-allowed disabled:border-dashed"}`}
        >
          {task.status === "done" ? "✓" : ""}
        </button>
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(!open)}>
          <div className={`text-sm ${task.status === "done" ? "line-through" : ""}`}>{task.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/50">
            {showProject && project && <span>{project.name}</span>}
            {task.requiredAttachment && (
              <span className={task.attachments.length ? "text-emerald-700" : "text-gold-600"}>📎 {task.attachments.length ? "file attached" : "file required"}</span>
            )}
            {waiting.length > 0 && <span>⏳ waiting on {waiting.length}</span>}
            {task.checklist.length > 0 && (
              <span>
                ☑ {task.checklist.filter((c) => c.done).length}/{task.checklist.length}
              </span>
            )}
          </div>
        </button>
        <div className="hidden items-center gap-2 sm:flex">
          <SourceChip source={task.source} />
          <RoleChip role={task.role} />
        </div>
        <Avatar user={assignee} size={24} />
        <div className={`w-20 text-right text-xs ${overdue ? "font-semibold text-red-600" : "text-ink/60"}`}>
          <div>{fmt(task.due)}</div>
          <div className="text-[10px] text-ink/40">{event ? tMinus(task.due, event.date) : relative(task.due)}</div>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t border-ink-100 bg-paper/60 px-3 py-3 pl-11 text-sm">
          <div className="flex flex-wrap items-center gap-2 sm:hidden">
            <SourceChip source={task.source} />
            <RoleChip role={task.role} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={task.status} />
            {(["todo", "in_progress", "blocked"] as const).map((s) => (
              <button key={s} className="btn-outline px-2 py-1 text-xs" onClick={() => update((x) => void (x.status = s))}>
                {s === "todo" ? "To do" : s === "in_progress" ? "In progress" : "Blocked"}
              </button>
            ))}
            <span className="text-xs text-ink/50">
              Assigned to {assignee?.name} · due {relative(task.due)}
            </span>
          </div>

          {task.checklist.length > 0 && (
            <ul className="space-y-1">
              {task.checklist.map((c, i) => (
                <li key={i}>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={c.done} onChange={() => update((x) => void (x.checklist[i].done = !x.checklist[i].done))} />
                    <span className={c.done ? "line-through text-ink/50" : ""}>{c.text}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {task.requiredAttachment && (
            <div className="rounded-lg border border-dashed border-gold p-3">
              <div className="text-xs font-semibold text-gold-600">Required to close: {task.requiredAttachment}</div>
              {task.attachments.map((a) => (
                <div key={a} className="mt-1 text-xs">
                  📎 {a}
                </div>
              ))}
              <label className="btn-outline mt-2 cursor-pointer px-2 py-1 text-xs">
                Upload file
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) update((x) => void x.attachments.push(f.name));
                  }}
                />
              </label>
            </div>
          )}

          {deps.length > 0 && (
            <div className="text-xs text-ink/60">
              Depends on:{" "}
              {deps.map((d, i) => (
                <span key={d.id}>
                  {i > 0 && ", "}
                  <span className={d.status === "done" ? "line-through" : ""}>{d.title}</span>
                </span>
              ))}
            </div>
          )}
          {showProject && project && (
            <Link href={`/projects/${project.id}`} className="text-xs text-cyan-600 hover:underline">
              Open project →
            </Link>
          )}
        </div>
      )}
    </li>
  );
}
