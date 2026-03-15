# Aivolo Design System - 概览

## 简介

Aivolo Design System 是基于 [Aivolo](https://www.aivolo.com/) 品牌风格提炼的完整设计系统。核心理念是 **"Let Imagination Take Flight"** (让想象力起飞)，设计语言围绕 **飞行 (Flight)** 和 **折射 (Prism)** 两大主题展开。

## 设计哲学

### 核心原则

1. **Dark Mode First (暗黑优先)**
   - 深邃的黑色背景 (`#0D0D0E`)
   - 象征宇宙与无限可能
   - 为 OLED 屏幕优化

2. **Flight & Energy (飞行与能量)**
   - 金色品牌强调色 (`#F5A623`)
   - 代表光芒、灵感和活力
   - 发光阴影效果营造"起飞"感

3. **Glassmorphism (玻璃拟态)**
   - 磨砂玻璃效果的 UI 元素
   - 象征空气与光线的通透
   - 现代、前沿的视觉体验

4. **Technical Precision (技术精度)**
   - 使用 Inter 和 Noto Sans SC 字体
   - 清晰、易读、专业
   - 适合 AI 和科技类产品

## 设计系统架构

```
Aivolo Design System
│
├── Foundation (基础层)
│   ├── Design Tokens (设计令牌)
│   ├── Typography (字体系统)
│   ├── Colors (Dark Mode 色彩)
│   └── Spacing (间距系统)
│
├── Components (组件层)
│   ├── Buttons (胶囊按钮)
│   ├── Cards (悬浮卡片)
│   ├── Navbar (玻璃导航)
│   ├── Forms (Dark 输入框)
│   └── Hero (光晕 Hero)
│
└── Patterns (模式层)
    ├── Layout Patterns
    └── Interaction Patterns
```

## 技术栈

- **HTML5**: 语义化标记
- **CSS3**: Custom Properties, `backdrop-filter`, Grid, Flexbox
- **JavaScript**: 渐进增强交互
- **无框架依赖**: 原生实现

### 字体加载
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
```

## 适用场景

- ✅ AI 产品和 SaaS 网站
- ✅ 科技类创业公司官网
- ✅ 深色主题的管理后台
- ✅ 移动端 H5 应用

---

**版本**: 1.0.0  
**最后更新**: 2026-01-16  
**品牌**: Aivolo
