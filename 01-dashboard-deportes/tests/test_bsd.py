import pytest
import requests
from sqlalchemy import text

from sports_dashboard.bsd import BsdClient, BsdError, import_details, select_season


class Response:
    def __init__(self, data=None, status=200, headers=None):
        self.data, self.status_code, self.headers = data, status, headers or {}

    def json(self):
        return self.data


class Session:
    def __init__(self, *results):
        self.results, self.calls = list(results), []

    def get(self, url, **kwargs):
        self.calls.append((url, kwargs))
        result = self.results.pop(0)
        if isinstance(result, Exception):
            raise result
        return result


def test_pages_follows_same_host_next_and_counts_budget():
    session = Session(Response({'count': 2, 'results': [{'id': 1}], 'next': '/api/v2/teams/?offset=1'}),
                      Response({'count': 2, 'results': [{'id': 2}], 'next': None}))
    client = BsdClient('not-a-real-key', session=session)
    assert list(client.pages('teams/')) == [{'id': 1}, {'id': 2}]
    assert client.used == 2
    assert session.calls[0][1]['allow_redirects'] is False


def test_external_next_never_receives_credentials():
    session = Session(Response({'results': [], 'next': 'https://evil.example/api/v2/teams/'}))
    client = BsdClient('test', session=session)
    with pytest.raises(BsdError, match='host/ruta'):
        list(client.pages('teams/'))
    assert len(session.calls) == 1


def test_truncated_pagination_is_not_accepted_as_complete():
    session = Session(Response({'count': 3, 'results': [{'id': 1}], 'next': None}))
    with pytest.raises(BsdError, match='incompleto'):
        list(BsdClient('test', session=session).pages('teams/'))


@pytest.mark.parametrize('status', [401, 403])
def test_authentication_fails_without_token_in_error(status):
    with pytest.raises(BsdError) as err:
        BsdClient('secret-must-not-leak', session=Session(Response({}, status))).get('leagues/')
    assert 'secret-must-not-leak' not in str(err.value)


def test_daily_quota_stops_without_sleeping_until_midnight():
    sleeps = []
    with pytest.raises(BsdError, match='429'):
        BsdClient('test', session=Session(Response({'code': 'taster_exhausted'}, 429, {'Retry-After': '50000'})), sleep=sleeps.append).get('leagues/')
    assert sleeps == []


def test_burst_limit_retries_and_timeout_is_bounded():
    sleeps = []
    c = BsdClient('test', session=Session(Response({}, 429, {'Retry-After': '1'}), Response({'ok': True})), sleep=sleeps.append)
    assert c.get('leagues/') == {'ok': True}
    assert sleeps == [1]
    session = Session(requests.Timeout(), requests.Timeout(), requests.Timeout())
    with pytest.raises(BsdError, match='tres intentos'):
        BsdClient('test', session=session, sleep=lambda _: None).get('leagues/')
    assert len(session.calls) == 3


def test_request_budget_applies_to_retries():
    c = BsdClient('test', budget=1, session=Session(Response({}, 500)), sleep=lambda _: None)
    with pytest.raises(BsdError, match='Presupuesto'):
        c.get('leagues/')
    assert c.used == 1


def test_season_mismatch_is_rejected_before_import():
    leagues = [{'id': 3, 'name': 'La Liga', 'country': 'Spain', 'is_women': False,
                'current_season': {'id': 1307, 'year': 2025}}]
    with pytest.raises(BsdError, match='no corresponde'):
        select_season(leagues, 'PD', 2026)


def test_detail_import_is_idempotent_and_keeps_nulls(seeded):
    event = {'id': 500, 'home_team_id': 44, 'away_team_id': 54}
    with seeded.begin() as conn:
        conn.execute(text("INSERT INTO bsd_matches(id,competition,season,home_team_id,away_team_id,utc_date,status) VALUES(500,'PD',2026,44,54,'2026-11-01','finished')"))

    class Client:
        def get(self, path):
            if 'player-stats' in path:
                return {'event_id': 500, 'player_stats': [{'player_id': 10, 'team_id': 44, 'event_id': 500, 'minutes_played': 90, 'goals': 1, 'expected_goals': None}]}
            if 'lineups' in path:
                return {'event_id': 500, 'lineups': {'home': {'players': [{'id': 10, 'name': 'Test Player', 'position': 'F'}], 'substitutes': []}}}
            return {'event_id': 500}

    for _ in range(2):
        import_details(seeded, Client(), event, 'PD', 2026)
    with seeded.connect() as conn:
        assert conn.execute(text('SELECT count(*) FROM bsd_player_matches')).scalar() == 1
        assert conn.execute(text("SELECT metrics->'expected_goals' FROM bsd_player_matches")).scalar() is None
        assert conn.execute(text('SELECT name FROM bsd_players WHERE id=10')).scalar() == 'Test Player'


def test_invalid_detail_rolls_back_previous_rows(seeded):
    event = {'id': 501, 'home_team_id': 44, 'away_team_id': 54}
    with seeded.begin() as conn:
        conn.execute(text("INSERT INTO bsd_matches(id,competition,season,home_team_id,away_team_id,utc_date,status) VALUES(501,'PD',2026,44,54,'2026-11-01','finished')"))
        conn.execute(text('INSERT INTO bsd_player_matches(match_id,player_id,team_id,minutes) VALUES(501,10,44,90)'))

    class Client:
        def get(self, path):
            return {'event_id': 501, 'player_stats': [{'player_id': 10, 'event_id': 501, 'team_id': 999, 'minutes_played': 90}]}

    with pytest.raises(BsdError, match='identidades'):
        import_details(seeded, Client(), event, 'PD', 2026)
    with seeded.connect() as conn:
        assert conn.execute(text('SELECT minutes FROM bsd_player_matches WHERE match_id=501')).scalar() == 90
