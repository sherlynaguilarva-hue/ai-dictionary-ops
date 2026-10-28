"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { now } from "@/lib/clock";
import { Entry } from "@/components/ui";

function timeAgo(iso: string) {
  const mins = Math.round((now().getTime() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
  const { state, act } = useStore();
  const me = state.currentUserId!;
  const mine = state.notifications.filter((n) => n.userId === me);
  const unread = mine.filter((n) => !n.read).length;

  const markRead = (id?: string) =>
    act((s) => {
      for (const n of s.notifications) if (n.userId === me && (!id || n.id === id)) n.read = true;
    });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-entry text-2xl">Reminders</h1>
          <p className="text-sm text-ink/60">{unread ? `${unread} unread` : "All caught up"}</p>
        </div>
        <button className="btn-outline" disabled={!unread} onClick={() => markRead()}>
          Mark all read
        </button>
      </div>

      <p className="rounded-lg bg-gold/15 p-3 text-xs text-ink/70">
        Prototype: reminders appear only here in the app. No emails, texts or phone notifications are sent yet.
      </p>

      {mine.length === 0 ? (
        <div className="card p-6">
          <Entry word="qui·et" pron="/ˈkwaɪ.ət/" pos="adjective">
            no reminders yet. Use the 🕒 demo clock to jump to 6 PM and see what happens.
          </Entry>
        </div>
      ) : (
        <ul className="card divide-y divide-ink-100 overflow-hidden">
          {mine.map((n) => (
            <li key={n.id} className={n.read ? "" : "bg-cyan/5"}>
              <Link href={n.href ?? "#"} onClick={() => markRead(n.id)} className="flex gap-3 px-4 py-3 hover:bg-paper">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-cyan-600"}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${n.read ? "" : "font-semibold"}`}>{n.title}</span>
                  <span className="block text-sm text-ink/60">{n.body}</span>
                  <span className="block text-[11px] text-ink/40">{timeAgo(n.at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
