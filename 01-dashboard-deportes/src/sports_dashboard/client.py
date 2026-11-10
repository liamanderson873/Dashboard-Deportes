import time

import requests

BASE_URL = "https://api.football-data.org/v4"
DEFAULT_BACKOFF_SECONDS = 10


class ApiAuthError(Exception):
    pass


class ApiAccessError(Exception):
    pass


class ApiRateLimitError(Exception):
    pass


def _api_message(response: requests.Response) -> str:
    try:
        return str(response.json().get("message", "")).strip()
    except ValueError:
        return ""


class FootballDataClient:
    def __init__(
        self,
        api_key: str,
        min_interval: float = 6.5,
        max_retries: int = 3,
        sleep=time.sleep,
        clock=time.monotonic,
    ):
        self._api_key = api_key
        self._min_interval = min_interval
        self._max_retries = max_retries
        self._sleep = sleep
        self._clock = clock
        self._last_request = None
        self._session = requests.Session()

    def _wait_turn(self) -> None:
        if self._last_request is not None:
            elapsed = self._clock() - self._last_request
            if elapsed < self._min_interval:
                self._sleep(self._min_interval - elapsed)
        self._last_request = self._clock()

    def get_matches(self, competition: str, season: int) -> list[dict]:
        url = f"{BASE_URL}/competitions/{competition}/matches"
        for attempt in range(self._max_retries + 1):
            self._wait_turn()
            response = self._session.get(
                url,
                headers={"X-Auth-Token": self._api_key},
                params={"season": season},
                timeout=30,
            )
            if response.status_code == 401:
                raise ApiAuthError(
                    "football-data.org rejected the API key. Check FOOTBALL_API_KEY in your .env file."
                )
            if response.status_code == 403:
                raise ApiAccessError(
                    f"football-data.org denied access to {competition} season {season}: "
                    f"{_api_message(response)} It may not be included in your plan."
                )
            if response.status_code == 429:
                if attempt == self._max_retries:
                    raise ApiRateLimitError(
                        f"Still rate limited after {self._max_retries} retries. Try again in a minute."
                    )
                wait = float(
                    response.headers.get("Retry-After", DEFAULT_BACKOFF_SECONDS * (attempt + 1))
                )
                self._sleep(wait)
                continue
            response.raise_for_status()
            return response.json()["matches"]
        raise AssertionError("unreachable")
