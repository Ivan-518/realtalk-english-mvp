const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const scenarioPayload = {
  sceneId: "restaurant",
  sceneTitle: "餐厅点餐",
  role: "Waiter",
  level: "beginner",
  recentScenarioTitles: [],
  weaknessProfile: {
    topTags: ["politeness", "missing_detail"],
    weakSentences: ["I want beef"],
    suggestedPatterns: ["I'd like the beef, please."],
    recentReviewTips: ["下一句用 I'd like / Could I get 开头，把同一个需求再说一遍。"],
  },
};

const chatPayload = {
  sceneId: "restaurant",
  sceneTitle: "餐厅点餐",
  role: "Waiter",
  goal: "礼貌点餐并确认需求。",
  turn: 0,
  maxTurns: 5,
  messages: [{ speaker: "Waiter", text: "Hi, what can I get for you today?", type: "ai" }],
  userReply: "I want beef",
  scenario: {
    title: "确认主菜",
    role: "Waiter",
    opener: "Hi, what can I get for you today?",
    goal: "礼貌点餐并确认主菜。",
    constraints: ["使用礼貌请求", "补充一个具体信息"],
    followUps: ["Would you like anything else?"],
    difficulty: "beginner",
    source: "fallback",
  },
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchText(path) {
  const response = await fetch(`${baseUrl}${path}`);
  assert(response.ok, `${path} returned ${response.status}`);
  return response.text();
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  assert(response.ok, `${path} returned ${response.status}`);
  return response.json();
}

function assertHasKeys(object, keys, label) {
  keys.forEach((key) => {
    assert(Object.prototype.hasOwnProperty.call(object, key), `${label} missing ${key}`);
  });
}

async function checkStaticAssets() {
  const html = await fetchText("/");
  assert(html.includes("RealTalk English"), "home page missing product name");
  assert(html.includes("./app.js"), "home page missing app script");

  const css = await fetchText("/styles.css");
  assert(css.includes(".app-shell"), "styles.css missing app shell styles");

  const js = await fetchText("/app.js");
  assert(js.includes("requestCoachFeedback"), "app.js missing coach feedback flow");
}

async function checkHealth() {
  const health = await fetchJson("/api/health");
  assert(health.status === "ok", "health status should be ok");
  assertHasKeys(health, ["model", "baseUrl", "envFileExists", "openaiKeyConfigured"], "health");
}

async function checkScenario() {
  const scenario = await fetchJson("/api/scenario", {
    method: "POST",
    body: JSON.stringify(scenarioPayload),
  });
  assertHasKeys(scenario, ["title", "role", "opener", "goal", "constraints", "followUps", "difficulty", "source"], "scenario");
  assert(Array.isArray(scenario.constraints) && scenario.constraints.length >= 2, "scenario constraints should have at least 2 items");
  assert(Array.isArray(scenario.followUps) && scenario.followUps.length >= 1, "scenario followUps should not be empty");
}

async function checkChat() {
  const feedback = await fetchJson("/api/chat", {
    method: "POST",
    body: JSON.stringify(chatPayload),
  });
  assertHasKeys(
    feedback,
    ["score", "level", "suggestion", "reason", "alternatives", "nextReply", "errorTags", "reviewTip", "source"],
    "feedback",
  );
  assert(Number.isInteger(feedback.score) && feedback.score >= 0 && feedback.score <= 100, "feedback score out of range");
  assert(Array.isArray(feedback.alternatives) && feedback.alternatives.length >= 2, "feedback alternatives should have at least 2 items");
  assert(Array.isArray(feedback.errorTags) && feedback.errorTags.length >= 1, "feedback errorTags should not be empty");
}

(async () => {
  const checks = [
    ["static assets", checkStaticAssets],
    ["health", checkHealth],
    ["scenario", checkScenario],
    ["chat", checkChat],
  ];

  for (const [name, fn] of checks) {
    await fn();
    console.log(`OK ${name}`);
  }

  console.log(`Smoke test passed: ${baseUrl}`);
})().catch((error) => {
  console.error(`Smoke test failed: ${baseUrl}`);
  console.error(error);
  process.exit(1);
});
