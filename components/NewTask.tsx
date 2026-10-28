"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { createTask } from "@/lib/engine";
import { addDays, today } from "@/lib/dates";
import { ROLE_LABEL, type Role, type Task } from "@/lib/types";
import { Avatar } from "./ui";

/** Toggle-chip picker for one or more people. */
export function UserPicker({ value, onChange, exclude = [] }: { value: string[]; onChange: (ids: string[]) => void; exclude?: string[] }) {
  const { state } = useStore();
  return (
    <div className="flex flex-wrap gap-1.5">
      {state.users
        .filter((u) => !exclude.includes(u.id))
        .map((u) => {
          const on = value.includes(u.id);
          return (
            <button
              type="button"
              key={u.id}
              onClick={() => onChange(on ? value.filter((x) => x !== u.id) : [...value, u.id])}
              className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs transition ${on ? "border-ink bg-ink text-white" : "border-ink-100 bg-white text-ink/70 hover:border-ink/40"}`}
            >
              <Avatar user={u} size={20} />
              {u.name.split(" ")[0]}
            </button>
          );
        })}
    </div>
  );
}

export function NewTaskButton({ projectId, className = "btn-primary" }: { projectId?: string; className?: string }) {
  const { state, act } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const empty = () => ({
    projectId: projectId ?? state.projects[0]?.id ?? "",
    title: "",
    role: "admin" as Role,
    assigneeId: "",
    due: addDays(today(), 3),
    priority: "normal" as Task["priority"],
    description: "",
    needsApproval: false,
    approverIds: [] as string[],
    requiredAttachment: "",
  });
  const [f, setF] = useState(empty);
  const set = (patch: Partial<ReturnType<typeof empty>>) => setF((x) => ({ ...x, ...patch }));

  if (!state.projects.length) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim() || !f.projectId) return;
    const task = act((s) =>
      createTask(
        s,
        {
          projectId: f.projectId,
          title: f.title.trim(),
          role: f.role,
          assigneeId: f.assigneeId || undefined,
          due: f.due,
          priority: f.priority,
          description: f.description,
          approverIds: f.needsApproval ? f.approverIds : [],
          requiredAttachment: f.requiredAttachment.trim(),
        },
        s.currentUserId!,
      ),
    );
    setOpen(false);
    setF(empty());
    router.push(`/tasks/${task.id}`);
  }

  const inRole = state.users.filter((u) => u.roles.includes(f.role));

  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        + New task
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="h-entry text-xl">New task</h2>
              <button type="button" className="btn-ghost px-2" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            <input autoFocus className="input text-base" placeholder="What needs to be done?" value={f.title} onChange={(e) => set({ title: e.target.value })} />

            {!projectId && (
              <label className="block">
                <span className="label">Project</span>
                <select className="input mt-1" value={f.projectId} onChange={(e) => set({ projectId: e.target.value })}>
                  {state.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Role</span>
                <select className="input mt-1" value={f.role} onChange={(e) => set({ role: e.target.value as Role, assigneeId: "" })}>
                  {Object.entries(ROLE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Assignee</span>
                <select className="input mt-1" value={f.assigneeId} onChange={(e) => set({ assigneeId: e.target.value })}>
                  <option value="">Auto (by role)</option>
                  {(inRole.length ? inRole : state.users).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                  {inRole.length > 0 && <option disabled>──────</option>}
                  {inRole.length > 0 &&
                    state.users
                      .filter((u) => !inRole.includes(u))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Due</span>
                <input type="date" className="input mt-1" value={f.due} onChange={(e) => set({ due: e.target.value })} />
              </label>
              <label className="block">
                <span className="label">Priority</span>
                <select className="input mt-1" value={f.priority} onChange={(e) => set({ priority: e.target.value as Task["priority"] })}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>

            <textarea className="input h-20" placeholder="Details (optional)" value={f.description} onChange={(e) => set({ description: e.target.value })} />

            <input className="input" placeholder="Required file to close, e.g. “Signed quotation” (optional)" value={f.requiredAttachment} onChange={(e) => set({ requiredAttachment: e.target.value })} />

            <div className="rounded-lg border border-ink-100 p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={f.needsApproval} onChange={(e) => set({ needsApproval: e.target.checked })} />
                Needs approval before Done
              </label>
              {f.needsApproval && (
                <div className="mt-2">
                  <div className="mb-1.5 text-xs text-ink/50">Approvers (all must approve)</div>
                  <UserPicker value={f.approverIds} onChange={(approverIds) => set({ approverIds })} />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={!f.title.trim() || (f.needsApproval && !f.approverIds.length)}>
                Create task
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
