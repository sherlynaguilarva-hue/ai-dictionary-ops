"use client";

import { useState } from "react";
import { useCurrentUser, useStore } from "@/lib/store";
import { COVERAGE, coverageGaps, coverageRuleText, DEFAULT_PLATFORMS, draftCaption, draftGapPosts } from "@/lib/social";
import { addDays, daysBetween, fmt, parseDate, today } from "@/lib/dates";
import { uid } from "@/lib/id";
import { PLATFORM, type Platform, type SocialPost, type State } from "@/lib/types";
import { AgentBadge, Entry, KindChip } from "@/components/ui";

const STATUS: Record<SocialPost["status"], { label: string; cls: string }> = {
  slot: { label: "Empty slot", cls: "bg-ink-50 text-ink/60" },
  draft: { label: "Draft · needs approval", cls: "bg-amber-50 text-amber-900" },
  scheduled: { label: "Scheduled", cls: "bg-cyan/20 text-cyan-600" },
  published: { label: "Published", cls: "bg-emerald-100 text-emerald-800" },
};

function mondayOf(d: string) {
  return addDays(d, -((parseDate(d).getDay() + 6) % 7));
}

export default function SocialPage() {
  const { state, act } = useStore();
  const me = useCurrentUser()!;
  const t = today();
  const canApprove = me.roles.includes("owner") || me.roles.includes("admin");
  const [projectId, setProjectId] = useState("all");
  const [editing, setEditing] = useState<SocialPost | null>(null);
  const gaps = coverageGaps(state, t);

  const posts = state.posts
    .filter((p) => projectId === "all" || p.projectId === projectId)
    .filter((p) => p.date >= addDays(t, -7) && p.date <= addDays(t, 42))
    .sort((a, b) => a.date.localeCompare(b.date));
  const weeks = new Map<string, SocialPost[]>();
  for (const p of posts) weeks.set(mondayOf(p.date), [...(weeks.get(mondayOf(p.date)) ?? []), p]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-entry text-2xl">Social media</h1>
          <p className="text-sm text-ink/60">Plan, write and approve posts. Herald drafts — a person always approves.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({ id: "", projectId: projectId === "all" ? state.projects[0].id : projectId, title: "", date: addDays(t, 1), status: "draft", platforms: [...DEFAULT_PLATFORMS] })}>
          + New post
        </button>
      </div>

      {gaps.length > 0 ? (
        <section className="space-y-2">
          {gaps.map((g) => {
            const e = state.events.find((x) => x.projectId === g.projectId)!;
            const missing = Math.max(0, g.required - g.scheduled - g.drafts);
            return (
              <div key={g.projectId} className="card flex flex-wrap items-center gap-3 border-red-200 bg-red-50/50 p-4">
                <span className="text-2xl">📣</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-red-900">Coverage gap — next 7 days</div>
                  <div className="text-sm text-ink/80">{g.message}</div>
                  <div className="mt-0.5 text-xs text-ink/50">
                    Rule for {e.kind === "campaign" ? "client campaigns" : `${e.kind}s`}: {coverageRuleText(e.kind)}
                    {g.drafts > 0 && ` · ${g.drafts} draft${g.drafts > 1 ? "s" : ""} waiting for approval`}
                  </div>
                </div>
                {missing > 0 && COVERAGE[e.kind] ? (
                  <button className="btn-primary" onClick={() => act((s) => draftGapPosts(s, g.projectId))}>
                    ✦ Draft {missing} with Herald
                  </button>
                ) : (
                  <span className="text-xs text-ink/50">Approve the drafts below to close it.</span>
                )}
              </div>
            );
          })}
        </section>
      ) : (
        <div className="card p-4">
          <Entry word="cov·er·age" pron="/ˈkʌv.ər.ɪdʒ/" pos="noun">
            enough posts, on the right days. Every project meets its rule for the next 7 days. ✓
          </Entry>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="all">All projects</option>
          {state.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink/50">Showing last week → 6 weeks ahead</span>
      </div>

      {weeks.size === 0 && <p className="text-sm text-ink/50">No posts in this range.</p>}
      {Array.from(weeks.entries()).map(([monday, list]) => (
        <section key={monday}>
          <h2 className="label mb-2">
            {monday <= t && t <= addDays(monday, 6) ? "This week" : monday < t ? "Last week" : daysBetween(t, monday) <= 7 ? "Next week" : `Week of ${fmt(monday)}`} · {list.length} post{list.length > 1 ? "s" : ""}
          </h2>
          <ul className="card divide-y divide-ink-100 overflow-hidden">
            {list.map((p) => {
              const project = state.projects.find((x) => x.id === p.projectId);
              const e = state.events.find((x) => x.projectId === p.projectId);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="w-14 text-center">
                    <div className="text-[11px] uppercase text-ink/50">{parseDate(p.date).toLocaleDateString("en-PH", { weekday: "short" })}</div>
                    <div className="font-serif text-xl font-semibold leading-none">{parseDate(p.date).getDate()}</div>
                  </div>
                  <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(p)}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">{p.title}</span>
                      {(p.platforms ?? []).map((pl) => (
                        <span key={pl} className="rounded px-1 text-[10px] font-bold text-white" style={{ background: PLATFORM[pl].color }}>
                          {PLATFORM[pl].short}
                        </span>
                      ))}
                    </div>
                    <div className="truncate text-xs text-ink/50">{p.caption ? p.caption.split("\n")[0] : "No caption yet — tap to write"}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink/50">
                      {e && <KindChip kind={e.kind} />} {project?.name}
                    </div>
                  </button>
                  <span className={`chip ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
                  {p.status === "draft" && canApprove && p.caption && (
                    <button className="btn-outline px-2.5 py-1 text-xs" onClick={() => act((s) => approve(s, p.id, me.id))}>
                      ✓ Approve & schedule
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {editing && <PostEditor post={editing} canApprove={canApprove} onClose={() => setEditing(null)} />}
    </div>
  );
}

function approve(s: State, id: string, userId: string) {
  const p = s.posts.find((x) => x.id === id)!;
  p.status = "scheduled";
  p.approvedBy = userId;
}

function PostEditor({ post, canApprove, onClose }: { post: SocialPost; canApprove: boolean; onClose: () => void }) {
  const { state, act } = useStore();
  const me = useCurrentUser()!;
  const [p, setP] = useState<SocialPost>({ ...post, platforms: post.platforms ?? [...DEFAULT_PLATFORMS] });
  const [seed, setSeed] = useState(0);
  const set = (patch: Partial<SocialPost>) => setP((x) => ({ ...x, ...patch }));
  const isNew = !post.id;
  const locked = post.status === "published";

  function save(status: SocialPost["status"]) {
    act((s) => {
      const next = { ...p, status, title: p.title.trim() || "Post", approvedBy: status === "scheduled" ? me.id : p.approvedBy };
      if (isNew) s.posts.push({ ...next, id: uid("pst") });
      else Object.assign(s.posts.find((x) => x.id === post.id)!, next);
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="h-entry text-xl">{isNew ? "New post" : locked ? "Published post" : "Edit post"}</h2>
          <button className="btn-ghost px-2" onClick={onClose}>
            ✕
          </button>
        </div>
        <input className="input" placeholder="Short title, e.g. “Countdown: 7 days”" value={p.title} disabled={locked} onChange={(e) => set({ title: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Project</span>
            <select className="input mt-1" value={p.projectId} disabled={locked || !isNew} onChange={(e) => set({ projectId: e.target.value })}>
              {state.projects.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Date</span>
            <input type="date" className="input mt-1" value={p.date} disabled={locked} onChange={(e) => set({ date: e.target.value })} />
          </label>
        </div>
        <div>
          <span className="label">Platforms</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(Object.keys(PLATFORM) as Platform[]).map((pl) => {
              const on = p.platforms!.includes(pl);
              return (
                <button key={pl} type="button" disabled={locked} onClick={() => set({ platforms: on ? p.platforms!.filter((x) => x !== pl) : [...p.platforms!, pl] })} className={`rounded-full border px-3 py-1 text-xs ${on ? "border-ink bg-ink text-white" : "border-ink-100 text-ink/60"}`}>
                  {PLATFORM[pl].label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <span className="label">Caption</span>
            {!locked && (
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-cyan-600 hover:underline"
                onClick={() => {
                  set({ caption: draftCaption(state, p, seed) });
                  setSeed(seed + 1);
                }}
              >
                <AgentBadge name="Herald" /> {p.caption ? "Try another draft" : "Draft caption"}
              </button>
            )}
          </div>
          <textarea className="input mt-1 h-44 font-mono text-[13px]" value={p.caption ?? ""} disabled={locked} onChange={(e) => set({ caption: e.target.value })} placeholder="Write the caption, or let Herald draft one in the dictionary style." />
          <div className="mt-1 text-right text-[11px] text-ink/40">{(p.caption ?? "").length} characters</div>
        </div>
        <p className="rounded-lg bg-gold/15 p-2.5 text-xs text-ink/70">Prototype: “Scheduled” posts are marked “Published” on their date, but nothing is actually posted to Facebook, Instagram, TikTok or LinkedIn yet.</p>
        {!locked && (
          <div className="flex flex-wrap justify-end gap-2">
            {!isNew && (
              <button
                className="btn-ghost mr-auto text-red-600"
                onClick={() => {
                  act((s) => void (s.posts = s.posts.filter((x) => x.id !== post.id)));
                  onClose();
                }}
              >
                Delete
              </button>
            )}
            <button className="btn-outline" onClick={() => save("draft")} disabled={!p.platforms!.length}>
              Save draft
            </button>
            {canApprove ? (
              <button className="btn-primary" onClick={() => save("scheduled")} disabled={!p.caption?.trim() || !p.platforms!.length}>
                ✓ Approve & schedule
              </button>
            ) : (
              <span className="self-center text-xs text-ink/50">Owner / Admin approves before it&apos;s scheduled.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
