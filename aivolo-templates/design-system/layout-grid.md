# 布局与网格系统 (Layout & Grid)

## 12 列网格系统

Aivolo 沿用经典的 12 列响应式网格系统。

### 基础结构

```html
<div class="container">
    <div class="row">
        <div class="col-12 col-md-6 col-lg-4">内容</div>
        <div class="col-12 col-md-6 col-lg-4">内容</div>
        <div class="col-12 col-md-12 col-lg-4">内容</div>
    </div>
</div>
```

### 容器 (Container)

```css
.container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
}
```

### 行 (Row)

```css
.row {
    display: flex;
    flex-wrap: wrap;
    margin: 0 -0.5rem;
}
```

### 列 (Columns)

```css
.col-1  { width: 8.33%; }
.col-2  { width: 16.66%; }
.col-3  { width: 25%; }
.col-4  { width: 33.33%; }
.col-6  { width: 50%; }
.col-12 { width: 100%; }
```

## 响应式断点

| 断点 | 前缀 | 宽度 |
|------|------|------|
| Small | `sm` | ≥576px |
| Medium | `md` | ≥768px |
| Large | `lg` | ≥992px |
| XL | `xl` | ≥1200px |

### 使用示例

```html
<!-- 移动端全宽，平板半宽，桌面 1/3 -->
<div class="col-12 col-md-6 col-lg-4">...</div>
```

## Flexbox 工具类

```css
.d-flex { display: flex; }
.flex-column { flex-direction: column; }
.justify-content-center { justify-content: center; }
.justify-content-between { justify-content: space-between; }
.align-items-center { align-items: center; }
```

## 间距工具类

```css
/* Margin */
.mt-4 { margin-top: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mx-auto { margin-left: auto; margin-right: auto; }

/* Padding */
.py-12 { padding-top: 3rem; padding-bottom: 3rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
```

---

**版本**: 1.0.0  
**最后更新**: 2026-01-16
