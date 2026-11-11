import pytest
import responses

from sports_dashboard.client import (
    ApiAccessError,
    ApiAuthError,
    ApiRateLimitError,
    FootballDataClient,
)

URL = "https://api.football-data.org/v4/competitions/PD/matches"


class FakeTime:
    def __init__(self):
        self.now = 0.0
        self.sleeps = []

    def clock(self):
        return self.now

    def sleep(self, seconds):
        self.sleeps.append(seconds)
        self.now += seconds


def make_client(fake, **kwargs):
    return FootballDataClient("k", sleep=fake.sleep, clock=fake.clock, **kwargs)


@responses.activate
def test_sends_auth_header_and_returns_matches_list():
    responses.add(responses.GET, URL, json={"matches": [{"id": 1}]})

    matches = make_client(FakeTime()).get_matches("PD", 2024)

    assert matches == [{"id": 1}]
    request = responses.calls[0].request
    assert request.headers["X-Auth-Token"] == "k"
    assert "season=2024" in request.url


@responses.activate
def test_401_raises_api_auth_error_mentioning_key():
    responses.add(responses.GET, URL, status=401, json={"message": "bad token"})

    with pytest.raises(ApiAuthError) as exc:
        make_client(FakeTime()).get_matches("PD", 2024)

    assert "FOOTBALL_API_KEY" in str(exc.value)


@responses.activate
def test_403_is_reported_as_restricted_resource_not_as_bad_key():
    responses.add(
        responses.GET,
        URL,
        status=403,
        json={"message": "The resource you are looking for is restricted."},
    )

    with pytest.raises(ApiAccessError) as exc:
        make_client(FakeTime()).get_matches("PD", 2018)

    message = str(exc.value)
    assert "restricted" in message
    assert "plan" in message
    assert "FOOTBALL_API_KEY" not in message


@responses.activate
def test_429_retries_then_succeeds():
    responses.add(responses.GET, URL, status=429)
    responses.add(responses.GET, URL, json={"matches": [{"id": 2}]})
    fake = FakeTime()

    matches = make_client(fake).get_matches("PD", 2024)

    assert matches == [{"id": 2}]
    assert len(responses.calls) == 2
    assert fake.sleeps, "must wait before retrying"


@responses.activate
def test_429_exhausted_raises_rate_limit_error():
    responses.add(responses.GET, URL, status=429)

    with pytest.raises(ApiRateLimitError):
        make_client(FakeTime(), max_retries=2).get_matches("PD", 2024)

    assert len(responses.calls) == 3


@responses.activate
def test_waits_min_interval_between_calls():
    responses.add(responses.GET, URL, json={"matches": []})
    fake = FakeTime()
    client = make_client(fake, min_interval=6.5)

    client.get_matches("PD", 2024)
    client.get_matches("PD", 2024)

    assert fake.sleeps == [6.5]


@responses.activate
def test_get_competitions_returns_competitions_list():
    responses.add(
        responses.GET,
        "https://api.football-data.org/v4/competitions",
        json={"competitions": [{"code": "PL"}]},
    )

    competitions = make_client(FakeTime()).get_competitions()

    assert competitions == [{"code": "PL"}]


@responses.activate
def test_get_teams_hits_teams_endpoint_with_season():
    responses.add(
        responses.GET,
        "https://api.football-data.org/v4/competitions/PL/teams",
        json={"teams": [{"id": 57}]},
    )

    teams = make_client(FakeTime()).get_teams("PL", 2026)

    assert teams == [{"id": 57}]
    url = responses.calls[0].request.url
    assert "/competitions/PL/teams" in url
    assert "season=2026" in url


@responses.activate
def test_get_scorers_sends_season_and_limit():
    responses.add(
        responses.GET,
        "https://api.football-data.org/v4/competitions/PL/scorers",
        json={"scorers": [{"goals": 20}]},
    )

    scorers = make_client(FakeTime()).get_scorers("PL", 2025, limit=50)

    assert scorers == [{"goals": 20}]
    url = responses.calls[0].request.url
    assert "season=2025" in url
    assert "limit=50" in url


@responses.activate
def test_403_on_teams_mentions_the_requested_resource():
    responses.add(
        responses.GET,
        "https://api.football-data.org/v4/competitions/PL/teams",
        status=403,
        json={"message": "The resource you are looking for is restricted."},
    )

    with pytest.raises(ApiAccessError) as exc:
        make_client(FakeTime()).get_teams("PL", 2026)

    message = str(exc.value)
    assert "PL season 2026" in message
    assert "FOOTBALL_API_KEY" not in message
