import argparse
import asyncio
import json
from dataclasses import asdict
from typing import Dict, List

from server.config import get_openai_api_key
from server.debug_prompt import build_request
from server.eval_cases import EVAL_CASES, EvalCase
from server.fallback import build_fallback_feedback
from server.models import CoachFeedback
from server.openai_client import call_openai, normalize_model_feedback_data
from server.rubric import ERROR_TAGS


DISALLOWED_SCENE_TAGS = {
    "restaurant": {"workplace_tone", "pronunciation_prompt"},
    "airport": {"workplace_tone", "pronunciation_prompt"},
    "hotel": {"workplace_tone", "pronunciation_prompt"},
    "smalltalk": {"workplace_tone", "pronunciation_prompt"},
    "work": {"pronunciation_prompt"},
}


def word_count(text: str) -> int:
    return len(text.replace("...", " ").split())


def validate_feedback(feedback: CoachFeedback, case: EvalCase) -> List[str]:
    issues = []

    if feedback.source != "openai":
        issues.append("source_not_openai")
    if word_count(feedback.suggestion) > 18:
        issues.append("suggestion_too_long")
    if word_count(feedback.nextReply) > 20:
        issues.append("next_reply_too_long")
    if len(feedback.alternatives) not in (2, 3):
        issues.append("alternatives_count")
    if any(word_count(item) > 18 for item in feedback.alternatives):
        issues.append("alternative_too_long")
    if not feedback.errorTags:
        issues.append("missing_error_tags")
    if any(tag not in ERROR_TAGS for tag in feedback.errorTags):
        issues.append("invalid_error_tag")
    if set(feedback.errorTags).intersection(DISALLOWED_SCENE_TAGS.get(case.scene, set())):
        issues.append("scene_mismatched_tag")
    if len(feedback.errorTags) > 3:
        issues.append("too_many_error_tags")
    if not set(case.expected_tags).intersection(feedback.errorTags):
        issues.append("expected_tag_miss")
    if not feedback.reviewTip.strip():
        issues.append("missing_review_tip")

    return issues


async def evaluate_case(case: EvalCase, api_key: str) -> Dict[str, object]:
    request = build_request(case.scene, case.reply)

    try:
        if api_key:
            data = await call_openai(request, api_key)
            feedback = CoachFeedback.model_validate(normalize_model_feedback_data(data))
        else:
            feedback = build_fallback_feedback(request, "未配置 OPENAI_API_KEY。")
    except Exception as exc:
        return {
            "case": asdict(case),
            "feedback": None,
            "issues": ["runtime_error"],
            "error": f"{exc.__class__.__name__}: {exc}",
            "passed": False,
        }

    issues = validate_feedback(feedback, case)
    return {
        "case": asdict(case),
        "feedback": feedback.model_dump(),
        "issues": issues,
        "passed": not issues,
    }


async def run_eval(limit: int, scene: str, fail_fast: bool) -> List[Dict[str, object]]:
    api_key = get_openai_api_key()
    cases = [case for case in EVAL_CASES if scene == "all" or case.scene == scene]
    cases = cases[:limit] if limit else cases
    results = []

    for case in cases:
        result = await evaluate_case(case, api_key)
        results.append(result)
        status = "PASS" if result["passed"] else "FAIL"
        feedback = result["feedback"]
        if feedback:
            print(
                f"{status} {case.id} [{case.scene}] score={feedback['score']} "
                f"tags={','.join(feedback['errorTags'])} suggestion={feedback['suggestion']}"
            )
        else:
            print(f"{status} {case.id} [{case.scene}] error={result.get('error')}")
        if result["issues"]:
            print(f"  issues: {', '.join(result['issues'])}")
        if fail_fast and result["issues"]:
            break

    return results


async def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate RealTalk prompt quality on fixed cases.")
    parser.add_argument("--limit", type=int, default=5, help="Number of cases to run. Use 0 for all.")
    parser.add_argument("--scene", default="all", choices=["all", "restaurant", "airport", "hotel", "smalltalk", "work"])
    parser.add_argument("--fail-fast", action="store_true")
    parser.add_argument("--json", action="store_true", help="Print full JSON results after summary.")
    args = parser.parse_args()

    results = await run_eval(args.limit, args.scene, args.fail_fast)
    passed = sum(1 for result in results if result["passed"])
    total = len(results)
    print(f"\nSUMMARY: {passed}/{total} passed")

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
