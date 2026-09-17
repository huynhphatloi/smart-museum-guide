import base64
import threading
import time

from museum_ai.backend_client import Outbox
from museum_ai.schemas import JobRequest
from museum_ai.translation import MockTranslator
from museum_ai.tts import MockEngine, Narrator
from museum_ai.worker import LocalizationWorker


class FakeResponse:
    def __init__(self, status_code=200, body=None):
        self.status_code = status_code
        self._body = body or {"applied": True}
        self.text = ""

    def json(self):
        return self._body


class FakeClient:
    def __init__(self, status_code=200, body=None):
        self.events = []
        self.status_code = status_code
        self.body = body

    def send_event(self, event):
        self.events.append(event)
        return FakeResponse(self.status_code, self.body)


def make_worker(tmp_path, client, progress_answer=None, translator=None):
    translator = translator or MockTranslator()
    narrator = Narrator(
        primary=MockEngine(),
        fallback_model_id=None,
        fallback_loader=None,
        fallback_languages=(),
        translator=translator,
        voice_dir=tmp_path / "voices",
        max_chunk_chars=80,
    )
    outbox = Outbox(client)
    threading.Thread(target=outbox.run, daemon=True).start()
    progress = []

    def send_progress(event):
        progress.append(event)
        return progress_answer

    worker = LocalizationWorker(translator, narrator, outbox, send_progress, threading.Lock())
    worker.start()
    return worker, outbox, progress


def job(*tasks):
    return JobRequest.model_validate(
        {
            "exhibitId": "exhibit-1",
            "exhibitCode": "EX_DRUM",
            "source": {
                "languageCode": "vi",
                "title": "Trống đồng Đông Sơn",
                "shortDescription": "Hiện vật thời đại đồ đồng",
                "description": "Trống được đúc bằng đồng. Mặt trống có hình ngôi sao.",
            },
            "tasks": [
                {"taskId": task_id, "languageCode": language, "translate": language != "vi"}
                for task_id, language in tasks
            ],
        }
    )


def wait_for(predicate, timeout=10):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if predicate():
            return
        time.sleep(0.05)
    raise AssertionError("timed out")


def test_translates_narrates_and_reports_each_task(tmp_path):
    client = FakeClient()
    worker, _, progress = make_worker(tmp_path, client)

    assert worker.submit(job(("t-vi", "vi"), ("t-en", "en"))) == ["t-vi", "t-en"]
    wait_for(lambda: len(client.events) == 2 and not worker.active_task_ids())

    source, english = client.events
    assert source["event"] == "task.completed" and source["taskId"] == "t-vi"
    assert "translation" not in source
    assert source["models"] == {"translation": None, "tts": "mock-tts"}

    assert english["translation"]["title"] == "[en] Trống đồng Đông Sơn"
    assert english["translation"]["description"].startswith("[en] Trống được đúc")
    assert english["audio"]["mimeType"] in ("audio/mpeg", "audio/wav")
    assert len(base64.b64decode(english["audio"]["base64"])) > 1000

    assert [(event["taskId"], event["stage"]) for event in progress] == [
        ("t-vi", "synthesizing"),
        ("t-en", "translating"),
        ("t-en", "synthesizing"),
    ]
    # One reference voice per language, reused afterwards.
    assert sorted(path.name for path in (tmp_path / "voices").glob("*.wav")) == [
        "mock-tts-en.wav",
        "mock-tts-vi.wav",
    ]


def test_ignores_task_ids_it_already_holds(tmp_path):
    client = FakeClient()
    gate = threading.Event()

    class SlowTranslator(MockTranslator):
        def translate(self, text, source, target):
            gate.wait(5)
            return super().translate(text, source, target)

    worker, _, _ = make_worker(tmp_path, client, translator=SlowTranslator())
    assert worker.submit(job(("t-en", "en"))) == ["t-en"]
    assert worker.submit(job(("t-en", "en"), ("t-ja", "ja"))) == ["t-ja"]
    assert set(worker.active_task_ids()) == {"t-en", "t-ja"}
    gate.set()
    wait_for(lambda: len(client.events) == 2)


def test_reports_failures_without_stopping_the_queue(tmp_path):
    client = FakeClient()

    class BrokenForJapanese(MockTranslator):
        def translate(self, text, source, target):
            if target == "ja":
                raise RuntimeError("model exploded")
            return super().translate(text, source, target)

    worker, _, _ = make_worker(tmp_path, client, translator=BrokenForJapanese())
    worker.submit(job(("t-ja", "ja"), ("t-en", "en")))
    wait_for(lambda: len(client.events) == 2)

    failed, completed = client.events
    assert failed == {"event": "task.failed", "taskId": "t-ja", "error": "RuntimeError: model exploded"}
    assert completed["event"] == "task.completed"


def test_fails_fast_for_languages_the_models_do_not_cover(tmp_path):
    client = FakeClient()

    class NoKhmer(MockTranslator):
        languages = frozenset({"vi", "en"})

    worker, _, progress = make_worker(tmp_path, client, translator=NoKhmer())
    worker.submit(job(("t-km", "km")))
    wait_for(lambda: len(client.events) == 1)

    assert client.events[0]["event"] == "task.failed"
    assert "does not support 'km'" in client.events[0]["error"]
    assert progress == []


def test_skips_tasks_the_backend_superseded(tmp_path):
    client = FakeClient()
    worker, _, progress = make_worker(
        tmp_path, client, progress_answer={"applied": False, "reason": "task is SUPERSEDED"}
    )
    worker.submit(job(("t-en", "en")))
    wait_for(lambda: progress and not worker.active_task_ids())
    time.sleep(0.2)
    assert client.events == []


def test_turns_a_rejected_result_into_a_failure(tmp_path):
    class RejectingClient(FakeClient):
        def send_event(self, event):
            self.events.append(event)
            if event["event"] == "task.completed":
                return FakeResponse(
                    400, {"message": "Request validation failed.", "details": ["title too long"]}
                )
            return FakeResponse(200)

    client = RejectingClient()
    worker, _, _ = make_worker(tmp_path, client)
    worker.submit(job(("t-en", "en")))
    wait_for(lambda: len(client.events) == 2)
    assert client.events[1]["event"] == "task.failed"
    assert "title too long" in client.events[1]["error"]
