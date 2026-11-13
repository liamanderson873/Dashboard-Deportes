import { notFound } from 'next/navigation';
import { LeagueHeader } from './LeagueHeader';
import { PlayerWorkbench } from './PlayerWorkbench';
import { getSql } from '@/lib/db';
import { loadLeagueContext } from '@/lib/league-context';
import { getPlayerData } from '@/lib/queries/players';
import { resolveRoute } from '@/lib/route-params';

export async function PersonalPage({ params, surface }: { params: Promise<{competition:string;season:string}>; surface:'following'|'lineup' }) {
  const {competition,season}=await params;
  const route=resolveRoute(competition,season); if(!route)notFound();
  const sql=getSql();
  const [context,data]=await Promise.all([loadLeagueContext(sql,competition,season),getPlayerData(sql,route.competition.code,route.season)]);
  const now=new Date().toISOString();
  return <><LeagueHeader context={context} section={surface==='following'?'seguimiento':'mi-once'} title={surface==='following'?'Tu seguimiento':'Mi once ideal'} subtitle={`${context.competition.name} · ${context.season}-${String(context.season+1).slice(-2)}`}/><PlayerWorkbench data={data} base={`/${context.competition.slug}/${context.season}`} today={now.slice(0,10)} now={now} surface={surface}/></>;
}
