"use client";

import { useState } from "react";
import { type NbaShot, nbaFormat } from "@/lib/nba";

export function NbaShotMap({
  shots,
  total,
}: {
  shots: NbaShot[];
  total: number;
}) {
  const [mode, setMode] = useState<"outcome" | "quality">("outcome");
  const [fullCourt, setFullCourt] = useState(false);
  const [value, setValue] = useState(""),
    [limit, setLimit] = useState(50);
  const filtered = shots.filter((s) => !value || s.value === Number(value));
  const drawn = filtered.filter((s) => fullCourt || s.y <= 41.75);
  const observed = filtered.reduce((sum, s) => sum + s.made, 0);
  const predicted = filtered.filter((s) => s.probability !== null);
  const xpoints = predicted.reduce(
    (sum, s) => sum + s.probability! * s.value,
    0,
  );
  if (!shots.length)
    return (
      <p className="rounded-panel border border-border bg-card p-6 text-muted">
        Todavía no hay tiros disponibles para esta selección.
      </p>
    );
  return (
    <section aria-label="Mapa y calidad de tiro NBA" className="mt-8">
      <h2 className="display mb-4 scroll-mt-28 text-2xl font-bold">
        Mapa de tiro y probabilidad de acierto
      </h2>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-2">
          <span className="eyebrow">Representación</span>
          <select
            className="min-h-11 rounded-control border border-border-strong bg-card px-3 text-base sm:text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as "outcome" | "quality")}
          >
            <option value="outcome">Aciertos y fallos</option>
            <option value="quality">Probabilidad del modelo</option>
          </select>
        </label>
        <button
          type="button"
          aria-pressed={fullCourt}
          onClick={() => setFullCourt((v) => !v)}
          className="min-h-11 rounded-control border border-border-strong bg-card px-3 text-sm font-semibold hover:bg-surface-2"
        >
          {fullCourt ? "Ver media cancha" : "Ver cancha completa"}
        </button>
        <label className="flex flex-col gap-2">
          <span className="eyebrow">Valor del tiro</span>
          <select
            className="min-h-11 rounded-control border border-border-strong bg-card px-3 text-base sm:text-sm"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setLimit(50);
            }}
          >
            <option value="">Todos</option>
            <option value="2">Dos puntos</option>
            <option value="3">Tres puntos</option>
          </select>
        </label>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,1fr)]">
        <div className="rounded-panel border border-border bg-card p-4">
          <svg
            viewBox={fullCourt ? "-27 -7 54 103" : "-27 -7 54 53"}
            role="img"
            aria-label={`${drawn.length} tiros representados de ${filtered.length} seleccionados. Círculos para aciertos y cruces para fallos; tabla disponible debajo.`}
            className={`mx-auto w-full rounded-control bg-surface-2 ${fullCourt ? "h-[470px] max-w-sm" : "h-[380px] max-w-lg"}`}
          >
            <g fill="none" stroke="var(--border-strong)" strokeWidth="0.25">
              <rect x="-25" y="-5.25" width="50" height={fullCourt ? 94 : 47} />
              <path d="M-8 -5.25v19h16v-19M-25 41.75h50M-22 -5.25v14a23.75 23.75 0 0 0 44 0v-14M-3 -1.25h6" />
              <circle cx="0" cy="0" r="0.75" />
              <circle cx="0" cy="13.75" r="6" />
              <circle cx="0" cy="41.75" r="6" />
            </g>
            {drawn.map((s) => {
              const title = `${s.value} puntos · ${s.distance} pies · ${s.made ? "Acierto" : "Fallo"} · P(acierto): ${s.probability == null ? "no disponible" : nbaFormat(s.probability * 100) + "%"}`;
              return mode === "quality" ? (
                <circle
                  key={s.id}
                  cx={s.x}
                  cy={s.y}
                  r={s.probability == null ? 0.3 : 0.25 + s.probability * 0.65}
                  fill={
                    s.probability == null ? "var(--subtle)" : "var(--accent)"
                  }
                  stroke="var(--accent)"
                  strokeWidth="0.15"
                  fillOpacity={
                    s.probability == null ? 0.3 : 0.25 + s.probability * 0.7
                  }
                >
                  <title>{title}</title>
                </circle>
              ) : s.made ? (
                <circle
                  key={s.id}
                  cx={s.x}
                  cy={s.y}
                  r="0.38"
                  fill="var(--accent)"
                  opacity="0.85"
                >
                  <title>{title}</title>
                </circle>
              ) : (
                <path
                  key={s.id}
                  d={`M${s.x - 0.3} ${s.y - 0.3}l.6 .6m0 -.6l-.6 .6`}
                  stroke="var(--loss)"
                  strokeWidth="0.2"
                  opacity="0.8"
                >
                  <title>{title}</title>
                </path>
              );
            })}
          </svg>
          {drawn.length < filtered.length && (
            <p className="mt-3 text-xs text-subtle">
              {filtered.length - drawn.length} tiros más allá de media cancha
              están en la tabla. Activa cancha completa para dibujarlos.
            </p>
          )}
        </div>
        <div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Tiros mostrados", nbaFormat(filtered.length, 0)],
              [
                "Acierto real",
                `${nbaFormat(filtered.length ? (observed / filtered.length) * 100 : 0)}%`,
              ],
              [
                "Acierto esperado",
                predicted.length
                  ? `${nbaFormat((predicted.reduce((sum, s) => sum + s.probability!, 0) / predicted.length) * 100)}%`
                  : "—",
              ],
              ["Puntos esperados", predicted.length ? nbaFormat(xpoints) : "—"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-panel border border-border bg-card p-4"
              >
                <p className="eyebrow">{label}</p>
                <p className="score mt-3 text-3xl">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-relaxed text-muted">
            {mode === "outcome"
              ? "Círculo verde: acierto. Cruz roja: fallo."
              : "Un punto más grande y oscuro representa una probabilidad mayor. Los puntos sin estimación aparecen en gris."}{" "}
            Las coordenadas están en pies respecto a la canasta; también se
            representan los lanzamientos lejanos.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-subtle">
            El modelo utiliza ubicación, distancia, ángulo, periodo, tiempo
            restante del cuarto y valor del tiro. No incluye distancia al
            defensor ni reloj de posesión. Los puntos esperados suman P(acierto)
            × 2 o 3.{" "}
            {total > shots.length
              ? `Se muestran los últimos ${shots.length} de ${total} tiros disponibles.`
              : `${total} tiros disponibles en este corte.`}
          </p>
          <p className="mt-3 text-xs text-subtle">
            Estas cifras describen la muestra mostrada y pueden diferir de las
            medias de temporada publicadas por el proveedor.
          </p>
        </div>
      </div>
      <details className="mt-5 rounded-panel border border-border bg-card">
        <summary className="cursor-pointer p-4 font-semibold">
          Tabla accesible de tiros · {filtered.length}
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Coordenadas, contexto y probabilidad de cada tiro
            </caption>
            <thead className="bg-surface-2">
              <tr>
                {[
                  "Periodo",
                  "Reloj cuarto",
                  "X (pies)",
                  "Y (pies)",
                  "Distancia",
                  "Valor",
                  "Resultado",
                  "P(acierto)",
                ].map((h) => (
                  <th
                    scope="col"
                    key={h}
                    className="whitespace-nowrap px-3 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, limit).map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3">{s.period}</td>
                  <td className="mono p-3">
                    {Math.floor(s.seconds / 60)}:
                    {String(Math.floor(s.seconds % 60)).padStart(2, "0")}
                  </td>
                  <td className="num p-3">{s.x}</td>
                  <td className="num p-3">{s.y}</td>
                  <td className="num p-3">{s.distance}</td>
                  <td className="num p-3">{s.value}</td>
                  <td className="p-3">{s.made ? "Acierto" : "Fallo"}</td>
                  <td className="num p-3">
                    {s.probability == null
                      ? "—"
                      : nbaFormat(s.probability * 100) + "%"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > limit && (
          <button
            type="button"
            className="m-3 min-h-11 rounded-control border border-border-strong px-3 text-sm font-semibold"
            onClick={() => setLimit((n) => n + 100)}
          >
            Mostrar más tiros
          </button>
        )}
      </details>
    </section>
  );
}
