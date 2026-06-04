from typing import List

from server.models import ChatRequest, CoachFeedback


def build_fallback_feedback(request: ChatRequest, failure_reason: str = "") -> CoachFeedback:
    text = request.userReply.strip()
    lower = text.lower()
    score = 78
    suggestion = normalize_sentence(text)
    intent = infer_request_object(text)
    reason = "这句话基本能听懂；本地教练会先帮你把它改成更自然、可直接复述的一句。"
    if failure_reason:
        reason = f"{reason} 后端诊断：{failure_reason[:650]}"
    alternatives = fallback_alternatives(request.sceneId, intent)
    error_tags = infer_error_tags(reason)

    if "i want" in lower:
        score -= 12
        suggestion = polite_request_for_scene(request.sceneId, intent)
        alternatives = fallback_alternatives(request.sceneId, intent)
        reason = "主要问题是 I want 在服务场景里偏直接；换成 I'd like 或 Could I get 会更礼貌自然。"
        error_tags.append("politeness")

    if len(text.split()) <= 3:
        score -= 10
        suggestion = complete_request_for_scene(request.sceneId, intent)
        alternatives = fallback_alternatives(request.sceneId, intent)
        reason = "主要问题是信息太短；补上具体对象或下一步动作，对方才能继续回应。"
        error_tags.append("missing_detail")

    if "please" in lower or "could" in lower or "would" in lower:
        score += 6

    score = max(45, min(92, score))
    level = "自然" if score >= 85 else "可理解，略生硬" if score >= 70 else "能猜到意思，但需要改写"
    error_tags = normalize_error_tags(error_tags or infer_error_tags(reason))

    return CoachFeedback(
        score=score,
        level=level,
        suggestion=suggestion,
        reason=reason,
        alternatives=alternatives,
        nextReply=fallback_next_reply(request),
        errorTags=error_tags,
        reviewTip=build_review_tip(error_tags),
        source="fallback",
    )


def normalize_sentence(text: str) -> str:
    cleaned = " ".join(text.split())
    if not cleaned:
        return "Could you help me with that, please?"
    cleaned = cleaned[0].upper() + cleaned[1:]
    if cleaned[-1] not in ".!?":
        cleaned += "."
    return cleaned


def polite_request_for_scene(scene_id: str, intent: str = "") -> str:
    target = scene_target(scene_id, intent)
    return {
        "restaurant": f"I'd like {target}, please.",
        "airport": f"Could you help me with {target}, please?",
        "hotel": f"Could I get help with {target}, please?",
        "smalltalk": "Could you tell me more about that?",
        "work": f"Could you clarify {target}, please?",
    }.get(scene_id, "Could you help me with that, please?")


def complete_request_for_scene(scene_id: str, intent: str = "") -> str:
    target = scene_target(scene_id, intent)
    return {
        "restaurant": f"I'd like {target}, please.",
        "airport": f"I need help with {target}, please.",
        "hotel": f"I need help with {target}, please.",
        "smalltalk": "I usually like quiet weekends with friends.",
        "work": f"I need clarification on {target}.",
    }.get(scene_id, "Could you help me with that, please?")


def fallback_alternatives(scene_id: str, intent: str = "") -> List[str]:
    target = scene_target(scene_id, intent)
    return {
        "restaurant": [f"I'd like {target}, please.", f"Could I get {target}, please?", f"I'll have {target}, please."],
        "airport": [f"I need help with {target}, please.", "Could you tell me where the gate is?", "Is my bag checked through?"],
        "hotel": [f"I need help with {target}, please.", "Could I check in now?", "Is breakfast included?"],
        "smalltalk": ["Nice to meet you.", "I'm into music and movies.", "How about you?"],
        "work": [f"Could you clarify {target}, please?", f"Just to confirm, you mean {target}.", "I suggest we confirm the next step."],
    }.get(scene_id, ["Could you say that again?", "I didn't quite catch that.", "Could you help me?"])


def infer_request_object(text: str) -> str:
    lowered = " ".join(text.lower().strip().strip(".!?").split())
    prefixes = (
        "i want to",
        "i want",
        "i'd like to",
        "i'd like",
        "i would like to",
        "i would like",
        "can i",
        "could i",
        "please",
    )
    for prefix in prefixes:
        if lowered.startswith(prefix):
            lowered = lowered[len(prefix) :].strip()
            break
    return lowered


def scene_target(scene_id: str, intent: str) -> str:
    cleaned = intent.strip()
    if cleaned:
        if scene_id == "restaurant" and not cleaned.startswith(("a ", "an ", "the ")):
            return cleaned
        return cleaned
    return {
        "restaurant": "the beef",
        "airport": "my check-in",
        "hotel": "my reservation",
        "smalltalk": "that",
        "work": "the requirement",
    }.get(scene_id, "that")


def fallback_next_reply(request: ChatRequest) -> str:
    if request.turn + 1 >= request.maxTurns:
        return "Great practice. Let's review your useful expressions."

    return {
        "restaurant": "Sure. Would you like anything else with that?",
        "airport": "Thanks. Are you checking any bags today?",
        "hotel": "Let me check that for you. Could I see your ID, please?",
        "smalltalk": "That sounds interesting. What do you usually do on weekends?",
        "work": "Thanks. What is the main blocker right now?",
    }.get(request.sceneId, "Thanks. Could you tell me a little more?")


def normalize_error_tags(tags: List[str]) -> List[str]:
    allowed = {
        "grammar",
        "politeness",
        "word_choice",
        "fluency",
        "missing_detail",
        "workplace_tone",
        "pronunciation_prompt",
    }
    normalized = []

    for tag in tags:
        cleaned = str(tag).strip().lower()
        if cleaned in allowed and cleaned not in normalized:
            normalized.append(cleaned)

    return (normalized or ["fluency"])[:4]


def infer_error_tags(text: str) -> List[str]:
    tags = []
    lowered = text.lower()

    if "want eat" in lowered or "语法" in text or "介词" in text:
        tags.append("grammar")
    if "礼貌" in text or "polite" in lowered or "i’d like" in lowered:
        tags.append("politeness")
    if "用词" in text or "自然" in text or "word" in lowered:
        tags.append("word_choice")
    if "偏短" in text or "补充" in text or "detail" in lowered:
        tags.append("missing_detail")
    if "工作" in text or "职场" in text:
        tags.append("workplace_tone")

    return normalize_error_tags(tags)


def build_review_tip(tags: List[str]) -> str:
    labels = {
        "grammar": "下一句先用主语 + 动词 + 对象说完整，再补一个细节。",
        "politeness": "下一句用 I'd like / Could I get 开头，把同一个需求再说一遍。",
        "word_choice": "下一句不要逐词翻译，直接复述推荐句里的固定搭配。",
        "fluency": "下一句先说一个短完整句，再补一个自然追问。",
        "missing_detail": "下一句必须补一个具体对象、时间、原因或下一步动作。",
        "workplace_tone": "下一句用 Could you clarify / Just to confirm 做委婉确认。",
        "pronunciation_prompt": "下一句先慢读推荐句，注意重音和停顿。",
    }

    return labels.get(tags[0], labels["fluency"])
