from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class EvalCase:
    id: str
    scene: str
    reply: str
    expected_tags: List[str]
    note: str


EVAL_CASES = [
    EvalCase("restaurant_001", "restaurant", "I want eat beef", ["grammar", "politeness"], "direct order with grammar issue"),
    EvalCase("restaurant_002", "restaurant", "Give me water", ["politeness"], "too direct service request"),
    EvalCase("restaurant_003", "restaurant", "I no spicy", ["grammar", "missing_detail"], "preference with missing structure"),
    EvalCase("restaurant_004", "restaurant", "Check please", ["politeness"], "understandable but can be more natural"),
    EvalCase("airport_001", "airport", "Where gate?", ["grammar", "missing_detail"], "missing article and flight context"),
    EvalCase("airport_002", "airport", "My luggage go where", ["grammar", "word_choice"], "baggage transfer question"),
    EvalCase("airport_003", "airport", "I want change seat", ["grammar", "politeness"], "seat change request"),
    EvalCase("airport_004", "airport", "I lost my boarding", ["word_choice", "missing_detail"], "boarding pass wording"),
    EvalCase("hotel_001", "hotel", "I live here tonight", ["word_choice"], "check-in wording"),
    EvalCase("hotel_002", "hotel", "Room has problem", ["missing_detail"], "complaint lacks detail"),
    EvalCase("hotel_003", "hotel", "I want late leave", ["word_choice", "politeness"], "late checkout request"),
    EvalCase("hotel_004", "hotel", "Breakfast include?", ["grammar"], "short hotel question"),
    EvalCase("smalltalk_001", "smalltalk", "I am boring", ["word_choice"], "bored vs boring"),
    EvalCase("smalltalk_002", "smalltalk", "I very like movie", ["grammar"], "common Chinese transfer"),
    EvalCase("smalltalk_003", "smalltalk", "My weekend is sleep", ["word_choice", "fluency"], "unnatural small talk"),
    EvalCase("smalltalk_004", "smalltalk", "You job is what", ["grammar", "fluency"], "awkward follow-up"),
    EvalCase("work_001", "work", "I finish first part", ["grammar", "workplace_tone"], "status update tense"),
    EvalCase("work_002", "work", "You must give me requirement", ["politeness", "workplace_tone"], "too direct workplace request"),
    EvalCase("work_003", "work", "I have problem API", ["grammar", "missing_detail"], "blocker lacks detail"),
    EvalCase("work_004", "work", "Maybe tomorrow can finish", ["fluency", "workplace_tone"], "timeline update"),
]
