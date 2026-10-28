"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { State } from "./types";
import { STATE_VERSION, seed } from "./seed";

const KEY = "aidict-state";

type Store = {
  state: State;
  /** Apply a mutation to a copy of state. */
  act: <R>(fn: (draft: State) => R) => R;
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed.version === STATE_VERSION) return parsed;
    }
  } catch {}
  return seed();
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const ref = useRef<State | null>(null);
  ref.current = state;

  useEffect(() => setState(load()), []);
  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const act = useCallback(<R,>(fn: (draft: State) => R): R => {
    // Compute synchronously from the latest state so callers get the result.
    const draft = structuredClone(ref.current!);
    const result = fn(draft);
    ref.current = draft;
    setState(draft);
    return result;
  }, []);

  const reset = useCallback(() => {
    const fresh = seed();
    setState((prev) => ({ ...fresh, currentUserId: prev?.currentUserId ?? null }));
  }, []);

  // Public pages render immediately; app pages wait behind <StoreGate>.
  return <Ctx.Provider value={state ? { state, act, reset } : null}>{children}</Ctx.Provider>;
}

/** Renders children only once saved state has loaded. */
export function StoreGate({ children }: { children: React.ReactNode }) {
  const s = useContext(Ctx);
  if (!s) return <div className="p-8 text-sm text-ink/50">Loading…</div>;
  return <>{children}</>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside a loaded StoreProvider");
  return s;
}

/** For public pages: null until state has loaded. */
export function useOptionalStore() {
  return useContext(Ctx);
}

export function useCurrentUser() {
  const { state } = useStore();
  return state.users.find((u) => u.id === state.currentUserId) ?? null;
}
