import random
from typing import Dict, List

from server.models import ScenarioCard, ScenarioRequest


SCENE_GUIDES: Dict[str, Dict[str, List[str] | str]] = {
    "restaurant": {
        "tone": "polite, brief, service-situation spoken English",
        "coachFocus": [
            "Prefer I'd like, Could I get, Could we have over direct I want.",
            "Keep the suggestion short enough to repeat at the table.",
            "If the learner gives vague food words, make the order specific.",
        ],
        "usefulPatterns": [
            "I'd like ..., please.",
            "Could I get ..., please?",
            "Could we have the check, please?",
        ],
        "avoid": "Do not make the line sound formal or scripted.",
    },
    "airport": {
        "tone": "clear, direct, information-complete travel English",
        "coachFocus": [
            "Prioritize passport, booking, baggage, gate, and transfer clarity.",
            "Make the sentence direct but still polite.",
            "Ask for missing practical details when needed.",
        ],
        "usefulPatterns": [
            "I'd like to check in for my flight.",
            "Is my bag checked through?",
            "Could you tell me where the gate is?",
        ],
        "avoid": "Do not add small talk unless the learner starts it.",
    },
    "hotel": {
        "tone": "polite, calm, request-focused hotel English",
        "coachFocus": [
            "Use reservation, check-in, late checkout, room issue language.",
            "Make requests polite and concrete.",
            "For complaints, state the problem and desired help clearly.",
        ],
        "usefulPatterns": [
            "I have a reservation under ...",
            "Could I check in now?",
            "Could I get a late checkout?",
        ],
        "avoid": "Do not sound angry or overly formal.",
    },
    "smalltalk": {
        "tone": "casual, warm, natural everyday conversation",
        "coachFocus": [
            "Make the reply easy to say and easy to continue.",
            "Add one simple follow-up question when appropriate.",
            "Avoid interview-like or textbook phrasing.",
        ],
        "usefulPatterns": [
            "Nice to meet you.",
            "I'm into ...",
            "How about you?",
        ],
        "avoid": "Do not over-polish into business English.",
    },
    "work": {
        "tone": "clear, professional, concise workplace English",
        "coachFocus": [
            "Prioritize clarity, ownership, blockers, timeline, and next step.",
            "Use polite but efficient phrases for disagreement or clarification.",
            "Make the suggestion useful in meetings or written chat.",
        ],
        "usefulPatterns": [
            "Just to confirm, ...",
            "Could you clarify ...?",
            "I suggest we ... before release.",
        ],
        "avoid": "Do not make it too casual or too wordy.",
    },
}


DEFAULT_SCENE_GUIDE = {
    "tone": "natural, practical spoken English",
    "coachFocus": [
        "Make the suggestion short, clear, and easy to repeat.",
        "Correct only the most important issue first.",
        "Keep the next reply natural for the role.",
    ],
    "usefulPatterns": [
        "Could you say that again?",
        "I didn't quite catch that.",
        "Could you help me with that?",
    ],
    "avoid": "Do not produce long textbook explanations.",
}


def get_scene_guide(scene_id: str) -> Dict[str, List[str] | str]:
    return SCENE_GUIDES.get(scene_id, DEFAULT_SCENE_GUIDE)


FALLBACK_SCENARIOS: Dict[str, List[Dict[str, object]]] = {
    "restaurant": [
        {
            "title": "没有预约但想要两人桌",
            "role": "Waiter",
            "opener": "Hi there. Do you have a reservation with us tonight?",
            "goal": "说明没有预约，询问等待时间，并争取两人桌。",
            "constraints": ["说明没有预约", "请求两人桌", "询问等待时间"],
            "followUps": [
                "We may have a table in about 20 minutes. Would that work for you?",
                "Would you prefer indoor or outdoor seating?",
                "Can I take your name for the waitlist?",
            ],
        },
        {
            "title": "确认花生过敏",
            "role": "Waiter",
            "opener": "Hi, welcome in. Are there any allergies we should know about?",
            "goal": "说明你对花生过敏，并确认推荐菜是否安全。",
            "constraints": ["说明花生过敏", "询问哪些菜安全", "确认配料是否含花生"],
            "followUps": [
                "Thanks for letting me know. Would you like me to check with the kitchen?",
                "This dish may contain peanuts. Would you like another option?",
            ],
        },
    ],
    "airport": [
        {
            "title": "行李超重需要处理",
            "role": "Airline Staff",
            "opener": "Your bag is a little over the weight limit. Would you like to repack it?",
            "goal": "询问超重费用，并决定是否重新整理行李。",
            "constraints": ["询问超重费用", "询问是否可以重新整理", "确认下一步怎么处理"],
            "followUps": [
                "The fee is 60 dollars. Would you still like to check it?",
                "You can move some items to your carry-on if you prefer.",
            ],
        },
        {
            "title": "确认转机行李",
            "role": "Airline Staff",
            "opener": "Are you traveling all the way to your final destination today?",
            "goal": "确认行李是否直挂到最终目的地。",
            "constraints": ["说明最终目的地", "询问行李是否直挂", "确认转机时是否需要取行李"],
            "followUps": [
                "Your bag is checked through to the final destination.",
                "You will need to pick it up and recheck it during your transfer.",
            ],
        },
    ],
    "hotel": [
        {
            "title": "提前入住",
            "role": "Front Desk",
            "opener": "Welcome. Your room may not be ready yet. Were you hoping to check in early?",
            "goal": "礼貌询问是否可以提前入住，必要时询问寄存行李。",
            "constraints": ["询问是否可以提前入住", "询问是否能寄存行李", "保持礼貌语气"],
            "followUps": [
                "I can check if we have a room available now.",
                "We can store your bags until your room is ready.",
            ],
        },
        {
            "title": "房间太吵",
            "role": "Front Desk",
            "opener": "Hi, how can I help you with your room today?",
            "goal": "说明房间太吵，并询问是否可以换房。",
            "constraints": ["描述噪音问题", "请求更安静的房间", "保持冷静礼貌"],
            "followUps": [
                "I'm sorry about that. Would you like me to check another room?",
                "Is the noise coming from outside or another room?",
            ],
        },
    ],
    "smalltalk": [
        {
            "title": "第一次见面聊周末",
            "role": "New Friend",
            "opener": "Hey, I don't think we've met before. Do you live around here?",
            "goal": "简单介绍自己，并自然聊到周末安排。",
            "constraints": ["简单介绍自己", "提到一个周末活动", "反问对方一个问题"],
            "followUps": [
                "That sounds nice. What do you usually do on weekends?",
                "How long have you been living here?",
            ],
        },
        {
            "title": "聊共同兴趣",
            "role": "New Friend",
            "opener": "I heard you like movies. What kind of movies are you into?",
            "goal": "表达你的兴趣，并向对方追问。",
            "constraints": ["说出一种电影类型", "给出一个喜欢的原因", "询问对方的偏好"],
            "followUps": [
                "Do you have any recommendations?",
                "I like that too. What did you watch recently?",
            ],
        },
    ],
    "work": [
        {
            "title": "解释进度延期",
            "role": "Team Lead",
            "opener": "Could you give me a quick update on the project timeline?",
            "goal": "说明延期原因，给出新时间，并提出下一步。",
            "constraints": ["解释当前阻碍", "给出新的时间点", "说明下一步动作"],
            "followUps": [
                "What is the main blocker right now?",
                "When do you think the next version will be ready?",
            ],
        },
        {
            "title": "确认需求不清楚",
            "role": "Team Lead",
            "opener": "Before you continue, do you have everything you need for this task?",
            "goal": "说明需求还不清楚，并礼貌请求进一步确认。",
            "constraints": ["说明哪里不清楚", "请求对方澄清", "建议先对齐需求"],
            "followUps": [
                "Which part of the requirement is unclear?",
                "Let's write down the expected behavior before you continue.",
            ],
        },
    ],
}


def build_fallback_scenario(request: ScenarioRequest) -> ScenarioCard:
    candidates = FALLBACK_SCENARIOS.get(request.sceneId, FALLBACK_SCENARIOS["restaurant"])
    recent = set(request.recentScenarioTitles)
    fresh = [item for item in candidates if item["title"] not in recent] or candidates
    selected = random.choice(fresh)

    constraints = [str(item) for item in selected["constraints"]]
    weakness = request.weaknessProfile

    if weakness and weakness.topTags:
        tag_constraints = {
            "politeness": "必须使用礼貌请求句型，例如 Could I / I'd like / Would it be possible。",
            "grammar": "必须说完整句，注意主语、动词和句末标点。",
            "missing_detail": "必须补充至少一个具体细节，例如时间、数量、原因或偏好。",
            "word_choice": "避免中式直译，优先使用更自然的固定搭配。",
            "fluency": "回答要连贯，不只说关键词。",
            "workplace_tone": "语气要清楚专业，避免过于随意或命令式表达。",
            "pronunciation_prompt": "选择一句推荐表达，按意群慢速复述一遍。",
        }
        for tag in weakness.topTags:
            extra = tag_constraints.get(tag)
            if extra and extra not in constraints:
                constraints.append(extra)

    return ScenarioCard(
        title=str(selected["title"]),
        role=str(selected.get("role") or request.role),
        opener=str(selected["opener"]),
        goal=str(selected["goal"]),
        constraints=constraints[:4],
        followUps=[str(item) for item in selected.get("followUps", [])],
        difficulty=request.level,
        source="fallback",
    )
