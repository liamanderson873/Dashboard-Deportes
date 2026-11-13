import Link from "next/link";
import { notFound } from "next/navigation";
import { getSql } from "@/lib/db";
import { getNbaData, getNbaGameLines, getNbaShots } from "@/lib/queries/nba";
import {
  nbaDate,
  nbaLabel,
  nbaSeasonParam,
  nbaValue,
  type NbaMetrics,
  type NbaGameLine,
} from "@/lib/nba";
import { NbaCoverage, NbaHeader } from "./NbaHeader";
import { NbaGameCards, NbaPlayersTable, NbaStar } from "./NbaWorkbench";
import { NbaShotMap } from "./NbaShotMap";

function StatTiles({ metrics, keys }: { metrics: NbaMetrics; keys: string[] }) {
  return (
    <div className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {keys.map((key) => (
        <div
          key={key}
          className="rounded-panel border border-border bg-card p-4"
        >
          <p className="eyebrow">{nbaLabel[key] ?? key}</p>
          <p className="score mt-3 text-3xl">{nbaValue(metrics, key)}</p>
        </div>
      ))}
    </div>
  );
}
function PointsTrend({ lines }: { lines: NbaGameLine[] }) {
  const points = lines
    .filter((l) => l.metrics.pts !== null)
    .toSorted(
      (a, b) =>
        a.date.localeCompare(b.date) || a.gameId.localeCompare(b.gameId),
    )
    .slice(-20);
  if (points.length < 2) return null;
  const max = Math.max(...points.map((p) => p.metrics.pts ?? 0), 1);
  return (
    <div className="my-6 rounded-panel border border-border bg-card p-5">
      <h2 className="display mb-3 text-xl font-bold">
        Puntos en tus últimos {points.length} partidos registrados
      </h2>
      <svg
        viewBox="0 0 600 130"
        role="img"
        aria-label={`Evolución de puntos. ${points.map((p) => `${nbaDate(p.date)}: ${p.metrics.pts}`).join("; ")}. También disponibles en la tabla.`}
        className="h-40 w-full"
      >
        <path d="M10 115h580" stroke="var(--border)" />
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          points={points
            .map(
              (p, i) =>
                `${10 + (i / (points.length - 1)) * 580},${115 - ((p.metrics.pts ?? 0) / max) * 95}`,
            )
            .join(" ")}
        />
        {points.map((p, i) => (
          <circle
            key={p.gameId}
            cx={10 + (i / (points.length - 1)) * 580}
            cy={115 - ((p.metrics.pts ?? 0) / max) * 95}
            r="4"
            fill="var(--accent)"
          >
            <title>
              {nbaDate(p.date)} · {p.metrics.pts} puntos
            </title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

export async function NbaProfile({
  params,
  kind,
}: {
  params: Promise<{ season: string; id: string }>;
  kind: "player" | "team" | "game";
}) {
  const { season: raw, id } = await params,
    season = nbaSeasonParam(raw);
  if (
    season === null ||
    !(kind === "game" ? /^\d{10}$/ : /^[1-9]\d{0,11}$/).test(id)
  )
    notFound();
  const sql = getSql(),
    data = await getNbaData(sql, season);
  const player = data.players.find((p) => p.id === Number(id)),
    team = data.teams.find((t) => t.id === Number(id)),
    game = data.games.find((g) => g.id === id);
  if (
    (kind === "player" && !player) ||
    (kind === "team" && !team) ||
    (kind === "game" && !game)
  )
    notFound();
  const [lines, shotData] = await Promise.all([
    getNbaGameLines(sql, season, kind, id),
    getNbaShots(sql, season, kind, id),
  ]);
  const base = `/nba/${season}`;
  const name = (teamId: number) =>
    data.teams.find((t) => t.id === teamId)?.name ?? `Equipo ${teamId}`;
  const title =
    kind === "player"
      ? player!.name
      : kind === "team"
        ? team!.name
        : "Centro de partido NBA";
  const section =
    kind === "player" ? "jugadores" : kind === "team" ? "liga" : "partidos";
  const backlink =
    kind === "player" ? "/jugadores" : kind === "game" ? "/partidos" : "";
  const selected =
    kind === "team" ? data.players.filter((p) => p.teamId === team!.id) : [];
  return (
    <>
      <NbaHeader data={data} active={section} title={title} />
      <Link
        href={`${base}${backlink}`}
        className="mb-5 inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline"
      >
        ←{" "}
        {kind === "player"
          ? "Jugadores"
          : kind === "team"
            ? "Clasificación"
            : "Partidos"}
      </Link>
      <NbaCoverage data={data} />
      {kind === "player" && player && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {name(player.teamId)} ·{" "}
              {player.position ?? "Posición no disponible"} ·{" "}
              {nbaValue(player.metrics, "age")} años
            </p>
            <NbaStar id={player.id} name={player.name} />
          </div>
          <StatTiles
            metrics={player.metrics}
            keys={[
              "pts",
              "reb",
              "ast",
              "min",
              "ts_pct",
              "usg_pct",
              "off_rating",
              "def_rating",
            ]}
          />
          <p className="text-xs text-subtle">
            {player.metrics.stats_unavailable === 1
              ? "Este jugador figura en la plantilla, pero aún no dispone de agregados de temporada en la fuente. Los datos ausentes se muestran como —."
              : player.metrics.stats_from_logs === 1
                ? "Medias calculadas a partir de las actuaciones disponibles; el proveedor aún no incluye este perfil en sus agregados de temporada."
                : "Medias de temporada por partido."}{" "}
            Los ratings del jugador describen la eficiencia de su equipo
            mientras está en pista.
          </p>
          <PointsTrend lines={lines} />
          <h2 className="display mb-3 mt-6 text-2xl font-bold">
            Registro de partidos
          </h2>
          <p className="mb-3 text-xs text-subtle">
            {lines.length} registros individuales disponibles; el total de
            partidos de la ficha puede tener otra cobertura.
          </p>
          <div className="overflow-x-auto rounded-panel border border-border bg-card">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Actuaciones de {player.name}
              </caption>
              <thead className="bg-surface-2">
                <tr>
                  {[
                    "Fecha",
                    "Partido",
                    "MIN",
                    "PTS",
                    "REB",
                    "AST",
                    "ROB",
                    "TAP",
                    "PÉR",
                  ].map((h) => (
                    <th scope="col" key={h} className="whitespace-nowrap p-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const g = data.games.find((g) => g.id === l.gameId);
                  return (
                    <tr
                      key={`${l.gameId}-${l.teamId}`}
                      className="border-t border-border"
                    >
                      <td className="whitespace-nowrap p-3">
                        {nbaDate(l.date)}
                      </td>
                      <th scope="row" className="min-w-52 p-3">
                        <Link
                          href={`${base}/partido/${l.gameId}`}
                          className="font-medium text-accent hover:underline"
                        >
                          {g
                            ? `${name(g.awayId)} @ ${name(g.homeId)}`
                            : l.gameId}
                        </Link>
                      </th>
                      {["min", "pts", "reb", "ast", "stl", "blk", "tov"].map(
                        (k) => (
                          <td key={k} className="num p-3">
                            {nbaValue(l.metrics, k)}
                          </td>
                        ),
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {kind === "team" && team && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Conferencia {team.conference} · {team.metrics.w ?? "—"} victorias
              · {team.metrics.l ?? "—"} derrotas
            </p>
            <NbaStar id={team.id} name={team.name} kind="teams" />
          </div>
          <StatTiles
            metrics={team.metrics}
            keys={[
              "pts",
              "reb",
              "ast",
              "pace",
              "off_rating",
              "def_rating",
              "net_rating",
              "efg_pct",
            ]}
          />
          <h2 className="display mb-4 mt-8 text-2xl font-bold">
            Jugadores con estadísticas
          </h2>
          <NbaPlayersTable
            data={data}
            players={selected.toSorted(
              (a, b) => (b.metrics.pts ?? 0) - (a.metrics.pts ?? 0),
            )}
          />
          <h2 className="display mb-4 mt-8 text-2xl font-bold">
            Partidos del equipo
          </h2>
          <NbaGameCards data={data} teamIds={[team.id]} />
        </>
      )}
      {kind === "game" && game && (
        <>
          <section className="rounded-panel bg-ink p-5 text-on-ink sm:p-8">
            <p className="mono mb-6 text-xs text-on-ink-muted">
              {nbaDate(game.date)} ·{" "}
              {game.status === "finished"
                ? "Final"
                : "Programado; hora no disponible"}
            </p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-7">
              <Link
                className="display min-w-0 break-words text-left text-xl font-bold sm:text-3xl"
                href={`${base}/equipo/${game.awayId}`}
              >
                {name(game.awayId)}
              </Link>
              <p className="score whitespace-nowrap text-3xl sm:text-5xl">
                {game.awayPts ?? "—"}{" "}
                <span className="font-normal text-on-ink-muted">:</span>{" "}
                {game.homePts ?? "—"}
              </p>
              <Link
                className="display min-w-0 break-words text-right text-xl font-bold sm:text-3xl"
                href={`${base}/equipo/${game.homeId}`}
              >
                {name(game.homeId)}
              </Link>
            </div>
          </section>
          {!lines.length ? (
            <p className="mt-5 rounded-panel border border-border bg-card p-5 text-muted">
              {game.status === "scheduled"
                ? "Las estadísticas individuales aparecerán cuando se juegue el partido y se actualicen los datos."
                : "No hay registros individuales disponibles para este encuentro."}
            </p>
          ) : (
            <>
              <h2 className="display mb-4 mt-8 text-2xl font-bold">
                Estadísticas individuales del partido
              </h2>
              {[game.awayId, game.homeId].map((teamId) => (
                <section key={teamId} className="mb-6">
                  <h3 className="display mb-3 text-xl font-bold">
                    {name(teamId)}
                  </h3>
                  <div className="overflow-x-auto rounded-panel border border-border bg-card">
                    <table className="w-full text-left text-sm">
                      <caption className="sr-only">
                        Box score de {name(teamId)}
                      </caption>
                      <thead className="bg-surface-2">
                        <tr>
                          {[
                            "Jugador",
                            "MIN",
                            "PTS",
                            "REB",
                            "AST",
                            "ROB",
                            "TAP",
                            "PÉR",
                          ].map((h) => (
                            <th key={h} scope="col" className="p-3">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lines
                          .filter((l) => l.teamId === teamId)
                          .toSorted(
                            (a, b) =>
                              (b.metrics.pts ?? 0) - (a.metrics.pts ?? 0),
                          )
                          .map((l) => (
                            <tr
                              key={l.playerId}
                              className="border-t border-border"
                            >
                              <th scope="row" className="min-w-40 p-3">
                                <Link
                                  className="font-semibold text-accent hover:underline"
                                  href={`${base}/jugador/${l.playerId}`}
                                >
                                  {data.players.find((p) => p.id === l.playerId)
                                    ?.name ?? `Jugador ${l.playerId}`}
                                </Link>
                              </th>
                              {[
                                "min",
                                "pts",
                                "reb",
                                "ast",
                                "stl",
                                "blk",
                                "tov",
                              ].map((k) => (
                                <td key={k} className="num p-3">
                                  {nbaValue(l.metrics, k)}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </>
          )}
        </>
      )}
      <NbaShotMap shots={shotData.shots} total={shotData.total} />
    </>
  );
}
