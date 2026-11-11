import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import postgres, { type Sql } from "postgres";

const SCHEMA_PATH = fileURLToPath(
  new URL("../../../sql/schema.sql", import.meta.url),
);
const TEST_DATABASE_NAME = "sports_test";

/** Connection to the throwaway test database (never the real one). */
export function testSql(): Sql {
  const url =
    process.env.TEST_DATABASE_URL ??
    "postgresql://sports:sports@127.0.0.1:5433/sports_test";
  return postgres(url, { max: 2, onnotice: () => {} });
}

/** Drops every table and recreates the schema from the Python project's SQL file. */
export async function resetTestDatabase(sql: Sql): Promise<void> {
  const [row] = await sql<{ name: string }[]>`SELECT current_database() AS name`;
  if (row?.name !== TEST_DATABASE_NAME) {
    throw new Error(
      `Refusing to reset database "${row?.name}": only "${TEST_DATABASE_NAME}" is allowed.`,
    );
  }
  await sql.unsafe(
    "DROP TABLE IF EXISTS match_stats, squad_members, scorers, players, competitions, matches, teams CASCADE",
  );
  await sql.unsafe(readFileSync(SCHEMA_PATH, "utf8"));
}

/** Teams A, B, C and four PD 2024 matches (three finished, one scheduled). */
export async function seedStandingsFixture(sql: Sql): Promise<void> {
  await sql`
    INSERT INTO teams (id, name, short_name, tla, crest) VALUES
      (1, 'A', 'A', 'AAA', 'https://crests.football-data.org/1.png'),
      (2, 'B', 'B', 'BBB', 'https://crests.football-data.org/2.png'),
      (3, 'C', NULL, NULL, NULL)`;
  await sql`
    INSERT INTO matches
      (id, competition, season, matchday, utc_date, status,
       home_team_id, away_team_id, home_goals, away_goals)
    VALUES
      (1, 'PD', 2024, 1, '2024-08-15T18:00:00Z', 'FINISHED', 1, 2, 2, 1),
      (2, 'PD', 2024, 2, '2024-08-22T18:00:00Z', 'FINISHED', 2, 3, 1, 1),
      (3, 'PD', 2024, 3, '2024-08-29T18:00:00Z', 'FINISHED', 3, 1, 0, 3),
      (4, 'PD', 2024, 4, '2024-09-05T18:00:00Z', 'SCHEDULED', 1, 2, NULL, NULL)`;
}

/** Four players, 2024 squads and PD 2024 scorers. Requires `seedStandingsFixture` first. */
export async function seedPlayersFixture(sql: Sql): Promise<void> {
  await sql`
    INSERT INTO players (id, name, position, nationality, date_of_birth) VALUES
      (10, 'Ana Gol', 'Centre-Forward', 'Spain', '1998-03-10'),
      (11, 'Beto Pase', 'Central Midfield', 'Brazil', '2001-11-02'),
      (12, 'Ciro Muro', 'Goalkeeper', NULL, '1990-01-20'),
      (13, 'Dani Nadie', NULL, NULL, NULL)`;
  await sql`
    INSERT INTO squad_members (season, team_id, player_id) VALUES
      (2024, 1, 10), (2024, 1, 12), (2024, 1, 13), (2024, 2, 11)`;
  await sql`
    INSERT INTO scorers
      (competition, season, player_id, team_id, goals, assists, penalties, played_matches)
    VALUES
      ('PD', 2024, 10, 1, 7, 2, 1, 2),
      ('PD', 2024, 11, 2, 7, NULL, NULL, 2),
      ('PD', 2024, 13, 1, 1, 0, 0, 1)`;
}
