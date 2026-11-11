CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

ALTER TABLE teams ADD COLUMN IF NOT EXISTS short_name TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS tla TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS crest TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS founded INTEGER;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS venue TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS club_colors TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS coach TEXT;

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

ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_ht_goals INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_ht_goals INTEGER;

CREATE INDEX IF NOT EXISTS ix_matches_competition_season ON matches (competition, season);

CREATE TABLE IF NOT EXISTS competitions (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    area TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY,
    team_id INTEGER REFERENCES teams (id),
    name TEXT NOT NULL,
    position TEXT,
    nationality TEXT,
    date_of_birth DATE
);

CREATE TABLE IF NOT EXISTS scorers (
    competition TEXT,
    season INTEGER,
    player_id INTEGER REFERENCES players (id),
    team_id INTEGER REFERENCES teams (id),
    goals INTEGER,
    assists INTEGER,
    penalties INTEGER,
    played_matches INTEGER,
    PRIMARY KEY (competition, season, player_id)
);

CREATE TABLE IF NOT EXISTS match_stats (
    match_id INTEGER PRIMARY KEY REFERENCES matches (id),
    home_xg NUMERIC,
    away_xg NUMERIC,
    home_shots INTEGER,
    away_shots INTEGER,
    home_shots_on_target INTEGER,
    away_shots_on_target INTEGER,
    home_corners INTEGER,
    away_corners INTEGER,
    home_fouls INTEGER,
    away_fouls INTEGER,
    home_yellow INTEGER,
    away_yellow INTEGER,
    home_red INTEGER,
    away_red INTEGER,
    referee TEXT
);
