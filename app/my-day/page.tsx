"use client";

import { useCurrentUser, useStore } from "@/lib/store";
import { addDays, fmt, today } from "@/lib/dates";
import { Entry } from "@/components/ui";
import { TaskRow } from "@/components/TaskRow";

export default function MyDay() {
  const { state } = useStore();
  const user = useCurrentUser()!;
  const t = today();
  const mine = state.tasks.filter((x) => x.assigneeId === user.id).sort((a, b) => a.due.localeCompare(b.due));
  const groups = [
    { title: "Overdue", items: mine.filter((x) => x.status !== "done" && x.due < t) },
    { title: "Today", items: mine.filter((x) => x.due === t) },
    { title: "Next 7 days", items: mine.filter((x) => x.status !== "done" && x.due > t && x.due <= addDays(t, 7)) },
    { title: "Later", items: mine.filter((x) => x.status !== "done" && x.due > addDays(t, 7)) },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="h-entry text-2xl">My Day</h1>
        <p className="text-sm text-ink/60">{fmt(t, { weekday: "long", month: "long", day: "numeric" })} · Evening check-in due 6:00 PM (coming in Step 3)</p>
      </div>
      {mine.length === 0 && (
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
