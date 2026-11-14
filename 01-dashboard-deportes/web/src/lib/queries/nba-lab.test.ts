import { readFileSync } from "node:fs";
import { beforeEach, afterAll, it, expect } from "vitest";
import {
  testSql,
  resetTestDatabase,
  seedStandingsFixture,
} from "../../../tests/helpers/test-db";
import { getPredictionHistory, getSimulationConfig } from "./nba-lab";
import { getNbaData } from "./nba";
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
it("supports optional schemas without inventing a history", async () => {
  expect(await getPredictionHistory(sql, 2026)).toEqual([]);
  expect(await getSimulationConfig(sql, 2026)).toBeNull();
});
it("uses only the latest genuinely pregame version and preserves all ledger rows", async () => {
  await sql.unsafe(schema);
  await sql`INSERT INTO nba_games VALUES(2026,'0022600001','2026-11-14',1,2,110,100,'finished')`;
  await sql`INSERT INTO nba_prediction_history VALUES
 (2026,'0022600001','early','2026-11-13','2026-11-13T15:00Z','2026-11-12',0.6,'{}'),
 (2026,'0022600001','latest-valid','2026-11-13','2026-11-14T02:00Z','2026-11-12',0.7,'{}'),
 (2026,'0022600001','same-day','2026-11-14','2026-11-14T12:00Z','2026-11-12',0.99,'{}'),
 (2026,'0022600001','wrong-emission-day','2026-11-13','2026-11-14T12:00Z','2026-11-12',0.99,'{}'),
 (2026,'0022600001','future-cutoff','2026-11-13','2026-11-14T03:00Z','2026-11-15',0.99,'{}')`;
  const rows = await getPredictionHistory(sql, 2026);
  expect(rows).toHaveLength(1);
  expect(rows[0].probability).toBe(0.7);
  expect(rows[0].modelVersion).toBe("latest-valid");
  expect(await getPredictionHistory(sql, 2025)).toEqual([]);
  expect(
    Number((await sql`SELECT count(*) AS n FROM nba_prediction_history`)[0].n),
  ).toBe(5);
});
it("keeps the large simulation configuration out of ordinary NBA page payloads", async () => {
  await sql.unsafe(schema);
  await sql`INSERT INTO nba_games VALUES(2026,'0022600001','2026-11-14',1,2,NULL,NULL,'scheduled')`;
  await sql`INSERT INTO nba_models VALUES(2026,'laboratory','{"version":1,"privateLargeInputs":true}','[]',now())`;
  const data = await getNbaData(sql, 2026);
  expect(data.models.laboratory).toBeUndefined();
  expect((await getSimulationConfig(sql, 2026))?.version).toBe(1);
});
