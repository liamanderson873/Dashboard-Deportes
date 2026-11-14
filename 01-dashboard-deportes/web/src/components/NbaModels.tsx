"use client";

import { NbaLaboratory } from "./NbaLaboratory";
import {
  type Evaluation,
  type NbaData,
  type NbaModel,
  nbaFormat,
  nbaSeason,
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

function NbaModelDetails({ data }: { data: NbaData }) {
  return (
    <>
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
      <p className="mt-5 text-sm leading-relaxed text-muted">
        El simulador reutiliza la regresión logística histórica con la fuerza
        actual. Los márgenes auxiliares para desempates se ajustan con Ridge y
        se evalúan cronológicamente. La temporada se completa con
        emparejamientos hipotéticos de NBA Cup; no representa un calendario
        oficial publicado. El modelo de tiro no incluye defensor ni reloj de
        posesión. Ninguna probabilidad garantiza un resultado.
      </p>
    </>
  );
}

export function NbaModels({ data }: { data: NbaData }) {
  return (
    <>
      <NbaLaboratory data={data} />
      <details className="mb-8 rounded-panel border border-border bg-card p-5">
        <summary className="display min-h-11 text-xl font-bold">
          Metodología y evaluación histórica de los modelos
        </summary>
        <div className="mt-5">
          <NbaModelDetails data={data} />
        </div>
      </details>
    </>
  );
}
