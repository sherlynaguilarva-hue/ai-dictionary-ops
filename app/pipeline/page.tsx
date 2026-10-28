"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { STAGES, STAGE_LABEL, type Pipeline } from "@/lib/types";
import { Avatar } from "@/components/ui";

export default function PipelinePage() {
  const { state } = useStore();
  const [pipeline, setPipeline] = useState<Pipeline>("sponsor");
  const deals = state.deals.filter((d) => d.pipeline === pipeline);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-entry text-2xl">Pipeline</h1>
          <p className="text-sm text-ink/60">Mark a deal Won and its contract turns into tasks automatically.</p>
        </div>
        <div className="inline-flex rounded-lg border border-ink-100 bg-white p-1">
          {(["sponsor", "partner"] as const).map((p) => (
            <button key={p} onClick={() => setPipeline(p)} className={`rounded-md px-3 py-1.5 text-sm ${pipeline === p ? "bg-ink text-white" : "text-ink/60"}`}>
              {p === "sponsor" ? "Sponsors" : "Partners"}
            </button>
          ))}
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
        <div className="flex gap-3">
          {STAGES.map((stage) => {
            const col = deals.filter((d) => d.stage === stage);
            const total = col.reduce((n, d) => n + d.value, 0);
            return (
              <div key={stage} className="w-60 shrink-0">
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <span className={`text-sm font-semibold ${stage === "won" ? "text-emerald-700" : ""}`}>{STAGE_LABEL[stage]}</span>
                  <span className="text-xs text-ink/40">
                    {col.length} · ₱{(total / 1000).toFixed(0)}k
                  </span>
                </div>
                <div className={`min-h-32 space-y-2 rounded-xl p-2 ${stage === "won" ? "bg-emerald-50" : "bg-ink-50/70"}`}>
                  {col.map((d) => {
                    const c = state.companies.find((x) => x.id === d.companyId)!;
                    const e = state.events.find((x) => x.id === d.eventId)!;
                    const k = state.contracts.find((x) => x.id === d.contractId);
                    return (
                      <Link key={d.id} href={`/deals/${d.id}`} className="card block p-3 transition hover:border-cyan-600">
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="text-xs text-ink/50">{d.title}</div>
                        <div className="mt-2 truncate text-xs text-ink/60">📅 {e.name}</div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm font-semibold">₱{d.value.toLocaleString()}</span>
                          <span className="flex items-center gap-1.5">
                            {k && <span title={k.fileName} className="chip bg-gold/20 text-gold-600">contract</span>}
                            <Avatar user={state.users.find((u) => u.id === d.ownerId)} size={22} />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
