# Football dashboard

A data project: it downloads real match data from a public football API, enriches it
with match statistics from a second source, stores everything in PostgreSQL, cleans it
with pandas and shows it in an interactive Streamlit dashboard.

The dashboard currently covers league tables, results by matchday and the points
evolution of any team. It reads only from the database, never from the API, so the
free-plan rate limits cannot break it.

The database holds more than the dashboard shows today:

- Several leagues: LaLiga (PD), Premier League (PL), Serie A (SA), Bundesliga (BL1)
  and Ligue 1 (FL1).
- Matches with half-time goals.
- Team profiles and squads per season (`squad_members`).
- Top scorers per season.
- Match statistics: xG, shots, corners, fouls and cards.

## Architecture

```
football-data.org  ->  client  ->  transform (pandas)  ->  ingest  ->  PostgreSQL
                                                                           ^   |
football-data.co.uk (CSV files)  ->  stats_import  ---------------------+   |
                                                         queries (SQL)  <----+
                                                                |
                                                         Streamlit app
```

| Module | Responsibility |
|---|---|
| `client.py` | HTTP client with request spacing and retries on HTTP 429 |
| `transform.py` | Pure functions that clean raw API data into tables |
| `ingest.py` | Idempotent upsert of matches, teams, squads and scorers into PostgreSQL (running it twice never duplicates rows) |
| `stats_import.py` | Imports match statistics from football-data.co.uk CSV files |
| `queries.py` | SQL for the league table, team form, results and available seasons |
| `app.py` | Streamlit dashboard |

The league table is computed from finished matches with SQL (win 3 points, draw 1).
Ties are broken by goal difference and then goals scored, not by official head-to-head
rules, so teams level on points can appear in a different order than in an official table.

## Run it locally

You need Python 3.12+, Docker and a free API key from
[football-data.org](https://www.football-data.org/client/register).

```bash
cd 01-dashboard-deportes
python -m venv .venv
.venv\Scripts\activate          # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
pip install -e .                # makes `sports_dashboard` importable

cp .env.example .env            # then put your key in FOOTBALL_API_KEY
docker compose up -d            # PostgreSQL on localhost:5433

python -m sports_dashboard.ingest --competitions PD --seasons 2024
streamlit run app.py
```

PostgreSQL is published on host port **5433** so it does not clash with a local
PostgreSQL installation using the default 5432.

## Loading data

### Matches, teams, squads and scorers (football-data.org)

```bash
# several leagues and seasons in one call
python -m sports_dashboard.ingest --competitions PD,PL,SA,BL1,FL1 --seasons 2024,2025,2026

# only some of the steps
python -m sports_dashboard.ingest --competitions PD --seasons 2024 --what matches,scorers
```

| Flag | Meaning |
|---|---|
| `--competitions` | Comma-separated competition codes. Default `PD`. The free plan covers `PD`, `PL`, `SA`, `BL1` and `FL1`. |
| `--seasons` | Comma-separated season start years, for example `2024,2025`. Required. |
| `--what` | Comma-separated steps: `matches`, `teams`, `scorers`. Default: all three. |

### Match statistics (football-data.co.uk)

football-data.org does not provide per-match statistics, so xG, shots, corners, fouls and
cards come from the CSV files published by [football-data.co.uk](https://www.football-data.co.uk/).
Each user downloads them by hand. The files are never committed to this repository
(`data/external/` is ignored by git).

1. Download one file per division and season from
   `https://www.football-data.co.uk/mmz4281/<yyzz>/<DIV>.csv`, for example
   `https://www.football-data.co.uk/mmz4281/2627/SP1.csv`. `<yyzz>` is the season written
   as two-digit start and end years (`2627` is 2026-27).
2. Save each file as `data/external/football-data-co-uk/<yyzz>/<DIV>.csv`.
3. Run the import:

```bash
python -m sports_dashboard.stats_import
```

Divisions map to competitions as `SP1` -> `PD`, `E0` -> `PL`, `I1` -> `SA`,
`D1` -> `BL1` and `F1` -> `FL1`. Options: `--folder` (default
`data/external/football-data-co-uk`) and `--aliases` (default `data/team_aliases.csv`).

Run the football-data.org ingest first: the import matches CSV rows to the matches
already in the database.

**Team name aliases.** The two sources spell some team names differently. The import
lists every team name it does not recognise and imports nothing until
`data/team_aliases.csv` covers them. The file has two columns, `alias,team_id`: `alias`
is the name as written in the CSV (case, accents and punctuation are ignored) and `team_id` is the id of that team in the
`teams` table. Add one line per unrecognised name and run the import again.

```
alias,team_id
Ath Madrid,78
```

**Terms of use.** football-data.co.uk states that its data is for private individuals,
not for commercial use or AI training. Read their terms before reusing the files.

## Tests

```bash
pytest -q
```

The tests use a separate `sports_test` database from the same Docker container, a fake
API client and a simulated clock, so they never call the real API or wait for rate
limits. The CI workflow runs them on every push.

## Data sources and limits

- [football-data.org](https://www.football-data.org/), free tier: matches, teams, squads
  and scorers. Check their terms before reusing the data.
- [football-data.co.uk](https://www.football-data.co.uk/): match statistics, loaded from
  CSV files you download yourself (see above).

The free plan of football-data.org allows about 10 requests per minute, so loading
5 leagues x 3 seasons takes about 5 minutes. A competition that is not part of your plan
is reported as a failure and skipped, and the rest of the run continues.

## Data caveats

- Squads are per season and live in `squad_members(season, team_id, player_id)`. Loading
  a season again replaces that team's squad for that season.
- `players` has one row per person. Its `team_id` is the team of the latest season loaded,
  so load the seasons in one call (for example `--seasons 2024,2025,2026`): the oldest is
  processed first and the latest wins.
- The coach in `teams.coach` is the current coach, whatever season was loaded.
- The scorers list has no `position` field, so player positions come from the squads.

## Roadmap

- Match outcome prediction with scikit-learn, evaluated against a "home team wins" baseline.
- Basketball section using a second public API.
