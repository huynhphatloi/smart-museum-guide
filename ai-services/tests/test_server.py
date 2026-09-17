import json

from fastapi.testclient import TestClient

from museum_ai.server import create_app
from museum_ai.signing import sign

SECRET = "test-secret-with-enough-length"


class FakeWorker:
    def __init__(self):
        self.jobs = []

    def submit(self, job):
        self.jobs.append(job)
        return [task.taskId for task in job.tasks]

    def queue_size(self):
        return len(self.jobs)


def payload():
    return json.dumps(
        {
            "exhibitId": "exhibit-1",
            "exhibitCode": "EX_DRUM",
            "source": {"languageCode": "vi", "title": "Trống đồng"},
            "tasks": [{"taskId": "t-en", "languageCode": "en", "translate": True}],
        }
    ).encode()


def test_accepts_signed_jobs():
    worker = FakeWorker()
    client = TestClient(create_app(SECRET, worker, lambda: {"ok": True}))
    body = payload()
    response = client.post(
        "/v1/jobs",
        content=body,
        headers={"X-Museum-Signature": sign(SECRET, body), "Content-Type": "application/json"},
    )
    assert response.status_code == 202
    assert response.json() == {"accepted": ["t-en"], "queueSize": 1}


def test_rejects_unsigned_or_invalid_jobs():
    worker = FakeWorker()
    client = TestClient(create_app(SECRET, worker, lambda: {"ok": True}))
    body = payload()
    assert client.post("/v1/jobs", content=body).status_code == 401

    bad = b'{"exhibitId": "x"}'
    response = client.post("/v1/jobs", content=bad, headers={"X-Museum-Signature": sign(SECRET, bad)})
    assert response.status_code == 400
    assert worker.jobs == []
