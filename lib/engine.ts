/**
 * Trigger engine: Deal Won → project from template → tasks with roles and
 * due dates → contract deliverables → tasks + social post slots.
 */
import type { ActivityEntry, Deliverable, Health, Role, SocialPost, State, Task } from "./types";
import { addDays, daysBetween } from "./dates";
import { uid } from "./id";

const OPEN: Task["status"][] = ["todo", "in_progress", "blocked"];

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

function newTask(state: State, t: Omit<Task, "id" | "assigneeId" | "status" | "attachments" | "checklist" | "dependsOn" | "priority"> & Partial<Task>): Task {
  const task: Task = {
    id: uid("tsk"),
    assigneeId: pickAssignee(state, t.role),
    status: "todo",
    attachments: [],
    checklist: [],
    dependsOn: [],
    priority: "normal",
    ...t,
  };
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
      checklist: (tt.checklist ?? []).map((text) => ({ text, done: false })),
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
      checklist: [
        { text: `Email upload link to ${company.contactName}`, done: false },
        { text: "Receive logo (PNG/SVG) + brand guide", done: false },
      ],
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
      checklist: slots.map((s) => ({ text: s.title, done: false })),
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
