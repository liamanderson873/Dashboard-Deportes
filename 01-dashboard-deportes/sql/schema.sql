CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY,
    competition TEXT NOT NULL,
    season INTEGER NOT NULL,
    matchday INTEGER,
    utc_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    home_team_id INTEGER NOT NULL REFERENCES teams (id),
    away_team_id INTEGER NOT NULL REFERENCES teams (id),
    home_goals INTEGER,
    away_goals INTEGER
);

CREATE INDEX IF NOT EXISTS ix_matches_competition_season ON matches (competition, season);
