# Design Tokens - 设计令牌规范

Design Tokens 是 Aivolo 设计系统的原子单位，定义了所有视觉属性的标准值。

## 色彩系统 (Colors)

### 主色调 (Primary Colors)

```css
/* Aivolo Gold - 品牌主色 */
--color-primary: #F5A623;
--color-primary-light: #FFC04D;
--color-primary-dark: #D48806;
--color-primary-darker: #8B5A00;

/* 主色调的透明度变体 */
--color-primary-alpha-10: rgba(245, 166, 35, 0.1);
--color-primary-alpha-20: rgba(245, 166, 35, 0.2);
--color-primary-alpha-50: rgba(245, 166, 35, 0.5);
```

### 中性色 (Neutral Colors) - Dark Mode

```css
/* 从亮到暗排列 (Dark Mode 反转) */
--color-gray-900: #FFFFFF;    /* 主要文本 */
--color-gray-800: #F0F0F0;
--color-gray-700: #E0E0E0;
--color-gray-600: #A0A0A0;    /* 次要文本 */
--color-gray-500: #808080;
--color-gray-400: #606060;
--color-gray-300: #404040;    /* 边框 */
--color-gray-200: #2C2C2E;    /* 卡片背景 */
--color-gray-100: #1C1C1E;    /* 次要背景 */
--color-gray-50: #0D0D0E;     /* 主背景 */

--color-white: #FFFFFF;
--color-black: #000000;
```

### 语义色 (Semantic Colors)

```css
--color-success: #52C41A;
--color-warning: #FAAD14;
--color-error: #FF4D4F;
--color-info: #1890FF;
```

### 背景色 (Background Colors)

```css
--bg-primary: #0D0D0E;        /* 主背景 - Deep Space */
--bg-secondary: #1C1C1E;      /* 次要背景 */
--bg-tertiary: #2C2C2E;       /* 卡片/交互元素 */
--bg-overlay: rgba(0, 0, 0, 0.7);
```

## 字体系统 (Typography)

### 字体族 (Font Families)

```css
/* 主要字体 - 用于界面、标题、正文 */
--font-primary: 'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* 等宽字体 - 用于代码 */
--font-mono: 'JetBrains Mono', 'Courier New', monospace;
```

### 字体大小 (Font Sizes)

```css
--font-size-xs: 0.75rem;      /* 12px */
--font-size-sm: 0.875rem;     /* 14px */
--font-size-base: 1rem;       /* 16px */
--font-size-lg: 1.125rem;     /* 18px */
--font-size-xl: 1.25rem;      /* 20px */
--font-size-2xl: 1.5rem;      /* 24px */
--font-size-3xl: 2rem;        /* 32px */
--font-size-4xl: 2.5rem;      /* 40px */
--font-size-5xl: 3.5rem;      /* 56px - Hero */
```

### 字重 (Font Weights)

```css
--font-weight-light: 300;
--font-weight-normal: 400;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### 行高 (Line Heights)

```css
--line-height-tight: 1.2;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
```

## 间距系统 (Spacing)

采用 4px 基准的间距系统:

```css
--spacing-1: 0.25rem;    /* 4px */
--spacing-2: 0.5rem;     /* 8px */
--spacing-3: 0.75rem;    /* 12px */
--spacing-4: 1rem;       /* 16px */
--spacing-6: 1.5rem;     /* 24px */
--spacing-8: 2rem;       /* 32px */
--spacing-10: 2.5rem;    /* 40px */
--spacing-12: 3rem;      /* 48px */
--spacing-16: 4rem;      /* 64px */
--spacing-24: 6rem;      /* 96px */
```

## 圆角 (Border Radius)

```css
--radius-sm: 0.25rem;    /* 4px */
--radius-base: 0.5rem;   /* 8px */
--radius-lg: 0.75rem;    /* 12px */
--radius-xl: 1rem;       /* 16px */
--radius-2xl: 1.25rem;   /* 20px */
--radius-full: 9999px;   /* Pill shape */
```

## 阴影 (Shadows) - Glow Effects

```css
/* Dark Mode 阴影 - 使用深色 */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
--shadow-base: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
--shadow-card: 0 4px 12px rgba(0, 0, 0, 0.3);
--shadow-card-hover: 0 12px 24px rgba(0, 0, 0, 0.4);

/* 品牌色光晕效果 */
--shadow-glow: 0 0 15px var(--color-primary-alpha-20);
--shadow-glow-strong: 0 0 30px var(--color-primary-alpha-50);
```

## 过渡动画 (Transitions)

```css
--duration-fast: 150ms;
--duration-base: 200ms;
--duration-slow: 300ms;

--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: all var(--duration-base) var(--ease-in-out);
```

## 断点 (Breakpoints)

```css
--breakpoint-sm: 576px;
--breakpoint-md: 768px;
--breakpoint-lg: 992px;
--breakpoint-xl: 1200px;
--breakpoint-2xl: 1400px;
```

---

**版本**: 1.0.0  
**最后更新**: 2026-01-16
