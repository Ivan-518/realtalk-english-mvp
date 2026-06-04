from server.debug_prompt import build_request
from server.fallback import build_fallback_feedback, normalize_error_tags


def test_fallback_flags_direct_restaurant_request():
    request = build_request("restaurant", "I want eat beef")

    feedback = build_fallback_feedback(request)

    assert feedback.source == "fallback"
    assert feedback.score < 80
    assert "politeness" in feedback.errorTags
    assert feedback.errorTags
    assert "I'd like" in feedback.suggestion
    assert "beef" in feedback.suggestion
    assert all("..." not in alternative for alternative in feedback.alternatives)
    assert any("beef" in alternative for alternative in feedback.alternatives)


def test_normalize_error_tags_filters_unknown_values():
    assert normalize_error_tags(["grammar", "bad_tag", "grammar"]) == ["grammar"]
