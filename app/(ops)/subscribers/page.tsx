"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { LEVELS, TIERS } from "@/lib/courses";
import { relative } from "@/lib/dates";
import type { LevelId, Tier } from "@/lib/types";
import { Mascot } from "@/components/Mascot";

export default function SubscribersPage() {
  const { state } = useStore();
  const [tier, setTier] = useState<Tier | "all">("all");
  const [level, setLevel] = useState<LevelId | 0>(0);
  const list = state.subscribers.filter((s) => (tier === "all" || s.tier === tier) && (!level || s.level === level));

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-entry text-2xl">Subscribers</h1>
          <p className="text-sm text-ink/60">Everyone who signed up on the website or at events.</p>
        </div>
        <Link href="/#join" target="_blank" className="btn-outline">
          ↗ Open signup page
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {TIERS.map((t) => (
          <button key={t.id} onClick={() => setTier(tier === t.id ? "all" : t.id)} className={`card p-4 text-left transition ${tier === t.id ? "ring-2 ring-ink" : ""}`}>
            <div className="label">{t.name}</div>
            <div className="mt-1 font-serif text-2xl font-semibold">{state.subscribers.filter((s) => s.tier === t.id).length}</div>
            <div className="text-xs text-ink/50">
              {t.price}
              {t.period}
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setLevel(0)} className={`chip px-3 py-1 ${!level ? "bg-ink text-white" : "bg-white text-ink/60 ring-1 ring-ink-100"}`}>
          All levels
        </button>
        {LEVELS.map((l) => (
          <button key={l.id} onClick={() => setLevel(l.id)} className={`chip gap-1 py-0.5 pl-1 pr-3 ${level === l.id ? "bg-ink text-white" : "bg-white text-ink/60 ring-1 ring-ink-100"}`}>
            <Mascot level={l.id} size={20} /> {l.name}
          </button>
        ))}
      </div>

      <ul className="card divide-y divide-ink-100 overflow-hidden">
        {list.length === 0 && <li className="p-4 text-sm text-ink/50">No subscribers match.</li>}
        {list.map((s) => {
          const l = LEVELS.find((x) => x.id === s.level)!;
          return (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: l.tint }}>
                <Mascot level={s.level} size={28} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{s.name}</div>
                <div className="truncate text-xs text-ink/50">{s.email}</div>
              </div>
              <span className="chip bg-ink-50 text-ink/70">
                L{s.level} · {l.name}
              </span>
              <span className={`chip ${s.tier === "reader" ? "bg-ink-50 text-ink/60" : "bg-gold/20 text-gold-600"}`}>{TIERS.find((t) => t.id === s.tier)!.name}</span>
              {s.level <= 2 && <span className={`chip ${s.parentConsent ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{s.parentConsent ? "parent consent ✓" : "needs consent"}</span>}
              <span className="w-24 text-right text-xs text-ink/50">
                {s.source} · {relative(s.createdAt.slice(0, 10))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
