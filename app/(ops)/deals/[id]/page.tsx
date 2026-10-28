"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { extractDeliverables } from "@/lib/ai";
import { winDeal } from "@/lib/engine";
import { fmt, today } from "@/lib/dates";
import { uid } from "@/lib/id";
import { nowISO } from "@/lib/clock";
import { SAMPLE_CLIENT_CONTRACT, SAMPLE_CONTRACT } from "@/lib/seed";
import { INITIATIVE, STAGES, STAGE_LABEL, type Deliverable, type DeliverableKind, type Stage } from "@/lib/types";
import { AgentBadge, Avatar, Entry, RoleChip, StatusChip } from "@/components/ui";

const KIND_LABEL: Record<DeliverableKind, string> = {
  logo: "Logo placement",
  social: "Social mention",
  booth: "Booth",
  speaking: "Speaking slot",
  content: "Posts / content",
  video: "Video",
  ads: "Ad campaign",
  report: "Report",
  other: "Other",
};

const PRE_WON: Stage[] = ["lead", "contacted", "meeting", "proposal", "negotiation"];

export default function DealPage() {
  const { id } = useParams<{ id: string }>();
  const { state, act } = useStore();
  const [extracting, setExtracting] = useState(false);
  const [draft, setDraft] = useState<Deliverable[] | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const deal = state.deals.find((d) => d.id === id);
  if (!deal) return <p className="text-sm text-ink/60">Deal not found.</p>;
  const company = state.companies.find((c) => c.id === deal.companyId)!;
  const event = state.events.find((e) => e.id === deal.eventId)!;
  const contract = state.contracts.find((c) => c.id === deal.contractId);
  const owner = state.users.find((u) => u.id === deal.ownerId);
  const isWon = !PRE_WON.includes(deal.stage);
  const generated = state.tasks.filter((t) => t.companyId === company.id && t.projectId === event.projectId);
  const slots = state.posts.filter((p) => p.companyId === company.id && p.projectId === event.projectId);

  function setStage(stage: Stage) {
    act((s) => {
      s.deals.find((d) => d.id === id)!.stage = stage;
    });
  }

  function attach(fileName: string, text: string) {
    act((s) => {
      const k = { id: uid("k"), dealId: id, fileName, text, status: "uploaded" as const, deliverables: [] };
      s.contracts.push(k);
      s.deals.find((d) => d.id === id)!.contractId = k.id;
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    // Prototype reads text files; PDF parsing arrives with the Claude API hookup.
    const text = f.type.startsWith("text") || f.name.endsWith(".txt") ? await f.text() : "";
    if (!text) {
      setError("PDF reading comes with the AI hookup. For now, paste the contract text below or use the sample.");
      return;
    }
    setError(null);
    attach(f.name, text);
  }

  function extract() {
    if (!contract) return;
    setExtracting(true);
    setTimeout(() => {
      setDraft(extractDeliverables(contract.text));
      setExtracting(false);
    }, 900);
  }

  function confirm() {
    if (!draft || !contract) return;
    act((s) => {
      const k = s.contracts.find((c) => c.id === contract.id)!;
      k.deliverables = draft.filter((d) => d.description.trim());
      k.status = "confirmed";
      s.activity.unshift({ id: uid("act"), at: nowISO(), agent: "Clerk", message: `${k.deliverables.length} deliverables confirmed on ${company.name}'s contract.`, href: `/deals/${id}` });
    });
    setDraft(null);
  }

  function markWon() {
    try {
      act((s) => winDeal(s, id, today()));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const editRow = (i: number, patch: Partial<Deliverable>) => setDraft((d) => d!.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const confirmed = contract?.status === "confirmed";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/pipeline" className="text-sm text-ink/50 hover:text-ink">
        ← Pipeline
      </Link>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="label">{deal.pipeline === "client" ? "Client deal" : deal.pipeline === "sponsor" ? "Sponsor deal" : "Partner deal"}</div>
            <h1 className="h-entry mt-1 text-2xl">{company.name}</h1>
            <div className="text-sm text-ink/60">
              {deal.title} · ₱{deal.value.toLocaleString()}
            </div>
            <div className="mt-2 text-sm">
              {INITIATIVE[event.kind].icon} {event.name} — {INITIATIVE[event.kind].dateLabel.toLowerCase()} {fmt(event.date, { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Avatar user={owner} />
            <span className="text-ink/60">{owner?.name}</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {STAGES.map((s) => {
            const reached = STAGES.indexOf(s) <= STAGES.indexOf(deal.stage);
            const clickable = !isWon && PRE_WON.includes(s);
            return (
              <button
                key={s}
                disabled={!clickable}
                onClick={() => setStage(s)}
                className={`chip px-2.5 py-1 ${s === deal.stage ? "bg-ink text-white" : reached ? "bg-cyan/20 text-ink" : "bg-ink-50 text-ink/40"} ${clickable ? "hover:ring-2 hover:ring-cyan/40" : "cursor-default"}`}
              >
                {STAGE_LABEL[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contract */}
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="h-entry text-lg">Contract</h2>
          {contract && <span className="text-xs text-ink/50">📄 {contract.fileName}</span>}
        </div>

        {!contract && (
          <div className="mt-3 space-y-3">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-ink-100 p-6 text-center text-sm text-ink/60 hover:border-cyan-600">
              <span className="text-2xl">⇪</span>
              Upload signed contract (.txt for now)
              <input type="file" accept=".txt,.pdf,text/plain,application/pdf" className="hidden" onChange={onFile} />
            </label>
            <textarea className="input h-32 font-mono text-xs" placeholder="…or paste the contract text here" value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" disabled={!pasteText.trim()} onClick={() => attach(`${company.name} contract.txt`, pasteText)}>
                Attach pasted text
              </button>
              <button className="btn-outline" onClick={() => attach(
                    `${company.name.replace(/\W+/g, "")}_${deal.pipeline === "client" ? "Services" : "Sponsorship"}.pdf`,
                    deal.pipeline === "client" ? SAMPLE_CLIENT_CONTRACT.replaceAll("Kape Kultura Café", company.name) : SAMPLE_CONTRACT.replaceAll("Brew & Co. Coffee", company.name),
                  )}>
                Use sample contract
              </button>
            </div>
          </div>
        )}

        {contract && !confirmed && !draft && (
          <div className="mt-3 space-y-3">
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-paper p-3 font-mono text-xs text-ink/80">{contract.text}</pre>
            <div className="flex items-center gap-3">
              <button className="btn-accent" onClick={extract} disabled={extracting}>
                {extracting ? "Clerk is reading…" : "✦ Extract deliverables"}
              </button>
              <span className="text-xs text-ink/50">Clerk pulls out every promise in the contract so none get forgotten.</span>
            </div>
          </div>
        )}

        {draft && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <AgentBadge name="Clerk" />
              <span>
                found <b>{draft.length}</b> deliverables. Check them, fix anything wrong, then confirm.
              </span>
            </div>
            <div className="space-y-2">
              {draft.map((d, i) => (
                <div key={d.id} className="grid grid-cols-12 items-center gap-2 rounded-lg border border-ink-100 p-2">
                  <select className="input col-span-6 md:col-span-3" value={d.kind} onChange={(e) => editRow(i, { kind: e.target.value as DeliverableKind })}>
                    {Object.entries(KIND_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <input className="input col-span-4 md:col-span-1" type="number" min={1} value={d.quantity} onChange={(e) => editRow(i, { quantity: Math.max(1, Number(e.target.value)) })} title="Quantity" />
                  <button className="btn-ghost col-span-2 text-ink/40 md:order-last md:col-span-1" onClick={() => setDraft(draft.filter((_, j) => j !== i))} title="Remove">
                    ✕
                  </button>
                  <input className="input col-span-12 md:col-span-7" value={d.description} onChange={(e) => editRow(i, { description: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-outline" onClick={() => setDraft([...draft, { id: uid("dlv"), kind: "other", description: "", quantity: 1, sourceLine: "(added manually)" }])}>
                + Add deliverable
              </button>
              <button className="btn-primary" onClick={confirm} disabled={!draft.length}>
                ✓ Confirm {draft.length} deliverables
              </button>
            </div>
          </div>
        )}

        {confirmed && (
          <div className="mt-3">
            <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100">
              {contract.deliverables.map((d) => (
                <li key={d.id} className="flex items-center gap-3 p-3 text-sm">
                  <span className="chip bg-gold/20 text-gold-600">{KIND_LABEL[d.kind]}</span>
                  <span className="flex-1">{d.description}</span>
                  <span className="text-xs text-ink/50">×{d.quantity}</span>
                </li>
              ))}
            </ul>
            {!isWon && (
              <button className="btn-ghost mt-2 text-xs" onClick={() => setDraft(contract.deliverables)}>
                Edit deliverables
              </button>
            )}
          </div>
        )}
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {/* Win */}
      {!isWon ? (
        <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="h-entry text-lg">Close the deal</h2>
            <p className="text-sm text-ink/60">{confirmed ? "Ready. Marking Won creates the project, tasks and post slots." : "Confirm the contract deliverables first."}</p>
          </div>
          <button className="btn bg-emerald-600 px-5 py-2.5 text-white hover:bg-emerald-700" disabled={!confirmed} onClick={markWon}>
            🏆 Mark as Won
          </button>
        </section>
      ) : (
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="h-entry text-lg">🏆 Won — here's what the system set up</h2>
            {event.projectId && (
              <Link href={`/projects/${event.projectId}`} className="btn-primary">
                Open project →
              </Link>
            )}
          </div>
          <div className="mt-2">
            <Entry word="won" pron="/wʌn/" pos="adjective">
              the moment the work starts doing itself.
            </Entry>
          </div>
          <ul className="mt-4 divide-y divide-ink-100">
            {generated.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                <span className="min-w-0 flex-1">{t.title}</span>
                <RoleChip role={t.role} />
                <Avatar user={state.users.find((u) => u.id === t.assigneeId)} size={22} />
                <span className="w-16 text-right text-xs text-ink/60">{fmt(t.due)}</span>
                <StatusChip status={t.status} />
              </li>
            ))}
            {slots.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                <span className="min-w-0 flex-1">📣 {p.title}</span>
                <RoleChip role="social" />
                <span className="w-16 text-right text-xs text-ink/60">{fmt(p.date)}</span>
                <span className="chip bg-amber-50 text-amber-900">post slot</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
