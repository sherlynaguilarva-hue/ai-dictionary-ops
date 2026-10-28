/**
 * "Sentinel" — the morning Risk Brief: what's at risk, what's late, who's
 * quiet, where social is thin, what will slip next — and what to do.
 */
import type { Health, State, Task, User } from "./types";
import { addDays, daysBetween, fmt } from "./dates";
import { isOverdue, projectHealth } from "./engine";
import { forecastProject, whatIfs, type WhatIf } from "./schedule";
import { coverageGaps, type Gap } from "./social";
import { noUpdateList } from "./updates";

export type Action =
  | { kind: "nudge"; text: string; userId: string; taskId: string }
  | { kind: "draft-posts"; text: string; projectId: string }
  | { kind: "open"; text: string; href: string };

export type Brief = {
  projects: { projectId: string; name: string; health: Health; reasons: string[]; daysToLaunch: number }[];
  late: (Task & { daysLate: number })[];
  slipping: (Task & { slip: number; eventRisk: boolean })[];
  silent: { user: User; tasks: Task[] }[];
  gaps: Gap[];
  whatIfs: (WhatIf & { projectName: string })[];
  actions: Action[];
  headline: string;
};

export function buildBrief(state: State, today: string): Brief {
  const projects = state.projects
    .map((p) => {
      const e = state.events.find((x) => x.id === p.eventId)!;
      return { projectId: p.id, name: p.name, ...projectHealth(state, p.id, today), daysToLaunch: daysBetween(today, e.date) };
    })
    .filter((p) => p.daysToLaunch >= -14)
    .sort((a, b) => (a.health === b.health ? a.daysToLaunch - b.daysToLaunch : a.health === "red" ? -1 : b.health === "red" ? 1 : a.health === "yellow" ? -1 : 1));

  const late = state.tasks
    .filter((t) => isOverdue(t, today) && t.status !== "in_review")
    .map((t) => ({ ...t, daysLate: daysBetween(t.due, today) }))
    .sort((a, b) => b.daysLate - a.daysLate || (a.priority === "high" ? -1 : 1));

  const slipping: Brief["slipping"] = [];
  const allWhatIfs: Brief["whatIfs"] = [];
  for (const p of state.projects) {
    const f = forecastProject(state, p.id, today);
    for (const t of state.tasks.filter((x) => x.projectId === p.id && x.status !== "done" && x.due >= today))
      if (f[t.id]?.slip > 0) slipping.push({ ...t, slip: f[t.id].slip, eventRisk: f[t.id].eventRisk });
    allWhatIfs.push(...whatIfs(state, p.id, today, 2).map((w) => ({ ...w, projectName: p.name })));
  }
  slipping.sort((a, b) => Number(b.eventRisk) - Number(a.eventRisk) || b.slip - a.slip);
  allWhatIfs.sort((a, b) => a.days - b.days);

  const silent = noUpdateList(state, addDays(today, -1));
  const gaps = coverageGaps(state, today);

  const name = (id: string) => state.users.find((u) => u.id === id)?.name.split(" ")[0] ?? "someone";
  const actions: Action[] = [];
  for (const t of late.slice(0, 3)) actions.push({ kind: "nudge", text: `Nudge ${name(t.assigneeId)} about “${t.title}” (${t.daysLate} day${t.daysLate > 1 ? "s" : ""} late)`, userId: t.assigneeId, taskId: t.id });
  for (const g of gaps.slice(0, 2)) {
    const pname = state.projects.find((p) => p.id === g.projectId)?.name;
    const n = g.required - g.scheduled - g.drafts;
    if (n > 0) actions.push({ kind: "draft-posts", text: `Have Herald draft ${n} post${n > 1 ? "s" : ""} for ${pname}`, projectId: g.projectId });
    else actions.push({ kind: "open", text: `Approve ${g.drafts} draft post${g.drafts > 1 ? "s" : ""} for ${pname}`, href: "/social" });
  }
  for (const s of slipping.filter((x) => x.eventRisk).slice(0, 2)) actions.push({ kind: "open", text: `Re-plan the timeline: “${s.title}” is forecast ${s.slip} day${s.slip > 1 ? "s" : ""} late`, href: `/projects/${s.projectId}?view=timeline` });
  for (const m of silent.slice(0, 2)) actions.push({ kind: "open", text: `Check in with ${m.user.name.split(" ")[0]} — no update yesterday`, href: "/check-in?tab=team" });

  const red = projects.filter((p) => p.health === "red").length;
  const yellow = projects.filter((p) => p.health === "yellow").length;
  const headline =
    red || yellow
      ? `${red ? `${red} project${red > 1 ? "s" : ""} delayed` : ""}${red && yellow ? ", " : ""}${yellow ? `${yellow} at risk` : ""} · ${late.length} late task${late.length === 1 ? "" : "s"} · ${gaps.length} social gap${gaps.length === 1 ? "" : "s"}`
      : "All projects on track. ✨";
  return { projects, late, slipping, silent, gaps, whatIfs: allWhatIfs.slice(0, 5), actions, headline };
}

export function briefDateLabel(today: string) {
  return fmt(today, { weekday: "long", month: "long", day: "numeric" });
}
