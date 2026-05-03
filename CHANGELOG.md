# Changelog

All notable changes to VoiceMind will be documented in this file.

## [2.1.0] - 2026-05-03

### 🔒 安全修复
- **API Key 掩码** — Settings 页和 /api/config 端点不再返回完整 API Key，显示 `前4位+••••+末4位`

### ☁️ 数据安全
- **笔记云同步 (D1)** — 笔记元数据写入 D1 `notes` 表，换设备/清缓存不丢失数据
- **同步状态指示器** — 思想库卡片显示同步图标：☁️同步完成 / 🔄同步中 / ⚠️失败 / 仅本地
- **三层数据策略** — 加载优先 D1 云端 → 回退 IndexedDB → 本地兜底

### 🧠 智能增强
- **灵感库 LLM 化** — 新增「AI 深度分析」按钮，LLM 发现跨领域关联 + 创意建议
- **短语级匹配** — 替代正则字符分词，添加停用词过滤，扫描上限提升至 50 条

### 📋 生产力
- **批量操作** — 思想库多选模式：全选/批量删除/批量导出 JSON
- **JSON 导入** — 上传 .json 文件恢复笔记，自动去重
- **待办交互化** — actionItems 添加 checkbox，支持勾选完成/删除线状态

### 📅 日历增强
- **月度统计** — 笔记数/活跃天数/总录音时长
- **热力图** — 日期格子颜色深浅表示笔记密度
- **本月概览** — 日均笔记/日均时长/活跃率
- **快速录音** — 日历页 Header 新增录音入口

### 📱 PWA 安装
- **Web App Manifest** — standalone 模式 + 暗色主题
- **App 图标** — 定制金色麦克风图标（192/512）
- **Apple Web App** — iOS Safari 添加到主屏幕支持

### 🔗 会议分享
- **一键分享** — 笔记详情页生成 7 天有效分享链接
- **公开页面** — `/share/[id]` 无需登录，精美渲染摘要/要点/转录
- **链接复制** — 自动复制到剪贴板 + Toast 提示

### 🎨 体验优化
- **空状态引导** — 思想库/灵感库/日历分别提供上下文相关的引导 + CTA
- **搜索空结果** — 区分「库为空」和「搜索无匹配」两种状态


## [2.0.0] - 2026-05-02

### 🌐 Web 版本 — 多用户 + 云存储

#### Added
- **Google OAuth 2.0** — 多用户认证 + JWT 会话管理 (72h TTL)
- **管理后台** — LLM 配置 / 动态模型选择 / 用户管理 (RBAC)
- **R2 云存储** — 音频文件自动同步 Cloudflare R2 (10GB 免费)
- **存储监控** — Admin 新增「存储」Tab：用量/进度条/用户分布/最近上传
- **AI 重新摘要** — 笔记详情可切换模板重新生成标题+摘要+要点
- **倍速播放** — 0.5x / 0.75x / 1x / 1.25x / 1.5x / 2x
- **搜索增强** — 全字段搜索 (标题/内容/摘要/要点/待办)，不区分大小写
- **排序功能** — 思想库支持最新/最早/最长/最短排序
- **笔记详情删除** — 详情页顶部工具栏添加删除按钮 + 确认弹窗
- **录音完成反馈** — toast 通知 + "查看笔记" 快捷链接

#### Changed
- **默认 LLM 端点** — 切换为 Google Gemini API (`generativelanguage.googleapis.com/v1beta/openai`)
- **默认模型** — `gemini-2.5-flash` (原 `gemini-2.5-pro`)
- **模型选择器** — 从文本输入改为 API 动态拉取下拉选择
- **音频加载** — 优先 R2 云端 → IndexedDB 本地 → session URL

#### Removed
- **Demo 假数据** — 移除 3 条硬编码示例笔记，新用户显示空状态引导

#### Infrastructure
- Cloudflare D1 (`voicemind-db`) — users / app_config / audio_files
- Cloudflare R2 (`voicemind-audio`) — 音频文件对象存储
- API 路由: `/api/auth/*`, `/api/admin/*`, `/api/audio/*`


## [1.2.0] - 2026-03-16

### 🌐 Web 版本 — Phase 1 核心升级

#### Added
- **IndexedDB 持久化** — 笔记、音频和配置刷新不丢失
- **5 种录音模式** — 所思所想 / 会议 / 讲座 / 访谈 / 日记
- **6 种 AI 模板** — 自动识别 / 会议纪要 / 读书笔记 / 头脑风暴 / 访谈记录 / 日记反思
- **Web Speech API 实时转录** — 录音中流式显示中文文字
- **音频定位播放** — 点击转录段落跳转到对应音频位置
- **说话人命名** — 点击说话人标签直接重命名
- **三格式导出** — Markdown / SRT 字幕 / JSON

#### Changed
- Store 升级为 IndexedDB 持久化架构
- AI 服务层改为模板驱动（AITemplate → System Prompt）
- 录音模式自动映射最佳 AI 模板

## [1.1.0] - 2026-03-15

### 🌐 Web 版本 — WhisperX 集成

#### Added
- **WhisperX 语音识别** — 自部署转录 + pyannote 说话人分离
- **说话人分离视图** — 彩色标签 + 时间戳 + 分段对话
- **LLM 智能摘要** — Gemini / OpenAI 兼容接口
- **设置页** — WhisperX + LLM 独立配置区

## [1.0.0] - 2026-03-15

### 🌐 Web 版本 — MVP

#### Added
- Next.js 16 + TypeScript + Tailwind CSS 项目搭建
- Aivolo 深色主题设计系统
- 录音工作台（Web Audio API + 波形可视化）
- 思想库（卡片列表 + 标签筛选）
- 笔记详情页（摘要 / 转录 / 播放器）
- 灵感库、日历视图、设置页
- 响应式侧边栏 + 移动端底部导航

### 📱 iOS 原生应用

#### Added
- SwiftUI 全功能 iOS 应用
- AVFoundation 音频录制
- Gemini 多模态音频转录
- Core Data + CloudKit 同步
- 完整 UI（录音/思想库/日历/灵感/设置）
