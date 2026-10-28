"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useCurrentUser, useStore } from "@/lib/store";
import { AUTO_CAPTURE_HOURS, acceptSuggestion, channelById, channelsFor, hoursLeft, ignoreSuggestion, markRead, postMessage, unreadCount, type Channel } from "@/lib/chat";
import { dateLabel } from "@/lib/detect";
import { now } from "@/lib/clock";
import type { Message, Suggestion } from "@/lib/types";
import { Avatar, Entry, RichText, RoleChip } from "@/components/ui";

const EXAMPLES = ["@Bea pakisend yung deck bukas", "Paolo, paki-post na yung teaser mamaya", "Can you confirm the venue by Friday?", "Ako na mag-email sa client bukas"];

export default function ChatPage() {
  return (
    <Suspense>
      <Chat />
    </Suspense>
  );
}

function channelLabel(c: Channel) {
  return c.kind === "dm" ? c.name : `# ${c.name}`;
}

function Chat() {
  const { state, act } = useStore();
  const me = useCurrentUser()!;
  const router = useRouter();
  const params = useSearchParams();
  const channels = channelsFor(state, me.id);
  const activeId = params.get("c");
  const active = activeId ? channelById(state, me.id, activeId) : undefined;
  const messageCount = state.messages.filter((m) => m.channelId === activeId).length;

  // Opening a channel (or a new message arriving in it) marks it read.
  useEffect(() => {
    if (activeId && unreadCount(state, me.id, activeId) > 0) act((s) => markRead(s, me.id, activeId));
  }, [activeId, messageCount, act, me.id, state]);

  const open = (id: string) => router.replace(`/chat?c=${encodeURIComponent(id)}`);
  const groups: [string, Channel[]][] = [
    ["Channels", channels.filter((c) => c.kind !== "dm")],
    ["Direct messages", channels.filter((c) => c.kind === "dm")],
  ];

  return (
    <div className="-mx-4 -mb-24 -mt-5 flex h-[calc(100dvh-7.5rem)] md:-mx-8 md:-mb-10 md:-mt-8 md:h-screen">
      <aside className={`w-full shrink-0 overflow-y-auto border-r border-ink-100 bg-white md:block md:w-64 ${active ? "hidden" : "block"}`}>
        <div className="border-b border-ink-100 p-4">
          <h1 className="h-entry text-2xl">Chat</h1>
          <p className="text-xs text-ink/50">✦ Scribe turns requests into tasks</p>
        </div>
        {groups.map(([title, list]) => (
          <div key={title} className="p-2">
            <div className="label px-2 py-1">{title}</div>
            {list.map((c) => {
              const unread = unreadCount(state, me.id, c.id);
              const partner = state.users.find((u) => u.id === c.partnerId);
              return (
                <button key={c.id} onClick={() => open(c.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${c.id === activeId ? "bg-ink text-white" : "hover:bg-ink-50"}`}>
                  {partner ? <Avatar user={partner} size={20} /> : <span className="w-5 text-center text-ink/40">#</span>}
                  <span className={`min-w-0 flex-1 truncate ${unread ? "font-semibold" : ""}`}>{c.kind === "dm" ? c.name : c.name}</span>
                  {unread > 0 && <span className="rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{unread}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      <section className={`min-w-0 flex-1 flex-col bg-paper ${active ? "flex" : "hidden md:flex"}`}>
        {active ? (
          <Thread channel={active} onBack={() => router.replace("/chat")} />
        ) : (
          <div className="m-auto max-w-sm p-6 text-center">
            <Entry word="chat" pron="/tʃæt/" pos="noun">
              where &ldquo;pakisend yung deck bukas&rdquo; stops getting lost. Pick a channel to start.
            </Entry>
          </div>
        )}
      </section>
    </div>
  );
}

function Thread({ channel, onBack }: { channel: Channel; onBack: () => void }) {
  const { state, act } = useStore();
  const me = useCurrentUser()!;
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const messages = state.messages.filter((m) => m.channelId === channel.id).sort((a, b) => a.at.localeCompare(b.at));
  const project = state.projects.find((p) => p.id === channel.projectId);
  const pending = state.suggestions.filter((s) => s.channelId === channel.id && s.status === "suggested").length;

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, channel.id]);

  const send = (value = text) => {
    if (!value.trim()) return;
    act((s) => postMessage(s, channel.id, me.id, value));
    setText("");
  };

  // @mention helper: suggest names while typing "@be…"
  const partial = text.match(/@(\w*)$/)?.[1];
  const mentionOptions = partial !== undefined ? state.users.filter((u) => u.id !== me.id && u.name.toLowerCase().startsWith(partial.toLowerCase())) : [];

  return (
    <>
      <header className="flex items-center gap-3 border-b border-ink-100 bg-white px-4 py-3">
        <button onClick={onBack} className="btn-ghost px-2 md:hidden" aria-label="Back to channels">
          ←
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{channelLabel(channel)}</div>
          <div className="truncate text-xs text-ink/50">
            {channel.kind === "general" ? "Whole team" : channel.kind === "project" ? (
              <Link href={`/projects/${project?.id}`} className="hover:underline">
                {project?.name} →
              </Link>
            ) : (
              "Direct message"
            )}
          </div>
        </div>
        {pending > 0 && <span className="chip bg-cyan/20 text-cyan-600">✦ {pending} to review</span>}
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && <p className="mt-10 text-center text-sm text-ink/50">No messages yet. Say hi 👋 — or try an example below.</p>}
        {messages.map((m) => (
          <MessageRow key={m.id} m={m} />
        ))}
        <div ref={bottom} />
      </div>

      <div className="border-t border-ink-100 bg-white p-3">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="shrink-0 py-1 text-ink/40">Try:</span>
          {EXAMPLES.map((e) => (
            <button key={e} onClick={() => setText(e)} className="shrink-0 rounded-full border border-ink-100 px-2.5 py-1 text-ink/70 hover:border-ink/40">
              {e}
            </button>
          ))}
        </div>
        {mentionOptions.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {mentionOptions.map((u) => (
              <button key={u.id} onClick={() => setText(text.replace(/@\w*$/, `@${u.name.split(" ")[0]} `))} className="flex items-center gap-1.5 rounded-full border border-ink-100 bg-white py-0.5 pl-0.5 pr-2.5 text-xs hover:border-ink/40">
                <Avatar user={u} size={20} /> {u.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            className="input max-h-32 min-h-[42px] flex-1 resize-none"
            rows={1}
            placeholder={`Message ${channelLabel(channel)}`}
            title="Write in English, Tagalog or Taglish"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className="btn-primary h-[42px]" disabled={!text.trim()} onClick={() => send()}>
            Send
          </button>
        </div>
      </div>
    </>
  );
}

function MessageRow({ m }: { m: Message }) {
  const { state } = useStore();
  const author = state.users.find((u) => u.id === m.userId);
  const suggestion = state.suggestions.find((s) => s.messageId === m.id);
  const time = new Date(m.at);
  const sameDay = time.toDateString() === now().toDateString();
  return (
    <div className="flex gap-3">
      <Avatar user={author} size={32} />
      <div className="min-w-0 flex-1">
        <div className="text-xs">
          <span className="font-semibold">{author?.name}</span>{" "}
          <span className="text-ink/40">{sameDay ? time.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }) : time.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
        </div>
        <div className="mt-0.5 whitespace-pre-wrap text-[15px] leading-snug">
          <RichText text={m.text} users={state.users} />
        </div>
        {suggestion && <SuggestionCard s={suggestion} />}
      </div>
    </div>
  );
}

function SuggestionCard({ s }: { s: Suggestion }) {
  const { state, act } = useStore();
  const me = useCurrentUser()!;
  const [title, setTitle] = useState(s.title);
  const [assigneeId, setAssigneeId] = useState(s.assigneeId ?? "");
  const [due, setDue] = useState(s.due);
  const [projectId, setProjectId] = useState(s.projectId ?? state.tasks.find((t) => t.assigneeId === s.assigneeId && t.status !== "done")?.projectId ?? state.projects[0]?.id);
  const task = state.tasks.find((t) => t.id === s.taskId);
  const decider = state.users.find((u) => u.id === s.decidedBy);

  if (s.status === "ignored")
    return <div className="mt-1.5 text-xs text-ink/40">✦ Task suggestion ignored{decider ? ` by ${decider.name.split(" ")[0]}` : ""}</div>;

  if (task)
    return (
      <Link href={`/tasks/${task.id}`} className="mt-2 flex max-w-md items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm hover:border-emerald-400">
        <span className="text-emerald-700">✓</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{task.title}</span>
          <span className="block text-xs text-ink/60">
            {s.status === "auto" ? "✦ Auto-captured" : `Task created by ${decider?.name.split(" ")[0] ?? "someone"}`} · {state.users.find((u) => u.id === task.assigneeId)?.name.split(" ")[0]} · due {dateLabel(task.due)}
          </span>
        </span>
        <span className="text-ink/40">→</span>
      </Link>
    );

  const left = hoursLeft(s);
  const assignee = state.users.find((u) => u.id === assigneeId);
  return (
    <div className="mt-2 max-w-md rounded-xl border border-cyan/50 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="chip gap-1 bg-ink text-cyan">✦ Scribe spotted a task</span>
        <span className="text-ink/40" title={`Created automatically if nobody acts within ${AUTO_CAPTURE_HOURS} hours`}>
          auto-creates in {Math.floor(left) ? `${Math.floor(left)}h ` : ""}
          {Math.floor((left * 60) % 60)}m
        </span>
      </div>
      <input className="input mt-2 py-1.5 font-medium" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Task title" />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block text-xs text-ink/50">
          Assign to
          <select className="input mt-0.5 py-1.5 text-sm" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">Auto (by role)</option>
            {state.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-ink/50">
          Due
          <input type="date" className="input mt-0.5 py-1.5 text-sm" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        {!s.projectId && (
          <label className="col-span-2 block text-xs text-ink/50">
            Project
            <select className="input mt-0.5 py-1.5 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {state.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {!assignee && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink/50">
          Nobody named — will go to <RoleChip role={s.role} />
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button className="btn-primary flex-1 py-1.5" disabled={!title.trim()} onClick={() => act((st) => acceptSuggestion(st, s.id, me.id, { title: title.trim(), assigneeId: assigneeId || undefined, due, projectId }))}>
          ✓ Create task
        </button>
        <button className="btn-outline py-1.5" onClick={() => act((st) => ignoreSuggestion(st, s.id, me.id))}>
          Ignore
        </button>
      </div>
    </div>
  );
}
