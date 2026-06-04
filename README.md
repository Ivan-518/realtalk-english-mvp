# RealTalk English MVP

RealTalk English 是一个面向真实生活和工作场景的英语陪练 MVP。产品闭环是：选择场景、完成 5 轮文本对话、获得教练式反馈、沉淀历史弱点、生成每日复习卡，并用薄弱点继续复练。

## 核心能力

| 模块 | 说明 |
| --- | --- |
| 动态任务卡 | 根据场景和历史弱点生成具体任务，例如点餐、机场、酒店、寒暄、工作沟通 |
| AI 教练反馈 | 输出自然度分数、主要问题、首推复述句、替代表达、错误标签和下一句训练 |
| 历史画像 | 使用 localStorage 保存 session、弱点标签、低分句、趋势和复习卡 |
| 弱点复练 | 按礼貌表达、信息完整度、语法结构、职场语气等弱点生成下一轮任务 |
| 移动端体验 | 手机端使用底部场景栏和聊天式输入，Playwright 覆盖 390px / 768px QA |
| 本地兜底 | 未配置 `OPENAI_API_KEY` 时仍可使用规则版反馈和任务卡 |

## 项目结构

| 路径 | 说明 |
| --- | --- |
| `web/index.html` | 单页应用入口 |
| `web/styles.css` | 响应式 UI、移动端布局、复习卡和反馈卡样式 |
| `web/app.js` | 前端状态、API 调用、localStorage 历史、复习和复练逻辑 |
| `server/main.py` | FastAPI 入口，提供静态页面、`/api/health`、`/api/scenario`、`/api/chat` |
| `server/config.py` | `.env`、OpenAI Base URL、模型和健康检查配置 |
| `server/prompts.py` | 任务卡和教练反馈 prompt |
| `server/openai_client.py` | OpenAI/兼容网关调用、结构化解析和兜底适配 |
| `server/fallback.py` | 本地规则版反馈、错误标签和复习建议 |
| `server/requirements.txt` | Python 部署依赖 |
| `.python-version` / `runtime.txt` | 固定 Render/Railway 使用 Python 3.11，避免 Python 3.14 下构建 `pydantic-core` |
| `scripts/mobile-qa.js` | Playwright 移动端截图和布局断言 |
| `render.yaml` | Render Blueprint 部署配置 |
| `Procfile` | Railway/Heroku 风格启动入口 |

## 本地运行

### 1. 配置环境变量

复制 `.env.example` 为 `.env`，再填入真实 API Key：

```text
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-5-mini
```

`OPENAI_API_KEY` 可以留空，此时后端会返回本地规则版反馈，适合离线演示和基础 QA。

### 2. 安装依赖并启动

```powershell
pip install -r server\requirements.txt
uvicorn server.main:app --reload --host 127.0.0.1 --port 8000
```

浏览器打开：

```text
http://127.0.0.1:8000
```

健康检查：

```text
http://127.0.0.1:8000/api/health
```

健康检查会返回服务状态、模型名、Base URL、`.env` 是否存在、是否配置了 OpenAI Key。不要在健康检查里返回真实 API Key。

## 部署

### Render

本仓库已提供 `render.yaml`，可用 Render Blueprint 部署。

| 配置项 | 值 |
| --- | --- |
| Build Command | `pip install -r server/requirements.txt` |
| Start Command | `uvicorn server.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/api/health` |
| Required Env | `OPENAI_API_KEY` |
| Optional Env | `OPENAI_BASE_URL`, `OPENAI_MODEL` |

如果 Render 日志显示正在使用 `python3.14`，说明运行时版本没有被识别。确认仓库根目录存在 `.python-version`，内容为 `3.11.9`，并重新部署。Python 3.14 下 `pydantic-core` 可能退回 Rust 编译并导致构建失败。

### Railway / Heroku 风格平台

仓库已提供 `Procfile`：

```text
web: uvicorn server.main:app --host 0.0.0.0 --port $PORT
```

部署平台需要安装 `server/requirements.txt`，并配置 `OPENAI_API_KEY`。如果平台不自动识别 Python 依赖路径，手动设置 build command：

```text
pip install -r server/requirements.txt
```

## 验证

| 检查 | 命令 |
| --- | --- |
| 后端测试 | `uv run --python D:\python\py311 pytest` |
| 前端语法 | `node --check web\app.js` |
| 核心链路 smoke | `npm.cmd run smoke` |
| 本地上线前验收 | `npm.cmd run preflight` |
| 移动端 QA | `npm.cmd run qa:mobile` |
| 健康检查 | 打开 `/api/health` |

`preflight` 会自动启动本地服务、等待 `/api/health`、运行 smoke test，然后关闭服务。需要一起跑移动端截图 QA 时：

```powershell
npm.cmd run preflight -- --mobile
```

如果你的 Python 路径不同，可以覆盖启动命令：

```powershell
$env:SERVER_CMD="D:\python\py311\python.exe -m uvicorn server.main:app --host 127.0.0.1 --port 8000"
npm.cmd run preflight
```

`smoke` 默认检查 `http://127.0.0.1:8000`，会覆盖首页、`/styles.css`、`/app.js`、`/api/health`、`/api/scenario`、`/api/chat`。

检查线上地址时设置 `BASE_URL`：

```powershell
$env:BASE_URL="https://your-app.example.com"
npm.cmd run smoke
```

`qa:mobile` 需要本地服务运行在 `http://127.0.0.1:8000`，并需要 Playwright Chromium。

## 隐私与数据边界

| 数据 | 保存位置 | 说明 |
| --- | --- | --- |
| 练习历史、收藏句、每日复习 | 浏览器 localStorage | 仅保存在当前浏览器，不会自动同步到服务器 |
| 用户输入的英文回复 | 发送到后端 `/api/chat` | 配置 `OPENAI_API_KEY` 后会转发给 OpenAI/兼容网关生成反馈 |
| OpenAI API Key | 服务端 `.env` 或部署平台环境变量 | 不进入前端，不写入 localStorage，不通过健康检查返回 |
| 服务日志 | 部署平台/本地终端 | 可能包含请求路径和错误摘要，不应记录真实 API Key |

当前版本没有账号系统和云端数据库。如果要面向真实用户上线，需要补充正式隐私政策、用户数据删除机制、速率限制和日志脱敏策略。

## 故障排查

| 现象 | 排查方式 |
| --- | --- |
| 页面能打开但反馈是规则兜底 | 检查 `/api/health` 的 `openaiKeyConfigured` 是否为 `true` |
| 配置了 `.env` 仍未生效 | 确认 `.env` 位于项目根目录，并重启 uvicorn |
| 部署后端口错误 | 确认启动命令使用 `--host 0.0.0.0 --port $PORT` |
| OpenAI 请求失败 | 检查 `OPENAI_BASE_URL`、模型名、API Key 权限和兼容网关是否支持 Responses/Chat Completions |
| Smoke test 失败 | 先看失败阶段：static assets 表示静态文件/路由问题，health 表示服务配置问题，scenario/chat 表示 API 契约或模型调用问题 |
| 移动端 QA 失败 | 先确认服务已启动，再运行 `npm.cmd run qa:mobile` 查看 390px/768px 指标 |

## 当前边界

| 边界 | 原因 |
| --- | --- |
| 未做登录 | MVP 阶段优先验证练习闭环 |
| 未做数据库 | 当前用 localStorage 足够支持个人演示和本地学习 |
| 未做语音识别/发音评分 | 需要额外音频链路和评估模型，适合作为第二阶段 |
| 未做计费/限流 | 商用前再接入账号、额度和风控 |

## 下一阶段

| 优先级 | 方向 | 建议 |
| --- | --- | --- |
| P1 | 云端历史 | 用 Supabase/PostgreSQL 迁移 localStorage session |
| P1 | 用户体系 | 登录、同步、多设备历史和数据删除 |
| P2 | 语音输入 | Web Speech API 或云语音识别 |
| P2 | 商用化 | 次数限制、订阅、订单和管理后台 |
