import { readFileSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  resetTestDatabase,
  seedStandingsFixture,
  testSql,
} from "../../../tests/helpers/test-db";
import { getNbaData, getNbaGameLines, getNbaShots, nbaSeasons } from "./nba";

const sql = testSql();
const schema = readFileSync(
  new URL("../../../../sql/nba.sql", import.meta.url),
  "utf8",
);
beforeEach(async () => {
  await resetTestDatabase(sql);
  await seedStandingsFixture(sql);
});
afterAll(async () => {
  await sql.end();
});

describe("NBA optional read model", () => {
  it("renders an uninstalled NBA schema without changing football", async () => {
    expect(await nbaSeasons(sql)).toEqual([]);
    expect((await getNbaData(sql, 2026)).teams).toEqual([]);
    expect(Number((await sql`SELECT count(*) AS n FROM teams`)[0].n)).toBe(3);
  });
  it("preserves leading-zero game IDs, missing metrics and season boundaries", async () => {
    await sql.unsafe(schema);
    await sql`INSERT INTO nba_teams VALUES(100,'Team A','AAA','Este'),(200,'Team B','BBB','Oeste')`;
    await sql`INSERT INTO nba_team_stats VALUES(2026,100,'{"off_rating":111.1,"def_rating":null,"net_rating":-2.3}'::jsonb)`;
    await sql`INSERT INTO nba_games VALUES(2026,'0022600001','2026-11-01',100,200,100,90,'finished'),(2025,'0022500001','2025-11-01',100,200,100,90,'finished')`;
    await sql`INSERT INTO nba_players VALUES(2026,1,'Player A',100,'G-F','{"pts":20,"ts_pct":null}'::jsonb)`;
    const data = await getNbaData(sql, 2026);
    expect(data.games).toHaveLength(1);
    expect(data.games[0].id).toBe("0022600001");
    expect(data.teams[0].metrics).toMatchObject({
      off_rating: 111.1,
      def_rating: null,
      net_rating: -2.3,
    });
    expect(data.players[0].metrics.ts_pct).toBeNull();
    expect(data.seasons).toEqual([2026, 2025]);
  });
  it("queries only the selected player/game and keeps unknown shot probabilities", async () => {
    await sql.unsafe(schema);
    await sql`INSERT INTO nba_shots(season,id,game_id,player_id,team_id,x,y,distance,period,seconds,value,made) VALUES(2026,1,'0022600001',1,100,0,2,2,1,60,2,0)`;
    await sql`INSERT INTO nba_player_games VALUES(2026,'0022600001',1,100,'2026-11-01','{"pts":0,"ast":null}'::jsonb)`;
    const shots = await getNbaShots(sql, 2026, "player", "1");
    expect(shots.total).toBe(1);
    expect(shots.shots[0].probability).toBeNull();
    expect(shots.shots[0].made).toBe(0);
    expect((await getNbaShots(sql, 2025, "player", "1")).total).toBe(0);
    expect(await getNbaGameLines(sql, 2026, "player", "1' OR true --")).toEqual(
      [],
    );
    expect(
      (await getNbaGameLines(sql, 2026, "game", "0022600001"))[0].metrics,
    ).toEqual({ pts: 0, ast: null });
  });
});
