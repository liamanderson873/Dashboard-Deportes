import Link from "next/link";
import type { NbaData } from "@/lib/nba";
import { nbaSeason, nbaFormat } from "@/lib/nba";
import { SportScene } from "./SportScene";
import { NbaTeamLogo } from "./TeamCrest";
import type { NbaTeam } from "@/lib/nba";
import { SiteBand } from "./SiteBand";
import { NavIcon } from "./NavIcon";

export type NbaSection =
  "liga" | "partidos" | "jugadores" | "modelos" | "personal";
const sections = [
  ["liga", "Liga", "", "liga"],
  ["partidos", "Partidos", "/partidos", "partidos"],
  ["jugadores", "Jugadores", "/jugadores", "jugadores"],
  ["modelos", "Simulador", "/modelos", "modelos"],
  ["personal", "Mi NBA", "/seguimiento", "seguimiento"],
] as const;
export function NbaHeader({
  data,
  active,
  title,
  subtitle,
  team,
}: {
  data: NbaData;
  active: NbaSection;
  title: string;
  subtitle?: string;
  team?: NbaTeam;
}) {
  const base = `/nba/${data.season}`;
  return (
    <>
      <SiteBand sport="nba">
        <span className="mono inline-flex min-h-11 items-center text-xs text-on-ink-muted">
          NBA · {nbaSeason(data.season)} · Datos de NBA Stats
        </span>
      </SiteBand>
      <header
        id="contenido"
        className="sport-hero nba-hero on-ink flex scroll-mt-28 flex-col gap-5 md:flex-row md:items-end md:justify-between"
      >
        <SportScene sport="nba" />
        <div className="relative min-w-0">
          <p className="sport-kicker">
            <span className="sport-kicker-line" /> NBA · El juego, en
            perspectiva
          </p>
          {team && (
            <div className="mb-3 flex items-center gap-3 text-sm font-medium text-on-ink-muted">
              <NbaTeamLogo
                id={team.id}
                abbreviation={team.abbreviation}
                size={48}
              />
              {team.abbreviation} · Conferencia {team.conference}
            </div>
          )}
          <h1 className="display break-words text-4xl font-extrabold tracking-[-0.02em] text-on-ink md:text-5xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-on-ink-muted">
            {subtitle ?? `NBA · Temporada ${nbaSeason(data.season)}`}
          </p>
        </div>
        <nav
          aria-label="Temporadas NBA"
          className="relative flex max-w-full shrink-0 flex-wrap gap-2"
        >
          {(data.seasons.length ? data.seasons : [data.season]).map((year) => (
            <Link
              key={year}
              href={`/nba/${year}${sections.find((s) => s[0] === active)?.[2] ?? ""}`}
              aria-current={year === data.season ? "page" : undefined}
              className="mono inline-flex min-h-11 items-center rounded-control border border-border bg-card px-3 text-sm font-semibold text-accent"
            >
              {nbaSeason(year)}
            </Link>
          ))}
        </nav>
      </header>
      <nav
        aria-label="Secciones NBA"
        className="sport-primary-nav mb-6 rounded-panel border border-border bg-card p-1.5 shadow-sm"
      >
        <ul className="m-0 grid list-none grid-cols-5 gap-1 p-0">
          {sections.map(([id, label, path, icon]) => (
            <li key={id} className="min-w-0">
              <Link
                href={`${base}${path}`}
                aria-current={active === id ? "location" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-control px-1 text-xs font-semibold transition-colors sm:min-h-12 sm:flex-row sm:gap-2 sm:text-sm ${active === id ? "bg-ink text-on-ink" : "text-muted hover:bg-surface-2"}`}
              >
                <NavIcon name={icon} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {active === "personal" && (
        <nav
          aria-label="Mi espacio NBA"
          className="mb-6 flex gap-4 border-b border-border"
        >
          <Link
            className="inline-flex min-h-11 items-center text-sm font-semibold text-accent"
            href={`${base}/seguimiento`}
          >
            Seguimiento
          </Link>
          <Link
            className="inline-flex min-h-11 items-center text-sm font-semibold text-accent"
            href={`${base}/quinteto`}
          >
            Mi quinteto
          </Link>
        </nav>
      )}
    </>
  );
}
export function NbaCoverage({ data }: { data: NbaData }) {
  const finished = data.games.filter((g) => g.status === "finished").length;
  const source = data.sources.find((s) => s.dataset === "schedules");
  return (
    <details className="mb-6 rounded-panel border border-border bg-card px-4 py-3 text-sm text-muted">
      <summary className="cursor-pointer">
        <strong className="text-accent">NBA Stats · SportsDataverse</strong> ·{" "}
        {nbaFormat(finished, 0)} partidos terminados ·{" "}
        {nbaFormat(data.shotCount, 0)} tiros
      </summary>
      <p className="mt-3 leading-relaxed">
        Datos descargados y normalizados de un archivo público de NBA Stats.
        Última descarga:{" "}
        {source
          ? new Date(source.fetched).toLocaleString("es-ES", {
              timeZone: "Europe/Madrid",
            })
          : "—"}
        . Los calendarios muestran fechas NBA; no disponemos de hora de inicio.
        Los datos ausentes se muestran como —. Hay registros individuales en{" "}
        {data.playerGameCount} de los {finished} encuentros terminados.
      </p>
      <p className="mt-2 text-xs">
        Archivo de hoopR.nba.stats / SportsDataverse, CC BY 4.0. Transformación
        y modelos de Marcador. La actualización requiere una nueva importación;
        no es un servicio en directo.
      </p>
    </details>
  );
}
