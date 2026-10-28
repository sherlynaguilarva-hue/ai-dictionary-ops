"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { now, setSimulatedNow } from "@/lib/clock";
import { runAutomations, CHECKIN_HOUR, MORNING_HOUR, NUDGE_HOUR, hourLabel } from "@/lib/automations";

function at(base: Date, dayOffset: number, hour: number, minute = 0) {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Prototype-only control to jump the app's clock forward and test reminders. */
export function DemoClock({ compact = false }: { compact?: boolean }) {
  const { state, act } = useStore();
  const [open, setOpen] = useState(false);
  const current = now();
  const simulated = state.simulatedNow !== null;

  function jump(d: Date | null) {
    act((s) => {
      s.simulatedNow = d ? d.toISOString() : null;
      setSimulatedNow(s.simulatedNow);
      runAutomations(s, now());
    });
    setOpen(false);
  }

  const label = current.toLocaleString("en-PH", { weekday: "short", hour: "numeric", minute: "2-digit" });
  const options = [
    { label: `Today ${hourLabel(CHECKIN_HOUR)} — check-in due`, d: at(current, 0, CHECKIN_HOUR, 1) },
    { label: `Today ${hourLabel(NUDGE_HOUR)} — second nudge`, d: at(current, 0, NUDGE_HOUR, 1) },
    { label: `Tomorrow ${hourLabel(MORNING_HOUR)} — morning report`, d: at(current, 1, MORNING_HOUR, 5) },
    { label: "+1 day (same time)", d: at(current, 1, current.getHours(), current.getMinutes()) },
    { label: "+3 days (same time)", d: at(current, 3, current.getHours(), current.getMinutes()) },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${simulated ? "border-gold bg-gold/15 text-ink" : "border-ink-100 bg-white text-ink/60"} ${compact ? "" : "w-full justify-between"}`}
        title="Demo clock — jump ahead to test reminders"
      >
        <span>🕒 {label}</span>
        {simulated && <span className="font-semibold text-gold-600">demo</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute z-50 w-72 rounded-xl border border-ink-100 bg-white p-3 shadow-xl ${compact ? "right-0 top-9" : "bottom-9 left-0"}`}>
            <div className="text-sm font-semibold">Demo clock</div>
            <p className="mt-0.5 text-xs text-ink/55">Pretend it&apos;s a different time to see reminders fire. Only this prototype is affected — nothing is sent.</p>
            <div className="mt-3 space-y-1">
              {options.map((o) => (
                <button key={o.label} onClick={() => jump(o.d)} className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-ink-50">
                  {o.label}
                </button>
              ))}
            </div>
            <button onClick={() => jump(null)} disabled={!simulated} className="btn-outline mt-2 w-full text-xs">
              ↺ Back to real time
            </button>
          </div>
        </>
      )}
    </div>
  );
}
