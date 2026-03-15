# Aivolo Design Templates

> 基于 [Aivolo](https://www.aivolo.com/) 品牌风格的完整设计模版系统

[![Version](https://img.shields.io/badge/version-1.0.0-F5A623.svg)](https://github.com/yourusername/aivolo-templates)
[![Theme](https://img.shields.io/badge/theme-dark--mode-0D0D0E.svg)](https://github.com/yourusername/aivolo-templates)

## 🚀 简介

Aivolo Design Templates 是一套 **Dark Mode First** 的现代设计系统，围绕 **Flight (飞行)** 主题构建。提供可重复使用的 CSS 变量、组件库和页面模版。

## ✨ 特性

- 🌙 **暗黑模式优先** - 深邃的 `#0D0D0E` 背景
- 🔥 **品牌强调色** - Aivolo Gold `#F5A623`
- 🀄 **Glassmorphism** - 玻璃拟态导航栏
- 📱 **响应式设计** - 12 列网格系统
- ♿ **可访问性** - 语义化 HTML + 键盘导航

## 📦 目录结构

```
aivolo-templates/
├── design-system/           # 设计规范文档
│   ├── overview.md          # 设计哲学
│   ├── design-tokens.md     # CSS 变量规范
│   ├── components.md        # 组件规范
│   └── layout-grid.md       # 布局系统
│
├── templates/               # 代码模版
│   ├── web/                 # Web 网站
│   │   ├── css/             # 样式文件
│   │   ├── js/              # 交互脚本
│   │   └── index.html       # 示例页面
│   └── app/                 # 移动端
│
├── guides/                  # 使用指南
│   ├── quick-start.md
│   └── best-practices.md
│
└── README.md
```

## 🎨 核心 Design Tokens

| 属性 | 值 | 说明 |
|------|-----|------|
| Primary | `#F5A623` | Aivolo Gold |
| Background | `#0D0D0E` | Deep Space |
| Surface | `#1C1C1E` | Card Bg |
| Text | `#FFFFFF` | 主文本 |
| Text Muted | `#A0A0A0` | 次要文本 |

## 🚀 快速开始

```bash
# 复制 Web 模版
cp -r templates/web/* your-project/
```

```html
<!-- 引入样式 -->
<link rel="stylesheet" href="css/design-system.css">
<link rel="stylesheet" href="css/layout.css">
<link rel="stylesheet" href="css/components.css">

<!-- 使用组件 -->
<button class="btn btn-primary">Take Flight</button>
```

## 📄 许可

MIT License - 详见 [LICENSE](LICENSE)

---

**版本**: 1.0.0  
**品牌**: Aivolo  
**主题**: Dark Mode / Flight
