"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { canComplete, completeTask, isOverdue, reopenTask } from "@/lib/engine";
import { fmt, relative, tMinus, today } from "@/lib/dates";
import type { Task } from "@/lib/types";
import { Avatar, RoleChip, SourceChip, StatusChip } from "./ui";

export function TaskCheck({ task }: { task: Task }) {
  const { state, act } = useStore();
  const me = state.currentUserId!;
  const blockedByFile = !canComplete(task) && task.status !== "done";
  const inReview = task.status === "in_review";
  const title = task.status === "done" ? "Reopen" : inReview ? "Waiting for approval" : blockedByFile ? `Needs: ${task.requiredAttachment}` : task.approval ? "Submit for approval" : "Mark done";
  return (
    <button
      aria-label={title}
      title={title}
      disabled={blockedByFile || inReview}
      onClick={() => act((s) => (task.status === "done" ? reopenTask(s, task.id, me) : completeTask(s, task.id, me)))}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
        task.status === "done"
          ? "border-emerald-600 bg-emerald-600 text-white"
          : inReview
            ? "border-violet-500 bg-violet-100 text-violet-700"
            : "border-ink/30 hover:border-cyan-600 disabled:cursor-not-allowed disabled:border-dashed"
      }`}
    >
      {task.status === "done" ? "✓" : inReview ? "⧗" : ""}
    </button>
  );
}

export function TaskRow({ task, showProject = false }: { task: Task; showProject?: boolean }) {
  const { state } = useStore();
  const t = today();
  const project = state.projects.find((p) => p.id === task.projectId);
  const event = state.events.find((e) => e.projectId === task.projectId);
  const assignee = state.users.find((u) => u.id === task.assigneeId);
  const waiting = state.tasks.filter((x) => task.dependsOn.includes(x.id) && x.status !== "done");
  const comments = state.comments.filter((c) => c.taskId === task.id && c.kind === "comment").length;
  const overdue = isOverdue(task, t);
  const approvals = task.approval ? task.approval.decisions.filter((d) => d.decision === "approved").length : 0;

  return (
    <li className={task.status === "done" ? "opacity-60" : ""}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <TaskCheck task={task} />
        <Link href={`/tasks/${task.id}`} className="group min-w-0 flex-1">
          <div className={`text-sm group-hover:text-cyan-600 ${task.status === "done" ? "line-through" : ""}`}>{task.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/50">
            {showProject && project && <span>{project.name}</span>}
            {task.status !== "todo" && task.status !== "done" && <StatusChip status={task.status} />}
            {task.requiredAttachment && <span className={task.attachments.length ? "text-emerald-700" : "text-gold-600"}>📎 {task.attachments.length ? "file attached" : "file required"}</span>}
            {task.approval && (
              <span className="text-violet-700">
                ✔ approval {approvals}/{task.approval.approverIds.length}
              </span>
            )}
            {waiting.length > 0 && <span>⏳ waiting on {waiting.length}</span>}
            {task.subtasks.length > 0 && (
              <span>
                ☑ {task.subtasks.filter((c) => c.done).length}/{task.subtasks.length}
              </span>
            )}
            {comments > 0 && <span>💬 {comments}</span>}
          </div>
        </Link>
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
    </li>
  );
}
