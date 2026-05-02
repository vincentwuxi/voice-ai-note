# 灵思 VoiceMind

> 用声音捕捉灵感，用 AI 构建知识库

一款面向创意工作者的 **语音优先智能笔记应用**，包含 **iOS 原生客户端** 和 **Web 版本**。通过自然语音记录灵感、会议要点和生活感悟，AI 自动转录、归类并提炼关键信息。

## ✨ 核心功能

| 功能 | 描述 |
|------|------|
| 🎤 **语音录制** | 一键录音，支持 5 种模式（所思所想/会议/讲座/访谈/日记）|
| 📎 **音频上传** | 支持 MP3/WAV/M4A/WebM/FLAC 文件上传转录 |
| 🤖 **AI 转录** | WhisperX large-v3-turbo 高精度语音转文字 + 说话人分离 |
| 📝 **智能摘要** | 6 种 AI 模板自动提炼要点和待办，支持重新生成 |
| 👥 **说话人分离** | 多人会议自动识别并标注不同发言者 |
| 🏷️ **自动分类** | 语义分析，智能打标签 |
| 📅 **日历视图** | 按日期查看笔记 |
| ✨ **灵感推荐** | AI 发现关联想法 |
| 📤 **数据导出** | Markdown / SRT 字幕 / JSON 格式 |
| 🔐 **多用户认证** | Google OAuth 2.0 + JWT 会话管理 |
| 👑 **管理后台** | LLM 配置 / 模型动态选择 / 用户管理 / 存储监控 |
| ☁️ **云存储** | Cloudflare R2 音频持久化 + IndexedDB 本地缓存 |
| ⏩ **倍速播放** | 0.5x / 0.75x / 1x / 1.25x / 1.5x / 2x 速率切换 |
| 🔍 **全文搜索** | 标题/内容/摘要/要点/待办 全字段搜索 |

## 📱 平台支持

### iOS 原生应用 (`VoiceAINote/`)

- SwiftUI (iOS 16+) + MVVM + Clean Architecture
- Core Data + CloudKit 同步
- AVFoundation 音频录制
- Gemini 多模态 API / OpenAI 兼容接口

### Web 应用 (`web/`)

- **框架**: Next.js 16 + TypeScript + OpenNext (Cloudflare Workers)
- **录音**: Web Audio API + MediaRecorder + Web Speech API
- **转录**: WhisperX 自部署 (large-v3-turbo) + pyannote 说话人分离
- **AI 摘要**: Google Gemini API (OpenAI 兼容端点)
- **认证**: Google OAuth 2.0 + HMAC-SHA256 JWT
- **数据库**: Cloudflare D1 (用户/配置/音频追踪)
- **存储**: Cloudflare R2 (音频文件) + IndexedDB (本地缓存)
- **状态**: Zustand + 响应式设计（桌面 + 移动端）

## 🏗️ Cloudflare 基础设施

| 资源 | 名称 | 用途 |
|------|------|------|
| Workers | `voicemind-web` | Next.js SSR + API 路由 |
| D1 | `voicemind-db` | 用户/配置/音频追踪 |
| R2 | `voicemind-audio` | 音频文件云存储 (10GB 免费) |
| Custom Domain | `voice.aivolo.com` | 生产域名 |

### 环境变量 (Secrets)

```
GOOGLE_CLIENT_ID      — Google OAuth Client ID
GOOGLE_CLIENT_SECRET  — Google OAuth Secret
JWT_SECRET            — JWT 签名密钥
CF_ACCESS_CLIENT_ID   — WhisperX Tunnel 认证
CF_ACCESS_CLIENT_SECRET
```

## 🎨 设计系统

**Aivolo Design System — Dark Mode First**

| 元素 | 值 |
|------|---|
| 主色调 | Aivolo Gold `#F5A623` |
| 背景色 | Deep Space `#0D0D0E` |
| 卡片色 | `#1C1C1E` |
| 玻璃态 | Glassmorphism + 微动画 |

## 🚀 快速开始

### Web 版本

```bash
cd web
npm install
npm run dev
```

访问 http://localhost:3000

### 部署到 Cloudflare

```bash
cd web
npm run deploy  # 等同于 npx opennextjs-cloudflare build && wrangler deploy
```

### 配置

1. **管理员登录** — 使用 `wenyun@gmail.com` 通过 Google OAuth 登录
2. **管理后台** → AI 配置 → 填入 Gemini API Key → 刷新模型列表
3. **WhisperX** — 通过 Cloudflare Tunnel 代理，默认已配置

### iOS 版本

```bash
# 需要 XcodeGen
xcodegen generate
open VoiceAINote.xcodeproj
```

## 🤖 AI 模板系统

| 模板 | 图标 | 用途 |
|------|------|------|
| 自动识别 | 🤖 | 智能判断最佳处理方式 |
| 会议纪要 | 🏢 | 议程 / 决策 / 待办 / 负责人 |
| 读书笔记 | 📚 | 核心论点 / 启发 / 应用场景 |
| 头脑风暴 | 💡 | 创意 / 可行性 / 下一步行动 |
| 访谈记录 | 🎤 | 问答整理 / 关键洞察 / 原话引用 |
| 日记/反思 | ✍️ | 情绪摘要 / 感恩 / 明日计划 |

## 📁 项目结构

```
voice-ai-note/
├── VoiceAINote/                 # iOS 原生应用
│   ├── App/                     # 入口
│   ├── Core/                    # 核心服务 (Audio/AI/Storage)
│   ├── Features/                # 功能模块
│   └── Shared/Theme/            # Aivolo 主题
├── web/                         # Web 应用
│   └── src/
│       ├── app/                 # Next.js 页面路由
│       │   ├── page.tsx         # 录音工作台
│       │   ├── library/         # 思想库 + 笔记详情
│       │   ├── admin/           # 管理后台 (LLM/用户/存储)
│       │   ├── login/           # Google OAuth 登录
│       │   ├── settings/        # 设置
│       │   ├── inspiration/     # 灵感库
│       │   ├── calendar/        # 日历视图
│       │   └── api/             # API 路由
│       │       ├── auth/        # OAuth + JWT
│       │       ├── admin/       # 管理接口 (config/users/storage)
│       │       ├── audio/       # R2 音频上传/读取/删除
│       │       ├── transcribe/  # WhisperX 代理
│       │       └── llm-config/  # 共享 LLM 配置
│       ├── components/          # AuthGuard / Navigation
│       ├── lib/                 # JWT 工具
│       ├── services/            # AI / DB / SharedConfig
│       └── store/               # Zustand (App + Auth)
├── api.md                       # WhisperX API 文档
└── CHANGELOG.md                 # 版本历史
```

## 🔧 技术架构

```
[录音/上传] → [Web Audio API] → [WebM/Opus]
                                     ↓
                    ┌────────────────┴────────────────┐
                    ↓                                  ↓
            [IndexedDB 本地缓存]              [R2 云存储]
                                     ↓
                          [WhisperX /transcribe]
                           (Cloudflare Tunnel)
                                     ↓
                      [说话人分离 + 词级时间戳]
                                     ↓
                      [Gemini LLM 智能摘要]
                                     ↓
                    [D1 配置 + IndexedDB 笔记]
```

## 📄 License

MIT License

---

**灵思 VoiceMind** — Made with ❤️ for creative minds
