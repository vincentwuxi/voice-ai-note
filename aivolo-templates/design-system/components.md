# 组件规范 (Components)

## 按钮 (Buttons)

### 基础按钮

```html
<button class="btn">Default</button>
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-lg">Large</button>
```

### 样式规范

| 属性 | Primary | Secondary |
|------|---------|-----------|
| Background | `#F5A623` | `transparent` |
| Text Color | `#000000` | `#FFFFFF` |
| Border | `none` | `1px solid #606060` |
| Border Radius | `9999px` (Pill) | `9999px` |
| Hover | Lighten + Lift | Border → White |

### CSS 示例

```css
.btn {
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius-full);
    font-weight: var(--font-weight-semibold);
    transition: var(--transition-base);
}

.btn-primary {
    background-color: var(--color-primary);
    color: #000;
    box-shadow: var(--shadow-glow);
}

.btn-primary:hover {
    background-color: var(--color-primary-light);
    transform: translateY(-2px);
}
```

---

## 卡片 (Cards)

### 基础卡片

```html
<div class="card">
    <h3 class="card-title">标题</h3>
    <p class="card-content">内容描述...</p>
</div>
```

### 样式规范

- **Background**: `var(--bg-secondary)` (#1C1C1E)
- **Border**: `1px solid var(--color-gray-200)`
- **Border Radius**: `var(--radius-xl)` (16px)
- **Hover Effect**: `translateY(-5px)` + Border glow

---

## 导航栏 (Navbar)

### 结构

```html
<nav class="navbar">
    <a class="navbar-brand">Logo</a>
    <ul class="navbar-menu">
        <li><a class="navbar-link">Link</a></li>
    </ul>
    <div class="navbar-actions">
        <button class="btn btn-primary">CTA</button>
    </div>
</nav>
```

### 样式规范

- **Background**: `rgba(13, 13, 14, 0.8)` + `backdrop-filter: blur(12px)`
- **Position**: `sticky`, `top: 0`
- **Border Bottom**: `1px solid rgba(255, 255, 255, 0.1)`

---

## 表单 (Forms)

### 输入框

```html
<div class="form-group">
    <label class="form-label">Label</label>
    <input type="text" class="form-input" placeholder="Placeholder">
</div>
```

### 样式规范

- **Background**: `var(--bg-secondary)`
- **Border**: `1px solid var(--color-gray-300)`
- **Focus**: Border → Primary color + Glow shadow

---

## Hero Section

### 结构

```html
<section class="hero">
    <h1 class="hero-title">Headline</h1>
    <p class="hero-subtitle">Description</p>
</section>
```

### 样式规范

- **Background**: `radial-gradient(circle at 50% 50%, #1a1a1a, #0d0d0e)`
- **Glow Effect**: Pseudo-element with primary color radial gradient
- **Title**: Gradient text (`white → gray`)

---

**版本**: 1.0.0  
**最后更新**: 2026-01-16
