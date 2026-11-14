"use client";

import { useRef, useState } from "react";
import { type NbaData } from "@/lib/nba";
import { assignNbaSlot, EMPTY_NBA, NBA_SLOTS } from "@/lib/nba-personal";
import { NbaTeamLogo } from "./TeamCrest";
import { Badge, Picker, button, usePersonal } from "./NbaShared";
import { NbaStar } from "./NbaStar";
import { NbaGameCards } from "./NbaGameCards";
import { NbaPlayersTable } from "./NbaPlayers";

export { NbaStar } from "./NbaStar";
export { NbaStandings } from "./NbaStandings";
export { NbaGameCards } from "./NbaGameCards";
export { NbaPlayersTable, NbaPlayers } from "./NbaPlayers";

export function NbaFollowing({ data }: { data: NbaData }) {
  const { state, failed } = usePersonal();
  return (
    <>
      <p className="mb-5 text-sm text-muted">
        Tu selección se guarda en este navegador, sin cuenta. Los favoritos NBA
        son independientes de los de fútbol.
      </p>
      {failed && (
        <p role="status" className="text-loss">
          No se ha podido guardar la selección.
        </p>
      )}
      <details
        className="mb-6 rounded-panel border border-border bg-card p-5"
        open={!state.teams.length}
      >
        <summary className="cursor-pointer font-semibold">
          Gestionar equipos · {state.teams.length} seguidos
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.teams.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-control border border-border p-3"
            >
              <span className="flex min-w-0 items-center gap-3 text-sm font-medium">
                <Badge team={t} />
                {t.name}
              </span>
              <NbaStar id={t.id} name={t.name} kind="teams" />
            </div>
          ))}
        </div>
      </details>
      <h2 className="display mb-4 text-2xl font-bold">Jugadores seguidos</h2>
      <NbaPlayersTable
        data={data}
        players={data.players.filter((p) => state.players.includes(p.id))}
      />
      <h2 className="display mb-4 mt-8 text-2xl font-bold">
        Partidos de tus equipos
      </h2>
      {state.teams.length ? (
        <NbaGameCards data={data} teamIds={state.teams} />
      ) : (
        <p className="text-muted">
          Sigue un equipo para reunir aquí sus próximos partidos.
        </p>
      )}
    </>
  );
}

export function NbaLineup({ data }: { data: NbaData }) {
  const { state, update, failed } = usePersonal();
  const [slot, setSlot] = useState(0);
  const editor = useRef<HTMLHeadingElement>(null);
  const names = [
    "Exterior 1",
    "Exterior 2",
    "Alero / ala-pívot 1",
    "Alero / ala-pívot 2",
    "Pívot",
  ];
  const coords = [
    [25, 76],
    [75, 76],
    [18, 39],
    [82, 39],
    [50, 26],
  ];
  const eligible = data.players.filter(
    (p) =>
      p.position?.includes(NBA_SLOTS[slot]) &&
      (!state.five.includes(p.id) || state.five[slot] === p.id),
  );
  return (
    <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="display text-2xl font-bold">
            Dos exteriores, dos aleros y un pívot
          </h2>
          <span className="mono ml-3 shrink-0 rounded-full bg-accent-soft px-3 py-1 text-sm text-accent">
            {state.five.filter(Boolean).length}/5
          </span>
        </div>
        <div className="nba-court relative h-[480px] overflow-hidden rounded-panel border border-border-strong">
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full fill-none stroke-court-line"
            strokeWidth="0.5"
          >
            <rect x="3" y="3" width="94" height="94" />
            <path d="M34 3v36a16 16 0 0 0 32 0V3M12 3v14a38 52 0 0 0 76 0V3M3 94h94" />
            <circle cx="50" cy="11" r="2" />
            <path d="M44 8h12" />
          </svg>
          {state.five.map((id, index) => {
            const p = data.players.find((p) => p.id === id);
            return (
              <button
                type="button"
                key={index}
                aria-label={`${names[index]}: ${p?.name ?? "Plaza libre"}`}
                aria-pressed={slot === index}
                className={`absolute flex min-h-24 w-[27%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-control p-2 text-xs font-semibold ${slot === index ? "bg-card ring-2 ring-accent" : "bg-card/85 hover:bg-card"}`}
                style={{
                  left: `${coords[index][0]}%`,
                  top: `${coords[index][1]}%`,
                }}
                onClick={() => {
                  setSlot(index);
                  if (matchMedia("(max-width:1023px)").matches) {
                    requestAnimationFrame(() => {
                      editor.current?.focus({ preventScroll: true });
                      editor.current?.scrollIntoView({ block: "center" });
                    });
                  }
                }}
              >
                {p ? (
                  <NbaTeamLogo id={p.teamId} size={36} />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-on-ink">
                    +
                  </span>
                )}
                <span className="line-clamp-2 leading-snug">
                  {p?.name ?? names[index]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="rounded-panel border border-border bg-card p-5 lg:mt-12">
        <p className="eyebrow mb-2">Mi quinteto ideal</p>
        <h3
          ref={editor}
          tabIndex={-1}
          className="display mb-3 scroll-mt-28 text-2xl font-bold"
        >
          {names[slot]}
        </h3>
        <p className="mb-5 text-sm leading-relaxed text-muted">
          Selecciona una plaza y busca un jugador. Se respetan las posiciones
          del proveedor, incluidos perfiles mixtos G-F o F-C.
        </p>
        <Picker
          label="Buscar jugador para esta plaza"
          data={data}
          eligible={eligible}
          value={String(state.five[slot] ?? "")}
          onChange={(value) =>
            update((s) =>
              assignNbaSlot(
                s,
                slot,
                data.players.find((p) => p.id === Number(value)) ?? null,
              ),
            )
          }
        />
        {state.five[slot] && (
          <button
            className="mt-3 min-h-11 text-sm font-semibold text-loss"
            onClick={() => update((s) => assignNbaSlot(s, slot, null))}
          >
            Quitar jugador
          </button>
        )}
        <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-subtle">
          Se guarda solo en este navegador. La selección no modifica el modelo
          de predicción.
        </p>
        <button
          type="button"
          className={`${button} mt-4`}
          onClick={() => {
            if (confirm("¿Vaciar las cinco plazas?"))
              update((s) => ({ ...s, five: [...EMPTY_NBA.five] }));
          }}
        >
          Vaciar quinteto
        </button>
        {failed && (
          <p role="status" className="mt-3 text-sm text-loss">
            No se pudo guardar en este navegador.
          </p>
        )}
      </div>
    </section>
  );
}
