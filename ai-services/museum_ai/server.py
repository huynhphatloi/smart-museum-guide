"""HTTP intake: the backend POSTs jobs here."""

from __future__ import annotations

import json
from typing import Callable, Dict

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from .schemas import JobRequest
from .signing import SIGNATURE_HEADER, verify
from .worker import LocalizationWorker


def create_app(secret: str, worker: LocalizationWorker, describe: Callable[[], Dict]) -> FastAPI:
    app = FastAPI(title="Smart Museum Guide AI service", docs_url=None, redoc_url=None)

    @app.get("/health")
    def health() -> Dict:
        return describe()

    @app.post("/v1/jobs")
    async def submit_job(request: Request) -> JSONResponse:
        body = await request.body()
        if not verify(secret, request.headers.get(SIGNATURE_HEADER), body):
            return JSONResponse({"message": "Invalid or missing signature."}, status_code=401)
        try:
            job = JobRequest.model_validate_json(body)
        except ValidationError as error:
            details = json.loads(error.json(include_url=False))
            return JSONResponse({"message": "Invalid job.", "details": details}, status_code=400)

        accepted = worker.submit(job)
        return JSONResponse({"accepted": accepted, "queueSize": worker.queue_size()}, status_code=202)

    return app
