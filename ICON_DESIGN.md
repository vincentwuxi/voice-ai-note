# 灵思 VoiceMind - 应用图标设计规格

## 品牌标识

| 属性 | 值 |
|------|---|
| 中文名 | **灵思** |
| 英文名 | **VoiceMind** |
| Slogan | 用声音捕捉灵感 |

---

## 图标设计规格

### 配色方案

```
背景色:     #0D0D0E (Deep Space)
主色调:     #F5A623 (Aivolo Gold)
亮色调:     #FFC04D (Gold Light)
深色调:     #D48806 (Gold Dark)
光晕色:     #F5A623 @ 40% opacity
```

### 视觉元素

1. **主图形**: 简约麦克风
   - 位于图标中央
   - 使用金色渐变（顶部亮，底部深）
   - 麦克风头部带有抽象的神经网络线条纹理

2. **光晕效果**:
   - 麦克风周围散发柔和金色光晕
   - 向外渐变透明
   - 营造高端科技感

3. **背景**:
   - 纯色 Deep Space (#0D0D0E)
   - 可选：极细微的径向渐变

### 尺寸规格 (iOS App Icon)

| 用途 | 尺寸 (pt) | 像素 @2x | 像素 @3x |
|------|----------|----------|----------|
| iPhone App | 60x60 | 120x120 | 180x180 |
| iPad App | 76x76 | 152x152 | - |
| iPad Pro | 83.5x83.5 | 167x167 | - |
| App Store | 1024x1024 | - | - |

---

## 设计参考描述 (AI 生成 Prompt)

```
Minimalist iOS app icon:
- Pure black background (#0D0D0E)
- Golden microphone icon in center (#F5A623)
- Microphone has subtle brain-like neural pattern
- Soft golden glow emanating outward
- Clean, modern, premium aesthetic
- No text, pure icon
- Gradient from bright gold to darker gold
```

---

## Figma/Sketch 设计步骤

1. 创建 1024x1024 画布
2. 填充背景色 #0D0D0E
3. 绘制麦克风形状（圆顶 + 矩形底座）
4. 应用金色渐变 (#FFC04D → #F5A623 → #D48806)
5. 在麦克风顶部添加细线条神经网络纹理
6. 添加图层效果：外发光 (#F5A623, 50px, 40%)
7. 导出各尺寸 PNG

---

## 文件输出

将以下文件放入 `VoiceAINote/Resources/Assets.xcassets/AppIcon.appiconset/`:

- `icon_1024.png` (1024x1024)
- `icon_180.png` (180x180)
- `icon_167.png` (167x167)
- `icon_152.png` (152x152)
- `icon_120.png` (120x120)

更新 `Contents.json` 配置文件关联图标。
