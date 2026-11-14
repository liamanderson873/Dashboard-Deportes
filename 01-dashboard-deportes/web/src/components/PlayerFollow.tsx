"use client";

import { pe } from "@/lib/players-es";
import { togglePersonal } from "@/lib/personal-state";
import { button, usePersonal } from "./PlayerShared";

export function PlayerStar({ id }: { id: number }) {
  const { state, update, failed } = usePersonal();
  const selected = state.players.includes(id);
  return (
    <span>
      <button
        type="button"
        className={button}
        aria-pressed={selected}
        onClick={() => update((s) => togglePersonal(s, "players", id))}
      >
        {selected ? "★" : "☆"} {selected ? pe.unstar : pe.star}
      </button>
      {failed && (
        <span role="status" className="block text-sm text-loss">
          {pe.storageError}
        </span>
      )}
    </span>
  );
}
export function TeamFollow({ id }: { id: number }) {
  const { state, update, failed } = usePersonal();
  const selected = state.teams.includes(id);
  return (
    <span>
      <button
        type="button"
        className={button}
        aria-pressed={selected}
        onClick={() => update((s) => togglePersonal(s, "teams", id))}
      >
        {selected ? "★" : "☆"}{" "}
        {selected ? "Dejar de seguir equipo" : "Seguir equipo"}
      </button>
      {failed && (
        <span role="status" className="block text-sm text-loss">
          {pe.storageError}
        </span>
      )}
    </span>
  );
}
