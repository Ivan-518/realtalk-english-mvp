import json
from typing import Any, Dict

from server.models import ChatRequest, ScenarioRequest
from server.rubric import build_rubric_payload
from server.scenes import get_scene_guide


def build_system_prompt() -> str:
    return (
        "You are RealTalk English, a practical spoken-English coach for Chinese learners. "
        "Your job is to make the learner's sentence usable in a real conversation, not to teach exam English. "
        "Return only JSON that matches the required schema. "
        "Use Chinese for level, reason, and reviewTip. "
        "Use natural spoken English for suggestion, alternatives, and nextReply. "
        "First infer the learner's intended meaning, then preserve that meaning in every rewrite. "
        "Correct only the single highest-impact issue unless the sentence is unclear. "
        "Make suggestion the one best line the learner can repeat immediately. "
        "Make alternatives practical variants for the same intention, not generic templates. "
        "Keep all English suggestions short, repeatable, and scene-appropriate. "
        "Avoid abstract praise, textbook grammar lectures, overly formal rewrites, or long sentences."
    )


def plain_json_contract() -> str:
    return (
        "Return raw JSON only. Do not wrap it in Markdown. "
        "The JSON object must use exactly these keys: "
        "score(integer 0-100), level(Chinese string), suggestion(English string), "
        "reason(Chinese string), alternatives(array of 2-3 English strings), "
        "nextReply(English string), errorTags(array of 1-4 strings chosen from grammar, politeness, "
        "word_choice, fluency, missing_detail, workplace_tone, pronunciation_prompt), "
        "reviewTip(Chinese string), source(string, must be openai)."
    )


def build_scenario_system_prompt() -> str:
    return (
        "You generate practical spoken-English roleplay task cards for Chinese learners. "
        "The task must feel like a real-life situation, not an exam question. "
        "Return raw JSON only. Keep English short, natural, and actionable. "
        "Avoid repeating recent task titles. "
        "Use the requested scene and role, but create a specific fresh situation each time."
    )


def scenario_json_contract() -> str:
    return (
        "Return exactly one JSON object with keys: "
        "title(string), role(string), opener(string), goal(string), "
        "constraints(array of 2-4 Chinese strings), followUps(array of 3-5 English strings), "
        "difficulty(one of beginner, intermediate, advanced), source(string, must be openai)."
    )


def build_scenario_payload(request: ScenarioRequest) -> Dict[str, Any]:
    weakness_profile = request.weaknessProfile.model_dump() if request.weaknessProfile else None
    return {
        "sceneId": request.sceneId,
        "sceneTitle": request.sceneTitle,
        "role": request.role,
        "learnerLevel": request.level,
        "recentScenarioTitles": request.recentScenarioTitles[-8:],
        "weaknessProfile": weakness_profile,
        "sceneGuide": get_scene_guide(request.sceneId),
        "task": (
            "Create one concrete roleplay task card. The opener should be the first line spoken by the AI role. "
            "The learner should need to ask, explain, confirm, or negotiate something realistic. "
            "If weaknessProfile is present, design the task to force practice of those weak points without naming them awkwardly."
        ),
        "outputRules": {
            "title": "Chinese, specific, <= 18 characters",
            "role": "English role name, usually close to the requested role",
            "opener": "one in-role English sentence, <= 20 words",
            "goal": "Chinese, explain what the learner must accomplish in this task",
            "constraints": "2-4 Chinese task requirements, concrete and measurable",
            "followUps": "3-5 short in-role English follow-up lines for later turns",
            "weaknessAdaptation": "If topTags include politeness, grammar, missing_detail, word_choice, fluency, workplace_tone, or pronunciation_prompt, make constraints require that behavior.",
        },
    }


def build_scenario_payload_text(request: ScenarioRequest) -> str:
    return json.dumps(build_scenario_payload(request), ensure_ascii=False)


def build_user_payload(request: ChatRequest) -> Dict[str, Any]:
    return {
        "sceneId": request.sceneId,
        "sceneTitle": request.sceneTitle,
        "aiRole": request.role,
        "learningGoal": request.goal,
        "scenario": request.scenario.model_dump() if request.scenario else None,
        "turn": request.turn,
        "maxTurns": request.maxTurns,
        "conversation": [message.model_dump() for message in request.messages[-10:]],
        "userReply": request.userReply,
        "task": (
            "Correct the user's latest English reply and generate the AI role's next reply within the scenario card. "
            "Act like a speaking coach: identify the learner's intent, choose the biggest communication problem, "
            "give a line they can say out loud now, and continue the roleplay. "
            "If this is the final turn, make nextReply a short closing sentence plus review transition."
        ),
        "sceneGuide": get_scene_guide(request.sceneId),
        "rubric": build_rubric_payload(),
        "outputRules": {
            "suggestion": "one best natural spoken English sentence, <= 16 words, same intent as userReply",
            "alternatives": "2-3 complete English sentences, each <= 16 words, same intent, no blanks or ellipses",
            "nextReply": "one in-role English sentence, <= 20 words",
            "reason": "Chinese, 1 short sentence naming the main issue and why the suggestion fixes it",
            "reviewTip": "Chinese, one concrete drill the learner can do in the next reply",
            "errorTags": "choose 1-3 stable tags from the provided enum",
        },
    }


def build_user_payload_text(request: ChatRequest) -> str:
    return json.dumps(build_user_payload(request), ensure_ascii=False)
