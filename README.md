# 灵思 VoiceMind

> 用声音捕捉灵感，用 AI 构建知识库

一款面向创意工作者的 **语音优先智能笔记应用**，包含 **iOS 原生客户端** 和 **Web 版本**。通过自然语音记录灵感、会议要点和生活感悟，AI 自动转录、归类并提炼关键信息。

## ✨ 核心功能

| 功能 | 描述 |
|------|------|
| 🎤 **语音录制** | 一键录音，支持 5 种模式（所思所想/会议/讲座/访谈/日记）|
| 🤖 **AI 转录** | WhisperX 高精度语音转文字 + 说话人分离 |
| 📝 **智能摘要** | 6 种 AI 模板自动提炼要点和待办 |
| 👥 **说话人分离** | 多人会议自动识别并标注不同发言者 |
| 🏷️ **自动分类** | 语义分析，智能打标签 |
| 📅 **日历视图** | 按日期查看笔记 |
| ✨ **灵感推荐** | AI 发现关联想法 |
| 📤 **数据导出** | Markdown / SRT 字幕 / JSON 格式 |
| 💾 **本地持久化** | IndexedDB 存储，刷新不丢失 |

## 📱 平台支持

### iOS 原生应用 (`VoiceAINote/`)

- SwiftUI (iOS 16+) + MVVM + Clean Architecture
- Core Data + CloudKit 同步
- AVFoundation 音频录制
- Gemini 多模态 API / OpenAI 兼容接口

### Web 应用 (`web/`)

- Next.js 16 + TypeScript + Tailwind CSS
- Web Audio API + MediaRecorder
- Web Speech API 实时转录预览
- WhisperX 自部署语音识别 + pyannote 说话人分离
- Zustand 状态管理 + IndexedDB 持久化
- 响应式设计（桌面 + 移动端）

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

### 配置 API

1. 打开设置页面
2. **WhisperX 端点** — 语音转录服务（默认 `http://100.67.209.116:9100`）
3. **LLM API** — Gemini / OpenAI 兼容接口，用于智能摘要

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
│       │   ├── settings/        # 设置 (WhisperX + LLM)
│       │   ├── inspiration/     # 灵感库
│       │   └── calendar/        # 日历视图
│       ├── components/          # 共享组件
│       ├── services/            # AI 服务 + IndexedDB
│       └── store/               # Zustand 状态管理
├── api.md                       # WhisperX API 文档
└── CHANGELOG.md                 # 版本历史
```

## 🔧 技术架构

```
[录音] → [Web Audio API] → [WebM/Opus]
                                  ↓
                        [WhisperX /transcribe]
                                  ↓
                   [说话人分离 + 词级时间戳]
                                  ↓
                        [LLM 智能摘要]
                                  ↓
              [IndexedDB 本地持久化存储]
```

## 📄 License

MIT License

---

**灵思 VoiceMind** — Made with ❤️ for creative minds
