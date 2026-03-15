# VoiceMind Web

灵思 VoiceMind 的 Web 版本，基于 Next.js 16 构建。

## 技术栈

- **框架**: Next.js 16 (App Router) + TypeScript
- **样式**: Tailwind CSS + Aivolo 深色主题
- **状态**: Zustand + IndexedDB 持久化
- **音频**: Web Audio API + MediaRecorder
- **AI**: WhisperX 转录 + LLM 智能摘要

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 页面路由

| 路由 | 功能 |
|------|------|
| `/` | 录音工作台 |
| `/library` | 思想库 |
| `/library/[id]` | 笔记详情 |
| `/inspiration` | 灵感库 |
| `/calendar` | 日历视图 |
| `/settings` | 设置 |
