"""Signed calls to the backend API: heartbeats and result webhooks."""

from __future__ import annotations

import json
import logging
import threading
from collections import deque
from dataclasses import dataclass
from typing import Any, Callable, Deque, Dict, List, Optional

import httpx

from .signing import SIGNATURE_HEADER, sign

logger = logging.getLogger(__name__)

PING_PATH = "/ai-services/ping"
HEARTBEAT_PATH = "/ai-services/heartbeat"
WEBHOOK_PATH = "/ai-services/webhooks/localization"


class BackendClient:
    def __init__(self, api_url: str, secret: str, timeout: float = 60.0) -> None:
        self.api_url = api_url.rstrip("/")
        self.secret = secret
        self.http = httpx.Client(timeout=timeout)

    def post(self, path: str, payload: Dict[str, Any]) -> httpx.Response:
        # The signature covers these exact bytes, so serialise once and send them as-is.
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
        return self.http.post(
            f"{self.api_url}{path}",
            content=body,
            headers={"Content-Type": "application/json", SIGNATURE_HEADER: sign(self.secret, body)},
        )

    def ping(self) -> httpx.Response:
        return self.post(PING_PATH, {})

    def heartbeat(self, payload: Dict[str, Any]) -> httpx.Response:
        return self.post(HEARTBEAT_PATH, payload)

    def send_event(self, event: Dict[str, Any]) -> httpx.Response:
        return self.post(WEBHOOK_PATH, event)

    def close(self) -> None:
        self.http.close()


@dataclass
class _Pending:
    event: Dict[str, Any]
    attempts: int = 0


class Outbox:
    """Delivers final task results in order, retrying while the backend is unreachable.

    A result that the backend rejects (4xx) will never be accepted, so a rejected
    `task.completed` is replaced by `task.failed` carrying the reason - otherwise
    the backend would wait for the task forever and eventually re-dispatch it.
    """

    def __init__(self, client: BackendClient, max_backoff: float = 60.0) -> None:
        self.client = client
        self.max_backoff = max_backoff
        self._items: Deque[_Pending] = deque()
        self._condition = threading.Condition()
        self._stopped = False

    def put(self, event: Dict[str, Any]) -> None:
        with self._condition:
            self._items.append(_Pending(event))
            self._condition.notify()

    def task_ids(self) -> List[str]:
        with self._condition:
            return [item.event["taskId"] for item in self._items]

    def __len__(self) -> int:
        with self._condition:
            return len(self._items)

    def stop(self) -> None:
        with self._condition:
            self._stopped = True
            self._condition.notify_all()

    def run(self) -> None:
        while True:
            with self._condition:
                while not self._items and not self._stopped:
                    self._condition.wait()
                if self._stopped:
                    return
                item = self._items[0]

            outcome = self._deliver(item)
            with self._condition:
                if outcome == "retry":
                    delay = min(self.max_backoff, 2 ** min(item.attempts, 6))
                    self._condition.wait(timeout=delay)
                    continue
                if outcome == "replace":
                    continue
                self._items.popleft()

    def _deliver(self, item: _Pending) -> str:
        event = item.event
        item.attempts += 1
        try:
            response = self.client.send_event(event)
        except httpx.HTTPError as error:
            logger.warning("Webhook for %s failed (attempt %s): %s", event["taskId"], item.attempts, error)
            return "retry"

        if response.status_code < 300:
            logger.info("Reported %s for task %s", event["event"], event["taskId"])
            return "done"
        if response.status_code >= 500 or response.status_code in (408, 429):
            logger.warning("Backend answered %s for %s; retrying", response.status_code, event["taskId"])
            return "retry"

        reason = _error_message(response)
        logger.error("Backend rejected %s for %s: %s", event["event"], event["taskId"], reason)
        if event["event"] == "task.completed" and response.status_code != 404:
            item.event = failed_event(event["taskId"], f"The API rejected the result: {reason}")
            item.attempts = 0
            return "replace"
        return "done"


def failed_event(task_id: str, error: str) -> Dict[str, Any]:
    return {"event": "task.failed", "taskId": task_id, "error": error[:2000]}


def _error_message(response: httpx.Response) -> str:
    try:
        body = response.json()
        message = body.get("message")
        details = body.get("details")
        return f"{message} {details}" if details else str(message)
    except ValueError:
        return response.text[:300]


def heartbeat_loop(
    client: BackendClient,
    payload_factory: Callable[[], Dict[str, Any]],
    interval: float,
    stop: threading.Event,
) -> None:
    """Announces this service every `interval` seconds until `stop` is set."""
    was_ok: Optional[bool] = None
    while not stop.is_set():
        try:
            response = client.heartbeat(payload_factory())
            ok = response.status_code < 300
            if ok and was_ok is not True:
                logger.info("Connected to the backend at %s", client.api_url)
            if not ok:
                logger.warning("Heartbeat rejected (%s): %s", response.status_code, _error_message(response))
            was_ok = ok
        except httpx.HTTPError as error:
            if was_ok is not False:
                logger.warning("Backend unreachable at %s: %s", client.api_url, error)
            was_ok = False
        stop.wait(interval)
