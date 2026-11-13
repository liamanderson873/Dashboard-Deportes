import { notFound } from 'next/navigation';
import { LeagueHeader } from '@/components/LeagueHeader';
import { Coverage } from '@/components/PlayerWorkbench';
import { MatchCards } from '@/components/UpcomingMatchCards';
import { getSql } from '@/lib/db';
import { loadLeagueContext } from '@/lib/league-context';
import { getPlayerData } from '@/lib/queries/players';
import { resolveRoute } from '@/lib/route-params';
export const dynamic='force-dynamic';
export const metadata={title:'Centro de partidos'};
export default async function Page({params}:{params:Promise<{competition:string;season:string}>}) {
  const {competition,season}=await params;
  const route=resolveRoute(competition,season);if(!route)notFound();
  const sql=getSql();
  const [context,data]=await Promise.all([loadLeagueContext(sql,competition,season),getPlayerData(sql,route.competition.code,route.season)]);
  return <><LeagueHeader context={context} section="partidos" title="Centro de partidos" subtitle={`${context.competition.name} · ${context.season}-${String(context.season+1).slice(-2)}`}/><Coverage data={data}/><MatchCards data={data} base={`/${context.competition.slug}/${context.season}`} now={new Date().toISOString()}/></>;
}
