"""Job payload sent by the backend (see AiJobRequest in backend/api/src/localization/ai-service.client.ts)."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class SourceCopy(BaseModel):
    languageCode: str
    title: str
    shortDescription: Optional[str] = None
    description: Optional[str] = None


class TaskSpec(BaseModel):
    taskId: str
    languageCode: str
    #: False for the primary language: narrate the source copy as it is.
    translate: bool


class JobRequest(BaseModel):
    exhibitId: str
    exhibitCode: str
    source: SourceCopy
    tasks: List[TaskSpec] = Field(min_length=1)
