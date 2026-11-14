"use client";

import { NavIcon } from "./NavIcon";
import { button, usePersonal } from "./NbaShared";

export function NbaStar({
  id,
  name,
  kind = "players",
}: {
  id: number;
  name: string;
  kind?: "players" | "teams";
}) {
  const { state, update, failed } = usePersonal();
  const selected = state[kind].includes(id);
  return (
    <span>
      <button
        type="button"
        className={`${button} min-w-11 ${selected ? "text-accent" : ""}`}
        aria-label={`${selected ? "Dejar de seguir" : "Seguir"} ${name}`}
        aria-pressed={selected}
        onClick={() =>
          update((s) => ({
            ...s,
            [kind]: selected
              ? s[kind].filter((v) => v !== id)
              : [...s[kind], id],
          }))
        }
      >
        <NavIcon name="seguimiento" />
        {selected && <span className="sr-only">Guardado</span>}
      </button>
      {failed && (
        <span role="status" className="block text-xs text-loss">
          No se ha podido guardar en este navegador.
        </span>
      )}
    </span>
  );
}
