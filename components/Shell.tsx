"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser, useStore } from "@/lib/store";
import { ROLE_LABEL } from "@/lib/types";
import { Avatar } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "◧" },
  { href: "/pipeline", label: "Pipeline", icon: "⇶" },
  { href: "/projects", label: "Projects", icon: "▤" },
  { href: "/my-day", label: "My Day", icon: "☀" },
  { href: "/subscribers", label: "Subscribers", icon: "✉" },
];

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

export function Shell({ children }: { children: React.ReactNode }) {
  const user = useCurrentUser();
  const { act, reset } = useStore();
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!user) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [user, path, router]);
  if (!user) return null;

  const signOut = () => {
    act((s) => void (s.currentUserId = null));
    router.push("/login");
  };
  const active = (href: string) => path.startsWith(href);

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-ink-100 bg-white p-4 md:flex">
        <Logo />
        <nav className="mt-8 space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active(n.href) ? "bg-ink text-white" : "text-ink/70 hover:bg-ink-50"}`}
            >
              <span className="w-4 text-center">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
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

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink-100 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <Logo />
        <button onClick={signOut} title="Sign out">
          <Avatar user={user} />
        </button>
      </header>

      <main className="min-w-0 flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-ink-100 bg-white md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active(n.href) ? "text-ink font-semibold" : "text-ink/50"}`}>
            <span className="text-lg leading-none">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
