"""Bounded, idempotent BSD v2 import. The web only reads the resulting local tables."""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import threading
import time
from urllib.parse import urljoin, urlsplit

from dotenv import dotenv_values
import requests
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from sports_dashboard.db import get_engine, init_schema

BASE = "https://sports.bzzoiro.com/api/v2/"
ROOT = Path(__file__).resolve().parents[2]
LEAGUES = {
    "PD": ("Spain", "La Liga"), "PL": ("England", "Premier League"),
    "SA": ("Italy", "Serie A"), "BL1": ("Germany", "Bundesliga"),
    "FL1": ("France", "Ligue 1"),
}


class BsdError(Exception):
    """A safe message which never contains the authentication token."""


class BsdAccessError(BsdError):
    """Credentials or request quota prevent continuing the batch."""


class BsdClient:
    def __init__(self, key: str, budget: int = 7000, session=None, sleep=time.sleep):
        if not key:
            raise BsdError("Falta BZZOIRO_API_KEY en el .env local.")
        if not 1 <= budget <= 7500:
            raise BsdError("El presupuesto debe estar entre 1 y 7500 peticiones.")
        self.key, self.budget, self.used = key, budget, 0
        self.session, self.sleep = session or requests.Session(), sleep
        self.lock = threading.Lock()

    def get(self, path: str, params=None):
        url = urljoin(BASE, path)
        parsed = urlsplit(url)
        if parsed.scheme != "https" or parsed.netloc != "sports.bzzoiro.com" or not parsed.path.startswith("/api/v2/"):
            raise BsdError("La paginación intenta abandonar el host/ruta autorizados.")
        for attempt in range(3):
            with self.lock:
                if self.used >= self.budget:
                    raise BsdAccessError("Presupuesto de peticiones agotado; vuelve a ejecutar para continuar.")
                self.used += 1
            try:
                response = self.session.get(url, params=params, headers={"Authorization": "Token " + self.key}, timeout=30, allow_redirects=False)
            except requests.RequestException:
                if attempt == 2:
                    raise BsdError("Bzzoiro no responde tras tres intentos.") from None
                self.sleep(2 ** attempt)
                continue
            if response.status_code in (401, 403):
                raise BsdAccessError("Bzzoiro rechaza las credenciales o el acceso (401/403).")
            if response.status_code == 429:
                try:
                    exhausted = response.json().get("code") == "taster_exhausted"
                except (ValueError, AttributeError):
                    exhausted = False
                try:
                    delay = float(response.headers.get("Retry-After", "1"))
                except ValueError:
                    delay = 1
                if exhausted or delay > 30 or attempt == 2:
                    raise BsdAccessError("Cuota/límite del proveedor alcanzado (429); importación parcial conservada.")
                self.sleep(max(1, delay))
                continue
            if response.status_code >= 500 and attempt < 2:
                self.sleep(2 ** attempt)
                continue
            if response.status_code != 200:
                raise BsdError(f"Respuesta HTTP {response.status_code} de {parsed.path}.")
            try:
                data = response.json()
            except ValueError:
                raise BsdError("Respuesta JSON no válida de Bzzoiro.") from None
            if not isinstance(data, dict):
                raise BsdError("Respuesta inesperada: se esperaba un objeto JSON.")
            return data
        raise BsdError("Reintentos agotados.")

    def pages(self, path: str, params=None):
        visited = set()
        total = 0
        expected = None
        for _ in range(100):
            marker = (path, json.dumps(params, sort_keys=True))
            if marker in visited:
                raise BsdError("Bucle en la paginación del proveedor.")
            visited.add(marker)
            data = self.get(path, params)
            rows = data.get("results")
            if not isinstance(rows, list) or any(not isinstance(r, dict) for r in rows):
                raise BsdError("Lista paginada sin results válido.")
            if expected is None and isinstance(data.get("count"), int):
                expected = data["count"]
            total += len(rows)
            yield from rows
            next_page = data.get("next")
            if not next_page:
                if expected is not None and total != expected:
                    raise BsdError("Listado incompleto o cambiado durante la paginación; vuelve a intentar.")
                return
            if not isinstance(next_page, str):
                raise BsdError("Enlace next no válido.")
            path, params = urljoin(BASE, next_page), None
        raise BsdError("Se alcanzó el máximo de 100 páginas.")


def valid_id(value):
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise BsdError("Identificador BSD no válido.")
    return value


def select_season(leagues, code, year):
    country, name = LEAGUES[code]
    candidates = [r for r in leagues if r.get("country") == country and r.get("name") == name and r.get("is_women") is False]
    if len(candidates) != 1:
        raise BsdError(f"No se puede identificar de forma inequívoca la liga {code}.")
    league = candidates[0]
    season = league.get("current_season") or {}
    if season.get("year") != year:
        raise BsdError(f"{code}: la temporada actual del proveedor no corresponde a {year}.")
    valid_id(league.get("id")); valid_id(season.get("id"))
    return league, season


def upsert_player(conn, profile, authoritative=True):
    pid = valid_id(profile.get("id"))
    name = profile.get("name") or None
    birth = profile.get("date_of_birth") or None
    if birth and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", birth):
        birth = None
    position = profile.get("position")
    if position not in ("G", "D", "M", "F"):
        position = None
    clean = {k: profile.get(k) for k in ("jersey_number", "short_name") if profile.get(k) is not None}
    conn.execute(text("""INSERT INTO bsd_players(id,name,position,date_of_birth,nationality,profile)
        VALUES(:id,COALESCE(:name,:fallback),:position,:birth,:nationality,CAST(:profile AS jsonb))
        ON CONFLICT(id) DO UPDATE SET name=COALESCE(:name,bsd_players.name),
        position=CASE WHEN :authoritative THEN COALESCE(EXCLUDED.position,bsd_players.position)
          ELSE COALESCE(bsd_players.position,EXCLUDED.position) END,
        date_of_birth=COALESCE(EXCLUDED.date_of_birth,bsd_players.date_of_birth),
        nationality=COALESCE(EXCLUDED.nationality,bsd_players.nationality),profile=bsd_players.profile||EXCLUDED.profile"""),
        {"id": pid, "name": name, "fallback": f"Jugador #{pid}", "position": position, "birth": birth,
         "nationality": profile.get("nationality"), "profile": json.dumps(clean), "authoritative": authoritative})


def import_details(engine, client, event, code, year):
    eid = valid_id(event["id"])
    blocks = {name: client.get(f"events/{eid}/{path}/") for name, path in
              (("lineups", "lineups"), ("stats", "stats"), ("incidents", "incidents"), ("players", "player-stats"))}
    for block in blocks.values():
        if block.get("event_id") != eid:
            raise BsdError(f"Contrato inesperado en el partido {eid}: event_id no coincide.")
    stats = blocks["players"].get("player_stats")
    if not isinstance(stats, list) or any(not isinstance(r, dict) for r in stats):
        raise BsdError(f"Partido {eid}: falta player_stats.")
    if not stats:
        # Useful match-level data is still visible; old player rows are preserved.
        # The absence of player rows keeps this fixture eligible for a retry.
        with engine.begin() as conn:
            conn.execute(text("""UPDATE bsd_matches SET lineups=CAST(:lineups AS jsonb),stats=CAST(:stats AS jsonb),
              incidents=CAST(:incidents AS jsonb),imported_at=now() WHERE id=:id"""),
              {"id": eid, **{k: json.dumps(blocks[k], allow_nan=False) for k in ("lineups", "stats", "incidents")}})
        raise BsdError(f"Partido {eid}: estadísticas individuales vacías; detalle parcial conservado y pendiente de reintento.")
    seen = set()
    for row in stats:
        pid = valid_id(row.get("player_id"))
        if pid in seen or row.get("team_id") not in (event["home_team_id"], event["away_team_id"]) or row.get("event_id") != eid:
            raise BsdError(f"Partido {eid}: estadísticas duplicadas o identidades incompatibles.")
        seen.add(pid)
    profiles = {row["player_id"]: {"id": row["player_id"]} for row in stats}
    for side in (blocks["lineups"].get("lineups") or {}).values():
        if not isinstance(side, dict):
            continue
        for player in (side.get("players") or []) + (side.get("substitutes") or []):
            # A real provider response includes a named substitute with id=null.
            # Keep it in the raw lineup, without inventing an identity/profile.
            if isinstance(player.get("id"), int) and not isinstance(player["id"], bool) and player["id"] > 0:
                profiles[player["id"]] = player
    with engine.begin() as conn:
        # Stable lock order avoids deadlocks when the same squad plays twice.
        for pid in sorted(profiles):
            upsert_player(conn, profiles[pid], authoritative=False)
        conn.execute(text("DELETE FROM bsd_player_matches WHERE match_id=:id"), {"id": eid})
        for row in stats:
            minutes = row.get("minutes_played")
            if minutes is not None and (isinstance(minutes, bool) or not isinstance(minutes, (int, float)) or minutes < 0):
                raise BsdError("Minutos no válidos.")
            conn.execute(text("""INSERT INTO bsd_player_matches(match_id,player_id,team_id,minutes,metrics)
                VALUES(:match,:player,:team,:minutes,CAST(:metrics AS jsonb))"""),
                {"match": eid, "player": row["player_id"], "team": row["team_id"], "minutes": minutes, "metrics": json.dumps(row, allow_nan=False)})
        conn.execute(text("""UPDATE bsd_matches SET lineups=CAST(:lineups AS jsonb),stats=CAST(:stats AS jsonb),
            incidents=CAST(:incidents AS jsonb),imported_at=now() WHERE id=:id"""),
            {"id": eid, **{k: json.dumps(blocks[k], allow_nan=False) for k in ("lineups", "stats", "incidents")}})
    return eid


def import_competition(engine, client, leagues, code, year, limit=None, refresh=False, workers=4):
    league, season = select_season(leagues, code, year)
    lid, sid = league["id"], season["id"]
    teams = list(client.pages("teams/", {"league_id": lid, "season_id": sid, "limit": 200}))
    events = list(client.pages("events/", {"league_id": lid, "season_id": sid, "limit": 200}))
    for event in events:
        if event.get("league_id") != lid or event.get("season_id") != sid:
            raise BsdError("El listado de partidos mezcla competiciones o temporadas.")
        valid_id(event.get("id"))
    replaced = [r["id"] for r in events if r.get("replaced_by")]
    events = [r for r in events if not r.get("replaced_by")]
    with engine.begin() as conn:
        conn.execute(text("""INSERT INTO bsd_seasons VALUES(:code,:year,:league,:season,:name,now())
          ON CONFLICT(competition,season) DO UPDATE SET league_id=EXCLUDED.league_id,
          provider_season_id=EXCLUDED.provider_season_id,name=EXCLUDED.name,imported_at=now()"""),
          {"code": code, "year": year, "league": lid, "season": sid, "name": season.get("name", str(year))})
        for team in teams:
            conn.execute(text("""INSERT INTO bsd_teams(id,name) VALUES(:id,:name)
              ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name"""), {"id": valid_id(team.get("id")), "name": team["name"]})
        for event in events:
            for side in ("home", "away"):
                conn.execute(text("""INSERT INTO bsd_teams(id,name) VALUES(:id,:name) ON CONFLICT(id) DO NOTHING"""),
                             {"id": valid_id(event[f"{side}_team_id"]), "name": event[f"{side}_team"]})
            conn.execute(text("""INSERT INTO bsd_matches(id,competition,season,home_team_id,away_team_id,utc_date,status,home_goals,away_goals,matchday)
              VALUES(:id,:code,:year,:home_team_id,:away_team_id,:event_date,:status,:home_score,:away_score,:round_number)
              ON CONFLICT(id) DO UPDATE SET utc_date=EXCLUDED.utc_date,status=EXCLUDED.status,
              home_team_id=EXCLUDED.home_team_id,away_team_id=EXCLUDED.away_team_id,
              home_goals=EXCLUDED.home_goals,away_goals=EXCLUDED.away_goals,matchday=EXCLUDED.matchday"""), {**event, "code": code, "year": year})
        # Only invalidate explicitly replaced fixtures, never a list complement.
        if replaced:
            conn.execute(text("DELETE FROM bsd_player_matches WHERE match_id=ANY(:ids)"), {"ids": replaced})
            conn.execute(text("UPDATE bsd_matches SET status='replaced',home_goals=NULL,away_goals=NULL WHERE id=ANY(:ids)"), {"ids": replaced})
    for team in teams:
        squad = client.get(f"teams/{team['id']}/squad/")
        if squad.get("team_id") != team["id"] or not isinstance(squad.get("players"), list):
            raise BsdError("Plantilla con contrato o identidad inesperados.")
        if not squad["players"]:
            print(f"Aviso {code}: plantilla BSD {team['id']} vacía; se conserva la importación anterior.", flush=True)
            continue
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM bsd_squads WHERE competition=:code AND season=:year AND team_id=:team"), {"code": code, "year": year, "team": team["id"]})
            for player in squad["players"]:
                upsert_player(conn, player)
                conn.execute(text("INSERT INTO bsd_squads VALUES(:code,:year,:team,:player) ON CONFLICT DO NOTHING"), {"code": code, "year": year, "team": team["id"], "player": player["id"]})
    with engine.connect() as conn:
        done = set(conn.execute(text("""SELECT id FROM bsd_matches m WHERE competition=:code AND season=:year
          AND imported_at >= utc_date + interval '48 hours'
          AND EXISTS(SELECT 1 FROM bsd_player_matches pm WHERE pm.match_id=m.id)"""), {"code": code, "year": year}).scalars())
    now = datetime.now(timezone.utc)
    pending = [e for e in events if e["status"] == "finished" and datetime.fromisoformat(e["event_date"].replace("Z", "+00:00")) <= now and (refresh or e["id"] not in done)]
    pending.sort(key=lambda e: e["event_date"], reverse=True)
    if limit is not None:
        pending = pending[:limit]
    print(f"{code} {year}: {len(teams)} equipos, {len(events)} partidos, {len(pending)} detalles pendientes.", flush=True)
    complete, failures = 0, []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(import_details, engine, client, event, code, year): event["id"] for event in pending}
        try:
            for future in as_completed(futures):
                try:
                    future.result()
                except BsdAccessError:
                    raise
                except Exception as exc:
                    # Report a safe error kind, never a DB URL or token-bearing request.
                    message = str(exc) if isinstance(exc, BsdError) else type(exc).__name__
                    failures.append(futures[future])
                    print(f"Aviso {code}: partido {futures[future]} pendiente: {message}", flush=True)
                    continue
                complete += 1
                if complete % 10 == 0 or complete == len(pending):
                    print(f"{code}: {complete}/{len(pending)} detalles; {client.used} peticiones en esta ejecución.", flush=True)
        except Exception:
            for future in futures:
                future.cancel()
            raise
    return complete, failures


def map_team(engine, raw):
    try:
        local, provider = (int(v) for v in raw.split(":"))
    except ValueError:
        raise BsdError("Mapeo esperado LOCAL:BSD.") from None
    with engine.begin() as conn:
        a = conn.execute(text("SELECT name FROM teams WHERE id=:id"), {"id": local}).scalar()
        b = conn.execute(text("SELECT name FROM bsd_teams WHERE id=:id"), {"id": provider}).scalar()
        if not a or not b:
            raise BsdError("Ambos equipos deben existir antes de mapearlos.")
        conn.execute(text("INSERT INTO bsd_team_map VALUES(:local,:provider) ON CONFLICT(local_team_id) DO UPDATE SET provider_team_id=EXCLUDED.provider_team_id"), {"local": local, "provider": provider})
    print(f"Mapeo explícito: {local} {a} → BSD {provider} {b}", flush=True)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--competitions", nargs="+", choices=LEAGUES, default=["PD"])
    parser.add_argument("--season", type=int, default=2026)
    parser.add_argument("--discover", action="store_true")
    parser.add_argument("--schema-only", action="store_true")
    parser.add_argument("--limit-matches", type=int)
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--workers", type=int, choices=range(1, 7), default=4)
    parser.add_argument("--budget", type=int, default=7000)
    parser.add_argument("--map-team", action="append", default=[])
    parser.add_argument("--mapping-file", type=Path, help="JSON revisado: competición -> id local -> id BSD")
    args = parser.parse_args(argv)
    if args.limit_matches is not None and args.limit_matches < 0:
        parser.error("--limit-matches no puede ser negativo")
    import os
    values = {**dotenv_values(ROOT / ".env"), **os.environ}
    try:
        if args.discover:
            client = BsdClient(values.get("BZZOIRO_API_KEY", ""), args.budget)
            for league in client.pages("leagues/", {"limit": 200}):
                if any(league.get("country") == c and league.get("name") == n for c, n in LEAGUES.values()):
                    s = league.get("current_season") or {}
                    print(league["id"], league["name"], s.get("year"), s.get("id"))
            return
        if not values.get("DATABASE_URL"):
            raise BsdError("Falta DATABASE_URL.")
        engine = get_engine(values["DATABASE_URL"])
        try:
            init_schema(engine)
            for mapping in args.map_team:
                map_team(engine, mapping)
            if args.mapping_file:
                mappings = json.loads(args.mapping_file.read_text(encoding="utf-8"))
                if not isinstance(mappings, dict) or any(code not in LEAGUES or not isinstance(rows, dict) for code, rows in mappings.items()):
                    raise BsdError("Formato de archivo de mapeos no válido.")
                for rows in mappings.values():
                    for local, provider in rows.items():
                        map_team(engine, f"{local}:{provider}")
            if args.schema_only or args.map_team or args.mapping_file:
                return
            client = BsdClient(values.get("BZZOIRO_API_KEY", ""), args.budget)
            leagues = list(client.pages("leagues/", {"limit": 200}))
            failures = []
            for code in args.competitions:
                _, failed = import_competition(engine, client, leagues, code, args.season, args.limit_matches, args.refresh, args.workers)
                failures.extend(failed)
            if failures:
                parser.exit(2, f"Importación parcial: {len(failures)} partidos pendientes; vuelve a ejecutar para reintentarlos.\n")
        finally:
            engine.dispose()
    except (BsdError, requests.RequestException) as exc:
        parser.exit(1, f"Importación detenida: {exc}\n")
    except SQLAlchemyError as exc:
        parser.exit(1, f"Error de base de datos ({type(exc).__name__}); se conserva lo ya importado.\n")


if __name__ == "__main__":
    main()
