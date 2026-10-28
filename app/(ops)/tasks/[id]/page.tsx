"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { addComment, canComplete, completeTask, decide, isOverdue, newSubtask, reopenTask, setStatus } from "@/lib/engine";
import { fmt, relative, tMinus, today } from "@/lib/dates";
import { now } from "@/lib/clock";
import { ROLE_LABEL, type Role, type State, type Subtask, type Task, type User } from "@/lib/types";
import { AgentBadge, Avatar, AvatarStack, RoleChip, SourceChip, StatusChip } from "@/components/ui";
import { UserPicker } from "@/components/NewTask";

function nameOf(state: State, id: string) {
  return state.users.find((u) => u.id === id)?.name ?? "Someone";
}

/** Highlight @mentions of team members. */
function RichText({ text, users }: { text: string; users: User[] }) {
  const firstNames = users.map((u) => u.name.split(" ")[0].toLowerCase());
  return (
    <>
      {text.split(/(@\w+)/g).map((part, i) =>
        part.startsWith("@") && firstNames.includes(part.slice(1).toLowerCase()) ? (
          <span key={i} className="rounded bg-cyan/20 px-1 font-medium text-cyan-600">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function timeAgo(iso: string) {
  const mins = Math.round((now().getTime() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

export default function TaskProfile() {
  const { id } = useParams<{ id: string }>();
  const { state, act } = useStore();
  const me = state.currentUserId!;
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return <p className="text-sm text-ink/60">Task not found.</p>;

  const project = state.projects.find((p) => p.id === task.projectId)!;
  const event = state.events.find((e) => e.projectId === task.projectId);
  const update = (fn: (t: Task, s: State) => void) => act((s) => fn(s.tasks.find((x) => x.id === id)!, s));

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink/50">
        <Link href="/projects" className="hover:text-ink">
          Projects
        </Link>
        <span>/</span>
        <Link href={`/projects/${project.id}`} className="hover:text-ink">
          {project.name}
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Header task={task} update={update} />
          <StatusBar task={task} />
          <Subtasks task={task} update={update} />
          <ApprovalPanel task={task} update={update} />
          <Remarks taskId={task.id} />
        </div>

        <aside className="space-y-4">
          <section className="card space-y-3 p-4 text-sm">
            <Field label="Assignee">
              <div className="flex items-center gap-2">
                <Avatar user={state.users.find((u) => u.id === task.assigneeId)} size={24} />
                <select className="input py-1.5" value={task.assigneeId} onChange={(e) => update((t, s) => {
                  t.assigneeId = e.target.value;
                  addComment(s, t.id, { kind: "system", userId: me, text: `${nameOf(s, me)} reassigned this to ${nameOf(s, e.target.value)}` });
                })}>
                  {state.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="Role">
              <select className="input py-1.5" value={task.role} onChange={(e) => update((t) => void (t.role = e.target.value as Role))}>
                {Object.entries(ROLE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Due">
              <input type="date" className={`input py-1.5 ${isOverdue(task, today()) ? "border-red-300 text-red-700" : ""}`} value={task.due} onChange={(e) => e.target.value && update((t, s) => {
                addComment(s, t.id, { kind: "system", userId: me, text: `${nameOf(s, me)} moved the due date ${fmt(t.due)} → ${fmt(e.target.value)}` });
                t.due = e.target.value;
              })} />
              <div className="mt-1 text-xs text-ink/50">
                {relative(task.due)}
                {event && ` · ${tMinus(task.due, event.date)} from event`}
              </div>
            </Field>
            <Field label="Priority">
              <select className="input py-1.5" value={task.priority} onChange={(e) => update((t) => void (t.priority = e.target.value as Task["priority"]))}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </Field>
            <Field label="Source">
              <div className="flex flex-wrap gap-1.5">
                <SourceChip source={task.source} />
                <RoleChip role={task.role} />
                {task.createdBy && <span className="text-xs text-ink/50">by {nameOf(state, task.createdBy)}</span>}
              </div>
            </Field>
          </section>

          <Attachments task={task} update={update} />

          {task.dependsOn.length > 0 && (
            <section className="card p-4">
              <div className="label mb-2">Waits on</div>
              <ul className="space-y-1.5 text-sm">
                {state.tasks
                  .filter((x) => task.dependsOn.includes(x.id))
                  .map((d) => (
                    <li key={d.id} className="flex items-center gap-2">
                      <StatusChip status={d.status} />
                      <Link href={`/tasks/${d.id}`} className="min-w-0 flex-1 truncate hover:underline">
                        {d.title}
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

type Update = (fn: (t: Task, s: State) => void) => void;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      {children}
    </div>
  );
}

function Header({ task, update }: { task: Task; update: Update }) {
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  // Grow the title box to fit long titles on narrow screens.
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);
  return (
    <section className="card p-5">
      <textarea
        ref={titleRef}
        rows={1}
        className="h-entry w-full resize-none bg-transparent text-2xl outline-none focus:rounded focus:ring-2 focus:ring-cyan/30"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title.trim() && title !== task.title && update((t) => void (t.title = title.trim()))}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), (e.target as HTMLTextAreaElement).blur())}
      />
      <textarea
        className="mt-2 min-h-16 w-full resize-y rounded-lg bg-paper p-3 text-sm text-ink/80 outline-none focus:ring-2 focus:ring-cyan/30"
        placeholder="Add details, links, or instructions…"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onBlur={() => desc !== task.description && update((t) => void (t.description = desc))}
      />
    </section>
  );
}

function StatusBar({ task }: { task: Task }) {
  const { state, act } = useStore();
  const me = state.currentUserId!;
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const openSubs = task.subtasks.filter((s) => !s.done).length;

  const run = (fn: (s: State) => unknown) => {
    try {
      act(fn);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <section className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label mr-1">Status</span>
        <StatusChip status={task.status} />
        <span className="flex-1" />
        {task.status === "done" ? (
          <button className="btn-outline" onClick={() => run((s) => reopenTask(s, task.id, me))}>
            ↺ Reopen
          </button>
        ) : task.status === "in_review" ? (
          <span className="text-sm text-violet-700">Waiting for approval…</span>
        ) : (
          <>
            {(["todo", "in_progress"] as const).map((st) => (
              <button key={st} className={`btn-outline px-2.5 py-1.5 text-xs ${task.status === st ? "border-ink" : ""}`} onClick={() => run((s) => setStatus(s, task.id, st, me))}>
                {st === "todo" ? "To do" : "In progress"}
              </button>
            ))}
            <button className={`btn-outline px-2.5 py-1.5 text-xs ${task.status === "blocked" ? "border-red-400 text-red-700" : ""}`} onClick={() => setBlockReason("")}>
              Blocked…
            </button>
            <button className="btn bg-emerald-600 text-white hover:bg-emerald-700" disabled={!canComplete(task)} onClick={() => run((s) => completeTask(s, task.id, me))} title={!canComplete(task) ? `Upload “${task.requiredAttachment}” first` : ""}>
              {task.approval?.approverIds.length ? "Submit for approval" : "✓ Mark done"}
            </button>
          </>
        )}
      </div>
      {blockReason !== null && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run((s) => setStatus(s, task.id, "blocked", me, blockReason.trim() || undefined));
            setBlockReason(null);
          }}
        >
          <input autoFocus className="input" placeholder="What's blocking it?" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
          <button className="btn-primary">Save</button>
        </form>
      )}
      {!canComplete(task) && task.status !== "done" && <p className="mt-2 text-xs text-gold-600">📎 Upload “{task.requiredAttachment}” before this can be closed.</p>}
      {openSubs > 0 && task.status !== "done" && <p className="mt-1 text-xs text-ink/50">{openSubs} subtask{openSubs > 1 ? "s" : ""} still open.</p>}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </section>
  );
}

function Subtasks({ task, update }: { task: Task; update: Update }) {
  const { state } = useStore();
  const me = state.currentUserId!;
  const [title, setTitle] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const done = task.subtasks.filter((s) => s.done).length;

  const patch = (sid: string, fn: (s: Subtask) => void) => update((t) => fn(t.subtasks.find((x) => x.id === sid)!));

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between">
        <h2 className="h-entry text-lg">Subtasks</h2>
        {task.subtasks.length > 0 && (
          <span className="text-xs text-ink/50">
            {done}/{task.subtasks.length} done
          </span>
        )}
      </div>
      {task.subtasks.length > 0 && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-50">
          <div className="h-full bg-cyan transition-all" style={{ width: `${(done / task.subtasks.length) * 100}%` }} />
        </div>
      )}
      <ul className="mt-2 divide-y divide-ink-100">
        {task.subtasks.map((sub) => (
          <li key={sub.id} className="py-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-600"
                checked={sub.done}
                onChange={() =>
                  update((t, s) => {
                    const x = t.subtasks.find((y) => y.id === sub.id)!;
                    x.done = !x.done;
                    if (x.done) addComment(s, t.id, { kind: "system", userId: me, text: `${nameOf(s, me)} completed subtask “${x.title}”` });
                  })
                }
              />
              <span className={`min-w-0 flex-1 text-sm ${sub.done ? "text-ink/40 line-through" : ""}`}>{sub.title}</span>
              {sub.due && <span className="text-xs text-ink/50">{fmt(sub.due)}</span>}
              <button className="flex items-center gap-1 rounded-full px-1 hover:bg-ink-50" onClick={() => setEditing(editing === sub.id ? null : sub.id)} title="Assign people">
                {sub.assigneeIds.length ? <AvatarStack users={sub.assigneeIds.map((i) => state.users.find((u) => u.id === i))} /> : <span className="text-xs text-ink/40">+ assign</span>}
              </button>
            </div>
            {editing === sub.id && (
              <div className="ml-7 mt-2 space-y-2 rounded-lg bg-paper p-3">
                <UserPicker value={sub.assigneeIds} onChange={(ids) => patch(sub.id, (x) => void (x.assigneeIds = ids))} />
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-ink/50">Due</label>
                  <input type="date" className="input w-auto py-1 text-xs" value={sub.due ?? ""} onChange={(e) => patch(sub.id, (x) => void (x.due = e.target.value || undefined))} />
                  <span className="flex-1" />
                  <button className="btn-ghost px-2 py-1 text-xs text-red-600" onClick={() => update((t) => void (t.subtasks = t.subtasks.filter((x) => x.id !== sub.id)))}>
                    Delete
                  </button>
                  <button className="btn-outline px-2 py-1 text-xs" onClick={() => setEditing(null)}>
                    Done
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <form
        className="mt-2 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          update((t) => void t.subtasks.push(newSubtask(title.trim(), assignees.length ? assignees : [t.assigneeId])));
          setTitle("");
          setAssignees([]);
        }}
      >
        <div className="flex gap-2">
          <input className="input" placeholder="Add a subtask…" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button className="btn-primary" disabled={!title.trim()}>
            Add
          </button>
        </div>
        {title.trim() && (
          <div>
            <div className="mb-1 text-xs text-ink/50">Assign to (one or more — defaults to the task owner)</div>
            <UserPicker value={assignees} onChange={setAssignees} />
          </div>
        )}
      </form>
    </section>
  );
}

function ApprovalPanel({ task, update }: { task: Task; update: Update }) {
  const { state, act } = useStore();
  const me = state.currentUserId!;
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const approval = task.approval;
  const myTurn = task.status === "in_review" && approval?.approverIds.includes(me) && !approval.decisions.some((d) => d.userId === me && d.decision === "approved");

  return (
    <section className={`card p-4 ${myTurn ? "border-violet-300 ring-2 ring-violet-200" : ""}`}>
      <div className="flex items-center justify-between">
        <h2 className="h-entry text-lg">Approval</h2>
        {task.status !== "done" && task.status !== "in_review" && (
          <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setEditing(!editing)}>
            {editing ? "Close" : approval ? "Edit approvers" : "+ Require approval"}
          </button>
        )}
      </div>

      {!approval && !editing && <p className="mt-1 text-sm text-ink/50">No approval needed. The assignee can mark this Done directly.</p>}

      {editing && (
        <div className="mt-2 space-y-2 rounded-lg bg-paper p-3">
          <div className="text-xs text-ink/50">Who must approve before this is Done? (all of them)</div>
          <UserPicker
            value={approval?.approverIds ?? []}
            onChange={(ids) => update((t) => void (t.approval = ids.length ? { approverIds: ids, decisions: (t.approval?.decisions ?? []).filter((d) => ids.includes(d.userId)) } : undefined))}
          />
        </div>
      )}

      {approval && (
        <ul className="mt-3 space-y-2">
          {approval.approverIds.map((uid) => {
            const d = approval.decisions.find((x) => x.userId === uid);
            return (
              <li key={uid} className="flex items-start gap-3 text-sm">
                <Avatar user={state.users.find((u) => u.id === uid)} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{nameOf(state, uid)}</div>
                  {d?.note && <div className="text-xs text-ink/60">“{d.note}”</div>}
                </div>
                {d?.decision === "approved" ? (
                  <span className="chip bg-emerald-100 text-emerald-800">✓ Approved</span>
                ) : d?.decision === "changes" ? (
                  <span className="chip bg-red-100 text-red-800">Changes requested</span>
                ) : (
                  <span className="chip bg-ink-50 text-ink/50">{task.status === "in_review" ? "Waiting" : "Not yet submitted"}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {myTurn && (
        <div className="mt-4 space-y-2 rounded-lg bg-violet-50 p-3">
          <div className="text-sm font-medium text-violet-900">Your approval is needed</div>
          <input className="input" placeholder="Note (required for changes)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <button
              className="btn bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => {
                act((s) => decide(s, task.id, me, "approved", note.trim() || undefined));
                setNote("");
              }}
            >
              ✓ Approve
            </button>
            <button
              className="btn-outline text-red-700"
              disabled={!note.trim()}
              onClick={() => {
                act((s) => decide(s, task.id, me, "changes", note.trim()));
                setNote("");
              }}
            >
              Request changes
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Attachments({ task, update }: { task: Task; update: Update }) {
  const { state } = useStore();
  const me = state.currentUserId!;
  return (
    <section className="card p-4">
      <div className="label mb-2">Files</div>
      {task.requiredAttachment && (
        <div className={`mb-2 rounded-lg border border-dashed p-2 text-xs ${task.attachments.length ? "border-emerald-400 text-emerald-700" : "border-gold text-gold-600"}`}>
          Required: {task.requiredAttachment}
        </div>
      )}
      <ul className="space-y-1 text-sm">
        {task.attachments.map((a, i) => (
          <li key={i} className="flex items-center gap-2">
            📎 <span className="min-w-0 flex-1 truncate">{a}</span>
            <button className="text-xs text-ink/40 hover:text-red-600" onClick={() => update((t) => void t.attachments.splice(i, 1))}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <label className="btn-outline mt-2 w-full cursor-pointer text-xs">
        Upload file
        <input
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f)
              update((t, s) => {
                t.attachments.push(f.name);
                addComment(s, t.id, { kind: "system", userId: me, text: `${nameOf(s, me)} uploaded ${f.name}` });
              });
            e.target.value = "";
          }}
        />
      </label>
    </section>
  );
}

function Remarks({ taskId }: { taskId: string }) {
  const { state, act } = useStore();
  const me = state.currentUserId!;
  const [text, setText] = useState("");
  const items = state.comments.filter((c) => c.taskId === taskId).sort((a, b) => a.at.localeCompare(b.at));
  const count = items.filter((c) => c.kind === "comment").length;

  function post() {
    if (!text.trim()) return;
    act((s) => addComment(s, taskId, { kind: "comment", userId: me, text: text.trim() }));
    setText("");
  }

  return (
    <section className="card p-4">
      <h2 className="h-entry text-lg">
        Remarks <span className="text-sm font-normal text-ink/40">{count}</span>
      </h2>
      <ul className="mt-3 space-y-3">
        {items.length === 0 && <li className="text-sm text-ink/50">No remarks yet. Start the conversation below.</li>}
        {items.map((c) =>
          c.kind === "system" ? (
            <li key={c.id} className="flex items-center gap-2 pl-1 text-xs text-ink/45">
              <span className="h-1.5 w-1.5 rounded-full bg-ink/20" />
              {c.agent && <AgentBadge name={c.agent} />}
              <span>{c.text}</span>
              <span className="text-ink/30">· {timeAgo(c.at)}</span>
            </li>
          ) : (
            <li key={c.id} className="flex gap-3">
              <Avatar user={state.users.find((u) => u.id === c.userId)} size={30} />
              <div className="min-w-0 flex-1">
                <div className="text-xs">
                  <span className="font-semibold">{c.userId ? nameOf(state, c.userId) : c.agent}</span> <span className="text-ink/40">{timeAgo(c.at)}</span>
                </div>
                <div className="mt-0.5 whitespace-pre-wrap rounded-lg rounded-tl-none bg-paper px-3 py-2 text-sm">
                  <RichText text={c.text} users={state.users} />
                </div>
              </div>
            </li>
          ),
        )}
      </ul>
      <div className="mt-4 flex gap-2">
        <Avatar user={state.users.find((u) => u.id === me)} size={30} />
        <div className="flex-1">
          <textarea
            className="input min-h-[44px] resize-y"
            rows={2}
            placeholder="Write a remark… use @name to mention (Enter to send, Shift+Enter for a new line)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                post();
              }
            }}
          />
          <div className="mt-1.5 flex justify-end">
            <button className="btn-primary px-3 py-1.5 text-xs" disabled={!text.trim()} onClick={post}>
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
