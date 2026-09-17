"""The queue: one GPU worker thread processing tasks in arrival order."""

from __future__ import annotations

import base64
import logging
import queue
import threading
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional

from .audio import duration_seconds, encode
from .backend_client import Outbox, failed_event
from .schemas import JobRequest, TaskSpec
from .text import narration_text
from .translation import Translator, translate_copy
from .tts import Narrator

logger = logging.getLogger(__name__)

#: Sends a progress event; returns the backend's JSON answer, or None when unreachable.
ProgressSink = Callable[[Dict[str, Any]], Optional[Dict[str, Any]]]


class TaskCancelled(Exception):
    """The backend no longer wants this task (superseded, failed or deleted)."""


@dataclass
class _QueuedTask:
    job: JobRequest
    task: TaskSpec


class LocalizationWorker:
    """Translate -> narrate -> report, one task at a time.

    Progress events (`task.processing`) are best effort, and double as a
    cancellation check: when the backend answers that the task was superseded,
    the GPU work is skipped. Final events go through the outbox, which retries
    until the backend accepts them. Task ids stay "active" until their final
    event is delivered, so the backend does not re-dispatch work that is merely
    waiting for delivery.
    """

    def __init__(
        self,
        translator: Translator,
        narrator: Narrator,
        outbox: Outbox,
        send_progress: ProgressSink,
        gpu_lock: threading.Lock,
        mp3_bitrate: str = "64k",
    ) -> None:
        self.translator = translator
        self.narrator = narrator
        self.outbox = outbox
        self.send_progress = send_progress
        self.gpu_lock = gpu_lock
        self.mp3_bitrate = mp3_bitrate
        self._queue: "queue.Queue[Optional[_QueuedTask]]" = queue.Queue()
        self._active: Dict[str, str] = {}
        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None

    # ---- intake -------------------------------------------------------------

    def submit(self, job: JobRequest) -> List[str]:
        """Queues the job's tasks; ids already queued or awaiting delivery are ignored."""
        accepted: List[str] = []
        with self._lock:
            pending_delivery = set(self.outbox.task_ids())
            for task in job.tasks:
                if task.taskId in self._active or task.taskId in pending_delivery:
                    continue
                self._active[task.taskId] = "queued"
                self._queue.put(_QueuedTask(job, task))
                accepted.append(task.taskId)
        if accepted:
            languages = ", ".join(task.languageCode for task in job.tasks if task.taskId in accepted)
            logger.info("Queued %s [%s]", job.exhibitCode, languages)
        return accepted

    def active_task_ids(self) -> List[str]:
        with self._lock:
            active = list(self._active)
        return active + [task_id for task_id in self.outbox.task_ids() if task_id not in active]

    def queue_size(self) -> int:
        with self._lock:
            return len(self._active)

    # ---- processing ---------------------------------------------------------

    def start(self) -> None:
        self._thread = threading.Thread(target=self._run, name="localization-worker", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._queue.put(None)

    def _run(self) -> None:
        while True:
            item = self._queue.get()
            if item is None:
                return
            event: Optional[Dict[str, Any]]
            try:
                event = self.process(item.job, item.task)
            except TaskCancelled as reason:
                logger.info("Skipped %s/%s: %s", item.job.exhibitCode, item.task.languageCode, reason)
                event = None
            except Exception as error:  # noqa: BLE001 - never let one task kill the queue
                logger.exception("Task %s crashed", item.task.taskId)
                event = failed_event(item.task.taskId, f"{type(error).__name__}: {error}")
            # Under the lock, so submit() always sees the id in one of the two places.
            with self._lock:
                if event is not None:
                    self.outbox.put(event)
                self._active.pop(item.task.taskId, None)

    def process(self, job: JobRequest, task: TaskSpec) -> Dict[str, Any]:
        language = task.languageCode
        logger.info("Processing %s/%s", job.exhibitCode, language)
        self._check_supported(job, task)
        with self._lock:
            self._active[task.taskId] = "processing"

        with self.gpu_lock:
            if task.translate:
                self._progress(task, "translating")
                copy = translate_copy(self.translator, job.source, language)
            else:
                copy = {
                    "title": job.source.title,
                    "shortDescription": job.source.shortDescription,
                    "description": job.source.description,
                }

            self._progress(task, "synthesizing")
            script = narration_text(copy["title"], copy["shortDescription"], copy["description"])
            wav, sample_rate, tts_model = self.narrator.narrate(script, language)

        audio, mime_type = encode(wav, sample_rate, self.mp3_bitrate)
        logger.info(
            "Finished %s/%s: %.1fs of audio (%d KB)",
            job.exhibitCode,
            language,
            duration_seconds(wav, sample_rate),
            len(audio) // 1024,
        )
        event: Dict[str, Any] = {
            "event": "task.completed",
            "taskId": task.taskId,
            "audio": {
                "base64": base64.b64encode(audio).decode(),
                "mimeType": mime_type,
                "durationSeconds": duration_seconds(wav, sample_rate),
            },
            "models": {
                "translation": self.translator.model_id if task.translate else None,
                "tts": tts_model,
            },
        }
        if task.translate:
            event["translation"] = {key: value for key, value in copy.items() if value is not None}
        return event

    def _check_supported(self, job: JobRequest, task: TaskSpec) -> None:
        """Fails fast, before any GPU work, with a message staff can act on."""
        if task.translate:
            for code in (job.source.languageCode, task.languageCode):
                if code not in self.translator.languages:
                    raise ValueError(
                        f"The translation model {self.translator.model_id} does not support '{code}'."
                    )
        if not self.narrator.supports(task.languageCode):
            raise ValueError(f"No narration model on this AI service supports '{task.languageCode}'.")

    def _progress(self, task: TaskSpec, stage: str) -> None:
        try:
            answer = self.send_progress({"event": "task.processing", "taskId": task.taskId, "stage": stage})
        except TaskCancelled:
            raise
        except Exception as error:  # noqa: BLE001 - progress is informational only
            logger.warning("Could not report %s for %s: %s", stage, task.taskId, error)
            return
        if answer is not None and answer.get("applied") is False:
            raise TaskCancelled(answer.get("reason") or "no longer requested")
