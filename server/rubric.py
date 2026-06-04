from typing import Dict, List


LEVEL_LABELS = [
    "自然",
    "可理解，略生硬",
    "能猜到意思，但需要改写",
    "不太清楚",
]

ERROR_TAGS = [
    "grammar",
    "politeness",
    "word_choice",
    "fluency",
    "missing_detail",
    "workplace_tone",
    "pronunciation_prompt",
]

TAG_RULES: Dict[str, str] = {
    "grammar": "Use when the sentence structure, verb pattern, tense, article, or preposition is the main issue.",
    "politeness": "Use when the sentence is too direct for service, travel, hotel, or request situations.",
    "word_choice": "Use when the words are understandable but not what people normally say in that scene.",
    "fluency": "Use when the sentence is correct enough but sounds choppy or hard to respond to.",
    "missing_detail": "Use when the learner should add object, time, reason, quantity, preference, or next step.",
    "workplace_tone": "Use only for work scenes when the reply needs clearer ownership, alignment, or softer tone.",
    "pronunciation_prompt": "Use only if the learner asks about speaking, pronunciation, or follow-up voice practice.",
}

RUBRIC = {
    "score": [
        "90-100: natural, scene-appropriate, and easy to continue.",
        "75-89: understandable and mostly natural, with one small improvement.",
        "60-74: understandable but noticeably unnatural or incomplete.",
        "40-59: meaning can be guessed, but it needs a rewrite.",
        "0-39: unclear or not usable in the scene.",
    ],
    "lengthLimits": {
        "suggestion": "one English sentence, 18 words or fewer",
        "alternatives": "2-3 English sentences, each 18 words or fewer",
        "nextReply": "one English sentence, 20 words or fewer",
        "reason": "Chinese, 1-2 short sentences, name the main issue only",
        "reviewTip": "Chinese, one concrete practice instruction",
    },
    "correctionPolicy": [
        "Do not rewrite everything if one small change is enough.",
        "Prefer the shortest natural spoken sentence.",
        "Avoid advanced vocabulary unless the scene requires it.",
        "If the learner's sentence is already natural, preserve their wording and give a small upgrade.",
        "Use Chinese explanations, but keep English examples clean and directly usable.",
    ],
}


def build_rubric_payload() -> Dict[str, object]:
    return {
        "levelLabels": LEVEL_LABELS,
        "errorTags": ERROR_TAGS,
        "tagRules": TAG_RULES,
        "rubric": RUBRIC,
    }
