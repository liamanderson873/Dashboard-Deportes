"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { type NbaData, type NbaPlayer, type NbaTeam } from "@/lib/nba";
import {
  NBA_PERSONAL_KEY,
  parseNbaPersonal,
  type NbaPersonal,
} from "@/lib/nba-personal";
import { NbaTeamLogo } from "./TeamCrest";
import { PlayerPicker } from "./PlayerPicker";

const change = "marcador-nba-personal-change";
let memory: string | null = null;
let blocked = false;
function snapshot() {
  try {
    return blocked ? memory : localStorage.getItem(NBA_PERSONAL_KEY);
  } catch {
    return memory;
  }
}
function subscribe(fn: () => void) {
  window.addEventListener("storage", fn);
  window.addEventListener(change, fn);
  return () => {
    window.removeEventListener("storage", fn);
    window.removeEventListener(change, fn);
  };
}
export function usePersonal() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const state = useMemo(() => parseNbaPersonal(raw), [raw]);
  const [failed, setFailed] = useState(false);
  const update = (fn: (state: NbaPersonal) => NbaPersonal) => {
    memory = JSON.stringify(fn(parseNbaPersonal(snapshot())));
    try {
      localStorage.setItem(NBA_PERSONAL_KEY, memory);
      blocked = false;
      setFailed(false);
    } catch {
      blocked = true;
      setFailed(true);
    }
    window.dispatchEvent(new Event(change));
  };
  return { state, update, failed };
}
export const control =
  "min-h-11 min-w-0 max-w-full rounded-control border border-border-strong bg-card px-3 py-2 text-base text-fg sm:text-sm";
export const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border-strong bg-card px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface-2";
export function Badge({ team }: { team: NbaTeam | undefined }) {
  return <NbaTeamLogo id={team?.id} abbreviation={team?.abbreviation} />;
}

export function Picker({
  label,
  data,
  value,
  onChange,
  eligible = data.players,
}: {
  label: string;
  data: NbaData;
  value: string;
  onChange: (id: string) => void;
  eligible?: NbaPlayer[];
}) {
  return (
    <PlayerPicker
      label={label}
      value={value}
      onChange={onChange}
      formatPosition={(pos) => pos ?? "Sin posición"}
      players={eligible.map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position,
        birth: null,
        nationality: null,
        teamIds: [p.teamId],
      }))}
      teams={data.teams.map((t) => ({ id: t.id, name: t.name, localId: null }))}
    />
  );
}
