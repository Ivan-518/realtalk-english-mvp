const MAX_TURNS = 5;
const API_ENDPOINT =
  window.location.protocol.startsWith("http") ? "/api/chat" : "http://127.0.0.1:8000/api/chat";
const SCENARIO_ENDPOINT =
  window.location.protocol.startsWith("http")
    ? "/api/scenario"
    : "http://127.0.0.1:8000/api/scenario";
const STORAGE_KEYS = {
  favorites: "realtalk.favorites",
  history: "realtalk.history",
};

const ERROR_TAG_LABELS = {
  grammar: "语法结构",
  politeness: "礼貌表达",
  word_choice: "用词自然度",
  fluency: "表达流畅度",
  missing_detail: "信息不足",
  workplace_tone: "职场语气",
  pronunciation_prompt: "发音提示",
};

const scenes = {
  restaurant: {
    title: "餐厅点餐",
    role: "Waiter",
    goal: "练习预订、点餐、修改需求和结账时更礼貌自然的表达。",
    opener: "Hi, welcome in. Do you have a reservation?",
    hints: [
      "I'd like a table for two, please.",
      "Could I see the menu?",
      "I'll have the beef, please.",
      "Could we get the check, please?",
    ],
    replies: [
      "Sure. Would you prefer indoor or outdoor seating?",
      "Great. Can I get you something to drink first?",
      "Would you like any sides with that?",
      "No problem. Is there anything else I can help you with?",
      "Here is your check. You can pay whenever you're ready.",
    ],
  },
  airport: {
    title: "机场出行",
    role: "Airline Staff",
    goal: "练习值机、托运行李、登机口和入境问题。",
    opener: "Good morning. May I see your passport and booking reference?",
    hints: [
      "Here is my passport.",
      "I'd like to check in for my flight.",
      "Could you tell me where the gate is?",
      "Is my luggage checked through to the final destination?",
    ],
    replies: [
      "Thank you. Are you checking any bags today?",
      "Your flight is on time. The gate opens in about 40 minutes.",
      "Your bag is slightly over the limit. Would you like to repack it?",
      "Please keep your boarding pass with you.",
      "You are all set. Have a pleasant flight.",
    ],
  },
  hotel: {
    title: "酒店入住",
    role: "Front Desk",
    goal: "练习入住、房间需求、延迟退房和反馈问题。",
    opener: "Welcome to Lakeside Hotel. Do you have a reservation with us?",
    hints: [
      "I have a reservation under Wang.",
      "Could I check in now?",
      "Is breakfast included?",
      "Could I get a late checkout?",
    ],
    replies: [
      "Let me check that for you. Could I see your ID, please?",
      "Your room is ready. Would you prefer a higher floor?",
      "Breakfast is served from 7 to 10 on the second floor.",
      "I can offer a late checkout until 1 p.m.",
      "Here are your key cards. Enjoy your stay.",
    ],
  },
  smalltalk: {
    title: "日常寒暄",
    role: "New Friend",
    goal: "练习自我介绍、兴趣、周末计划和自然接话。",
    opener: "Hey, I don't think we've met before. I'm Alex.",
    hints: [
      "Nice to meet you. I'm Yu.",
      "I work in software development.",
      "I'm into movies and hiking.",
      "How about you?",
    ],
    replies: [
      "Nice to meet you too. What do you do?",
      "That sounds interesting. How did you get into that?",
      "What do you usually do on weekends?",
      "I like that too. Do you have any recommendations?",
      "It was great talking with you. Let's keep in touch.",
    ],
  },
  work: {
    title: "工作沟通",
    role: "Team Lead",
    goal: "练习确认需求、汇报进度、解释问题和提出建议。",
    opener: "Hi, could you give me a quick update on the project?",
    hints: [
      "I've finished the first part.",
      "I'm still working on the API integration.",
      "Could you clarify the requirement?",
      "I suggest we test it before release.",
    ],
    replies: [
      "Thanks. What is the main blocker right now?",
      "Could you estimate when the next version will be ready?",
      "That makes sense. Please document the change.",
      "Let's align with the design team before moving forward.",
      "Good update. Please send me a short summary after the meeting.",
    ],
  },
};

const localScenarioFallbacks = {
  restaurant: [
    {
      title: "临时换到安静座位",
      role: "Waiter",
      opener: "Hi, is everything okay with your table?",
      goal: "说明旁边太吵，礼貌请求换到更安静的位置。",
      constraints: ["说明现在的问题", "提出换座请求", "接受或确认等待时间"],
      followUps: [
        "I can check another table for you.",
        "Would a table near the window be okay?",
        "It may take about ten minutes. Is that alright?",
      ],
    },
    {
      title: "询问推荐菜和忌口",
      role: "Waiter",
      opener: "Hi, are you ready to order, or would you like a recommendation?",
      goal: "询问推荐菜，同时说明一个忌口或过敏信息。",
      constraints: ["询问推荐菜", "说明一个忌口", "确认是否可以替换配料"],
      followUps: [
        "Our grilled chicken is popular tonight.",
        "Would you like the sauce on the side?",
        "I can ask the kitchen to leave that out.",
      ],
    },
  ],
  airport: [
    {
      title: "登机口临时变更",
      role: "Gate Agent",
      opener: "Hi, your flight has moved to a different gate.",
      goal: "确认新登机口、登机时间，并询问是否还有足够时间。",
      constraints: ["确认新登机口", "询问登机时间", "说明你担心赶不上"],
      followUps: [
        "The new gate is B18.",
        "Boarding starts in about twenty minutes.",
        "You still have enough time if you go now.",
      ],
    },
  ],
  hotel: [
    {
      title: "房间空调有问题",
      role: "Front Desk",
      opener: "Good evening. How can I help you with your room?",
      goal: "说明空调问题，并请求维修或换房。",
      constraints: ["说明房间号", "描述空调问题", "提出维修或换房请求"],
      followUps: [
        "I am sorry about that. What is your room number?",
        "We can send someone up in ten minutes.",
        "If it cannot be fixed, we can move you.",
      ],
    },
  ],
  smalltalk: [
    {
      title: "第一次见面聊周末",
      role: "New Friend",
      opener: "Hey, I don't think we've met before. How's your weekend going?",
      goal: "自然介绍自己，聊周末安排，并反问对方。",
      constraints: ["简单介绍自己", "说一个周末安排", "反问对方"],
      followUps: [
        "That sounds nice. Do you usually do that on weekends?",
        "I might try something similar.",
        "Have you lived around here long?",
      ],
    },
  ],
  work: [
    {
      title: "同步延期和下一步",
      role: "Manager",
      opener: "Hi, can you give me a quick update on the task?",
      goal: "说明进度、解释延期原因，并给出下一步时间。",
      constraints: ["说明当前进度", "解释一个具体阻碍", "给出下一步时间"],
      followUps: [
        "What is blocking it right now?",
        "When do you think you can send the next version?",
        "Do you need anything from me?",
      ],
    },
  ],
};

let state = {
  sceneId: "restaurant",
  turn: 0,
  messages: [],
  feedback: [],
  lastSuggestion: "",
  scenario: null,
  completed: false,
  isLoadingScenario: false,
};

const elements = {
  sceneButtons: document.querySelectorAll(".scene-button"),
  sceneTitle: document.querySelector("#sceneTitle"),
  scenarioPanel: document.querySelector("#scenarioPanel"),
  turnCounter: document.querySelector("#turnCounter"),
  chatLog: document.querySelector("#chatLog"),
  replyForm: document.querySelector("#replyForm"),
  replyInput: document.querySelector("#replyInput"),
  hintButton: document.querySelector("#hintButton"),
  hintText: document.querySelector("#hintText"),
  feedbackPanel: document.querySelector("#feedbackPanel"),
  reviewPanel: document.querySelector("#reviewPanel"),
  historyDetailPanel: document.querySelector("#historyDetailPanel"),
  progressPanel: document.querySelector("#progressPanel"),
  favoriteList: document.querySelector("#favoriteList"),
  dailyReviewList: document.querySelector("#dailyReviewList"),
  saveFavoriteButton: document.querySelector("#saveFavoriteButton"),
  restartButton: document.querySelector("#restartButton"),
  exportButton: document.querySelector("#exportButton"),
  historySummary: document.querySelector("#historySummary"),
  historyList: document.querySelector("#historyList"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
  toast: document.querySelector("#toast"),
};

async function startScene(sceneId, options = {}) {
  const scene = scenes[sceneId];
  const reviewScenario = options.scenario || null;

  state = {
    sceneId,
    turn: 0,
    messages: [{ speaker: scene.role, text: "One moment. I am setting up a realistic practice task.", type: "ai" }],
    feedback: [],
    lastSuggestion: "",
    scenario: null,
    completed: false,
    isLoading: false,
    isLoadingScenario: true,
  };

  elements.sceneButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.scene === sceneId);
  });

  elements.sceneTitle.textContent = scene.title;
  elements.replyInput.value = "";
  setReplyDisabled(true);
  elements.hintText.textContent = "正在生成一个更贴近真实生活的本轮任务。";
  render();

  if (reviewScenario) {
    state.scenario = reviewScenario;
    state.messages = [{ speaker: reviewScenario.role || scene.role, text: reviewScenario.opener || scene.opener, type: "ai" }];
    state.isLoadingScenario = false;
    elements.hintText.textContent = reviewScenario.goal || scene.goal;
    setReplyDisabled(false);
    showToast("已生成薄弱点复练任务。");
    render();
    return;
  }

  const scenario = await requestScenario(sceneId, scene);

  if (state.sceneId !== sceneId) {
    return;
  }

  state.scenario = scenario;
  state.messages = [{ speaker: scenario.role || scene.role, text: scenario.opener || scene.opener, type: "ai" }];
  state.isLoadingScenario = false;
  elements.hintText.textContent = scenario.goal || scene.goal;
  setReplyDisabled(false);
  render();
}

async function requestScenario(sceneId, scene) {
  const payload = {
    sceneId,
    sceneTitle: scene.title,
    role: scene.role,
    level: "beginner",
    recentScenarioTitles: getRecentScenarioTitles(sceneId),
    weaknessProfile: buildWeaknessProfile(sceneId),
  };

  try {
    const response = await fetch(SCENARIO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Scenario request failed: ${response.status}`);
    }

    return normalizeScenario(await response.json(), scene);
  } catch (error) {
    console.warn(error);
    showToast("任务生成接口不可用，已使用本地真实场景任务。");
    return buildLocalScenario(sceneId, scene);
  }
}

function normalizeScenario(data, scene) {
  data = data || {};
  const fallback = buildLocalScenario(state.sceneId, scene);
  const constraints = Array.isArray(data.constraints) ? data.constraints.filter(Boolean).slice(0, 4) : [];
  const followUps = Array.isArray(data.followUps) ? data.followUps.filter(Boolean).slice(0, 5) : [];

  return {
    title: data.title || fallback.title,
    role: data.role || scene.role,
    opener: data.opener || fallback.opener,
    goal: data.goal || fallback.goal,
    constraints: constraints.length >= 2 ? constraints : fallback.constraints,
    followUps: followUps.length ? followUps : fallback.followUps,
    difficulty: ["beginner", "intermediate", "advanced", "review"].includes(data.difficulty)
      ? data.difficulty
      : "beginner",
    source: data.source === "openai" ? "openai" : "fallback",
  };
}

function buildLocalScenario(sceneId, scene) {
  const candidates = localScenarioFallbacks[sceneId] || localScenarioFallbacks.restaurant;
  const recentTitles = new Set(getRecentScenarioTitles(sceneId));
  const fresh = candidates.filter((item) => !recentTitles.has(item.title));
  const pool = fresh.length ? fresh : candidates;
  const selected = pool[Math.floor(Math.random() * pool.length)];

  return {
    title: selected.title,
    role: selected.role || scene.role,
    opener: selected.opener || scene.opener,
    goal: selected.goal || scene.goal,
    constraints: selected.constraints || scene.hints.slice(0, 3),
    followUps: selected.followUps || scene.replies,
    difficulty: "beginner",
    source: "fallback",
  };
}

function getRecentScenarioTitles(sceneId) {
  return loadJson(STORAGE_KEYS.history, [])
    .filter((item) => item.sceneId === sceneId && item.scenario?.title)
    .slice(0, 8)
    .map((item) => item.scenario.title);
}

function render() {
  renderChat();
  renderScenario();
  renderFeedback();
  renderReview();
  renderProgress();
  updateHistorySummary();
  renderHistoryList();
  renderHistoryDetail();
  renderFavoriteList();
  renderDailyReview();
  elements.turnCounter.textContent = String(state.turn);
}

function renderScenario() {
  if (state.isLoadingScenario) {
    elements.scenarioPanel.innerHTML = `
      <strong>正在生成本轮真实任务</strong>
      <span>同一个大场景下，每次会尽量换成不同的具体情况、目标和开场。</span>
    `;
    return;
  }

  if (!state.scenario) {
    elements.scenarioPanel.innerHTML = `
      <strong>本轮任务</strong>
      <span>${escapeHtml(scenes[state.sceneId].goal)}</span>
    `;
    return;
  }

  elements.scenarioPanel.innerHTML = `
    <strong>${escapeHtml(state.scenario.title)}</strong>
    <span>${escapeHtml(state.scenario.goal)}</span>
    <ul>
      ${state.scenario.constraints.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderChat() {
  const messagesHtml = state.messages
    .map(
      (message) => `
        <article class="message ${message.type}">
          <small>${escapeHtml(message.speaker)}</small>
          ${escapeHtml(message.text)}
        </article>
      `,
    )
    .join("");

  elements.chatLog.innerHTML = `
    ${messagesHtml}
    ${state.turn < 2 && !state.completed ? renderPracticeBrief() : ""}
  `;
  elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
}

function renderPracticeBrief() {
  const scene = scenes[state.sceneId];
  const examples = (scene.hints || []).slice(0, 3);
  const constraints = (state.scenario?.constraints || []).slice(0, 3);

  return `
    <section class="practice-brief" aria-label="本轮练习提示">
      <div class="brief-heading">
        <span>Practice Focus</span>
        <strong>${escapeHtml(state.scenario?.title || scene.title)}</strong>
      </div>
      <div class="brief-grid">
        <div>
          <small>本轮目标</small>
          <p>${escapeHtml(state.scenario?.goal || scene.goal)}</p>
        </div>
        <div>
          <small>可直接套用</small>
          <ul>
            ${examples.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
        <div>
          <small>回答时检查</small>
          <ul>
            ${constraints.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      </div>
    </section>
  `;
}

function renderFeedback() {
  const latest = state.feedback.at(-1);

  if (state.isLoading) {
    elements.feedbackPanel.innerHTML =
      '<p class="empty-state">正在调用 AI 教练分析你的表达，请稍等...</p>';
    return;
  }

  if (!latest) {
    elements.feedbackPanel.innerHTML = `
      <div class="coach-placeholder">
        <div class="score-preview">
          <strong>--</strong>
          <span>自然度</span>
        </div>
        <div class="coach-checklist">
          <span>等待你的第一句英文回复</span>
          <span>会检查礼貌程度、信息完整度和自然表达</span>
          <span>每轮都会给出一句可复述的替代表达</span>
        </div>
      </div>
    `;
    return;
  }

  const scoreClass = latest.score >= 80 ? "good" : latest.score >= 60 ? "" : "warning";
  const scoreTone = latest.score >= 80 ? "good" : latest.score >= 60 ? "steady" : "warning";
  const sessionTags = getTagDistribution(state.feedback);

  elements.feedbackPanel.innerHTML = `
    <div class="feedback-card">
      <div class="score-visual ${scoreTone}">
        <div class="score-ring" style="--score: ${latest.score}">
          <strong>${latest.score}</strong>
          <span>/100</span>
        </div>
        <div>
          <strong>${escapeHtml(latest.level)}</strong>
          <span>${latest.source === "fallback" ? "规则兜底反馈" : "AI 教练反馈"}</span>
        </div>
      </div>
      <div class="score-row">
        <span class="tag ${scoreClass}">自然度 ${latest.score}/100</span>
        <span class="tag">${latest.level}</span>
        <span class="tag ${latest.source === "fallback" ? "warning" : "good"}">${
          latest.source === "fallback" ? "规则兜底" : "AI 生成"
        }</span>
      </div>
      <div class="feedback-item">
        <strong>你的表达</strong>
        <span>${escapeHtml(latest.original)}</span>
      </div>
      <div class="feedback-item">
        <strong>首推复述句</strong>
        <span class="coach-line">${escapeHtml(latest.suggestion)}</span>
      </div>
      <div class="feedback-item">
        <strong>教练判断</strong>
        <span>${escapeHtml(latest.reason)}</span>
      </div>
      <div class="feedback-item">
        <strong>也可以这样说</strong>
        <div class="alternative-list">
          ${latest.alternatives.map((sentence) => `<span>${escapeHtml(sentence)}</span>`).join("")}
        </div>
      </div>
      <div class="feedback-item">
        <strong>错误类型</strong>
        <div class="tag-row">${renderTagList(latest.errorTags)}</div>
      </div>
      <div class="feedback-item">
        <strong>本轮标签分布</strong>
        <div class="tag-bars">${renderTagBars(sessionTags)}</div>
      </div>
      <div class="feedback-item">
        <strong>下一句训练</strong>
        <span>${escapeHtml(latest.reviewTip)}</span>
      </div>
    </div>
  `;
}

function renderReview() {
  if (!state.completed) {
    const count = state.feedback.length;
    const progress = Math.round((count / MAX_TURNS) * 100);
    elements.reviewPanel.innerHTML = `
      <div class="session-progress">
        <div>
          <strong>${count}/${MAX_TURNS}</strong>
          <span>完成 5 轮后生成复盘。</span>
        </div>
        <div class="progress-track" aria-label="本次练习进度">
          <span style="width: ${progress}%"></span>
        </div>
      </div>
    `;
    return;
  }

  const weakPoints = getWeakPoints();
  const bestSentences = state.feedback.map((item) => item.suggestion).slice(-3);
  const averageScore = getAverageScore(state.feedback);
  const topTags = getTopErrorTags(state.feedback);
  const drillPlan = buildDrillPlan(topTags);

  elements.reviewPanel.innerHTML = `
    <p><strong>场景：</strong>${escapeHtml(scenes[state.sceneId].title)}</p>
    <p><strong>本轮任务：</strong>${escapeHtml(state.scenario?.title || "未记录具体任务")}</p>
    <p><strong>平均自然度：</strong>${averageScore}/100</p>
    <p><strong>主要问题：</strong>${topTags.length ? topTags.map(getTagLabel).join("、") : "暂无明显问题"}</p>
    <p><strong>建议重点：</strong>${escapeHtml(weakPoints.join("；"))}</p>
    <div class="drill-plan">
      <strong>下一步训练</strong>
      <ul>
        ${drillPlan.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>
    <div class="drill-actions">
      <button class="primary-button start-weak-drill" type="button">复练薄弱点</button>
      <span>用本轮低分表达生成一个针对性任务。</span>
    </div>
    <ol class="review-list">
      ${bestSentences.map((sentence) => `<li>${escapeHtml(sentence)}</li>`).join("")}
    </ol>
  `;
}

async function handleReply(event) {
  event.preventDefault();

  if (state.isLoadingScenario) {
    showToast("本轮任务还在生成，请稍等。");
    return;
  }

  if (state.completed) {
    showToast("本轮练习已完成，可以重新开始或切换场景。");
    return;
  }

  const text = elements.replyInput.value.trim();

  if (!text) {
    showToast("请先输入一句英文回复。");
    return;
  }

  const scene = scenes[state.sceneId];
  const aiRole = state.scenario?.role || scene.role;
  const userMessage = { speaker: "You", text, type: "user" };
  const conversation = [...state.messages, userMessage];

  state.messages.push(userMessage);
  state.isLoading = true;
  elements.replyInput.value = "";
  setReplyDisabled(true);
  render();

  const feedback = await requestCoachFeedback(text, scene, conversation);
  const scenarioFollowUp = state.scenario?.followUps?.[state.turn];
  const aiReply = feedback.nextReply || scenarioFollowUp || scene.replies[state.turn] || scene.replies.at(-1);

  state.isLoading = false;
  state.feedback.push(feedback);
  state.lastSuggestion = feedback.suggestion;
  state.turn += 1;

  if (state.turn >= MAX_TURNS) {
    state.completed = true;
    state.messages.push({
      speaker: aiRole,
      text: `${aiReply} Great practice. Let's review your useful expressions.`,
      type: "ai",
    });
    saveHistory();
    setReplyDisabled(true);
  } else {
    state.messages.push({ speaker: aiRole, text: aiReply, type: "ai" });
    setReplyDisabled(false);
  }

  render();
}

async function requestCoachFeedback(text, scene, conversation) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sceneId: state.sceneId,
        sceneTitle: scene.title,
        role: state.scenario?.role || scene.role,
        goal: state.scenario?.goal || scene.goal,
        turn: state.turn,
        maxTurns: MAX_TURNS,
        messages: conversation,
        userReply: text,
        scenario: state.scenario,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return normalizeFeedback(await response.json(), text, scene);
  } catch (error) {
    console.warn(error);
    showToast("AI 后端不可用，已使用本地规则版反馈。");
    return { ...buildFeedback(text, scene), nextReply: "", source: "fallback" };
  }
}

function normalizeFeedback(data, text, scene) {
  const fallback = buildFeedback(text, scene);
  const alternatives =
    Array.isArray(data.alternatives) && data.alternatives.length
      ? data.alternatives.slice(0, 3).map(String).filter(Boolean)
      : fallback.alternatives;

  return {
    original: text,
    score: clampNumber(data.score, fallback.score, 0, 100),
    level: data.level || fallback.level,
    suggestion: data.suggestion || fallback.suggestion,
    reason: data.reason || fallback.reason,
    alternatives: ensureRepeatableAlternatives(alternatives, data.suggestion || fallback.suggestion),
    nextReply: data.nextReply || "",
    source: data.source === "openai" ? "openai" : "fallback",
    errorTags: normalizeErrorTags(data.errorTags || fallback.errorTags),
    reviewTip: data.reviewTip || fallback.reviewTip,
  };
}

function ensureRepeatableAlternatives(alternatives, suggestion) {
  const cleaned = alternatives
    .map((item) => String(item).trim())
    .filter((item) => item && !item.includes("..."));
  const unique = [...new Set([suggestion, ...cleaned].filter(Boolean))].slice(0, 3);

  while (unique.length < 2) {
    unique.push("Could you help me with that, please?");
  }

  return unique;
}

function setReplyDisabled(disabled) {
  elements.replyInput.disabled = disabled;
  elements.replyForm.querySelector("button[type='submit']").disabled = disabled;
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(number)));
}

function buildFeedback(text, scene) {
  const lower = text.toLowerCase();
  const issues = [];
  const errorTags = [];
  let score = 78;
  let suggestion = text;
  let reason = "这句话基本能表达意思。可以再调整礼貌程度、冠词或常用搭配，让它更像真实交流。";
  let alternatives = scene.hints.slice(0, 3);

  if (/\bi want eat\b|\bi want to eat\b|\bi want\b/.test(lower)) {
    score -= 14;
    issues.push("用 I want 在服务场景里偏直接");
    errorTags.push("politeness");
    suggestion = getSceneSuggestion(scene, "politeRequest");
    reason = "真实点餐或请求服务时，I’d like / Could I get / May I have 通常更礼貌自然。";
    alternatives = [
      suggestion,
      "Could I get that, please?",
      "I'll have that, please.",
    ];
  }

  if (!/[.!?]$/.test(text)) {
    score -= 4;
    issues.push("句末标点缺失");
    errorTags.push("grammar");
  }

  if (text.split(/\s+/).length <= 3) {
    score -= 10;
    issues.push("信息太短");
    errorTags.push("missing_detail");
    suggestion = getSceneSuggestion(scene, "completeSentence");
    reason = "真实对话里最好给出完整意图，必要时补充对象、时间或请求。";
  }

  if (/\bplease\b/.test(lower)) {
    score += 5;
  }

  if (/\bcould\b|\bwould\b|\bi'd like\b|\blet me\b|\bjust to confirm\b/.test(lower)) {
    score += 8;
  }

  if (/\bcan you\b/.test(lower)) {
    score -= 3;
    issues.push("Can you 可用，但 Could you 更委婉");
    errorTags.push("politeness");
  }

  score = Math.max(45, Math.min(96, score));

  if (suggestion === text) {
    suggestion = polishSentence(text, scene);
  }

  const level =
    score >= 85 ? "自然" : score >= 70 ? "可理解，略生硬" : "能猜到意思，但需要改写";

  return {
    original: text,
    score,
    level,
    suggestion,
    reason: issues.length ? `${reason} 主要问题：${issues.join("、")}。` : reason,
    alternatives,
    nextReply: "",
    errorTags: normalizeErrorTags(errorTags.length ? errorTags : inferErrorTags(reason)),
    reviewTip: buildReviewTip(errorTags.length ? errorTags : inferErrorTags(reason)),
    source: "fallback",
  };
}

function getSceneSuggestion(scene, type) {
  const map = {
    restaurant: {
      politeRequest: "I'd like the beef, please.",
      completeSentence: "I'd like a table for two, please.",
    },
    airport: {
      politeRequest: "Could you tell me where the gate is, please?",
      completeSentence: "I'd like to check in for my flight, please.",
    },
    hotel: {
      politeRequest: "Could I get a late checkout, please?",
      completeSentence: "I have a reservation under Wang.",
    },
    smalltalk: {
      politeRequest: "Could you tell me more about that?",
      completeSentence: "Nice to meet you. I'm Yu, and I work in software development.",
    },
    work: {
      politeRequest: "Could you clarify the requirement, please?",
      completeSentence: "I've finished the first part, and I'm working on the API integration now.",
    },
  };

  const sceneId = Object.keys(scenes).find((id) => scenes[id] === scene);
  return map[sceneId][type];
}

function polishSentence(text, scene) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  const startsWithLower = /^[a-z]/.test(trimmed);
  const capitalized = startsWithLower
    ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
    : trimmed;
  const punctuated = /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;

  if (scene === scenes.work && !/\bjust to confirm\b/i.test(punctuated)) {
    return `Just to confirm, ${punctuated.charAt(0).toLowerCase()}${punctuated.slice(1)}`;
  }

  return punctuated;
}

function getWeakPoints() {
  const average =
    state.feedback.reduce((sum, item) => sum + item.score, 0) / Math.max(state.feedback.length, 1);

  if (average >= 85) {
    return ["整体表达自然，下一步可以练更快反应和更丰富的追问"];
  }

  const reasons = state.feedback.map((item) => item.reason).join(" ");
  const points = [];

  if (/I want|偏直接|礼貌/.test(reasons)) {
    points.push("多用 I’d like / Could I / Would it be possible 表达请求");
  }

  if (/信息太短/.test(reasons)) {
    points.push("回答时补充对象、时间、原因或下一步动作");
  }

  if (/标点/.test(reasons)) {
    points.push("注意句子完整性，输入时也按完整句训练");
  }

  return points.length ? points : ["继续积累当前场景的固定表达，并训练自然追问"];
}

function getAverageScore(feedbackItems) {
  if (!feedbackItems.length) {
    return 0;
  }

  return Math.round(feedbackItems.reduce((sum, item) => sum + item.score, 0) / feedbackItems.length);
}

function getTopErrorTags(feedbackItems) {
  const counts = {};

  feedbackItems.forEach((item) => {
    normalizeErrorTags(item.errorTags).forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .slice(0, 3);
}

function getTagDistribution(feedbackItems) {
  const counts = {};
  let total = 0;

  feedbackItems.forEach((item) => {
    normalizeErrorTags(item.errorTags).forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
      total += 1;
    });
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({
      tag,
      count,
      percent: total ? Math.max(12, Math.round((count / total) * 100)) : 0,
    }));
}

function renderTagBars(distribution) {
  if (!distribution.length) {
    return '<p class="empty-state">继续练习后会显示错误标签分布。</p>';
  }

  return distribution
    .map(
      (item) => `
        <div class="tag-bar">
          <span>${escapeHtml(getTagLabel(item.tag))}</span>
          <div><i style="width: ${item.percent}%"></i></div>
          <strong>${item.count}</strong>
        </div>
      `,
    )
    .join("");
}

function buildWeaknessProfile(sceneId) {
  const history = loadJson(STORAGE_KEYS.history, []);
  const sameSceneFeedback = history
    .filter((session) => !sceneId || session.sceneId === sceneId)
    .flatMap((session) => session.feedback || []);
  const allFeedback = history.flatMap((session) => session.feedback || []);
  const source = sameSceneFeedback.length ? sameSceneFeedback : allFeedback;
  const weakItems = [...source]
    .filter((item) => (Number(item.score) || 0) < 84)
    .sort((a, b) => (Number(a.score) || 100) - (Number(b.score) || 100))
    .slice(0, 3);
  const topTags = getTopErrorTags(weakItems.length ? weakItems : source).slice(0, 4);

  return {
    topTags,
    weakSentences: weakItems.map((item) => item.original).filter(Boolean).slice(0, 3),
    suggestedPatterns: weakItems.map((item) => item.suggestion).filter(Boolean).slice(0, 3),
    recentReviewTips: weakItems.map((item) => item.reviewTip).filter(Boolean).slice(0, 3),
  };
}

function buildLearningProfile(history) {
  const sessions = Array.isArray(history) ? history : [];
  const feedback = sessions.flatMap((session) =>
    (session.feedback || []).map((item) => ({
      ...item,
      sceneId: session.sceneId,
      scene: session.scene,
      sessionId: session.id,
      createdAt: session.createdAt,
    })),
  );
  const weakItems = [...feedback]
    .filter((item) => (Number(item.score) || 0) < 84)
    .sort((a, b) => (Number(a.score) || 100) - (Number(b.score) || 100))
    .slice(0, 6);
  const recentScores = sessions
    .slice(0, 5)
    .map((session) => Number(session.averageScore) || 0)
    .filter(Boolean);
  const trend =
    recentScores.length >= 2 ? recentScores[0] - recentScores[recentScores.length - 1] : 0;
  const topTags = getTopErrorTags(weakItems.length ? weakItems : feedback).slice(0, 4);

  return {
    topTags,
    weakItems,
    trend,
    trendLabel: getTrendLabel(trend),
    reviewCards: buildReviewCards(sessions, weakItems),
  };
}

function getTrendLabel(trend) {
  if (trend >= 5) return `最近提升 ${trend} 分`;
  if (trend <= -5) return `最近下降 ${Math.abs(trend)} 分`;
  return "最近表现稳定";
}

function buildReviewCards(sessions, weakItems) {
  const favorites = loadJson(STORAGE_KEYS.favorites, []).map((item) => ({
    id: item.id,
    sentence: item.sentence,
    scene: item.scene || "收藏句",
    tags: normalizeErrorTags(item.tags),
    reviewTip: item.reviewTip || buildReviewTip(item.tags),
    source: "favorite",
  }));
  const weakCards = weakItems.map((item, index) => ({
    id: `${item.sessionId || "weak"}-${index}`,
    sentence: item.suggestion,
    original: item.original,
    scene: item.scene || "低分复习",
    tags: normalizeErrorTags(item.errorTags),
    reviewTip: item.reviewTip || buildReviewTip(item.errorTags),
    source: "weak",
  }));
  const latestSessionCards = sessions.slice(0, 2).flatMap((session) =>
    (session.feedback || [])
      .slice(-2)
      .map((item, index) => ({
        id: `${session.id || "session"}-${index}`,
        sentence: item.suggestion,
        scene: session.scenario?.title || session.scene || "最近练习",
        tags: normalizeErrorTags(item.errorTags),
        reviewTip: item.reviewTip || buildReviewTip(item.errorTags),
        source: "recent",
      })),
  );

  return dedupeReviewCards([...favorites, ...weakCards, ...latestSessionCards]).slice(0, 5);
}

function dedupeReviewCards(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item.sentence || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getProgressSummary(history) {
  const sessions = Array.isArray(history) ? history : [];
  const feedback = sessions.flatMap((session) => session.feedback || []);
  const learningProfile = buildLearningProfile(sessions);
  const sceneStats = Object.fromEntries(
    Object.keys(scenes).map((sceneId) => [
      sceneId,
      {
        count: 0,
        scoreTotal: 0,
      },
    ]),
  );

  sessions.forEach((session) => {
    const sceneId = session.sceneId;
    if (!sceneStats[sceneId]) return;

    sceneStats[sceneId].count += 1;
    sceneStats[sceneId].scoreTotal += Number(session.averageScore) || 0;
  });

  const sceneRows = Object.entries(sceneStats).map(([sceneId, item]) => ({
    sceneId,
    title: scenes[sceneId].title,
    count: item.count,
    averageScore: item.count ? Math.round(item.scoreTotal / item.count) : 0,
  }));
  const unpracticed = sceneRows.find((item) => item.count === 0);
  const weakest = sceneRows
    .filter((item) => item.count > 0)
    .sort((a, b) => a.averageScore - b.averageScore || a.count - b.count)[0];
  const recommendedScene = unpracticed || weakest || sceneRows[0];
  const practicedDays = new Set(
    sessions
      .map((session) => (session.createdAt ? new Date(session.createdAt).toLocaleDateString() : ""))
      .filter(Boolean),
  ).size;

  return {
    sessions,
    feedback,
    averageScore: getAverageScore(feedback),
    practicedDays,
    topTags: learningProfile.topTags.length ? learningProfile.topTags : getTopErrorTags(feedback),
    recommendedScene,
    learningProfile,
  };
}

function renderProgress() {
  const history = loadJson(STORAGE_KEYS.history, []);
  const summary = getProgressSummary(history);

  if (!summary.sessions.length) {
    elements.progressPanel.innerHTML =
      '<p class="empty-state">完成一轮练习后，会统计常见问题并推荐下一场景。</p>';
    return;
  }

  const tagText = summary.topTags.length ? summary.topTags.map(getTagLabel).join("、") : "暂无明显短板";
  const drillPlan = buildDrillPlan(summary.topTags).slice(0, 2);
  const profile = summary.learningProfile;
  const weaknessChips = summary.topTags.length
    ? summary.topTags.map((tag) => `<span class="weakness-chip">${escapeHtml(getTagLabel(tag))}</span>`).join("")
    : '<span class="weakness-chip">继续积累数据</span>';

  elements.progressPanel.innerHTML = `
    <div class="progress-grid">
      <div>
        <span>完成练习</span>
        <strong>${summary.sessions.length}</strong>
      </div>
      <div>
        <span>平均自然度</span>
        <strong>${summary.averageScore}/100</strong>
      </div>
      <div>
        <span>练习天数</span>
        <strong>${summary.practicedDays}</strong>
      </div>
    </div>
    <div class="trend-card">
      <span>自然度趋势</span>
      <strong>${escapeHtml(profile.trendLabel)}</strong>
      <small>基于最近 ${Math.min(summary.sessions.length, 5)} 次练习</small>
    </div>
    <div class="progress-focus">
      <span>常见问题</span>
      <strong>${escapeHtml(tagText)}</strong>
      <div class="weakness-chip-row">${weaknessChips}</div>
    </div>
    <div class="progress-focus">
      <span>建议训练</span>
      <ul>
        ${drillPlan.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>
    <button class="ghost-button start-recommended-scene" type="button" data-scene="${escapeHtml(
      summary.recommendedScene.sceneId,
    )}">
      练习${escapeHtml(summary.recommendedScene.title)}
    </button>
    <button class="ghost-button start-weak-drill" type="button">复练薄弱点</button>
  `;
}

function collectWeakFeedback(sessionId) {
  const history = loadJson(STORAGE_KEYS.history, []);
  const currentItems = state.feedback.map((item) => ({
    ...item,
    sceneId: state.sceneId,
    scene: scenes[state.sceneId].title,
  }));

  if (sessionId) {
    const session = history.find((item, index) => (item.id || String(index)) === sessionId);
    return {
      sceneId: session?.sceneId || state.sceneId,
      items: (session?.feedback || []).map((item) => ({
        ...item,
        sceneId: session?.sceneId || state.sceneId,
        scene: session?.scene || scenes[state.sceneId].title,
      })),
    };
  }

  if (currentItems.length) {
    return { sceneId: state.sceneId, items: currentItems };
  }

  const historyItems = history.flatMap((session) =>
    (session.feedback || []).map((item) => ({
      ...item,
      sceneId: session.sceneId,
      scene: session.scene,
    })),
  );
  const firstSceneId = historyItems[0]?.sceneId || state.sceneId;
  return { sceneId: firstSceneId, items: historyItems };
}

function buildWeakDrillScenario(sceneId, feedbackItems) {
  const scene = scenes[sceneId] || scenes[state.sceneId];
  const sorted = [...feedbackItems].sort((a, b) => (a.score || 100) - (b.score || 100));
  const weakItems = (sorted.filter((item) => (item.score || 0) < 82).length ? sorted.filter((item) => (item.score || 0) < 82) : sorted).slice(0, 3);
  const topTags = getTopErrorTags(weakItems);
  const tagText = topTags.length ? topTags.map(getTagLabel).join("、") : "表达完整度";
  const original = weakItems[0]?.original || scene.hints[0] || "";
  const suggestion = weakItems[0]?.suggestion || scene.hints[0] || "";

  return {
    title: `复练：${tagText}`,
    role: scene.role,
    opener: `Let's try that again. ${scene.opener}`,
    goal: `复练上一轮薄弱点：${tagText}。先把意思说完整，再尽量用更自然、更礼貌的表达。`,
    constraints: [
      original ? `避免重复原句里的问题：${original}` : "先说完整句，不只说关键词。",
      suggestion ? `优先参考这句表达：${suggestion}` : "使用更自然的场景表达。",
      "补充至少一个具体信息，例如人数、时间、原因、偏好或下一步动作。",
    ],
    followUps: [
      "Can you add one more specific detail?",
      "How would you make that sound more polite?",
      "Could you confirm the main point one more time?",
      "What would you say if the other person asks a follow-up question?",
    ],
    difficulty: "review",
    source: "review",
  };
}

function startWeakDrill(sessionId) {
  const { sceneId, items } = collectWeakFeedback(sessionId);

  if (!items.length) {
    showToast("还没有可复练的历史反馈。先完成一轮练习。");
    return;
  }

  const validSceneId = scenes[sceneId] ? sceneId : state.sceneId;
  startScene(validSceneId, { scenario: buildWeakDrillScenario(validSceneId, items) });
}

function buildDrillPlan(tags) {
  const normalized = normalizeErrorTags(tags);
  const planMap = {
    grammar: "先用 1 个完整主谓宾句子回答，再补一句原因或需求。",
    politeness: "把直接表达改成 Could I / I'd like / Would it be possible。",
    word_choice: "每轮保留 1 个推荐句，复述 3 遍后再换词重说。",
    fluency: "限制自己 20 秒内说完整句，不追求复杂但要连续。",
    missing_detail: "回答时固定补充对象、时间、原因、下一步动作中的两个信息。",
    workplace_tone: "工作场景优先练 clarify、confirm、follow up 三类表达。",
    pronunciation_prompt: "把推荐句拆成 2-3 个意群，先慢读再正常速度读。",
  };

  if (!normalized.length) {
    return ["下一轮提高反应速度：先回答主句，再自然追问一句。"];
  }

  return normalized.map((tag) => planMap[tag]).filter(Boolean);
}

function normalizeErrorTags(tags) {
  const values = Array.isArray(tags) ? tags : [];
  const normalized = values
    .map((tag) => String(tag).trim().toLowerCase())
    .filter((tag) => ERROR_TAG_LABELS[tag]);

  return [...new Set(normalized)].slice(0, 4);
}

function inferErrorTags(text) {
  const tags = [];

  if (/语法|标点|want eat/i.test(text)) tags.push("grammar");
  if (/礼貌|I’d like|Could I|委婉/i.test(text)) tags.push("politeness");
  if (/自然|用词|搭配/i.test(text)) tags.push("word_choice");
  if (/太短|补充|信息/i.test(text)) tags.push("missing_detail");

  return normalizeErrorTags(tags.length ? tags : ["fluency"]);
}

function buildReviewTip(tags) {
  const first = normalizeErrorTags(tags)[0] || "fluency";
  const tips = {
    grammar: "先把句子主干说完整，再考虑更自然的表达。",
    politeness: "请求和服务场景优先练 I’d like / Could I / Would it be possible。",
    word_choice: "把推荐句当固定表达复述，不要逐词翻译中文。",
    fluency: "先用一个完整句快速回应，再补一个简单追问。",
    missing_detail: "回答时补充对象、时间、原因或下一步动作。",
    workplace_tone: "职场表达要明确、委婉，并带上确认或下一步。",
    pronunciation_prompt: "后续语音练习时关注重音、连读和停顿。",
  };

  return tips[first];
}

function getTagLabel(tag) {
  return ERROR_TAG_LABELS[tag] || tag;
}

function renderTagList(tags) {
  const normalized = normalizeErrorTags(tags);

  if (!normalized.length) {
    return '<span class="tag">暂无分类</span>';
  }

  return normalized.map((tag) => `<span class="tag">${escapeHtml(getTagLabel(tag))}</span>`).join("");
}

function showHint() {
  const scene = scenes[state.sceneId];
  const scenarioHints = state.scenario?.constraints || [];
  const hintSource = scenarioHints.length ? scenarioHints : scene.hints;
  const hint = hintSource[state.turn % hintSource.length];
  elements.hintText.textContent = hint;
}

function saveFavorite() {
  if (!state.lastSuggestion) {
    showToast("还没有可收藏的推荐表达。");
    return;
  }

  const favorites = loadJson(STORAGE_KEYS.favorites, []);
  favorites.unshift({
    id: createId(),
    scene: state.scenario?.title || scenes[state.sceneId].title,
    sentence: state.lastSuggestion,
    tags: normalizeErrorTags(state.feedback.at(-1)?.errorTags),
    reviewTip: state.feedback.at(-1)?.reviewTip || "",
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites.slice(0, 50)));
  renderFavoriteList();
  renderDailyReview();
  showToast("已收藏推荐表达。");
}

function saveHistory() {
  const history = loadJson(STORAGE_KEYS.history, []);
  const averageScore = getAverageScore(state.feedback);
  const session = buildSessionRecord(averageScore);
  history.unshift({
    ...session,
    averageScore,
  });
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history.slice(0, 20)));
}

function buildSessionRecord(averageScore) {
  const createdAt = new Date().toISOString();
  const feedback = state.feedback.map((item) => ({
    ...item,
    sceneId: state.sceneId,
    scene: scenes[state.sceneId].title,
  }));
  const learningProfile = buildLearningProfile([
    {
      id: "current",
      sceneId: state.sceneId,
      scene: scenes[state.sceneId].title,
      averageScore,
      feedback,
      createdAt,
    },
    ...loadJson(STORAGE_KEYS.history, []),
  ]);

  return {
    id: createId(),
    sceneId: state.sceneId,
    scene: scenes[state.sceneId].title,
    scenario: state.scenario,
    averageScore,
    topTags: getTopErrorTags(state.feedback),
    weakPoints: getWeakPoints(),
    messages: state.messages,
    feedback,
    learningProfile: {
      topTags: learningProfile.topTags,
      trendLabel: learningProfile.trendLabel,
      reviewCards: learningProfile.reviewCards.slice(0, 3),
    },
    createdAt,
  };
}

function updateHistorySummary() {
  const history = loadJson(STORAGE_KEYS.history, []);

  if (!history.length) {
    elements.historySummary.textContent = "暂无练习记录";
    elements.historyList.innerHTML = "";
    return;
  }

  const latest = history[0];
  elements.historySummary.textContent = `已完成 ${history.length} 次。最近：${latest.scenario?.title || latest.scene}，平均自然度 ${latest.averageScore}/100。`;
}

function renderHistoryList() {
  const history = loadJson(STORAGE_KEYS.history, []);

  if (!history.length) {
    elements.historyList.innerHTML = "";
    return;
  }

  elements.historyList.innerHTML = history
    .slice(0, 5)
    .map(
      (item, index) => `
        <button class="history-button" type="button" data-id="${escapeHtml(item.id || String(index))}">
          <strong>${escapeHtml(item.scenario?.title || item.scene || "历史练习")}</strong>
          <span>${item.averageScore || 0}/100 · ${new Date(item.createdAt).toLocaleDateString()}</span>
        </button>
      `,
    )
    .join("");
}

function renderHistoryDetail(sessionId) {
  const history = loadJson(STORAGE_KEYS.history, []);
  const session = sessionId
    ? history.find((item, index) => (item.id || String(index)) === sessionId)
    : history[0];

  if (!session) {
    elements.historyDetailPanel.innerHTML =
      '<p class="empty-state">完成一次练习后，这里会展示最近一次完整对话和纠错。</p>';
    return;
  }

  const feedback = Array.isArray(session.feedback) ? session.feedback : [];
  const messages = Array.isArray(session.messages) ? session.messages : [];
  const topTags = session.topTags || getTopErrorTags(feedback);
  const drillPlan = buildDrillPlan(topTags);

  elements.historyDetailPanel.innerHTML = `
    <div class="history-card">
      <div>
        <strong>${escapeHtml(session.scene)}</strong>
        <span>${escapeHtml(session.scenario?.title || "未记录具体任务")}</span>
        <span>${new Date(session.createdAt).toLocaleString()}</span>
      </div>
      <p>${escapeHtml(session.scenario?.goal || "")}</p>
      <div class="score-row">
        <span class="tag good">平均 ${session.averageScore}/100</span>
        ${renderTagList(topTags)}
      </div>
      <div class="drill-plan">
        <strong>下次重点</strong>
        <ul>
          ${drillPlan.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>
      <div class="drill-actions">
        <button class="primary-button start-weak-drill" type="button" data-session-id="${escapeHtml(
          session.id || "",
        )}">复练这次薄弱点</button>
        <span>从这次历史反馈生成复练任务。</span>
      </div>
      <ol class="review-list">
        ${feedback
          .map(
            (item, index) => `
              <li>
                <strong>第 ${index + 1} 轮：</strong>${escapeHtml(item.original)}<br />
                <span>推荐：${escapeHtml(item.suggestion)}</span><br />
                <span>复习：${escapeHtml(item.reviewTip || buildReviewTip(item.errorTags))}</span>
              </li>
            `,
          )
          .join("")}
      </ol>
      <details>
        <summary>查看完整对话</summary>
        <div class="mini-list">
          ${messages
            .map(
              (message) => `
                <div class="mini-item">
                  <strong>${escapeHtml(message.speaker)}</strong>
                  <span>${escapeHtml(message.text)}</span>
                </div>
              `,
            )
            .join("")}
        </div>
      </details>
    </div>
  `;
}

function renderFavoriteList() {
  const favorites = loadJson(STORAGE_KEYS.favorites, []);

  if (!favorites.length) {
    elements.favoriteList.innerHTML = '<p class="empty-state">收藏推荐表达后会出现在这里。</p>';
    return;
  }

  elements.favoriteList.innerHTML = `
    <div class="mini-list">
      ${favorites
        .slice(0, 8)
        .map(
          (item) => `
            <div class="mini-item">
              <strong>${escapeHtml(item.sentence)}</strong>
              <span>${escapeHtml(item.scene)} · ${new Date(item.createdAt).toLocaleDateString()}</span>
              <div class="tag-row">${renderTagList(item.tags)}</div>
              <button class="ghost-button delete-favorite" type="button" data-id="${escapeHtml(item.id)}">删除</button>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderDailyReview() {
  const history = loadJson(STORAGE_KEYS.history, []);
  const profile = buildLearningProfile(history);
  const reviewItems = profile.reviewCards;

  if (!reviewItems.length) {
    elements.dailyReviewList.innerHTML =
      '<p class="empty-state">完成练习或收藏句子后，会自动生成复习清单。</p>';
    return;
  }

  elements.dailyReviewList.innerHTML = `
    <div class="daily-review-head">
      <strong>今日复述 ${reviewItems.length} 句</strong>
      <button class="ghost-button start-weak-drill" type="button">按弱点复练</button>
    </div>
    ${reviewItems
      .map(
        (item) => `
          <div class="review-card">
            <div>
              <strong>${escapeHtml(item.sentence)}</strong>
              <small>${escapeHtml(item.scene || "复习句")}</small>
            </div>
            <div class="tag-row">${renderTagList(item.tags)}</div>
            <span>${escapeHtml(item.reviewTip || buildReviewTip(item.tags))}</span>
          </div>
        `,
      )
      .join("")}
  `;
}

function clearHistory() {
  localStorage.removeItem(STORAGE_KEYS.history);
  localStorage.removeItem(STORAGE_KEYS.favorites);
  updateHistorySummary();
  renderHistoryList();
  renderHistoryDetail();
  renderFavoriteList();
  renderDailyReview();
  showToast("本地记录已清空。");
}

function exportReview() {
  if (!state.feedback.length) {
    showToast("还没有可导出的练习内容。");
    return;
  }

  const lines = [
    `RealTalk English 练习复盘`,
    `场景：${scenes[state.sceneId].title}`,
    `本轮任务：${state.scenario?.title || "未记录具体任务"}`,
    `任务目标：${state.scenario?.goal || scenes[state.sceneId].goal}`,
    `时间：${new Date().toLocaleString()}`,
    "",
    ...state.feedback.flatMap((item, index) => [
      `第 ${index + 1} 轮`,
      `你的表达：${item.original}`,
      `更自然说法：${item.suggestion}`,
      `原因：${item.reason}`,
      `错误类型：${normalizeErrorTags(item.errorTags).map(getTagLabel).join("、")}`,
      `复习建议：${item.reviewTip || buildReviewTip(item.errorTags)}`,
      "",
    ]),
    `建议重点：${getWeakPoints().join("；")}`,
    `下一步训练：${buildDrillPlan(getTopErrorTags(state.feedback)).join("；")}`,
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `realtalk-review-${Date.now()}.txt`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("复盘已导出。");
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.setTimeout(() => elements.toast.classList.remove("show"), 1800);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

elements.sceneButtons.forEach((button) => {
  button.addEventListener("click", () => startScene(button.dataset.scene));
});
elements.replyForm.addEventListener("submit", handleReply);
elements.hintButton.addEventListener("click", showHint);
elements.saveFavoriteButton.addEventListener("click", saveFavorite);
elements.restartButton.addEventListener("click", () => startScene(state.sceneId));
elements.exportButton.addEventListener("click", exportReview);
elements.clearHistoryButton.addEventListener("click", clearHistory);
elements.progressPanel.addEventListener("click", (event) => {
  const button = event.target.closest(".start-recommended-scene");
  if (!button) return;

  startScene(button.dataset.scene);
});
elements.progressPanel.addEventListener("click", (event) => {
  const button = event.target.closest(".start-weak-drill");
  if (!button) return;

  startWeakDrill();
});
elements.reviewPanel.addEventListener("click", (event) => {
  const button = event.target.closest(".start-weak-drill");
  if (!button) return;

  startWeakDrill(button.dataset.sessionId);
});
elements.historyList.addEventListener("click", (event) => {
  const button = event.target.closest(".history-button");
  if (!button) return;

  renderHistoryDetail(button.dataset.id);
});
elements.historyDetailPanel.addEventListener("click", (event) => {
  const button = event.target.closest(".start-weak-drill");
  if (!button) return;

  startWeakDrill(button.dataset.sessionId);
});
elements.dailyReviewList.addEventListener("click", (event) => {
  const button = event.target.closest(".start-weak-drill");
  if (!button) return;

  startWeakDrill();
});
elements.favoriteList.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-favorite");
  if (!button) return;

  const favorites = loadJson(STORAGE_KEYS.favorites, []).filter((item) => item.id !== button.dataset.id);
  localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
  renderFavoriteList();
  renderDailyReview();
  showToast("已删除收藏句。");
});

startScene(state.sceneId);
