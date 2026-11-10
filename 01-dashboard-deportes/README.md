# Football dashboard

A data project: it downloads real match data from a public football API, stores it in
PostgreSQL, cleans it with pandas and shows it in an interactive Streamlit dashboard.

The dashboard currently covers league tables, results by matchday and the points
evolution of any team. It reads only from the database, never from the API, so the
free-plan rate limits cannot break it.

## Architecture

```
football-data.org  ->  client  ->  transform (pandas)  ->  ingest  ->  PostgreSQL
                                                                           |
                                                         queries (SQL)  <--+
                                                                |
                                                         Streamlit app
```

| Module | Responsibility |
|---|---|
| `client.py` | HTTP client with request spacing and retries on HTTP 429 |
| `transform.py` | Pure function that cleans raw matches into `teams` and `matches` tables |
| `ingest.py` | Idempotent upsert into PostgreSQL (running it twice never duplicates rows) |
| `queries.py` | SQL for the league table, team form, results and available seasons |
| `app.py` | Streamlit dashboard |

The league table is computed from finished matches with SQL (win 3 points, draw 1),
so it is always consistent with the stored results.

## Run it locally

You need Python 3.12+, Docker and a free API key from
[football-data.org](https://www.football-data.org/client/register).

```bash
cd 01-dashboard-deportes
python -m venv .venv
.venv\Scripts\activate          # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env            # then put your key in FOOTBALL_API_KEY
docker compose up -d            # PostgreSQL on localhost:5433

python -m sports_dashboard.ingest --competition PD --season 2024
streamlit run app.py
```

PostgreSQL is published on host port **5433** so it does not clash with a local
PostgreSQL installation using the default 5432.

## Tests

```bash
pytest -q
```

The tests use a separate `sports_test` database from the same Docker container, a fake
API client and a simulated clock, so they never call the real API or wait for rate
limits. The CI workflow runs them on every push.

## Data source and limits

Match data comes from [football-data.org](https://www.football-data.org/), free tier.
It allows roughly 10 requests per minute and a limited set of competitions, and does
not include per-match statistics. Check their terms before reusing the data.

## Roadmap

- Match outcome prediction with scikit-learn, evaluated against a "home team wins" baseline.
- Basketball section using a second public API.
