"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { createInitiative } from "@/lib/engine";
import { addDays, today } from "@/lib/dates";
import { INITIATIVE } from "@/lib/types";

/** Start a project that doesn't come from a deal — e.g. our own course launch or event. */
export function NewProjectButton() {
  const { state, act } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState(state.templates[0].id);
  const [name, setName] = useState("");
  const [date, setDate] = useState(addDays(today(), 30));
  const [venue, setVenue] = useState("");
  const template = state.templates.find((t) => t.id === templateId)!;
  const meta = INITIATIVE[template.kind];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const id = act((s) => createInitiative(s, { name: name.trim(), templateId, date, venue: venue.trim() }, today()));
    setOpen(false);
    setName("");
    router.push(`/projects/${id}`);
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + New project
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="h-entry text-xl">New project</h2>
              <button type="button" className="btn-ghost px-2" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
            <div>
              <span className="label">Template</span>
              <div className="mt-1 grid gap-2">
                {state.templates.map((t) => (
                  <label key={t.id} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${t.id === templateId ? "border-ink bg-ink-50" : "border-ink-100"}`}>
                    <input type="radio" name="tpl" checked={t.id === templateId} onChange={() => setTemplateId(t.id)} className="mt-1" />
                    <span>
                      <span className="block text-sm font-medium">
                        {INITIATIVE[t.kind].icon} {t.name} <span className="font-normal text-ink/40">· {t.tasks.length} tasks</span>
                      </span>
                      <span className="block text-xs text-ink/60">{t.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <input autoFocus className="input text-base" placeholder={template.kind === "course" ? "e.g. Level 4 · Nova — Course Launch" : template.kind === "campaign" ? "e.g. Client — Campaign name" : "e.g. AI Words Workshop — Cebu"} value={name} onChange={(e) => setName(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">{meta.dateLabel} (T-0)</span>
                <input type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="block">
                <span className="label">{template.kind === "event" ? "Venue" : template.kind === "course" ? "Audience / level" : "Channels"}</span>
                <input className="input mt-1" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder={template.kind === "event" ? "Venue" : template.kind === "course" ? "Online · Ages 22–40" : "Facebook + Instagram"} />
              </label>
            </div>
            <p className="text-xs text-ink/50">All {template.tasks.length} tasks will be created and assigned by role, with due dates counted back from {meta.dateLabel.toLowerCase()}.</p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={!name.trim()}>
                Create project
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
