"use client";

import Link from "next/link";
import { useState } from "react";
import {
  type Evaluation,
  type Forecast,
  type NbaData,
  type NbaModel,
  nbaFormat,
  nbaSeason,
  nbaProbability,
} from "@/lib/nba";

function Calibration({ evaluation }: { evaluation: Evaluation }) {
  return (
    <details className="mt-4 rounded-control border border-border p-3">
      <summary className="cursor-pointer text-sm font-semibold">
        Ver calibración: probabilidad estimada frente a frecuencia real
      </summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <svg
          role="img"
          aria-label="Calibración por intervalos. La diagonal representa probabilidades perfectamente calibradas; la tabla contiene los valores."
          viewBox="0 0 260 260"
          className="mx-auto w-full max-w-xs"
        >
          <path
            d="M30 15v215h215M30 230 245 15"
            fill="none"
            stroke="var(--border-strong)"
            strokeDasharray="4 4"
          />
          <polyline
            points={evaluation.calibration
              .map((b) => `${30 + b.predicted * 215},${230 - b.observed * 215}`)
              .join(" ")}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
          />
          {evaluation.calibration.map((b, i) => (
            <circle
              key={i}
              cx={30 + b.predicted * 215}
              cy={230 - b.observed * 215}
              r="3"
              fill="var(--accent)"
            >
              <title>
                {nbaFormat(b.predicted * 100)}% estimado;{" "}
                {nbaFormat(b.observed * 100)}% observado; n={b.n}
              </title>
            </circle>
          ))}
          <text x="35" y="250" fontSize="11" fill="var(--muted)">
            0
          </text>
          <text x="215" y="250" fontSize="11" fill="var(--muted)">
            100%
          </text>
          <text x="35" y="14" fontSize="11" fill="var(--muted)">
            Frecuencia real
          </text>
        </svg>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Calibración del modelo</caption>
            <thead>
              <tr>
                <th className="p-2">Estimada</th>
                <th className="p-2">Real</th>
                <th className="p-2">Muestra</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.calibration.map((b, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="num p-2">{nbaFormat(b.predicted * 100)}%</td>
                  <td className="num p-2">{nbaFormat(b.observed * 100)}%</td>
                  <td className="num p-2">{nbaFormat(b.n, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-subtle">
        Las diferencias respecto a la diagonal indican descalibración. Los
        intervalos con pocas observaciones tienen mayor incertidumbre.
      </p>
    </details>
  );
}
function ModelReport({
  model,
  title,
}: {
  model: NbaModel | undefined;
  title: string;
}) {
  if (!model?.metadata.test)
    return (
      <div className="rounded-panel border border-border bg-card p-5">
        <h2 className="display text-2xl font-bold">{title}</h2>
        <p className="mt-3 text-sm text-muted">
          Este modelo todavía no tiene una evaluación publicada.
        </p>
      </div>
    );
  const meta = model.metadata,
    test = meta.test!,
    end = meta.season_basis === "end-year";
  const season =
    typeof meta.test_season === "number"
      ? nbaSeason(meta.test_season - (end ? 1 : 0))
      : "—";
  const references = [
    ["Modelo", test],
    ["Referencia constante", meta.home_or_make_rate],
    ["Elo", meta.elo_baseline],
    ["Regresión logística", meta.logistic_baseline],
    ["Por valor 2/3 puntos", meta.value_baseline],
  ].filter(([, score]) => !!score) as [string, Evaluation][];
  return (
    <div className="rounded-panel border border-border bg-card p-5 sm:p-6">
      <p className="eyebrow mb-2">Evaluación fuera de muestra · {season}</p>
      <h2 className="display text-2xl font-bold">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {typeof meta.method === "string"
          ? meta.method
          : typeof meta.scope === "string"
            ? meta.scope
            : ""}
      </p>
      <div className="my-5 grid grid-cols-3 gap-3">
        {[
          ["AUC", nbaFormat(test.auc, 3)],
          ["Brier", nbaFormat(test.brier, 3)],
          ["Muestra", nbaFormat(test.n, 0)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-control bg-surface-2 p-3">
            <p className="eyebrow">{label}</p>
            <p className="num mt-2 text-lg font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Comparación de métricas del modelo y sus referencias
          </caption>
          <thead>
            <tr>
              <th className="py-3">Método</th>
              <th className="p-3">Log loss ↓</th>
              <th className="p-3">Brier ↓</th>
            </tr>
          </thead>
          <tbody>
            {references.map(([name, result]) => (
              <tr key={name} className="border-t border-border">
                <th scope="row" className="py-3 text-xs font-medium">
                  {name}
                </th>
                <td className="num p-3">{nbaFormat(result.log_loss, 4)}</td>
                <td className="num p-3">{nbaFormat(result.brier, 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-subtle">
        Entrenamiento y prueba separados por temporadas. Las métricas
        corresponden al modelo evaluado antes del reajuste de producción con las
        temporadas completas. Menor log loss y Brier indican mejor estimación de
        probabilidades; AUC mide ordenación, no porcentaje de aciertos.
      </p>
      <Calibration evaluation={test} />
      {meta.features && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Variables y temporadas
          </summary>
          <p className="mt-2 break-words text-xs leading-relaxed text-subtle">
            {meta.features.join(" · ")}
          </p>
          <p className="mt-2 text-xs text-subtle">
            Temporadas del reajuste:{" "}
            {meta.production_refit_seasons
              ?.map((y) => nbaSeason(y - (end ? 1 : 0)))
              .join(", ") ?? "—"}
          </p>
        </details>
      )}
    </div>
  );
}

export function NbaModels({ data }: { data: NbaData }) {
  const forecast = data.models.playoffs;
  const [sort, setSort] = useState<keyof Forecast>("champion");
  const [conference, setConference] = useState("");
  const rows = ((forecast?.predictions ?? []) as Forecast[])
    .filter(
      (p) =>
        !conference ||
        data.teams.find((t) => t.id === p.team_id)?.conference === conference,
    )
    .toSorted((a, b) => Number(b[sort]) - Number(a[sort]));
  const metadata = forecast?.metadata;
  return (
    <>
      <section className="mb-8 rounded-panel bg-ink p-5 text-on-ink sm:p-7">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-on-ink-muted">
          Laboratorio NBA · probabilidades explicables
        </p>
        <h2 className="display max-w-3xl text-3xl font-bold">
          Del próximo partido a la lucha por el título
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-on-ink-muted">
          La regresión logística estima cada encuentro y el simulador recorre
          temporada, play-in y series. El modelo de tiro estima la probabilidad
          de acierto con contexto observable.
        </p>
      </section>
      <section className="mb-8">
        <h2 className="display mb-4 text-2xl font-bold">
          Simulación de temporada y playoffs
        </h2>
        {metadata?.conditional === true && (
          <div className="mb-5 rounded-panel border border-border-strong bg-surface-2 p-4">
            <p className="text-sm font-semibold">
              Escenario condicionado al calendario publicado:{" "}
              {nbaFormat(Number(metadata.published_games), 0)} de{" "}
              {nbaFormat(Number(metadata.expected_games), 0)} encuentros
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Faltan {String(metadata.missing_games)} partidos por asignar. Las
              victorias y probabilidades de esta tabla se calculan con los
              encuentros conocidos. Los cruces futuros de la NBA Cup todavía
              pueden cambiar el escenario.
            </p>
          </div>
        )}
        {rows.length ? (
          <>
            <div className="mb-4 flex flex-wrap gap-3">
              <label className="flex flex-col gap-2">
                <span className="eyebrow">Conferencia</span>
                <select
                  value={conference}
                  onChange={(e) => setConference(e.target.value)}
                  className="min-h-11 rounded-control border border-border-strong bg-card px-3 text-base sm:text-sm"
                >
                  <option value="">Ambas</option>
                  <option value="Este">Este</option>
                  <option value="Oeste">Oeste</option>
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="eyebrow">Ordenar por probabilidad de</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as keyof Forecast)}
                  className="min-h-11 rounded-control border border-border-strong bg-card px-3 text-base sm:text-sm"
                >
                  <option value="champion">Ganar el título</option>
                  <option value="playoffs">Entrar en playoffs</option>
                  <option value="round2">Avanzar a segunda ronda</option>
                  <option value="final">Llegar a la final</option>
                </select>
              </label>
            </div>
            <div className="overflow-x-auto rounded-panel border border-border bg-card">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Probabilidades de temporada condicionadas al calendario
                  conocido
                </caption>
                <thead className="bg-surface-2">
                  <tr>
                    {[
                      "Equipo",
                      "V proyectadas",
                      "PJ previstos",
                      "Playoffs",
                      "2.ª ronda",
                      "Final conf.",
                      "Final NBA",
                      "Campeón",
                    ].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="whitespace-nowrap px-3 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.team_id} className="border-t border-border">
                      <th scope="row" className="min-w-44 px-3 py-3">
                        <Link
                          className="font-semibold text-accent hover:underline"
                          href={`/nba/${data.season}/equipo/${row.team_id}`}
                        >
                          {data.teams.find((t) => t.id === row.team_id)?.name ??
                            row.team_id}
                        </Link>
                      </th>
                      <td
                        className="num whitespace-nowrap px-3 py-3"
                        title={`Intervalo central del 90%: ${row.wins_p05}–${row.wins_p95}`}
                      >
                        {nbaFormat(row.wins_mean)}{" "}
                        <span className="text-xs text-subtle">
                          ({row.wins_p05}–{row.wins_p95})
                        </span>
                      </td>
                      <td className="num px-3 py-3">{row.scheduled_games}</td>
                      {(
                        [
                          "playoffs",
                          "round2",
                          "conference_final",
                          "final",
                          "champion",
                        ] as const
                      ).map((key) => (
                        <td
                          key={key}
                          className={`num px-3 py-3 ${key === "champion" ? "font-bold text-accent" : ""}`}
                        >
                          {nbaProbability(row[key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details className="mt-4 rounded-panel border border-border bg-card p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                Supuestos y límites · {nbaFormat(Number(metadata?.runs), 0)}{" "}
                simulaciones
              </summary>
              {["scope", "ties", "rest", "uncertainty"].map((key) => (
                <p
                  key={key}
                  className="mt-3 text-xs leading-relaxed text-subtle"
                >
                  {String(metadata?.[key] ?? "")}
                </p>
              ))}
              <p className="mt-3 text-xs text-subtle">
                La clasificación directa y el play-in se simulan antes de formar
                el cuadro. Los intervalos junto a las victorias recogen el 90%
                central de las simulaciones. No se modelan lesiones futuras ni
                cambios de plantilla.
              </p>
            </details>
          </>
        ) : (
          <p className="rounded-panel border border-border bg-card p-6 text-muted">
            No hay una simulación disponible para esta temporada.{" "}
            {typeof metadata?.unavailable === "string"
              ? metadata.unavailable
              : ""}
          </p>
        )}
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <ModelReport
          model={data.models.games}
          title="Regresión logística de partidos"
        />
        <ModelReport
          model={data.models.shots}
          title="Gradient boosting de tiros"
        />
      </div>
      <p className="mt-5 max-w-4xl text-xs leading-relaxed text-subtle">
        El modelo de tiro no dispone de distancia al defensor ni reloj de
        posesión. El tiempo restante del cuarto es una variable diferente. Los
        gráficos y métricas permiten revisar el comportamiento real de los
        modelos; ninguna probabilidad garantiza un resultado.
      </p>
    </>
  );
}
