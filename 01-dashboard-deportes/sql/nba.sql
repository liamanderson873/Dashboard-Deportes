CREATE TABLE IF NOT EXISTS nba_teams (
  id bigint PRIMARY KEY, name text NOT NULL, abbreviation text NOT NULL, conference text NOT NULL
);
CREATE TABLE IF NOT EXISTS nba_games (
  season integer NOT NULL, id text NOT NULL, game_date date NOT NULL,
  home_id bigint NOT NULL, away_id bigint NOT NULL, home_pts integer, away_pts integer,
  status text NOT NULL, PRIMARY KEY(season,id)
);
CREATE INDEX IF NOT EXISTS nba_games_date_idx ON nba_games(season,game_date);
CREATE TABLE IF NOT EXISTS nba_team_games (
  season integer NOT NULL, game_id text NOT NULL, team_id bigint NOT NULL,
  game_date date NOT NULL, metrics jsonb NOT NULL, PRIMARY KEY(season,game_id,team_id)
);
CREATE TABLE IF NOT EXISTS nba_team_stats (
  season integer NOT NULL, team_id bigint NOT NULL, metrics jsonb NOT NULL, PRIMARY KEY(season,team_id)
);
CREATE TABLE IF NOT EXISTS nba_players (
  season integer NOT NULL, id bigint NOT NULL, name text NOT NULL, team_id bigint NOT NULL,
  position text, metrics jsonb NOT NULL, PRIMARY KEY(season,id)
);
CREATE TABLE IF NOT EXISTS nba_player_games (
  season integer NOT NULL, game_id text NOT NULL, player_id bigint NOT NULL, team_id bigint NOT NULL,
  game_date date NOT NULL, metrics jsonb NOT NULL, PRIMARY KEY(season,game_id,player_id,team_id)
);
CREATE TABLE IF NOT EXISTS nba_shots (
  season integer NOT NULL, id integer NOT NULL, game_id text NOT NULL, player_id bigint NOT NULL,
  team_id bigint NOT NULL, x double precision NOT NULL, y double precision NOT NULL,
  distance double precision NOT NULL, period integer NOT NULL, seconds double precision NOT NULL,
  value integer NOT NULL CHECK(value IN (2,3)), made integer NOT NULL CHECK(made IN (0,1)),
  probability double precision CHECK(probability BETWEEN 0 AND 1), PRIMARY KEY(season,id)
);
CREATE INDEX IF NOT EXISTS nba_shots_player_idx ON nba_shots(season,player_id);
CREATE TABLE IF NOT EXISTS nba_sources (
  season integer NOT NULL, dataset text NOT NULL, metadata jsonb NOT NULL, PRIMARY KEY(season,dataset)
);
CREATE TABLE IF NOT EXISTS nba_models (
  season integer NOT NULL, kind text NOT NULL, metadata jsonb NOT NULL, predictions jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(season,kind)
);

-- Append-only forecast ledger: deliberately not deleted during snapshot ingestion.
CREATE TABLE IF NOT EXISTS nba_prediction_history (
  season integer NOT NULL, game_id text NOT NULL, model_version text NOT NULL,
  forecast_day date NOT NULL, created_at timestamptz NOT NULL,
  data_cutoff date NOT NULL, home_win double precision NOT NULL CHECK(home_win BETWEEN 0 AND 1),
  explanation jsonb NOT NULL,
  PRIMARY KEY(season,game_id,model_version,forecast_day)
);
CREATE INDEX IF NOT EXISTS nba_prediction_history_date_idx ON nba_prediction_history(season,game_id,created_at);
