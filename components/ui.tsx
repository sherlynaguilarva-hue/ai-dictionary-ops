"use client";

import type { Health, InitiativeKind, Role, Task, User } from "@/lib/types";
import { INITIATIVE, ROLE_LABEL } from "@/lib/types";

export function Avatar({ user, size = 28 }: { user?: User | null; size?: number }) {
  if (!user) return null;
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <span
      title={user.name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: user.color, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}

const ROLE_STYLE: Record<Role, string> = {
  owner: "bg-ink text-white",
  admin: "bg-violet-100 text-violet-800",
  sales: "bg-cyan-100 text-cyan-900",
  creative: "bg-pink-100 text-pink-800",
  social: "bg-amber-100 text-amber-900",
  eventops: "bg-emerald-100 text-emerald-800",
  instructor: "bg-orange-100 text-orange-800",
};

export function RoleChip({ role }: { role: Role }) {
  return <span className={`chip ${ROLE_STYLE[role]}`}>{ROLE_LABEL[role]}</span>;
}

const HEALTH: Record<Health, { dot: string; label: string; chip: string }> = {
  green: { dot: "bg-emerald-500", label: "On track", chip: "bg-emerald-50 text-emerald-800" },
  yellow: { dot: "bg-amber-400", label: "At risk", chip: "bg-amber-50 text-amber-900" },
  red: { dot: "bg-red-500", label: "Delayed", chip: "bg-red-50 text-red-800" },
};

export function HealthChip({ health }: { health: Health }) {
  const h = HEALTH[health];
  return (
    <span className={`chip gap-1.5 ${h.chip}`}>
      <span className={`h-2 w-2 rounded-full ${h.dot}`} />
      {h.label}
    </span>
  );
}

const STATUS: Record<Task["status"], { label: string; cls: string }> = {
  todo: { label: "To do", cls: "bg-ink-50 text-ink/70" },
  in_progress: { label: "In progress", cls: "bg-cyan-100 text-cyan-900" },
  blocked: { label: "Blocked", cls: "bg-red-100 text-red-800" },
  in_review: { label: "In review", cls: "bg-violet-100 text-violet-800" },
  done: { label: "Done", cls: "bg-emerald-100 text-emerald-800" },
};

export function StatusChip({ status }: { status: Task["status"] }) {
  const s = STATUS[status];
  return <span className={`chip ${s.cls}`}>{s.label}</span>;
}

export function SourceChip({ source, auto }: { source: Task["source"]; auto?: boolean }) {
  if (source === "template") return <span className="chip bg-ink-50 text-ink/60">template</span>;
  if (source === "contract") return <span className="chip bg-gold/20 text-gold-600">from contract</span>;
  if (source === "chat") return <span className="chip bg-cyan/20 text-cyan-600">{auto ? "✦ auto-captured" : "from chat"}</span>;
  if (source === "manual") return <span className="chip bg-ink-50 text-ink/60">added by hand</span>;
  return <span className="chip bg-ink-50 text-ink/60">{source}</span>;
}

/** Brand motif: dictionary entry. */
export function Entry({ word, pron, pos, children }: { word: string; pron: string; pos: string; children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-ink/80">
      <span className="h-entry text-base text-ink">{word}</span> <span className="text-ink/50">{pron}</span>{" "}
      <em className="text-ink/60">{pos}</em> — {children}
    </p>
  );
}

export function AgentBadge({ name }: { name: string }) {
  return (
    <span className="chip gap-1 bg-ink text-cyan">
      <span aria-hidden>✦</span>
      {name}
    </span>
  );
}

/** Overlapping avatars for multi-assignee subtasks. */
export function AvatarStack({ users, size = 22 }: { users: (User | undefined)[]; size?: number }) {
  const list = users.filter(Boolean) as User[];
  return (
    <span className="inline-flex -space-x-1.5">
      {list.map((u) => (
        <span key={u.id} className="rounded-full ring-2 ring-white">
          <Avatar user={u} size={size} />
        </span>
      ))}
    </span>
  );
}

const KIND_STYLE: Record<InitiativeKind, string> = {
  campaign: "bg-cyan/15 text-cyan-600",
  course: "bg-gold/20 text-gold-600",
  event: "bg-violet-100 text-violet-800",
};

export function KindChip({ kind }: { kind: InitiativeKind }) {
  return (
    <span className={`chip gap-1 ${KIND_STYLE[kind]}`}>
      {INITIATIVE[kind].icon} {INITIATIVE[kind].label}
    </span>
  );
}

/** Text with team @mentions highlighted. */
export function RichText({ text, users }: { text: string; users: User[] }) {
  const firstNames = users.map((u) => u.name.split(" ")[0].toLowerCase());
  return (
    <>
      {text.split(/(@\w+)/g).map((part, i) =>
        part.startsWith("@") && firstNames.includes(part.slice(1).toLowerCase()) ? (
          <span key={i} className="rounded bg-cyan/20 px-1 font-medium text-cyan-600">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
