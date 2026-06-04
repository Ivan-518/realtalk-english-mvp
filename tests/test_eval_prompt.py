from server.eval_cases import EVAL_CASES
from server.eval_prompt import validate_feedback
from server.models import CoachFeedback


def test_eval_case_collection_covers_all_scenes():
    scenes = {case.scene for case in EVAL_CASES}

    assert {"restaurant", "airport", "hotel", "smalltalk", "work"}.issubset(scenes)
    assert len(EVAL_CASES) >= 20


def test_eval_validation_rejects_scene_mismatched_tag():
    case = next(case for case in EVAL_CASES if case.scene == "restaurant")
    feedback = CoachFeedback(
        score=80,
        level="可理解，略生硬",
        suggestion="Could I get some water, please?",
        reason="这句话更礼貌。",
        alternatives=["Could I get water, please?", "Can I have water, please?"],
        nextReply="Sure. Still or sparkling?",
        errorTags=["workplace_tone"],
        reviewTip="请求时练 Could I get。",
        source="openai",
    )

    assert "scene_mismatched_tag" in validate_feedback(feedback, case)
