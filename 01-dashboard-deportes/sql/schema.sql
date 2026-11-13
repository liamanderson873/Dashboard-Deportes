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

CREATE TABLE IF NOT EXISTS squad_members (
    season INTEGER NOT NULL,
    team_id INTEGER NOT NULL REFERENCES teams (id),
    player_id INTEGER NOT NULL REFERENCES players (id),
    PRIMARY KEY (season, team_id, player_id)
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

-- BSD identifiers are a separate namespace; legacy provider rows are untouched.
CREATE TABLE IF NOT EXISTS bsd_seasons (
 competition TEXT NOT NULL, season INTEGER NOT NULL, league_id BIGINT NOT NULL,
 provider_season_id BIGINT NOT NULL, name TEXT NOT NULL,
 imported_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(competition,season)
);
CREATE TABLE IF NOT EXISTS bsd_teams (
 id BIGINT PRIMARY KEY, name TEXT NOT NULL, profile JSONB NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS bsd_players (
 id BIGINT PRIMARY KEY, name TEXT NOT NULL, position TEXT, date_of_birth DATE,
 nationality TEXT, profile JSONB NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS bsd_squads (
 competition TEXT NOT NULL, season INTEGER NOT NULL, team_id BIGINT NOT NULL,
 player_id BIGINT NOT NULL, PRIMARY KEY(competition,season,team_id,player_id)
);
CREATE TABLE IF NOT EXISTS bsd_matches (
 id BIGINT PRIMARY KEY, competition TEXT NOT NULL, season INTEGER NOT NULL,
 home_team_id BIGINT NOT NULL, away_team_id BIGINT NOT NULL, utc_date TIMESTAMPTZ NOT NULL,
 status TEXT NOT NULL, home_goals INTEGER, away_goals INTEGER, matchday INTEGER,
 lineups JSONB NOT NULL DEFAULT '{}', stats JSONB NOT NULL DEFAULT '{}',
 incidents JSONB NOT NULL DEFAULT '{}', imported_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_bsd_matches_season ON bsd_matches(competition,season);
CREATE TABLE IF NOT EXISTS bsd_player_matches (
 match_id BIGINT NOT NULL, player_id BIGINT NOT NULL, team_id BIGINT NOT NULL,
 minutes NUMERIC, metrics JSONB NOT NULL DEFAULT '{}', PRIMARY KEY(match_id,player_id)
);
CREATE INDEX IF NOT EXISTS ix_bsd_player_matches_player ON bsd_player_matches(player_id);
CREATE TABLE IF NOT EXISTS bsd_team_map (
 local_team_id INTEGER PRIMARY KEY, provider_team_id BIGINT UNIQUE NOT NULL
);
