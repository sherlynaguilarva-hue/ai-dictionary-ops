/** Who owes a daily check-in, and who missed one. Shared by reminders, health and the Risk Brief. */
import type { CheckIn, State, Task } from "./types";
import { addDays } from "./dates";

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
