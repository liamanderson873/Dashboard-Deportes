import {afterAll,beforeEach,describe,expect,it} from 'vitest';
import {resetTestDatabase,seedStandingsFixture,testSql} from '../../../tests/helpers/test-db';
import {getEnrichedMatchLinks,getPlayerData,getProviderTeamId,getMatchEnrichment} from './players';
const sql=testSql();
beforeEach(async()=>{await resetTestDatabase(sql);await seedStandingsFixture(sql);});
afterAll(async()=>{await sql.end();});
describe('BSD read model',()=>{
 it('keeps empty optional data separate from the legacy standings',async()=>{const data=await getPlayerData(sql,'PD',2026);expect(data.ready).toBe(true);expect(data.players).toEqual([]);expect(await getProviderTeamId(sql,1)).toBeNull();});
 it('survives an uninstalled optional schema',async()=>{await sql`DROP TABLE bsd_player_matches`;expect((await getPlayerData(sql,'PD',2026)).ready).toBe(false);});
 it('normalizes IDs and null metrics without admitting another season or unfinished matches',async()=>{
  await sql`INSERT INTO bsd_teams(id,name) VALUES(100,'Provider A'),(200,'Provider B')`;
  await sql`INSERT INTO bsd_players(id,name,position,date_of_birth) VALUES(1000,'Player A','F','2003-11-14')`;
  await sql`INSERT INTO bsd_squads VALUES('PD',2026,100,1000)`;
  await sql`INSERT INTO bsd_matches(id,competition,season,home_team_id,away_team_id,utc_date,status,home_goals,away_goals)
   VALUES(500,'PD',2026,100,200,'2026-11-01','finished',2,1),(501,'PD',2025,100,200,'2025-11-01','finished',2,1),(502,'PD',2026,100,200,'2026-12-01','upcoming',NULL,NULL)`;
  await sql`INSERT INTO bsd_player_matches(match_id,player_id,team_id,minutes,metrics) VALUES
   (500,1000,100,45,'{"goals":1,"goal_assist":null}'::jsonb),
   (501,1000,100,90,'{"goals":9}'::jsonb),(502,1000,100,90,'{"goals":9}'::jsonb)`;
  const data=await getPlayerData(sql,'PD',2026);expect(data.appearances).toHaveLength(1);expect(data.appearances[0]).toMatchObject({playerId:1000,teamId:100,minutes:45,metrics:{goals:1,assists:null}});expect(data.players[0].teamIds).toEqual([100]);
  expect(await getMatchEnrichment(sql,'PD',2025,500)).toBeNull();
 });
 it('links matches only with explicit ID mappings and exact teams and date',async()=>{
  await sql`INSERT INTO bsd_teams(id,name) VALUES(100,'Provider A'),(200,'Provider B')`;
  await sql`INSERT INTO bsd_matches(id,competition,season,home_team_id,away_team_id,utc_date,status) VALUES(500,'PD',2024,100,200,'2024-08-15T18:00Z','finished')`;
  expect(await getEnrichedMatchLinks(sql,'PD',2024)).toEqual({});
  await sql`INSERT INTO bsd_team_map VALUES(1,100),(2,200)`;
  expect(await getProviderTeamId(sql,1)).toBe(100);expect(await getEnrichedMatchLinks(sql,'PD',2024)).toEqual({1:500});
 });
});
