import type { Explanation } from "@/lib/nba-simulator";
import { nbaDate, nbaFormat, nbaProbability } from "@/lib/nba";
const labels: Record<string, string> = {
  off_est_diff: "Ataque previo",
  def_est_diff: "Defensa previa",
  pace_est_diff: "Ritmo previo",
  efg_diff: "Eficiencia de tiro",
  tov_rate_diff: "Pérdidas",
  oreb_rate_diff: "Rebote ofensivo",
  ft_rate_diff: "Tiros libres",
  win_diff: "Victorias anteriores",
  recent_off_diff: "Ataque últimos 10",
  recent_def_diff: "Defensa últimos 10",
  rest_diff: "Diferencia de descanso",
  home_advantage: "Localía",
  playoffs: "Fase de competición",
};
export function NbaExplanation({
  explanation,
  cutoff,
  version,
  homeName,
  historical = false,
}: {
  explanation: Explanation;
  cutoff: string;
  version: string;
  homeName: string;
  historical?: boolean;
}) {
  const terms = [...explanation.terms].sort(
      (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
    ),
    max = Math.max(...terms.map((t) => Math.abs(t.contribution)), 0.001);
  return (
    <section
      className="my-6 rounded-panel border border-border bg-card p-5"
      aria-label="Explicación del pronóstico"
    >
      <p className="eyebrow">
        {historical
          ? "Pronóstico guardado antes del partido"
          : "Pronóstico actual"}{" "}
        · versión {version.slice(0, 8)}
      </p>
      <h2 className="display mt-2 text-2xl font-bold">
        ¿Por qué esta probabilidad?
      </h2>
      <p className="my-3 text-sm text-muted">
        Victoria de {homeName}:{" "}
        <strong className="text-accent">
          {nbaProbability(explanation.probability)}
        </strong>{" "}
        · datos hasta {nbaDate(cutoff)}.
      </p>
      <p className="mb-5 max-w-4xl text-sm leading-relaxed text-muted">
        Cada barra representa una contribución exacta del modelo en log-odds. Un
        valor positivo favorece al local y uno negativo al visitante. No son
        puntos porcentuales ni efectos causales; las variables pueden estar
        relacionadas entre sí.
      </p>
      <div className="space-y-3">
        {terms.slice(0, 6).map((t) => (
          <div
            key={t.feature}
            className="grid grid-cols-[minmax(0,1fr)_minmax(60px,1fr)_auto] items-center gap-3 text-sm"
          >
            <span>{labels[t.feature] ?? t.feature}</span>
            <span
              aria-hidden="true"
              className="relative grid h-3 grid-cols-2 overflow-hidden rounded-full bg-surface-2"
            >
              <span className="flex justify-end border-r border-border-strong">
                {t.contribution < 0 && (
                  <span
                    className="h-3 bg-ink"
                    style={{
                      width: `${(Math.abs(t.contribution) / max) * 100}%`,
                    }}
                  />
                )}
              </span>
              <span>
                {t.contribution >= 0 && (
                  <span
                    className="block h-3 bg-accent"
                    style={{ width: `${(t.contribution / max) * 100}%` }}
                  />
                )}
              </span>
            </span>
            <span className="num w-14 text-right">
              {t.contribution >= 0 ? "+" : ""}
              {nbaFormat(t.contribution, 3)}
            </span>
          </div>
        ))}
      </div>
      <details className="mt-5">
        <summary className="min-h-11 text-sm font-semibold">
          Descomposición completa y valores de entrada
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="py-2">Variable</th>
                <th className="p-2">Entrada</th>
                <th className="p-2">Contribución</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <th className="py-2 font-medium">Intercepto</th>
                <td>—</td>
                <td className="num p-2">
                  {nbaFormat(explanation.intercept, 4)}
                </td>
              </tr>
              {explanation.terms.map((t) => (
                <tr key={t.feature} className="border-t border-border">
                  <th scope="row" className="py-2 font-medium">
                    {labels[t.feature] ?? t.feature}
                  </th>
                  <td className="num p-2">{nbaFormat(t.value, 4)}</td>
                  <td className="num p-2">{nbaFormat(t.contribution, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-subtle">
          Intercepto + contribuciones = {nbaFormat(explanation.logit, 4)}; P = 1
          / (1 + exp(−suma)). Las diferencias comparan local y visitante antes
          del encuentro. Fuerza del equipo fija según el último corte y descanso
          según el calendario publicado.
        </p>
      </details>
    </section>
  );
}
