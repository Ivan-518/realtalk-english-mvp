import argparse
import asyncio
import json

from server.config import get_openai_api_key
from server.fallback import build_fallback_feedback
from server.models import ChatMessage, ChatRequest, CoachFeedback
from server.openai_client import call_openai, normalize_model_feedback_data
from server.prompts import build_system_prompt, build_user_payload


def build_request(scene_id: str, reply: str) -> ChatRequest:
    openers = {
        "restaurant": ("Waiter", "餐厅点餐", "练习点餐、修改需求和结账", "Hi, welcome in. Do you have a reservation?"),
        "airport": ("Airline Staff", "机场出行", "练习值机、行李和登机沟通", "May I see your passport and booking reference?"),
        "hotel": ("Front Desk", "酒店入住", "练习入住、房间需求和投诉", "Do you have a reservation with us?"),
        "smalltalk": ("New Friend", "日常寒暄", "练习自然聊天和追问", "Hey, I don't think we've met before."),
        "work": ("Team Lead", "工作沟通", "练习确认需求、汇报和提出问题", "Could you give me a quick update?"),
    }
    role, title, goal, opener = openers.get(scene_id, openers["restaurant"])

    return ChatRequest(
        sceneId=scene_id,
        sceneTitle=title,
        role=role,
        goal=goal,
        turn=0,
        maxTurns=5,
        messages=[
            ChatMessage(speaker=role, text=opener, type="ai"),
            ChatMessage(speaker="You", text=reply, type="user"),
        ],
        userReply=reply,
    )


async def main() -> None:
    parser = argparse.ArgumentParser(description="Debug RealTalk prompt and model output.")
    parser.add_argument("--scene", default="restaurant")
    parser.add_argument("--reply", default="I want eat beef")
    parser.add_argument("--show-prompt", action="store_true")
    args = parser.parse_args()

    request = build_request(args.scene, args.reply)

    if args.show_prompt:
        print("SYSTEM PROMPT:")
        print(build_system_prompt())
        print("\nUSER PAYLOAD:")
        print(json.dumps(build_user_payload(request), ensure_ascii=False, indent=2))

    api_key = get_openai_api_key()
    if not api_key:
        feedback = build_fallback_feedback(request, "未配置 OPENAI_API_KEY。")
    else:
        data = await call_openai(request, api_key)
        feedback = CoachFeedback.model_validate(normalize_model_feedback_data(data))

    print("\nFEEDBACK:")
    print(json.dumps(feedback.model_dump(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
