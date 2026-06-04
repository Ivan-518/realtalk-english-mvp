import json
from typing import Any, Dict

import httpx

from server.config import OPENAI_BASE_URL, OPENAI_MODEL
from server.fallback import build_review_tip, infer_error_tags, normalize_error_tags
from server.models import ChatRequest, ScenarioRequest
from server.prompts import (
    build_scenario_payload_text,
    build_scenario_system_prompt,
    build_system_prompt,
    build_user_payload_text,
    plain_json_contract,
    scenario_json_contract,
)


async def call_openai(request: ChatRequest, api_key: str) -> Dict[str, Any]:
    responses_error = None
    structured_chat_error = None

    try:
        return await call_responses_api(request, api_key)
    except Exception as exc:
        responses_error = exc

    try:
        return await call_chat_completions_api(request, api_key)
    except Exception as exc:
        structured_chat_error = exc

    try:
        return await call_plain_chat_completions_api(request, api_key)
    except Exception as plain_chat_error:
        raise ValueError(
            "Responses API 未返回文本，Chat Completions 结构化请求失败，普通 JSON 请求也失败。"
            f"Responses: {format_openai_error(responses_error)}; "
            f"Structured chat: {format_openai_error(structured_chat_error)}; "
            f"Plain chat: {format_openai_error(plain_chat_error)}"
        ) from plain_chat_error


async def call_openai_scenario(request: ScenarioRequest, api_key: str) -> Dict[str, Any]:
    payload = {
        "model": OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": f"{build_scenario_system_prompt()} {scenario_json_contract()}"},
            {"role": "user", "content": build_scenario_payload_text(request)},
        ],
    }
    data = await post_openai(f"{OPENAI_BASE_URL}/chat/completions", api_key, payload)
    embedded = find_scenario_object(data)
    if embedded:
        return embedded
    return parse_json_text(extract_response_text(data))


async def call_responses_api(request: ChatRequest, api_key: str) -> Dict[str, Any]:
    payload = {
        "model": OPENAI_MODEL,
        "input": [
            {
                "role": "system",
                "content": [{"type": "input_text", "text": build_system_prompt()}],
            },
            {
                "role": "user",
                "content": [{"type": "input_text", "text": build_user_payload_text(request)}],
            },
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "english_coach_feedback",
                "strict": True,
                "schema": feedback_schema(),
            }
        },
    }
    data = await post_openai(f"{OPENAI_BASE_URL}/responses", api_key, payload)
    return extract_feedback_data(data)


async def call_chat_completions_api(request: ChatRequest, api_key: str) -> Dict[str, Any]:
    payload = {
        "model": OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": build_system_prompt()},
            {"role": "user", "content": build_user_payload_text(request)},
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "english_coach_feedback",
                "strict": True,
                "schema": feedback_schema(),
            },
        },
    }
    data = await post_openai(f"{OPENAI_BASE_URL}/chat/completions", api_key, payload)
    embedded = find_feedback_object(data)
    if embedded:
        return embedded
    return parse_json_text(extract_response_text(data))


async def call_plain_chat_completions_api(request: ChatRequest, api_key: str) -> Dict[str, Any]:
    payload = {
        "model": OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": f"{build_system_prompt()} {plain_json_contract()}"},
            {"role": "user", "content": build_user_payload_text(request)},
        ],
    }
    data = await post_openai(f"{OPENAI_BASE_URL}/chat/completions", api_key, payload)
    embedded = find_feedback_object(data)
    if embedded:
        return embedded
    return parse_json_text(extract_response_text(data))


async def post_openai(url: str, api_key: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()


def feedback_schema() -> Dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "score",
            "level",
            "suggestion",
            "reason",
            "alternatives",
            "nextReply",
            "errorTags",
            "reviewTip",
            "source",
        ],
        "properties": {
            "score": {"type": "integer", "minimum": 0, "maximum": 100},
            "level": {"type": "string"},
            "suggestion": {"type": "string"},
            "reason": {"type": "string"},
            "alternatives": {
                "type": "array",
                "minItems": 2,
                "maxItems": 3,
                "items": {"type": "string"},
            },
            "nextReply": {"type": "string"},
            "errorTags": {
                "type": "array",
                "minItems": 1,
                "maxItems": 4,
                "items": {
                    "type": "string",
                    "enum": [
                        "grammar",
                        "politeness",
                        "word_choice",
                        "fluency",
                        "missing_detail",
                        "workplace_tone",
                        "pronunciation_prompt",
                    ],
                },
            },
            "reviewTip": {"type": "string"},
            "source": {"type": "string", "enum": ["openai", "fallback"]},
        },
    }


def extract_feedback_data(data: Dict[str, Any]) -> Dict[str, Any]:
    embedded = find_feedback_object(data)
    if embedded:
        return embedded

    return parse_json_text(extract_response_text(data))


def extract_response_text(data: Dict[str, Any]) -> str:
    if isinstance(data.get("output_text"), str):
        return data["output_text"]

    for output in data.get("output", []):
        if output.get("type") != "message":
            continue
        for content in output.get("content", []):
            text = content.get("text")
            if isinstance(text, str) and text.strip():
                return text

    for choice in data.get("choices", []):
        message = choice.get("message", {})
        content = message.get("content")
        if isinstance(content, str) and content.strip():
            return content

    raise ValueError(f"No text output found in model response. Shape: {summarize_response_shape(data)}")


def parse_json_text(text: str) -> Dict[str, Any]:
    cleaned = text.strip()

    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```").strip()
        cleaned = cleaned.removesuffix("```").strip()

    return json.loads(cleaned)


def normalize_model_feedback_data(data: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(data)

    if "score" not in normalized:
        if normalized.get("natural") is True:
            normalized["score"] = 88
        elif normalized.get("understandable") is True:
            normalized["score"] = 72
        else:
            normalized["score"] = 62

    normalized.setdefault("level", "可理解，略生硬")
    normalized.setdefault("suggestion", "Could you say that in a more natural way, please?")
    normalized.setdefault("reason", "模型返回字段不完整，后端已做兼容归一化。")
    normalized.setdefault("alternatives", ["Could you say that again?", "I didn't quite catch that."])
    normalized.setdefault("nextReply", "Thanks. Could you tell me a little more?")
    normalized.setdefault("errorTags", infer_error_tags(str(normalized.get("reason", ""))))
    normalized.setdefault("reviewTip", build_review_tip(normalized["errorTags"]))
    normalized["source"] = "openai"

    if not isinstance(normalized["alternatives"], list):
        normalized["alternatives"] = [str(normalized["alternatives"])]
    normalized["alternatives"] = [str(item) for item in normalized["alternatives"][:3]]
    while len(normalized["alternatives"]) < 2:
        normalized["alternatives"].append("Could you say that another way?")

    if not isinstance(normalized["errorTags"], list):
        normalized["errorTags"] = [str(normalized["errorTags"])]
    normalized["errorTags"] = normalize_error_tags(normalized["errorTags"])

    return normalized


def normalize_scenario_data(data: Dict[str, Any], request: ScenarioRequest) -> Dict[str, Any]:
    normalized = dict(data)

    normalized.setdefault("title", f"{request.sceneTitle}实战任务")
    normalized.setdefault("role", request.role)
    normalized.setdefault("opener", "Hi there. How can I help you today?")
    normalized.setdefault("goal", f"在{request.sceneTitle}中完成一次真实口语沟通。")
    normalized.setdefault("constraints", ["说明你的需求", "补充一个具体细节"])
    normalized.setdefault("followUps", ["Could you tell me a little more?", "Is there anything else I should know?"])
    normalized.setdefault("difficulty", request.level)
    normalized["source"] = "openai"

    if normalized["difficulty"] not in {"beginner", "intermediate", "advanced"}:
        normalized["difficulty"] = request.level

    if not isinstance(normalized["constraints"], list):
        normalized["constraints"] = [str(normalized["constraints"])]
    normalized["constraints"] = [str(item) for item in normalized["constraints"][:4] if str(item).strip()]
    while len(normalized["constraints"]) < 2:
        normalized["constraints"].append("补充一个具体细节")

    if not isinstance(normalized["followUps"], list):
        normalized["followUps"] = [str(normalized["followUps"])]
    normalized["followUps"] = [str(item) for item in normalized["followUps"][:5] if str(item).strip()]

    return normalized


def find_scenario_object(value: Any) -> Dict[str, Any]:
    if isinstance(value, dict):
        required = {"title", "role", "opener", "goal", "constraints"}
        if required.issubset(value.keys()):
            return value

        for nested in value.values():
            found = find_scenario_object(nested)
            if found:
                return found

    if isinstance(value, list):
        for item in value:
            found = find_scenario_object(item)
            if found:
                return found

    if isinstance(value, str):
        text = value.strip()
        if text.startswith("{") and text.endswith("}"):
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                return {}
            return find_scenario_object(parsed)

    return {}


def find_feedback_object(value: Any) -> Dict[str, Any]:
    if isinstance(value, dict):
        required = {"score", "level", "suggestion", "reason", "alternatives", "nextReply"}
        if required.issubset(value.keys()) and is_feedback_object(value):
            return value

        for nested in value.values():
            found = find_feedback_object(nested)
            if found:
                return found

    if isinstance(value, list):
        for item in value:
            found = find_feedback_object(item)
            if found:
                return found

    if isinstance(value, str):
        text = value.strip()
        if text.startswith("{") and text.endswith("}"):
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                return {}
            return find_feedback_object(parsed)

    return {}


def is_feedback_object(value: Dict[str, Any]) -> bool:
    return (
        isinstance(value.get("score"), int)
        and isinstance(value.get("level"), str)
        and isinstance(value.get("suggestion"), str)
        and isinstance(value.get("reason"), str)
        and isinstance(value.get("alternatives"), list)
        and isinstance(value.get("nextReply"), str)
    )


def summarize_response_shape(data: Dict[str, Any]) -> str:
    summary = {
        "topLevelKeys": sorted(data.keys()),
        "status": data.get("status"),
        "model": data.get("model"),
        "outputTypes": [],
        "contentTypes": [],
        "choiceKeys": [],
        "incompleteDetails": data.get("incomplete_details"),
        "error": data.get("error"),
    }

    for output in data.get("output", [])[:5]:
        summary["outputTypes"].append(output.get("type"))
        for content in output.get("content", [])[:5]:
            summary["contentTypes"].append(content.get("type"))

    for choice in data.get("choices", [])[:3]:
        summary["choiceKeys"].append(sorted(choice.keys()))

    return json.dumps(summary, ensure_ascii=False)


def format_openai_error(exc: Exception) -> str:
    if isinstance(exc, httpx.HTTPStatusError):
        response_text = exc.response.text[:500].replace("\n", " ")
        return f"模型接口返回 HTTP {exc.response.status_code}：{response_text}"

    if isinstance(exc, httpx.RequestError):
        return f"无法连接模型接口：{exc.__class__.__name__}: {exc}"

    return f"模型响应解析失败或结构不匹配：{exc.__class__.__name__}: {exc}"
