from typing import Any, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.config import get_openai_api_key, health_payload
from server.fallback import build_fallback_feedback
from server.models import ChatRequest, CoachFeedback, ScenarioCard, ScenarioRequest
from server.openai_client import (
    call_openai,
    call_openai_scenario,
    format_openai_error,
    normalize_model_feedback_data,
    normalize_scenario_data,
)
from server.scenes import build_fallback_scenario
from server.static_routes import router as static_router


app = FastAPI(title="RealTalk English API", version="0.3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(static_router)


@app.get("/api/health")
async def health() -> Dict[str, Any]:
    return health_payload()


@app.post("/api/chat", response_model=CoachFeedback)
async def chat(request: ChatRequest) -> CoachFeedback:
    api_key = get_openai_api_key()

    if not api_key:
        return build_fallback_feedback(
            request,
            "未配置 OPENAI_API_KEY，或当前后端进程没有读取到 .env。请确认 .env 位于项目根目录，并重启 uvicorn。",
        )

    try:
        data = await call_openai(request, api_key)
        feedback = CoachFeedback.model_validate(normalize_model_feedback_data(data))
        return feedback.model_copy(update={"source": "openai"})
    except Exception as exc:
        return build_fallback_feedback(request, format_openai_error(exc))


@app.post("/api/scenario", response_model=ScenarioCard)
async def scenario(request: ScenarioRequest) -> ScenarioCard:
    api_key = get_openai_api_key()

    if not api_key:
        return build_fallback_scenario(request)

    try:
        data = await call_openai_scenario(request, api_key)
        scenario_card = ScenarioCard.model_validate(normalize_scenario_data(data, request))
        return scenario_card.model_copy(update={"source": "openai"})
    except Exception:
        return build_fallback_scenario(request)
