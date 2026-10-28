"use client";

import { useCurrentUser, useStore } from "@/lib/store";
import { addDays, fmt, today } from "@/lib/dates";
import { Entry } from "@/components/ui";
import { TaskRow } from "@/components/TaskRow";
import { NewTaskButton } from "@/components/NewTask";
import Link from "next/link";
import { AvatarStack } from "@/components/ui";
import { CHECKIN_HOUR, checkInFor, hourLabel, tasksNeedingUpdate } from "@/lib/automations";
import { now } from "@/lib/clock";

/** Today's entry status: reminds the person until they submit. */
function CheckInBanner() {
  const { state } = useStore();
  const user = useCurrentUser()!;
  const t = today();
  const done = checkInFor(state, user.id, t);
  const n = tasksNeedingUpdate(state, user.id, t).length;
  if (!done && !n) return null;
  const late = now().getHours() >= CHECKIN_HOUR;
  if (done)
    return (
      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
        <span className="text-lg">✓</span> Today&apos;s entry submitted. Nice work.
      </div>
    );
  return (
    <Link href="/check-in" className={`flex flex-wrap items-center gap-3 rounded-xl p-3 text-sm ${late ? "bg-red-50 text-red-900 ring-1 ring-red-200" : "bg-amber-50 text-amber-900"}`}>
      <span className="text-lg">📝</span>
      <span className="flex-1">
        <b>{late ? "Today's entry is due now." : `Today's entry is due at ${hourLabel(CHECKIN_HOUR)}.`}</b> {n} task{n > 1 ? "s" : ""} to update — under a minute.
      </span>
      <span className="btn-primary px-3 py-1.5 text-xs">Check in →</span>
    </Link>
  );
}

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
          <p className="text-sm text-ink/60">{fmt(t, { weekday: "long", month: "long", day: "numeric" })} · Evening check-in due {hourLabel(CHECKIN_HOUR)}</p>
        </div>
        <NewTaskButton />
      </div>
      <CheckInBanner />
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
