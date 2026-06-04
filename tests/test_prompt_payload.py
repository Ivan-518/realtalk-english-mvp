from server.debug_prompt import build_request
from server.models import ScenarioCard, ScenarioRequest
from server.prompts import build_scenario_payload, build_system_prompt, build_user_payload
from server.rubric import ERROR_TAGS


def test_prompt_payload_contains_scene_guide_rubric_and_output_rules():
    request = build_request("work", "I finish first part")

    payload = build_user_payload(request)

    assert "sceneGuide" in payload
    assert "rubric" in payload
    assert "outputRules" in payload
    assert payload["sceneGuide"]["tone"]
    assert "workplace_tone" in payload["rubric"]["errorTags"]
    assert "no blanks or ellipses" in payload["outputRules"]["alternatives"]
    assert "same intent" in payload["outputRules"]["suggestion"]


def test_prompt_payload_includes_scenario_card():
    request = build_request("restaurant", "I have peanut allergy")
    request.scenario = ScenarioCard(
        title="确认花生过敏",
        role="Waiter",
        opener="Are there any allergies we should know about?",
        goal="说明过敏并确认推荐菜是否安全。",
        constraints=["说明过敏信息", "确认替代菜品"],
        followUps=["I can check with the kitchen."],
        difficulty="beginner",
        source="fallback",
    )

    payload = build_user_payload(request)

    assert payload["scenario"]["title"] == "确认花生过敏"
    assert "scenario card" in payload["task"]


def test_scenario_prompt_payload_includes_weakness_profile():
    request = ScenarioRequest(
        sceneId="restaurant",
        sceneTitle="餐厅点餐",
        role="Waiter",
        level="beginner",
        weaknessProfile={
            "topTags": ["politeness", "grammar", "missing_detail"],
            "weakSentences": ["I want water."],
            "suggestedPatterns": ["Could I get some water, please?"],
            "recentReviewTips": ["请求时加 please，并补充数量或规格。"],
        },
    )

    payload = build_scenario_payload(request)

    assert payload["weaknessProfile"]["topTags"] == [
        "politeness",
        "grammar",
        "missing_detail",
    ]
    assert "weaknessProfile" in payload["task"]


def test_system_prompt_prioritizes_practical_spoken_english():
    prompt = build_system_prompt()

    assert "spoken-English coach" in prompt
    assert "not to teach exam English" in prompt
    assert "preserve that meaning" in prompt
    assert "same intention" in prompt


def test_error_tags_are_available_to_prompt():
    assert {"grammar", "politeness", "word_choice", "missing_detail"}.issubset(set(ERROR_TAGS))
