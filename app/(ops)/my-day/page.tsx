"use client";

import { useCurrentUser, useStore } from "@/lib/store";
import { addDays, fmt, today } from "@/lib/dates";
import { Entry } from "@/components/ui";
import { TaskRow } from "@/components/TaskRow";
import { NewTaskButton } from "@/components/NewTask";
import Link from "next/link";
import { AvatarStack } from "@/components/ui";

export default function MyDay() {
  const { state } = useStore();
  const user = useCurrentUser()!;
  const t = today();
  const mine = state.tasks.filter((x) => x.assigneeId === user.id).sort((a, b) => a.due.localeCompare(b.due));
  const toApprove = state.tasks.filter(
    (x) => x.status === "in_review" && x.approval?.approverIds.includes(user.id) && !x.approval.decisions.some((d) => d.userId === user.id && d.decision === "approved"),
  );
  const mySubtasks = state.tasks.flatMap((x) =>
    x.assigneeId === user.id || x.status === "done" ? [] : x.subtasks.filter((s) => !s.done && s.assigneeIds.includes(user.id)).map((s) => ({ task: x, sub: s })),
  );
  const groups = [
    { title: "Overdue", items: mine.filter((x) => x.status !== "done" && x.due < t) },
    { title: "Today", items: mine.filter((x) => x.due === t) },
    { title: "Next 7 days", items: mine.filter((x) => x.status !== "done" && x.due > t && x.due <= addDays(t, 7)) },
    { title: "Later", items: mine.filter((x) => x.status !== "done" && x.due > addDays(t, 7)) },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-entry text-2xl">My Day</h1>
          <p className="text-sm text-ink/60">{fmt(t, { weekday: "long", month: "long", day: "numeric" })} · Evening check-in due 6:00 PM (coming in Step 3)</p>
        </div>
        <NewTaskButton />
      </div>
      {toApprove.length > 0 && (
        <section>
          <h2 className="label mb-2 text-violet-700">Waiting for my approval · {toApprove.length}</h2>
          <ul className="card divide-y divide-ink-100 overflow-hidden border-violet-200">
            {toApprove.map((x) => (
              <TaskRow key={x.id} task={x} showProject />
            ))}
          </ul>
        </section>
      )}
      {mySubtasks.length > 0 && (
        <section>
          <h2 className="label mb-2">Subtasks assigned to me · {mySubtasks.length}</h2>
          <ul className="card divide-y divide-ink-100 overflow-hidden">
            {mySubtasks.map(({ task, sub }) => (
              <li key={sub.id}>
                <Link href={`/tasks/${task.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-paper">
                  <span className="text-ink/30">☐</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{sub.title}</span>
                    <span className="block text-xs text-ink/50">in “{task.title}”</span>
                  </span>
                  <AvatarStack users={sub.assigneeIds.map((i) => state.users.find((u) => u.id === i))} />
                  {sub.due && <span className="w-14 text-right text-xs text-ink/60">{fmt(sub.due)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {mine.length === 0 && !toApprove.length && !mySubtasks.length && (
        <div className="card p-6">
          <Entry word="free" pron="/friː/" pos="adjective">
            no tasks assigned to you yet. Enjoy it while it lasts.
          </Entry>
        </div>
      )}
      {groups
        .filter((g) => g.items.length)
        .map((g) => (
          <section key={g.title}>
            <h2 className={`label mb-2 ${g.title === "Overdue" ? "text-red-600" : ""}`}>
              {g.title} · {g.items.length}
            </h2>
            <ul className="card divide-y divide-ink-100 overflow-hidden">
              {g.items.map((x) => (
                <TaskRow key={x.id} task={x} showProject />
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
