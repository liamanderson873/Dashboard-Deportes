import {redirect} from 'next/navigation';
import {notFound} from 'next/navigation';
import {LeagueHeader} from '@/components/LeagueHeader';
import {PlayerWorkbench} from '@/components/PlayerWorkbench';
import {getSql} from '@/lib/db';
import {loadLeagueContext} from '@/lib/league-context';
import {getPlayerData} from '@/lib/queries/players';
import {resolveRoute} from '@/lib/route-params';
import {pe} from '@/lib/players-es';
export const dynamic='force-dynamic';
export const metadata={title:pe.title};
export default async function PlayersPage({params,searchParams}:{params:Promise<{competition:string;season:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {competition,season}=await params,route=resolveRoute(competition,season);if(!route)notFound();
 const sql=getSql();const [context,data,search]=await Promise.all([loadLeagueContext(sql,competition,season),getPlayerData(sql,route.competition.code,route.season),searchParams]);
 const initial=Object.fromEntries(Object.entries(search).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));
 const destination=({partidos:'partidos',favoritos:'seguimiento',once:'mi-once'} as Record<string,string>)[initial.tab];
 if(destination)redirect(`/${context.competition.slug}/${context.season}/${destination}`);
 return <><LeagueHeader context={context} section="jugadores" title={pe.title} subtitle={`${context.competition.name} · ${context.season}-${String(context.season+1).slice(-2)}`}/><PlayerWorkbench data={data} base={`/${context.competition.slug}/${context.season}`} today={new Date().toISOString().slice(0,10)} now={new Date().toISOString()} initial={initial}/></>;
}
