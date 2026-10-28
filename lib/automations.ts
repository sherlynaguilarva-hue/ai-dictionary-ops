/**
 * Daily check-in and reminder rules ("Coach" agent).
 *
 * runAutomations() looks at the clock and the data and creates in-app
 * notifications. Each rule has a key so it fires only once. Prototype:
 * nothing leaves the app — "emails" are only logged as simulated.
 */
import type { CheckIn, DailyUpdate, State, Task, User } from "./types";
import { addDays, daysBetween, fmt, toISODate } from "./dates";
import { addComment, completeTask, notify, setStatus } from "./engine";
import { autoCaptureSuggestions } from "./chat";
import { nowISO } from "./clock";
import { uid } from "./id";

export const CHECKIN_HOUR = 18; // 6 PM — evening check-in due
export const NUDGE_HOUR = 20; // 8 PM — second nudge if still missing
export const MORNING_HOUR = 8; // 8 AM — morning list + "No update" report

export function hourLabel(h: number) {
  return `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;
}

const isLead = (u: User) => u.roles.includes("owner") || u.roles.includes("admin");

/** Tasks a person must report on for a given day. */
export function tasksNeedingUpdate(state: State, userId: string, date: string): Task[] {
  return state.tasks
    .filter((t) => t.assigneeId === userId && t.status !== "done" && t.status !== "in_review")
    .filter((t) => t.due <= date || t.status === "in_progress" || t.status === "blocked")
    .sort((a, b) => a.due.localeCompare(b.due));
}

export function checkInFor(state: State, userId: string, date: string): CheckIn | undefined {
  return state.checkins.find((c) => c.userId === userId && c.date === date);
}

/** People who had something to report on `date` but didn't submit. */
export function noUpdateList(state: State, date: string) {
  return state.users
    .filter((u) => !checkInFor(state, u.id, date))
    .map((u) => ({ user: u, tasks: tasksNeedingUpdate(state, u.id, date) }))
    .filter((x) => x.tasks.length > 0);
}

/** Consecutive days with a submitted check-in, counting back from `date` (today counts once submitted). */
export function streak(state: State, userId: string, date: string): number {
  let d = checkInFor(state, userId, date) ? date : addDays(date, -1);
  let n = 0;
  while (checkInFor(state, userId, d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export type EntryInput = { taskId: string; status: DailyUpdate["status"]; percent?: number; note?: string };

/** Save someone's evening check-in and apply each answer to its task. */
export function submitCheckIn(state: State, userId: string, date: string, entries: EntryInput[]) {
  const at = nowISO();
  const me = state.users.find((u) => u.id === userId)!;
  for (const e of entries) {
    const task = state.tasks.find((t) => t.id === e.taskId)!;
    state.dailyUpdates.push({ id: uid("upd"), userId, date, at, ...e });
    if (e.status === "done") {
      completeTask(state, task.id, userId);
    } else if (e.status === "in_progress") {
      setStatus(state, task.id, "in_progress", userId);
      addComment(state, task.id, { kind: "comment", userId, text: `Daily update: ${e.percent ?? 0}% done${e.note ? ` — ${e.note}` : ""}` });
    } else {
      setStatus(state, task.id, "blocked", userId, e.note);
      // Tell the PM and whoever owns the tasks this one is waiting on.
      const waitingOn = state.tasks.filter((t) => task.dependsOn.includes(t.id) && t.status !== "done").map((t) => t.assigneeId);
      const recipients = new Set([...state.users.filter((u) => u.roles.includes("admin")).map((u) => u.id), ...waitingOn]);
      recipients.delete(userId);
      for (const r of recipients)
        notify(state, r, "blocked", null, `🚧 ${me.name} is blocked`, `“${task.title}” — ${e.note || "no reason given"}`, `/tasks/${task.id}`);
    }
  }
  state.checkins.push({ userId, date, submittedAt: at, taskCount: entries.length });
  state.activity.unshift({ id: uid("act"), at, agent: "Coach", message: `${me.name} submitted today's entry (${entries.length} task${entries.length === 1 ? "" : "s"}).`, href: "/check-in?tab=team" });
}

/** Run every reminder rule for the moment `at`. Returns how many notifications were created. */
export function runAutomations(state: State, at: Date): number {
  const before = state.notifications.length;
  const date = toISODate(at);
  const hour = at.getHours();
  const leads = state.users.filter(isLead);
  const open = state.tasks.filter((t) => t.status !== "done");
  const name = (id: string) => state.users.find((u) => u.id === id)?.name ?? "Someone";

  if (hour >= MORNING_HOUR) {
    // Morning: today's list for everyone with something due.
    for (const u of state.users) {
      const dueToday = open.filter((t) => t.assigneeId === u.id && t.due === date && t.status !== "in_review");
      if (dueToday.length)
        notify(state, u.id, "morning", `morning:${u.id}:${date}`, `☀ Today's entry: ${dueToday.length} task${dueToday.length > 1 ? "s" : ""} due`, dueToday.map((t) => t.title).slice(0, 3).join(" · "), "/my-day");
    }

    // Morning: "No update" report for yesterday.
    const yesterday = addDays(date, -1);
    const missed = noUpdateList(state, yesterday);
    if (missed.length && !state.firedKeys.includes(`noupdate:${yesterday}`)) {
      for (const l of leads)
        notify(state, l.id, "no-update", null, `📋 No update from ${missed.length} ${missed.length === 1 ? "person" : "people"} yesterday`, missed.map((m) => m.user.name).join(", "), "/check-in?tab=team");
      for (const m of missed)
        notify(state, m.user.id, "no-update", null, "You missed yesterday's entry", `${m.tasks.length} task${m.tasks.length > 1 ? "s" : ""} had no update. Your PM can see this.`, "/check-in");
      state.firedKeys.push(`noupdate:${yesterday}`);
      state.activity.unshift({ id: uid("act"), at: nowISO(), agent: "Coach", message: `No update yesterday (${fmt(yesterday)}): ${missed.map((m) => m.user.name).join(", ")}.`, href: "/check-in?tab=team" });
    }

    // Due tomorrow.
    for (const t of open.filter((t) => t.due === addDays(date, 1) && t.status !== "in_review"))
      notify(state, t.assigneeId, "due-soon", `due:${t.id}:${t.due}`, "⏰ Due tomorrow", t.title, `/tasks/${t.id}`);

    // Overdue: the assignee hears about each task; the PM (2+ days) and
    // Owner (4+ days) get one summary a day instead of one alert per task.
    const lateTasks = open.filter((t) => t.due < date && t.status !== "in_review");
    for (const t of lateTasks)
      notify(state, t.assigneeId, "overdue", `od1:${t.id}:${t.due}`, "⚠ Overdue", `“${t.title}” was due ${fmt(t.due)}.`, `/tasks/${t.id}`);
    const digest = (minDays: number, role: "admin" | "owner", title: string) => {
      const list = lateTasks.filter((t) => daysBetween(t.due, date) >= minDays).sort((a, b) => a.due.localeCompare(b.due));
      if (!list.length) return;
      const body = list.slice(0, 3).map((t) => `${name(t.assigneeId).split(" ")[0]}: ${t.title}`).join(" · ") + (list.length > 3 ? ` · +${list.length - 3} more` : "");
      for (const u of state.users.filter((u) => u.roles.includes(role)))
        notify(state, u.id, "escalation", `esc:${role}:${u.id}:${date}`, title.replace("{n}", String(list.length)).replace("{s}", list.length > 1 ? "s" : ""), body, list.length === 1 ? `/tasks/${list[0].id}` : "/calendar");
    };
    digest(2, "admin", "⬆ {n} task{s} 2+ days late");
    digest(4, "owner", "⬆⬆ {n} task{s} 4+ days late — escalated to you");

    // Approvals waiting.
    for (const t of state.tasks.filter((t) => t.status === "in_review" && t.approval))
      for (const id of t.approval!.approverIds.filter((id) => !t.approval!.decisions.some((d) => d.userId === id && d.decision === "approved")))
        notify(state, id, "approval", `appr:${t.id}:${id}:${date}`, "✔ Waiting for your approval", t.title, `/tasks/${t.id}`);
  }

  // Sponsor logo not uploaded within 3 days → remind sponsor (simulated email) + Sales.
  for (const t of open.filter((t) => t.automation === "logo-request" && !t.attachments.length && t.createdAt && daysBetween(t.createdAt, date) >= 3)) {
    const company = state.companies.find((c) => c.id === t.companyId);
    const deal = state.deals.find((d) => d.companyId === t.companyId && state.events.find((e) => e.id === d.eventId)?.projectId === t.projectId);
    const salesIds = new Set([t.assigneeId, deal?.ownerId].filter(Boolean) as string[]);
    let fired = false;
    for (const id of salesIds) fired = notify(state, id, "logo", `logo:${t.id}:${id}`, `🖼 ${company?.name ?? "Sponsor"} logo still missing`, "3 days since signing. A reminder was sent to the sponsor — please follow up.", `/tasks/${t.id}`) || fired;
    if (fired && company) {
      state.activity.unshift({ id: uid("act"), at: nowISO(), agent: "Coach", message: `📧 Simulated email (not sent) to ${company.contactName} <${company.contactEmail}>: “Friendly reminder — please upload your logo and brand guide.”`, href: `/tasks/${t.id}` });
      addComment(state, t.id, { kind: "system", agent: "Coach", text: `Logo not received after 3 days — reminder sent to ${company.contactName} (simulated) and Sales notified.` });
    }
  }

  if (hour >= CHECKIN_HOUR) {
    for (const u of state.users) {
      if (checkInFor(state, u.id, date)) continue;
      const n = tasksNeedingUpdate(state, u.id, date).length;
      if (!n) continue;
      notify(state, u.id, "checkin", `checkin:${u.id}:${date}`, "📝 Time for today's entry", `${n} task${n > 1 ? "s" : ""} to update. Takes under a minute.`, "/check-in");
      if (hour >= NUDGE_HOUR) notify(state, u.id, "nudge", `nudge:${u.id}:${date}`, "📝 Still missing today's entry", "Your PM will see “No update” tomorrow morning.", "/check-in");
    }
  }

  // Chat suggestions nobody acted on become tasks automatically.
  autoCaptureSuggestions(state, at);

  return state.notifications.length - before;
}
