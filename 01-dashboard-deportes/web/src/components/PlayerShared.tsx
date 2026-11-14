"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { pe } from "@/lib/players-es";
import {
  parsePersonal,
  PERSONAL_KEY,
  type PersonalState,
} from "@/lib/personal-state";

const EVENT = "marcador-personal-change";
let memorySnapshot: string | null = null;
let storageUnavailable = false;
function snapshot() {
  if (storageUnavailable) return memorySnapshot;
  try {
    return localStorage.getItem(PERSONAL_KEY);
  } catch {
    return memorySnapshot;
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}
export function usePersonal() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const state = useMemo(() => parsePersonal(raw), [raw]);
  const [failed, setFailed] = useState(false);
  const update = (fn: (s: PersonalState) => PersonalState) => {
    const next = fn(parsePersonal(snapshot()));
    memorySnapshot = JSON.stringify(next);
    try {
      localStorage.setItem(PERSONAL_KEY, memorySnapshot);
      storageUnavailable = false;
      setFailed(false);
    } catch {
      storageUnavailable = true;
      setFailed(true);
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return { state, update, failed };
}
export const control =
  "min-h-11 max-w-full rounded-control border border-border-strong bg-card px-3 py-2 text-base text-fg sm:text-sm";
export const button =
  "inline-flex min-h-11 items-center justify-center rounded-control border border-border-strong bg-card px-3 py-2 text-sm font-semibold hover:bg-surface-2";
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      {children}
    </label>
  );
}
export function Empty() {
  return (
    <div className="rounded-panel border border-border bg-card p-6">
      <h2 className="display text-xl font-bold">{pe.empty}</h2>
      <p className="mt-2 text-muted">{pe.setup}</p>
    </div>
  );
}
