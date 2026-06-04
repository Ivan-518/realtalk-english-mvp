from typing import Annotated, List, Literal, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    speaker: str = Field(..., max_length=64)
    text: str = Field(..., max_length=1200)
    type: Literal["ai", "user"]


class ScenarioCard(BaseModel):
    title: str = Field(..., max_length=80)
    role: str = Field(..., max_length=80)
    opener: str = Field(..., max_length=220)
    goal: str = Field(..., max_length=300)
    constraints: List[str] = Field(..., min_length=2, max_length=4)
    followUps: List[str] = Field(default_factory=list, max_length=5)
    difficulty: Literal["beginner", "intermediate", "advanced", "review"] = "beginner"
    source: Literal["openai", "fallback"] = "openai"


class ChatRequest(BaseModel):
    sceneId: str
    sceneTitle: str = Field(..., max_length=80)
    role: str = Field(..., max_length=80)
    goal: str = Field(..., max_length=300)
    turn: Annotated[int, Field(ge=0, le=20)]
    maxTurns: Annotated[int, Field(ge=1, le=20)] = 5
    messages: List[ChatMessage] = Field(default_factory=list, max_length=20)
    userReply: str = Field(..., min_length=1, max_length=1200)
    scenario: Optional[ScenarioCard] = None


class CoachFeedback(BaseModel):
    score: Annotated[int, Field(ge=0, le=100)]
    level: str = Field(..., max_length=60)
    suggestion: str = Field(..., max_length=400)
    reason: str = Field(..., max_length=900)
    alternatives: List[str] = Field(..., min_length=2, max_length=3)
    nextReply: str = Field(..., max_length=500)
    errorTags: List[str] = Field(default_factory=list, max_length=4)
    reviewTip: str = Field(..., max_length=300)
    source: Literal["openai", "fallback"] = "openai"


class WeaknessProfile(BaseModel):
    topTags: List[str] = Field(default_factory=list, max_length=4)
    weakSentences: List[str] = Field(default_factory=list, max_length=3)
    suggestedPatterns: List[str] = Field(default_factory=list, max_length=3)
    recentReviewTips: List[str] = Field(default_factory=list, max_length=3)


class ScenarioRequest(BaseModel):
    sceneId: str
    sceneTitle: str = Field(..., max_length=80)
    role: str = Field(..., max_length=80)
    level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    recentScenarioTitles: List[str] = Field(default_factory=list, max_length=8)
    weaknessProfile: Optional[WeaknessProfile] = None
