/**
 * Trigger engine: Deal Won → project from template → tasks with roles and
 * due dates → contract deliverables → tasks + social post slots.
 */
import type { ActivityEntry, Comment, Deliverable, Health, Role, SocialPost, State, Subtask, Task } from "./types";
import { addDays, daysBetween } from "./dates";
import { uid } from "./id";

const OPEN: Task["status"][] = ["todo", "in_progress", "blocked", "in_review"];

function log(state: State, entry: Omit<ActivityEntry, "id" | "at">) {
  state.activity.unshift({ id: uid("act"), at: new Date().toISOString(), ...entry });
}

function maxDate(a: string, b: string) {
  return a > b ? a : b;
}

/** Assign by role, not name: the person in that role with the fewest open tasks. */
export function pickAssignee(state: State, role: Role): string {
  const people = state.users.filter((u) => u.roles.includes(role));
  const pool = people.length ? people : state.users.filter((u) => u.roles.includes("admin"));
  const load = (id: string) => state.tasks.filter((t) => t.assigneeId === id && OPEN.includes(t.status)).length;
  return [...pool].sort((a, b) => load(a.id) - load(b.id))[0].id;
}

/** First person in each role, skipping the assignee (no self-approval). */
export function approversFor(state: State, roles: Role[], assigneeId: string): string[] {
  const ids = roles
    .map((r) => state.users.find((u) => u.roles.includes(r) && u.id !== assigneeId)?.id)
    .filter((x): x is string => Boolean(x));
  return Array.from(new Set(ids));
}

type NewTask = Omit<Task, "id" | "assigneeId" | "status" | "attachments" | "subtasks" | "dependsOn" | "priority" | "description"> &
  Partial<Task> & { checklistItems?: string[]; approverRoles?: Role[] };

function newTask(state: State, input: NewTask): Task {
  const { checklistItems, approverRoles, ...t } = input;
  const assigneeId = t.assigneeId ?? pickAssignee(state, t.role);
  const task: Task = {
    id: uid("tsk"),
    status: "todo",
    description: "",
    attachments: [],
    subtasks: (checklistItems ?? []).map((title) => ({ id: uid("sub"), title, assigneeIds: [assigneeId], done: false })),
    dependsOn: [],
    priority: "normal",
    ...t,
    assigneeId,
  };
  if (approverRoles?.length && !task.approval) {
    const approverIds = approversFor(state, approverRoles, assigneeId);
    if (approverIds.length) task.approval = { approverIds, decisions: [] };
  }
  state.tasks.push(task);
  return task;
}

/** Create the event's project from its template. Returns the project id. */
export function createProjectFromTemplate(state: State, eventId: string, on: string): string {
  const event = state.events.find((e) => e.id === eventId)!;
  if (event.projectId) return event.projectId;
  const template = state.templates.find((t) => t.id === event.templateId)!;
  const projectId = uid("prj");
  state.projects.push({ id: projectId, eventId, name: event.name, createdAt: on });
  event.projectId = projectId;

  const idByKey: Record<string, string> = {};
  for (const tt of template.tasks) {
    const task = newTask(state, {
      projectId,
      title: tt.title,
      role: tt.role,
      due: maxDate(on, addDays(event.date, tt.offset)),
      source: "template",
      templateKey: tt.key,
      requiredAttachment: tt.requiredAttachment,
      priority: tt.priority ?? "normal",
      checklistItems: tt.checklist,
      approverRoles: tt.approverRoles,
    });
    idByKey[tt.key] = task.id;
  }
  for (const tt of template.tasks) {
    const task = state.tasks.find((t) => t.id === idByKey[tt.key])!;
    task.dependsOn = (tt.dependsOn ?? []).map((k) => idByKey[k]).filter(Boolean);
  }
  log(state, {
    agent: "Clerk",
    message: `Created project “${event.name}” from template “${template.name}” with ${template.tasks.length} tasks.`,
    href: `/projects/${projectId}`,
  });
  return projectId;
}

function deliverableTasks(state: State, projectId: string, eventDate: string, companyId: string, dels: Deliverable[], on: string) {
  const company = state.companies.find((c) => c.id === companyId)!;
  const projectTasks = () => state.tasks.filter((t) => t.projectId === projectId);
  const created: string[] = [];

  const logos = dels.filter((d) => d.kind === "logo");
  if (logos.length) {
    const request = newTask(state, {
      projectId,
      title: `Request logo + brand guide from ${company.name}`,
      role: "sales",
      due: addDays(on, 2),
      source: "contract",
      companyId,
      priority: "high",
      requiredAttachment: `${company.name} logo (high-res)`,
      checklistItems: [`Email upload link to ${company.contactName}`, "Receive logo (PNG/SVG) + brand guide"],
    });
    created.push(request.title);
    const finalPoster = projectTasks().find((t) => t.templateKey === "final-poster");
    for (const d of logos) {
      const place = newTask(state, {
        projectId,
        title: `Place ${company.name} logo — ${d.description}`,
        role: "creative",
        due: maxDate(addDays(request.due, 1), addDays(eventDate, -15)),
        source: "contract",
        deliverableId: d.id,
        companyId,
        dependsOn: [request.id],
        requiredAttachment: "Proof with logo placed",
        approverRoles: ["sales"],
      });
      created.push(place.title);
      if (finalPoster) finalPoster.dependsOn.push(place.id);
    }
  }

  for (const d of dels.filter((d) => d.kind === "social")) {
    const slots: SocialPost[] = [];
    for (let i = 0; i < d.quantity; i++) {
      // Spread shout-outs across the final two weeks: T-14, T-7, T-3, ...
      const offsets = [-14, -7, -3, -1];
      const date = maxDate(addDays(on, 3), addDays(eventDate, offsets[i] ?? -1));
      slots.push({ id: uid("pst"), projectId, title: `Sponsor shout-out: ${company.name} (${i + 1}/${d.quantity})`, date, status: "slot", companyId, deliverableId: d.id });
    }
    state.posts.push(...slots);
    const first = slots.map((s) => s.date).sort()[0];
    const t = newTask(state, {
      projectId,
      title: `Draft ${d.quantity} sponsor shout-out${d.quantity > 1 ? "s" : ""} for ${company.name}`,
      role: "social",
      due: maxDate(on, addDays(first, -2)),
      source: "contract",
      deliverableId: d.id,
      companyId,
      checklistItems: slots.map((s) => s.title),
      approverRoles: ["owner"],
    });
    created.push(t.title);
  }

  for (const d of dels.filter((d) => d.kind === "booth")) {
    created.push(
      newTask(state, { projectId, title: `Allocate booth for ${company.name} — ${d.description}`, role: "eventops", due: maxDate(on, addDays(eventDate, -10)), source: "contract", deliverableId: d.id, companyId }).title,
    );
  }
  for (const d of dels.filter((d) => d.kind === "speaking")) {
    created.push(
      newTask(state, { projectId, title: `Schedule speaking slot for ${company.name}`, role: "admin", due: maxDate(on, addDays(eventDate, -14)), source: "contract", deliverableId: d.id, companyId }).title,
    );
  }
  for (const d of dels.filter((d) => d.kind === "other")) {
    created.push(
      newTask(state, { projectId, title: `${company.name}: ${d.description}`, role: "admin", due: maxDate(on, addDays(eventDate, -14)), source: "contract", deliverableId: d.id, companyId }).title,
    );
  }
  return created;
}

/** Mark a deal Won. Requires a confirmed contract. Mutates a draft copy of state. */
export function winDeal(state: State, dealId: string, on: string): { projectId: string; created: string[] } {
  const deal = state.deals.find((d) => d.id === dealId)!;
  const contract = state.contracts.find((c) => c.id === deal.contractId);
  if (!contract || contract.status !== "confirmed") throw new Error("Confirm the contract deliverables first.");
  const event = state.events.find((e) => e.id === deal.eventId)!;
  const company = state.companies.find((c) => c.id === deal.companyId)!;

  deal.stage = "won";
  log(state, { message: `${company.name} deal marked Won (₱${deal.value.toLocaleString()}).`, href: `/deals/${deal.id}` });

  const existed = Boolean(event.projectId);
  const projectId = createProjectFromTemplate(state, event.id, on);
  const created = deliverableTasks(state, projectId, event.date, company.id, contract.deliverables, on);
  log(state, {
    agent: "Clerk",
    message: `Added ${created.length} task${created.length === 1 ? "" : "s"} from ${company.name}'s contract to ${existed ? "existing" : "new"} project “${event.name}”.`,
    href: `/projects/${projectId}`,
  });
  return { projectId, created };
}

export function isOverdue(t: Task, on: string) {
  return t.status !== "done" && t.due < on;
}

export function projectHealth(state: State, projectId: string, on: string): { health: Health; reasons: string[] } {
  const tasks = state.tasks.filter((t) => t.projectId === projectId);
  const overdue = tasks.filter((t) => isOverdue(t, on));
  const blocked = tasks.filter((t) => t.status === "blocked");
  const reasons: string[] = [];
  if (overdue.length) reasons.push(`${overdue.length} overdue task${overdue.length > 1 ? "s" : ""}`);
  if (blocked.length) reasons.push(`${blocked.length} blocked`);
  const missingAttach = tasks.filter((t) => t.requiredAttachment && t.attachments.length === 0 && t.status !== "done" && daysBetween(on, t.due) <= 0);
  if (missingAttach.length) reasons.push(`${missingAttach.length} missing required file${missingAttach.length > 1 ? "s" : ""}`);
  const highOverdue = overdue.filter((t) => t.priority === "high");
  const health: Health = highOverdue.length || overdue.length > 2 ? "red" : reasons.length ? "yellow" : "green";
  return { health, reasons };
}

/** A task can't be closed until its required attachment is present. */
export function canComplete(t: Task): boolean {
  return !t.requiredAttachment || t.attachments.length > 0;
}

export function isApproved(t: Task): boolean {
  if (!t.approval?.approverIds.length) return true;
  return t.approval.approverIds.every((id) => t.approval!.decisions.some((d) => d.userId === id && d.decision === "approved"));
}

export function addComment(state: State, taskId: string, c: Omit<Comment, "id" | "at" | "taskId">) {
  state.comments.push({ id: uid("cmt"), at: new Date().toISOString(), taskId, ...c });
}

const STATUS_WORD: Record<Task["status"], string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  in_review: "In review",
  done: "Done",
};

function nameOf(state: State, userId: string) {
  return state.users.find((u) => u.id === userId)?.name ?? "Someone";
}

/** Set a non-terminal status. Done goes through completeTask so approvals apply. */
export function setStatus(state: State, taskId: string, status: Exclude<Task["status"], "done" | "in_review">, userId: string, note?: string) {
  const t = state.tasks.find((x) => x.id === taskId)!;
  if (t.status === status) return;
  t.status = status;
  addComment(state, taskId, { kind: "system", userId, text: `${nameOf(state, userId)} set status to ${STATUS_WORD[status]}${note ? ` — ${note}` : ""}` });
}

/** Mark done, or send for approval when sign-off is required. */
export function completeTask(state: State, taskId: string, userId: string): "done" | "in_review" {
  const t = state.tasks.find((x) => x.id === taskId)!;
  if (!canComplete(t)) throw new Error(`Upload “${t.requiredAttachment}” first.`);
  if (t.approval?.approverIds.length && !isApproved(t)) {
    t.approval.decisions = [];
    t.status = "in_review";
    const names = t.approval.approverIds.map((id) => nameOf(state, id)).join(", ");
    addComment(state, taskId, { kind: "system", userId, text: `${nameOf(state, userId)} submitted for approval → ${names}` });
    return "in_review";
  }
  t.status = "done";
  addComment(state, taskId, { kind: "system", userId, text: `${nameOf(state, userId)} marked this Done` });
  return "done";
}

export function reopenTask(state: State, taskId: string, userId: string) {
  const t = state.tasks.find((x) => x.id === taskId)!;
  t.status = "in_progress";
  if (t.approval) t.approval.decisions = [];
  addComment(state, taskId, { kind: "system", userId, text: `${nameOf(state, userId)} reopened this task` });
}

export function decide(state: State, taskId: string, userId: string, decision: "approved" | "changes", note?: string) {
  const t = state.tasks.find((x) => x.id === taskId)!;
  if (!t.approval?.approverIds.includes(userId)) throw new Error("You're not an approver on this task.");
  t.approval.decisions = t.approval.decisions.filter((d) => d.userId !== userId);
  t.approval.decisions.push({ userId, decision, note, at: new Date().toISOString() });
  const who = nameOf(state, userId);
  if (decision === "changes") {
    t.status = "in_progress";
    addComment(state, taskId, { kind: "system", userId, text: `${who} requested changes${note ? `: “${note}”` : ""}` });
    return;
  }
  addComment(state, taskId, { kind: "system", userId, text: `${who} approved${note ? `: “${note}”` : ""}` });
  if (isApproved(t)) {
    t.status = "done";
    addComment(state, taskId, { kind: "system", text: "All approvals in — task is Done ✓" });
  }
}

export function createTask(
  state: State,
  input: { projectId: string; title: string; role: Role; assigneeId?: string; due: string; priority: Task["priority"]; description?: string; approverIds?: string[]; requiredAttachment?: string },
  userId: string,
): Task {
  const { approverIds, ...rest } = input;
  const task = newTask(state, {
    ...rest,
    description: rest.description ?? "",
    requiredAttachment: rest.requiredAttachment || undefined,
    source: "manual",
    createdBy: userId,
    approval: approverIds?.length ? { approverIds, decisions: [] } : undefined,
  });
  addComment(state, task.id, { kind: "system", userId, text: `${nameOf(state, userId)} created this task` });
  return task;
}

export function newSubtask(title: string, assigneeIds: string[]): Subtask {
  return { id: uid("sub"), title, assigneeIds, done: false };
}
