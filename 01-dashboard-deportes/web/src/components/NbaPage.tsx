import { notFound } from "next/navigation";
import { getSql } from "@/lib/db";
import { getNbaData } from "@/lib/queries/nba";
import { nbaSeasonParam } from "@/lib/nba";
import { NbaCoverage, NbaHeader, type NbaSection } from "./NbaHeader";
import {
  NbaFollowing,
  NbaGameCards,
  NbaLineup,
  NbaPlayers,
  NbaStandings,
} from "./NbaWorkbench";
import { NbaModels } from "./NbaModels";
import { EmptyState } from "./EmptyState";

export async function NbaPage({
  params,
  section,
  title,
  initial = {},
  lineup = false,
}: {
  params: Promise<{ season: string }>;
  section: NbaSection;
  title: string;
  initial?: Record<string, string>;
  lineup?: boolean;
}) {
  const { season: raw } = await params,
    season = nbaSeasonParam(raw);
  if (season === null) notFound();
  const data = await getNbaData(getSql(), season);
  return (
    <>
      <NbaHeader data={data} active={section} title={title} />
      {!data.teams.length ? (
        <EmptyState title="Esta temporada NBA todavía no tiene datos">
          <p>
            Cuando se carguen sus estadísticas podrás explorar equipos, partidos
            y jugadores.
          </p>
        </EmptyState>
      ) : (
        <>
          <NbaCoverage data={data} />
          {section === "liga" ? (
            <NbaStandings data={data} />
          ) : section === "partidos" ? (
            <NbaGameCards data={data} />
          ) : section === "jugadores" ? (
            <NbaPlayers data={data} initial={initial} />
          ) : section === "modelos" ? (
            <NbaModels data={data} />
          ) : lineup ? (
            <NbaLineup data={data} />
          ) : (
            <NbaFollowing data={data} />
          )}
        </>
      )}
    </>
  );
}
