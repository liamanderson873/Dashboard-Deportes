# Marcador NBA Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Add current NBA team/player analysis, a temporally validated logistic game model and playoff simulator, and a gradient boosting shot model with verified individual variables.

**Architecture:** Namespaced nba_* tables in the existing PostgreSQL database, bounded cached Python ingestion, offline model training and persisted reports/predictions. Next.js reads the database only. Prefer NBA API; explicitly identify and validate public NBA Stats archives when direct access fails. Unknown values never become invented observations.

**Tech Stack:** Existing Python/pandas/SQLAlchemy/PostgreSQL, scikit-learn and pyarrow for optional model/data work; Next.js/React/TypeScript/Tailwind for the web.

---

## Task 1: Source audit and importer contracts
Files: `src/sports_dashboard/nba/source.py`, `tests/test_nba_source.py`, `docs/nba-integration.md`, `requirements.txt` (under `01-dashboard-deportes`).
1. Inspect a current and a historical source file for schedule, team logs, player stats and shots. Record source timestamps and actual coverage, including missing schedule slots.
2. Write tests for year naming (2027=2026-27), safe fixed hosts, timeouts, bounded downloads, cache invalidation and explicit failure. Reject malformed parquet rather than caching an error page.
3. Implement `load_frame(dataset: str, season: int, refresh: bool=False) -> DataFrame` with a fixed dataset registry and local cache outside Git. Preserve provenance and checksums.
4. Run `.venv/Scripts/python.exe -m pytest tests/test_nba_source.py -q`; expect passing coverage of success/failure cases with mocked network.

## Task 2: Database and normalized ingestion
Files: `sql/nba.sql`, `src/sports_dashboard/nba/ingest.py`, `tests/test_nba_ingest.py`.
1. Add namespaced teams, games, players, player-game stats, team-game stats, shots, coverage and model-output tables. Keep raw provider IDs as strings where leading zeros matter.
2. Test repeat ingestion, wrong-season rejection, missing/null metrics and transaction rollback against sports_test only.
3. Add CLI `python -m sports_dashboard.nba.ingest --season 2026 --history 10`; load metadata/current data first and cache history before training. No simultaneous football and NBA destructive tests.
4. Re-run counts to confirm no duplicates and no deletion of legacy football records.

## Task 3: Temporal team features
Files: `src/sports_dashboard/nba/features.py`, `tests/test_nba_features.py`.
1. Test that changing a future game's score never changes earlier features. Preserve two teams per game and exclude the target game from rolling stats.
2. Implement pregame strength differences, season/recent form, rest, back-to-back and home advantage. Label estimated possession ratings distinctly when exact NBA possession counts are unavailable.
3. Exclude incomplete targets and apply consistent warmup/minimum-sample rules; distinguish regular season/play-in/playoffs and the neutral-site bubble.
4. Run feature tests and independently inspect sample before/after snapshots.

## Task 4: Logistic probability model
Files: `src/sports_dashboard/nba/models.py`, `tests/test_nba_models.py`.
1. Use a training-only imputer/scaler and regularized logistic regression. Separate training, chronological validation and latest completed-season test; no shuffled game split.
2. Compare with home-rate and Elo baselines using log loss, Brier, AUC and calibration. Keep the held-out result even if weak; only tune on validation.
3. Persist model version, feature list, date cutoff, sample counts, source coverage and evaluation. Refit a production artifact only after freezing evaluation.
4. Test class/probability mapping, temporal split boundaries and bounded predictions.

## Task 5: Season and playoff simulation
Files: `src/sports_dashboard/nba/simulation.py`, `tests/test_nba_simulation.py`.
1. Test reproducibility, no duplicated fixtures, one champion per run, nesting of round probabilities and conference allocation.
2. Simulate real remaining fixtures, play-in and best-of-seven series with home advantage. Use actual dates where known and disclose assumptions for future rounds.
3. Validate tiebreakers and schedule completeness. Never invent unassigned NBA Cup games. Refuse an unconditional full-season forecast if required fixtures/teams are missing; clearly label a conditional playoff bracket scenario separately.
4. Run 10,000 simulations on CPU only after coverage checks and record Monte Carlo error separately from model uncertainty.

## Task 6: Shot model
Files: `src/sports_dashboard/nba/shots.py`, `tests/test_nba_shots.py`.
1. Test inclusion of both makes/misses, exact (game,event) uniqueness, finite coordinates, units and probability bounds.
2. Derive angle/distance, 2/3-point value, period and period-clock time. Do not fabricate defender/possession-clock values or use outcome-bearing event descriptions as features.
3. Fit logistic and zone baselines and a histogram gradient boosting classifier using chronological seasons and games kept together. Evaluate calibration/log loss/Brier by shot type, including explicit handling/reporting of heaves.
4. Persist held-out results and current shot probabilities/xPoints. Explain the distinction between location/context quality and player finishing ability.

## Task 7: NBA server queries and navigation
Files: `web/src/lib/queries/nba.ts`, `web/src/components/SportNav.tsx`, `web/src/components/NbaHeader.tsx`, `web/src/app/nba/[season]/.../page.tsx`.
1. Read installed Next routing docs before edits; await route params. Add specific `/nba/[season]` routes alongside existing competition routes, with `/nba` selecting latest available season.
2. Add Fútbol/NBA navigation and classification, games, players, team/player/game profiles and models routes. Current incomplete datasets render explanatory empty/coverage states.
3. Test query mapping, ID/season validation and absent NBA schema. All navigation reads PostgreSQL without provider calls.

## Task 8: NBA interactions and visual design
Files: `web/src/components/NbaWorkbench.tsx`, `web/src/lib/nba-personal.ts`, relevant tests.
1. Reuse Marcador's identity and responsive five-destination navigation; add NBA-specific metrics and comparison with name search.
2. Store NBA personal data under a separate versioned browser key. Add favourite teams/players and a valid five-position lineup without duplicate players.
3. Add accessible shot map/table and probability display, comparative bars, filters and model provenance. Never show a blank precision claim or fabricated prediction.
4. Browser-check 390/768/1440, keyboard search, persistence, future-first games and zero document horizontal overflow.

## Task 9: End-to-end delivery
Files: root README, project/web READMEs, `docs/nba-integration.md`, screenshots and CI optional model dependency installation.
1. Run source/feature/model tests and the complete Python suite sequentially before web DB tests; then lint, typecheck, Vitest and build.
2. Run real ingestion/training only on verified data and audit actual coverage/counts/metrics. Explicitly report anything unavailable; mock test data must never populate production.
3. Scan changed files for configured credentials; publish code, docs and small summary artifacts without raw external datasets/models.
4. Commit coherent milestones, push the feature work when validated and inspect GitHub Actions before reporting publication complete.

## Delivery record

Implemented and exercised on real archived 2026-27 data. The importer, temporal team and shot models, conditional simulator, NBA routes, profiles, comparison, shot charts, favourites and five-player lineup are present. Source/API limitations and approximate tiebreakers are explicit in `docs/nba-integration.md`. Local verification currently passes 127 Python and 174 web tests; final visual checks and publication are tracked in the delivery summary.
