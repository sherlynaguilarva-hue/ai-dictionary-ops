"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCurrentUser, useStore } from "@/lib/store";
import { ROLE_LABEL } from "@/lib/types";
import { now } from "@/lib/clock";
import { today } from "@/lib/dates";
import { CHECKIN_HOUR, checkInFor, runAutomations, tasksNeedingUpdate } from "@/lib/automations";
import { channelsFor, unreadCount } from "@/lib/chat";
import { Avatar } from "./ui";
import { DemoClock } from "./DemoClock";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "◧" },
  { href: "/brief", label: "Risk Brief", icon: "🛡" },
  { href: "/my-day", label: "My Day", icon: "☀" },
  { href: "/check-in", label: "Check-in", icon: "✎" },
  { href: "/chat", label: "Chat", icon: "💬" },
  { href: "/calendar", label: "Calendar", icon: "▦" },
  { href: "/social", label: "Social", icon: "📣" },
  { href: "/projects", label: "Projects", icon: "▤" },
  { href: "/pipeline", label: "Pipeline", icon: "⇶" },
  { href: "/subscribers", label: "Subscribers", icon: "✉" },
];
const MOBILE_TABS = ["/my-day", "/chat", "/check-in", "/calendar"];

export function Logo({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink font-serif text-lg font-bold text-cyan">Ai</span>
      <span className="leading-tight">
        <span className="block font-serif text-base font-semibold">AI Dictionary</span>
        <span className="block text-[11px] text-ink/50">Ops</span>
      </span>
    </Link>
  );
}

/** Runs the reminder rules on load, when the demo clock moves, and every minute. */
function useAutomations() {
  const { state, act } = useStore();
  const simulatedNow = state.simulatedNow;
  useEffect(() => {
    act((s) => runAutomations(s, now()));
    if (simulatedNow) return;
    const id = setInterval(() => act((s) => runAutomations(s, now())), 60_000);
    return () => clearInterval(id);
  }, [simulatedNow, act]);
}

function Bell() {
  const { state } = useStore();
  const unread = state.notifications.filter((n) => n.userId === state.currentUserId && !n.read).length;
  return (
    <Link href="/notifications" className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink-50" title="Reminders">
      <span className="text-lg">🔔</span>
      {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}
    </Link>
  );
}

/** Dot on the Check-in tab: amber = due later today, red = due now (after 6 PM). */
function useCheckInDot(): "amber" | "red" | null {
  const { state } = useStore();
  const id = state.currentUserId!;
  const t = today();
  if (checkInFor(state, id, t) || !tasksNeedingUpdate(state, id, t).length) return null;
  return now().getHours() >= CHECKIN_HOUR ? "red" : "amber";
}

export function Shell({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!user) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [user, path, router]);
  if (!user) return null;
  return (
    <SignedIn path={path} onSignedOut={() => router.push("/login")}>
      {children}
    </SignedIn>
  );
}

function SignedIn({ children, path, onSignedOut }: { children: React.ReactNode; path: string; onSignedOut: () => void }) {
  const { act, reset } = useStore();
  const user = useCurrentUser()!;
  const [menu, setMenu] = useState(false);
  const dot = useCheckInDot();
  const { state } = useStore();
  const chatUnread = channelsFor(state, user.id).some((c) => unreadCount(state, user.id, c.id) > 0);
  useAutomations();
  useEffect(() => {
    setMenu(false);
  }, [path]);

  const signOut = () => {
    act((s) => void (s.currentUserId = null));
    onSignedOut();
  };
  const active = (href: string) => path.startsWith(href);
  const Dot = ({ href }: { href: string }) =>
    href === "/check-in" && dot ? (
      <span className={`h-2 w-2 rounded-full ${dot === "red" ? "bg-red-600" : "bg-amber-400"}`} />
    ) : href === "/chat" && chatUnread ? (
      <span className="h-2 w-2 rounded-full bg-cyan-600" />
    ) : null;

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-ink-100 bg-white p-4 md:flex">
        <div className="flex items-center justify-between">
          <Logo />
          <Bell />
        </div>
        <nav className="mt-8 space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active(n.href) ? "bg-ink text-white" : "text-ink/70 hover:bg-ink-50"}`}
            >
              <span className="w-4 text-center">{n.icon}</span>
              <span className="flex-1">{n.label}</span>
              <Dot href={n.href} />
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <DemoClock />
          <Link href="/" className="btn-ghost w-full justify-start text-xs text-ink/50">
            ↗ View public website
          </Link>
          <button className="btn-ghost w-full justify-start text-xs text-ink/50" onClick={reset}>
            ↺ Reset demo data
          </button>
          <div className="flex items-center gap-2 rounded-lg bg-ink-50 p-2">
            <Avatar user={user} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-[11px] text-ink/50">{ROLE_LABEL[user.roles[0]]}</div>
            </div>
            <button className="text-xs text-ink/50 hover:text-ink" title="Sign out" onClick={signOut}>
              ⎋
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-ink-100 bg-white/90 px-4 py-2.5 backdrop-blur md:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <DemoClock compact />
          <Bell />
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-8">{children}</main>

      {menu && (
        <div className="fixed inset-0 z-40 bg-ink/30 md:hidden" onClick={() => setMenu(false)}>
          <div className="absolute inset-x-0 bottom-14 rounded-t-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-3 gap-2">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-1 rounded-xl p-3 text-xs ${active(n.href) ? "bg-ink text-white" : "bg-ink-50"}`}>
                  <span className="text-lg">{n.icon}</span>
                  {n.label}
                </Link>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-ink-50 p-2">
              <Avatar user={user} />
              <div className="min-w-0 flex-1 text-sm font-medium">{user.name}</div>
              <button className="btn-ghost text-xs" onClick={reset}>
                ↺ Reset
              </button>
              <button className="btn-outline text-xs" onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-ink-100 bg-white md:hidden">
        {NAV.filter((n) => MOBILE_TABS.includes(n.href)).map((n) => (
          <Link key={n.href} href={n.href} className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] ${active(n.href) ? "font-semibold text-ink" : "text-ink/50"}`}>
            <span className="text-lg leading-none">{n.icon}</span>
            {n.label}
            <span className="absolute right-1/4 top-1.5">
              <Dot href={n.href} />
            </span>
          </Link>
        ))}
        <button onClick={() => setMenu(!menu)} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${menu ? "font-semibold text-ink" : "text-ink/50"}`}>
          <span className="text-lg leading-none">☰</span>
          More
        </button>
      </nav>
    </div>
  );
}
