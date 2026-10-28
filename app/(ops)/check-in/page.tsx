"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useCurrentUser, useStore } from "@/lib/store";
import { CHECKIN_HOUR, MORNING_HOUR, checkInFor, hourLabel, noUpdateList, streak, submitCheckIn, tasksNeedingUpdate, type EntryInput } from "@/lib/automations";
import { canComplete } from "@/lib/engine";
import { now } from "@/lib/clock";
import { addDays, fmt, relative, today } from "@/lib/dates";
import { ROLE_LABEL, type DailyUpdate, type Task } from "@/lib/types";
import { Avatar, Entry } from "@/components/ui";

export default function CheckInPage() {
  return (
    <Suspense>
      <CheckIn />
    </Suspense>
  );
}

function CheckIn() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") === "team" ? "team" : "mine";
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-entry text-2xl">Daily check-in</h1>
          <p className="text-sm text-ink/60">Due every day at {hourLabel(CHECKIN_HOUR)}. Takes under a minute.</p>
        </div>
        <div className="inline-flex rounded-lg border border-ink-100 bg-white p-1">
          {(["mine", "team"] as const).map((t) => (
            <button key={t} onClick={() => router.replace(t === "team" ? "/check-in?tab=team" : "/check-in")} className={`rounded-md px-3 py-1.5 text-sm ${tab === t ? "bg-ink text-white" : "text-ink/60"}`}>
              {t === "mine" ? "My entry" : "Team"}
            </button>
          ))}
        </div>
      </div>
      {tab === "mine" ? <MyEntry /> : <Team />}
    </div>
  );
}

type Draft = { status?: DailyUpdate["status"]; percent: number; note: string };

function MyEntry() {
  const { state, act } = useStore();
  const user = useCurrentUser()!;
  const t = today();
  const hour = now().getHours();
  const submitted = checkInFor(state, user.id, t);
  const tasks = tasksNeedingUpdate(state, user.id, t);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState<string | null>(null);
  const days = streak(state, user.id, t);

  const d = (id: string): Draft => drafts[id] ?? { percent: 50, note: "" };
  const set = (id: string, patch: Partial<Draft>) => setDrafts((x) => ({ ...x, [id]: { ...d(id), ...patch } }));
  const answered = tasks.filter((x) => d(x.id).status).length;

  function submit() {
    const missing = tasks.find((x) => !d(x.id).status);
    if (missing) return setError(`Pick Done, In progress or Blocked for “${missing.title}”.`);
    const noReason = tasks.find((x) => d(x.id).status === "blocked" && !d(x.id).note.trim());
    if (noReason) return setError(`Say what's blocking “${noReason.title}” so the PM can help.`);
    const entries: EntryInput[] = tasks.map((x) => ({ taskId: x.id, status: d(x.id).status!, percent: d(x.id).status === "in_progress" ? d(x.id).percent : undefined, note: d(x.id).note.trim() || undefined }));
    act((s) => submitCheckIn(s, user.id, t, entries));
    setError(null);
  }

  const deadline = submitted ? null : hour >= CHECKIN_HOUR ? <span className="font-semibold text-red-700">Due now</span> : <span>Due today at {hourLabel(CHECKIN_HOUR)}</span>;

  return (
    <>
      <section className="card flex flex-wrap items-center gap-4 p-4">
        <div className="min-w-0 flex-1">
          <Entry word="en·try" pron="/ˈɛn.tri/" pos="noun">
            one minute each evening that saves an hour of chasing.
          </Entry>
          <p className="mt-1 text-xs text-ink/50">
            {fmt(t, { weekday: "long", month: "long", day: "numeric" })} · {deadline ?? <span className="text-emerald-700">Submitted at {new Date(submitted!.submittedAt).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })} ✓</span>}
          </p>
        </div>
        <div className="text-center">
          <div className="font-serif text-2xl font-semibold">🔥 {days}</div>
          <div className="text-[11px] text-ink/50">day streak</div>
        </div>
      </section>

      {submitted ? (
        <Submitted userId={user.id} date={t} />
      ) : tasks.length === 0 ? (
        <section className="card p-6 text-center">
          <p className="font-serif text-xl">Nothing to report today. 🎉</p>
          <p className="mt-1 text-sm text-ink/60">No tasks due or in progress for you. You&apos;re exempt from today&apos;s check-in.</p>
        </section>
      ) : (
        <>
          <ul className="space-y-3">
            {tasks.map((task) => (
              <EntryRow key={task.id} task={task} draft={d(task.id)} onChange={(p) => set(task.id, p)} />
            ))}
          </ul>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="sticky bottom-16 z-10 flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white/95 p-3 shadow-lg backdrop-blur md:bottom-4">
            <span className="text-sm text-ink/60">
              {answered}/{tasks.length} answered
            </span>
            <button className="btn-primary px-5" onClick={submit}>
              Submit today&apos;s entry
            </button>
          </div>
        </>
      )}
    </>
  );
}

function EntryRow({ task, draft, onChange }: { task: Task; draft: Draft; onChange: (p: Partial<Draft>) => void }) {
  const { state } = useStore();
  const project = state.projects.find((p) => p.id === task.projectId);
  const t = today();
  const late = task.due < t;
  const fileMissing = !canComplete(task);
  const options: { s: DailyUpdate["status"]; label: string; cls: string }[] = [
    { s: "done", label: task.approval?.approverIds.length ? "✓ Done → approval" : "✓ Done", cls: "border-emerald-600 bg-emerald-600 text-white" },
    { s: "in_progress", label: "◐ In progress", cls: "border-cyan-600 bg-cyan/20 text-ink" },
    { s: "blocked", label: "⛔ Blocked", cls: "border-red-500 bg-red-50 text-red-800" },
  ];
  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/tasks/${task.id}`} className="font-medium hover:text-cyan-600">
            {task.title}
          </Link>
          <div className="text-xs text-ink/50">
            {project?.name} · <span className={late ? "font-semibold text-red-600" : ""}>due {relative(task.due)}</span>
            {task.status === "blocked" && <span className="text-red-700"> · was blocked</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {options.map((o) => {
          const disabled = o.s === "done" && fileMissing;
          return (
            <button
              key={o.s}
              disabled={disabled}
              title={disabled ? `Upload “${task.requiredAttachment}” on the task first` : ""}
              onClick={() => onChange({ status: o.s })}
              className={`rounded-lg border px-2 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm ${draft.status === o.s ? o.cls : "border-ink-100 bg-white hover:border-ink/40"}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {fileMissing && <p className="mt-2 text-xs text-gold-600">📎 Needs “{task.requiredAttachment}” before Done — upload it on the task.</p>}
      {draft.status === "in_progress" && (
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-3 text-sm">
            <span className="w-20 text-ink/60">Progress</span>
            <input type="range" min={0} max={100} step={10} value={draft.percent} onChange={(e) => onChange({ percent: Number(e.target.value) })} className="flex-1 accent-cyan-600" />
            <span className="w-10 text-right font-semibold">{draft.percent}%</span>
          </label>
          <input className="input" placeholder="Short note (optional)" value={draft.note} onChange={(e) => onChange({ note: e.target.value })} />
        </div>
      )}
      {draft.status === "blocked" && (
        <input className="input mt-3 border-red-200" placeholder="What's blocking you? (required — the PM will be told)" value={draft.note} onChange={(e) => onChange({ note: e.target.value })} />
      )}
    </li>
  );
}

function Submitted({ userId, date }: { userId: string; date: string }) {
  const { state } = useStore();
  const updates = state.dailyUpdates.filter((u) => u.userId === userId && u.date === date);
  const label = { done: "✓ Done", in_progress: "◐ In progress", blocked: "⛔ Blocked" };
  return (
    <section className="card p-5">
      <p className="font-serif text-xl">Entry submitted. Salamat! 🙌</p>
      <p className="mt-1 text-sm text-ink/60">Want to add more? Leave a remark on the task itself.</p>
      <ul className="mt-4 divide-y divide-ink-100">
        {updates.map((u) => {
          const task = state.tasks.find((t) => t.id === u.taskId);
          return (
            <li key={u.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <Link href={`/tasks/${u.taskId}`} className="min-w-0 flex-1 hover:underline">
                {task?.title}
              </Link>
              <span className="text-xs text-ink/60">
                {label[u.status]}
                {u.percent !== undefined && ` · ${u.percent}%`}
                {u.note && ` · “${u.note}”`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Team() {
  const { state } = useStore();
  const me = useCurrentUser()!;
  const t = today();
  const yesterday = addDays(t, -1);
  const isLead = me.roles.includes("owner") || me.roles.includes("admin");
  const missed = noUpdateList(state, yesterday);
  const hour = now().getHours();

  const rows = state.users.map((u) => {
    const c = checkInFor(state, u.id, t);
    const n = tasksNeedingUpdate(state, u.id, t).length;
    return { u, c, n, streak: streak(state, u.id, t) };
  });

  return (
    <>
      {isLead && (
        <section className={`card p-4 ${missed.length ? "border-red-200" : ""}`}>
          <div className="flex items-center justify-between">
            <h2 className="h-entry text-lg">No update — {fmt(yesterday, { weekday: "long", month: "short", day: "numeric" })}</h2>
            <span className={`chip ${missed.length ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{missed.length ? `${missed.length} missing` : "everyone updated"}</span>
          </div>
          <p className="mt-1 text-xs text-ink/50">People who had tasks to report yesterday but didn&apos;t submit by midnight. Sent to you each morning at {hourLabel(MORNING_HOUR)}.</p>
          {missed.length > 0 && (
            <ul className="mt-3 divide-y divide-ink-100">
              {missed.map(({ user, tasks }) => (
                <li key={user.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <Avatar user={user} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{user.name}</div>
                      <div className="text-xs text-ink/50">
                        {ROLE_LABEL[user.roles[0]]} · {tasks.length} task{tasks.length > 1 ? "s" : ""} without an update
                      </div>
                    </div>
                  </div>
                  <ul className="ml-11 mt-1.5 space-y-0.5">
                    {tasks.slice(0, 4).map((task) => (
                      <li key={task.id} className="text-xs">
                        <Link href={`/tasks/${task.id}`} className="text-ink/70 hover:underline">
                          • {task.title} <span className={task.due < t ? "text-red-600" : "text-ink/40"}>(due {fmt(task.due)})</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="h-entry text-lg">Today&apos;s board</h2>
          <span className="text-xs text-ink/50">
            {rows.filter((r) => r.c).length}/{rows.filter((r) => r.c || r.n).length} submitted
          </span>
        </div>
        <div className="mt-1">
          <Entry word="ac·count·a·ble" pron="/əˈkaʊn.tə.bəl/" pos="adjective">
            word of the day. Showing up, even when it&apos;s just one line.
          </Entry>
        </div>
        <ul className="mt-3 divide-y divide-ink-100">
          {rows.map(({ u, c, n, streak: s }) => (
            <li key={u.id} className="flex items-center gap-3 py-2.5">
              <Avatar user={u} size={30} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{u.name}</div>
                <div className="text-xs text-ink/50">{ROLE_LABEL[u.roles[0]]}</div>
              </div>
              <span className="w-14 text-center text-sm" title="Day streak">
                {s > 0 ? `🔥 ${s}` : "—"}
              </span>
              {c ? (
                <span className="chip w-32 justify-center bg-emerald-100 text-emerald-800">✓ {new Date(c.submittedAt).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}</span>
              ) : n ? (
                <span className={`chip w-32 justify-center ${hour >= CHECKIN_HOUR ? "bg-red-100 text-red-800" : "bg-amber-50 text-amber-900"}`}>
                  {hour >= CHECKIN_HOUR ? "Missing" : "Waiting"} · {n} task{n > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="chip w-32 justify-center bg-ink-50 text-ink/50">Nothing due</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
