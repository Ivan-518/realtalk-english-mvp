import pytest
from pydantic import ValidationError

from server.models import CoachFeedback, ScenarioCard, ScenarioRequest


def test_coach_feedback_accepts_valid_payload():
    feedback = CoachFeedback(
        score=88,
        level="自然",
        suggestion="I'd like some water, please.",
        reason="表达自然，适合当前场景。",
        alternatives=["Could I get some water, please?", "Can I have some water, please?"],
        nextReply="Sure. Still or sparkling?",
        errorTags=["politeness"],
        reviewTip="请求时继续练 Could I get 句型。",
        source="openai",
    )

    assert feedback.score == 88


def test_coach_feedback_rejects_invalid_score():
    with pytest.raises(ValidationError):
        CoachFeedback(
            score=101,
            level="自然",
            suggestion="Hello.",
            reason="测试。",
            alternatives=["Hi.", "Hello."],
            nextReply="Welcome.",
            errorTags=["fluency"],
            reviewTip="继续练完整句。",
            source="openai",
        )


def test_scenario_card_accepts_valid_payload():
    scenario = ScenarioCard(
        title="确认花生过敏",
        role="Waiter",
        opener="Are there any allergies we should know about?",
        goal="说明过敏信息并确认菜品是否安全。",
        constraints=["说明你对花生过敏", "确认推荐菜是否安全"],
        followUps=["I can check with the kitchen.", "Would you like another option?"],
        difficulty="beginner",
        source="openai",
    )

    assert scenario.title == "确认花生过敏"


def test_scenario_card_accepts_review_difficulty():
    scenario = ScenarioCard(
        title="礼貌请求复练",
        role="Barista",
        opener="What can I get started for you?",
        goal="把直接要求改成更礼貌的现场请求。",
        constraints=["使用 Could I get", "补充尺寸或数量"],
        followUps=["Anything else for you?"],
        difficulty="review",
        source="fallback",
    )

    assert scenario.difficulty == "review"


def test_scenario_request_accepts_weakness_profile():
    request = ScenarioRequest(
        sceneId="restaurant",
        sceneTitle="餐厅点餐",
        role="Waiter",
        level="beginner",
        weaknessProfile={
            "topTags": ["politeness", "missing_detail"],
            "weakSentences": ["I want water."],
            "suggestedPatterns": ["Could I get some water, please?"],
            "recentReviewTips": ["请求时加 please，并补充数量或规格。"],
        },
    )

    assert request.weaknessProfile is not None
    assert request.weaknessProfile.topTags == ["politeness", "missing_detail"]
