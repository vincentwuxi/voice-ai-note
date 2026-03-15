# 快速开始指南

5 分钟快速上手 Aivolo Design System。

## 1. 复制模板文件

```bash
cp -r templates/web/* your-project/
```

## 2. 引入样式

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
    
    <!-- Aivolo Design System -->
    <link rel="stylesheet" href="css/design-system.css">
    <link rel="stylesheet" href="css/layout.css">
    <link rel="stylesheet" href="css/components.css">
</head>
<body>
    <!-- Your content -->
    <script src="js/interactions.js"></script>
</body>
</html>
```

## 3. 使用组件

### 按钮
```html
<button class="btn btn-primary">Take Flight</button>
<button class="btn btn-secondary">Learn More</button>
```

### 卡片
```html
<div class="card">
    <h3 class="card-title">标题</h3>
    <p class="card-content">内容描述...</p>
</div>
```

### 网格布局
```html
<div class="container">
    <div class="row">
        <div class="col-12 col-md-6 col-lg-4">Column 1</div>
        <div class="col-12 col-md-6 col-lg-4">Column 2</div>
        <div class="col-12 col-md-12 col-lg-4">Column 3</div>
    </div>
</div>
```

## 4. 自定义品牌色

```css
:root {
    --color-primary: #YOUR_BRAND_COLOR;
}
```

---

**版本**: 1.0.0
