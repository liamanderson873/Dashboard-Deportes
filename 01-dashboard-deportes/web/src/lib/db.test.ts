import { afterAll, describe, expect, test } from "vitest";
import { getSql, normalizeDatabaseUrl } from "@/lib/db";
import {
  resetTestDatabase,
  seedStandingsFixture,
  testSql,
} from "../../tests/helpers/test-db";

describe("normalizeDatabaseUrl", () => {
  test("test_normalize_database_url_strips_the_driver_suffix", () => {
    expect(normalizeDatabaseUrl("postgresql+psycopg://u:p@h:5433/db")).toBe(
      "postgresql://u:p@h:5433/db",
    );
    expect(normalizeDatabaseUrl("postgres+x://u:p@h/db")).toBe(
      "postgres://u:p@h/db",
    );
    expect(normalizeDatabaseUrl("postgresql://u:p+q@h/db")).toBe(
      "postgresql://u:p+q@h/db",
    );
  });
});

describe("getSql", () => {
  test("test_get_sql_without_database_url_raises_a_spanish_config_error", () => {
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      expect(() => getSql()).toThrowError(/DATABASE_URL/);
      expect(() => getSql()).toThrowError(/\.env\.local/);
    } finally {
      if (saved !== undefined) process.env.DATABASE_URL = saved;
    }
  });
});

describe("test database helper", () => {
  const sql = testSql();
  afterAll(async () => {
    await sql.end();
  });

  test("test_reset_test_database_creates_the_schema_from_the_python_file", async () => {
    await resetTestDatabase(sql);
    const rows = await sql<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'`;
    const names = rows.map((r) => r.table_name);
    for (const table of ["teams", "matches", "squad_members", "match_stats"]) {
      expect(names).toContain(table);
    }
  });

  test("seed_standings_fixture_inserts_three_teams_and_four_matches", async () => {
    await resetTestDatabase(sql);
    await seedStandingsFixture(sql);
    const [t] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM teams`;
    const [m] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM matches`;
    expect([t.n, m.n]).toEqual([3, 4]);
  });
});
