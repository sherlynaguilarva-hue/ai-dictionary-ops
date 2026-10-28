/**
 * Schedule forecasting for the Gantt chart and the Risk Brief.
 *
 * Forward pass: when will each task realistically finish, given what's late
 * and what it waits on? Backward pass: how late can it finish before
 * something downstream misses its deadline (slack)?
 */
import type { State, Task } from "./types";
import { addDays, daysBetween, fmt } from "./dates";

/** Bars are drawn as a few working days ending on the due date. */
export const BAR_DAYS = 3;

export type Forecast = {
  /** Realistic finish date. */
  end: string;
  /** Days later than the due date (0 = on time). */
  slip: number;
  /** Days this task can slip before a task that waits on it misses its deadline. Infinity if nothing waits on it. */
  slack: number;
  /** Zero slack and still open: any delay hurts. */
  critical: boolean;
  /** This task (or something it waits on) will push work past the event / launch date. */
  eventRisk: boolean;
  /** The downstream task that would be hit first. */
  limitingChildId?: string;
};

export function barStart(t: Task) {
  return addDays(t.due, -(BAR_DAYS - 1));
}

function maxDate(a: string, b: string) {
  return a > b ? a : b;
}

/** Tasks ordered so each comes after the tasks it waits on. */
function topoOrder(tasks: Task[]): Task[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const out: Task[] = [];
  const visit = (t: Task, stack: Set<string>) => {
    if (seen.has(t.id) || stack.has(t.id)) return;
    stack.add(t.id);
    for (const d of t.dependsOn) {
      const dep = byId.get(d);
      if (dep) visit(dep, stack);
    }
    stack.delete(t.id);
    seen.add(t.id);
    out.push(t);
  };
  for (const t of [...tasks].sort((a, b) => a.due.localeCompare(b.due))) visit(t, new Set());
  return out;
}

export function forecastProject(state: State, projectId: string, today: string): Record<string, Forecast> {
  const tasks = state.tasks.filter((t) => t.projectId === projectId);
  const event = state.events.find((e) => e.projectId === projectId);
  const order = topoOrder(tasks);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const children = new Map<string, Task[]>();
  for (const t of tasks) for (const d of t.dependsOn) if (byId.has(d)) children.set(d, [...(children.get(d) ?? []), t]);

  // Forward: an open task finishes no earlier than today, and at least a day after what it waits on.
  const end: Record<string, string> = {};
  for (const t of order) {
    if (t.status === "done") {
      end[t.id] = t.due;
      continue;
    }
    let earliest = t.due < today ? today : t.due;
    for (const d of t.dependsOn) if (end[d] && byId.get(d)!.status !== "done") earliest = maxDate(earliest, addDays(end[d], 1));
    end[t.id] = earliest;
  }

  // Backward: latest finish that still lets every downstream task meet its due date.
  const latest: Record<string, string> = {};
  const limiting: Record<string, string | undefined> = {};
  for (const t of [...order].reverse()) {
    let lf = t.due;
    for (const c of children.get(t.id) ?? []) {
      const cap = addDays(latest[c.id], -1);
      if (cap < lf) {
        lf = cap;
        limiting[t.id] = c.id;
      }
    }
    latest[t.id] = lf;
  }

  const out: Record<string, Forecast> = {};
  for (const t of order) {
    const kids = children.get(t.id) ?? [];
    // Slack against downstream tasks only (missing your own date is "slip").
    let slack = Infinity;
    let limitingChildId: string | undefined;
    for (const c of kids) {
      const s = daysBetween(end[t.id], addDays(latest[c.id], -1));
      if (s < slack) {
        slack = s;
        limitingChildId = c.id;
      }
    }
    out[t.id] = {
      end: end[t.id],
      slip: Math.max(0, daysBetween(t.due, end[t.id])),
      slack,
      critical: t.status !== "done" && slack <= 0,
      eventRisk: false,
      limitingChildId: limitingChildId ?? limiting[t.id],
    };
  }

  // Event risk: work due by the event that will now finish after it — and everything late that causes it.
  if (event) {
    const mark = (id: string) => {
      const f = out[id];
      if (!f || f.eventRisk) return;
      f.eventRisk = true;
      // A prerequisite is a cause if it's late itself, or if it finishes too close to let this task meet its date.
      for (const d of byId.get(id)!.dependsOn) {
        const dep = byId.get(d);
        if (out[d] && dep && dep.status !== "done" && (out[d].slip > 0 || addDays(out[d].end, 1) > byId.get(id)!.due)) mark(d);
      }
    };
    for (const t of tasks) if (t.status !== "done" && t.due <= event.date && out[t.id].end > event.date) mark(t.id);
  }
  return out;
}

export type WhatIf = { taskId: string; childId: string; days: number; text: string };

/** "If X slips N more days, Y will miss its deadline." — the closest calls first. */
export function whatIfs(state: State, projectId: string, today: string, limit = 3): WhatIf[] {
  const f = forecastProject(state, projectId, today);
  const out: WhatIf[] = [];
  // Only near-term work: what could realistically slip in the next three weeks.
  const horizon = addDays(today, 21);
  for (const t of state.tasks.filter((x) => x.projectId === projectId && x.status !== "done" && x.due <= horizon)) {
    const fc = f[t.id];
    if (!fc || !fc.limitingChildId || fc.slack === Infinity || fc.slack < 0 || fc.slack > 5) continue;
    const child = state.tasks.find((x) => x.id === fc.limitingChildId)!;
    const days = fc.slack + 1;
    out.push({ taskId: t.id, childId: child.id, days, text: `If “${t.title}” slips ${days} more day${days > 1 ? "s" : ""}, “${child.title}” will miss its deadline (${fmt(child.due)}).` });
  }
  const due = (id: string) => state.tasks.find((x) => x.id === id)!.due;
  return out.sort((a, b) => a.days - b.days || due(a.childId).localeCompare(due(b.childId))).slice(0, limit);
}
