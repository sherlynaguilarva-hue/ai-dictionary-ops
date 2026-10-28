/**
 * Team chat: channels, messages, and Scribe's task suggestions.
 * A suggestion nobody acts on within AUTO_CAPTURE_HOURS becomes a task.
 */
import type { Message, Project, State, Suggestion, User } from "./types";
import { detectTask } from "./detect";
import { addComment, createTask, notify } from "./engine";
import { now, nowISO } from "./clock";
import { toISODate } from "./dates";
import { uid } from "./id";

export const AUTO_CAPTURE_HOURS = 4;

export type Channel = { id: string; kind: "general" | "project" | "dm"; name: string; projectId?: string; partnerId?: string };

export function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[—–·]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function dmId(a: string, b: string) {
  return `dm:${[a, b].sort().join(":")}`;
}

/** Channels visible to a user: #general, one per project, and a DM with each teammate. */
export function channelsFor(state: State, userId: string): Channel[] {
  return [
    { id: "general", kind: "general", name: "general" },
    ...state.projects.map((p: Project): Channel => ({ id: `prj:${p.id}`, kind: "project", name: slug(p.name), projectId: p.id })),
    ...state.users.filter((u) => u.id !== userId).map((u: User): Channel => ({ id: dmId(userId, u.id), kind: "dm", name: u.name, partnerId: u.id })),
  ];
}

export function channelById(state: State, userId: string, id: string): Channel | undefined {
  return channelsFor(state, userId).find((c) => c.id === id);
}

export function unreadCount(state: State, userId: string, channelId: string): number {
  const last = state.chatReads[userId]?.[channelId] ?? "";
  return state.messages.filter((m) => m.channelId === channelId && m.userId !== userId && m.at > last).length;
}

export function markRead(state: State, userId: string, channelId: string) {
  (state.chatReads[userId] ??= {})[channelId] = nowISO();
}

/** Post a message; Scribe checks it for a task and @mentions notify people. */
export function postMessage(state: State, channelId: string, userId: string, text: string, at = nowISO()): Message {
  const msg: Message = { id: uid("msg"), channelId, userId, text: text.trim(), at };
  state.messages.push(msg);
  markRead(state, userId, channelId);

  const partnerId = channelId.startsWith("dm:") ? channelId.split(":").slice(1).find((id) => id !== userId) : undefined;
  const found = detectTask(msg.text, state.users, userId, toISODate(new Date(at)), partnerId);
  if (found) {
    state.suggestions.push({
      id: uid("sug"),
      messageId: msg.id,
      channelId,
      title: found.title,
      assigneeId: found.assigneeId,
      role: found.role,
      due: found.due,
      projectId: channelId.startsWith("prj:") ? channelId.slice(4) : undefined,
      status: "suggested",
      createdAt: at,
    });
  }

  const author = state.users.find((u) => u.id === userId)!;
  const mentioned = new Set(Array.from(msg.text.matchAll(/@(\w+)/g)).map((m) => state.users.find((u) => u.name.split(" ")[0].toLowerCase() === m[1].toLowerCase())?.id));
  if (partnerId) mentioned.add(partnerId);
  for (const id of mentioned)
    if (id && id !== userId) notify(state, id, "mention", null, `💬 ${author.name}${partnerId ? "" : " mentioned you"}`, msg.text.slice(0, 120), `/chat?c=${encodeURIComponent(channelId)}`);
  return msg;
}

/** Best project for a suggestion from #general or a DM: the assignee's busiest project. */
function guessProject(state: State, s: Suggestion): string {
  if (s.projectId) return s.projectId;
  const mine = state.tasks.filter((t) => t.assigneeId === s.assigneeId && t.status !== "done");
  return mine[0]?.projectId ?? state.projects[0].id;
}

export function acceptSuggestion(
  state: State,
  suggestionId: string,
  userId: string,
  edits: Partial<Pick<Suggestion, "title" | "assigneeId" | "due" | "projectId">> = {},
  auto = false,
) {
  const s = state.suggestions.find((x) => x.id === suggestionId)!;
  Object.assign(s, Object.fromEntries(Object.entries(edits).filter(([, v]) => v !== undefined)));
  const msg = state.messages.find((m) => m.id === s.messageId)!;
  const author = state.users.find((u) => u.id === msg.userId)!;
  const channel = channelById(state, msg.userId, s.channelId);
  const task = createTask(
    state,
    {
      projectId: guessProject(state, s),
      title: s.title,
      role: s.role,
      assigneeId: s.assigneeId,
      due: s.due,
      priority: "normal",
      description: `From chat (${channel?.kind === "dm" ? "direct message" : `#${channel?.name}`}) — ${author.name}: “${msg.text}”`,
      source: "chat",
      messageId: msg.id,
      autoCaptured: auto,
    },
    auto ? msg.userId : userId,
  );
  s.status = auto ? "auto" : "created";
  s.taskId = task.id;
  s.decidedBy = auto ? undefined : userId;
  if (auto) addComment(state, task.id, { kind: "system", agent: "Scribe", text: `Auto-captured from chat — nobody acted on it for ${AUTO_CAPTURE_HOURS} hours.` });
  if (task.assigneeId !== userId || auto)
    notify(state, task.assigneeId, "captured", null, auto ? "✦ Auto-captured from chat" : "✦ New task from chat", `${task.title} — due ${task.due}`, `/tasks/${task.id}`);
  return task;
}

export function ignoreSuggestion(state: State, suggestionId: string, userId: string) {
  const s = state.suggestions.find((x) => x.id === suggestionId)!;
  s.status = "ignored";
  s.decidedBy = userId;
}

/** Suggestions left alone for 4+ hours become tasks (rule from the spec). */
export function autoCaptureSuggestions(state: State, at: Date = now()) {
  for (const s of state.suggestions.filter((x) => x.status === "suggested")) {
    const hours = (at.getTime() - new Date(s.createdAt).getTime()) / 3_600_000;
    if (hours >= AUTO_CAPTURE_HOURS) {
      acceptSuggestion(state, s.id, "", {}, true);
      state.activity.unshift({ id: uid("act"), at: nowISO(), agent: "Scribe", message: `Auto-captured “${s.title}” from chat (no one acted for ${AUTO_CAPTURE_HOURS}h).`, href: s.taskId ? `/tasks/${s.taskId}` : undefined });
    }
  }
}

export function hoursLeft(s: Suggestion): number {
  return Math.max(0, AUTO_CAPTURE_HOURS - (now().getTime() - new Date(s.createdAt).getTime()) / 3_600_000);
}

