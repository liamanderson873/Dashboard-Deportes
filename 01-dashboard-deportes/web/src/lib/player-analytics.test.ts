import {describe,it,expect} from 'vitest';
import {aggregatePlayers,metricValue,normalizeMetrics,percentile,similarPlayers,ageAt,type Player,type Appearance} from './player-analytics';
const player:Player={id:1,name:'Prueba',position:'F',birth:'2003-11-14',nationality:null,teamIds:[1,2]};
const row=(matchId:number,minutes:number,goals:number|null,teamId=1):Appearance=>({matchId,playerId:1,teamId,date:`2026-11-${String(matchId).padStart(2,'0')}`,minutes,metrics:{goals}});
describe('player analytics',()=>{
 it('uses only covered minutes and preserves unknown metrics',()=>{const [a]=aggregatePlayers([player],[row(1,90,null),row(2,45,1)]);expect(a.minutes).toBe(135);expect(metricValue(a,'goals',true)).toBe(2);expect(a.totals.assists).toBeNull();expect(a.coveredMatches.goals).toBe(1);});
 it('counts transfers once, filters team and chooses latest five played appearances',()=>{const rows=Array.from({length:7},(_,i)=>row(i+1,90,1,i<3?1:2));rows.push(rows[0],row(8,0,0));expect(aggregatePlayers([player],rows)[0].matches).toBe(7);expect(aggregatePlayers([player],rows,'five')[0].matches).toBe(5);expect(aggregatePlayers([player],rows,'season',2)[0].totals.goals).toBe(4);});
 it('rejects empty and invalid raw numbers rather than converting to zero',()=>{expect(normalizeMetrics({goals:null,goal_assist:'',total_shots:0,expected_goals:-1})).toMatchObject({goals:null,assists:null,shots:0,xg:null});});
 it('does not invent percentiles or similarity for singleton or insufficient data',()=>{const [a]=aggregatePlayers([player],[row(1,90,1)]);expect(percentile(a,[a],'goals')).toBeNull();expect(similarPlayers(a,[a])).toEqual([]);});
 it('computes age on a specific date',()=>{expect(ageAt(player.birth,'2026-11-13')).toBe(22);expect(ageAt(player.birth,'2026-11-14')).toBe(23);});
 it('ranks only eligible same-position peers and assigns midranks to ties',()=>{
  const ps=[1,2,3,4].map(id=>({...player,id,position:id===4?'D':'F'}));
  const apps=ps.map(p=>({...row(p.id,270,p.id===3?6:3),playerId:p.id}));
  const cohort=aggregatePlayers(ps,apps);expect(percentile(cohort[0],cohort,'goals')).toEqual({value:25,size:3});
  expect(percentile(cohort[0],cohort,'assists')).toBeNull();
 });
 it('requires comparable observed features and gives identical profiles full similarity',()=>{
  const ps=[1,2,3,4].map(id=>({...player,id}));
  const apps=ps.map(p=>({...row(p.id,270,3),playerId:p.id,metrics:{goals:p.id===3?6:3,assists:p.id===3?6:3,shots:p.id===3?12:6,keyPasses:null}}));
  const cohort=aggregatePlayers(ps,apps),s=similarPlayers(cohort[0],cohort);expect(s[0].row.player.id).toBe(2);expect(s[0].score).toBe(100);expect(s[0].metrics).toHaveLength(3);
 });
});
