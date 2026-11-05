# 视觉系统

## 关键词

莱茵生命 / 明日方舟 / 科幻终端 / 档案库 / 数据青与白金色 / 工业排版。

## 字体

- 标题：Orbitron / 展示字体；
- 正文：系统无衬线 + MiSans（Lab）；
- 数据、编号、标签：等宽字体（Share Tech Mono / IBM Plex Mono）。

## 颜色

页面主题通过 CSS 变量提供：

```text
--color-rhine-abyss
--color-rhine-panel
--color-rhine-ink
--color-rhine-dim
--color-rhine-faint
--color-rhine-gold
--color-rhine-cyan
--color-rhine-green
--color-rhine-red
--color-rhine-line
```

内置主题：莱茵生命（亮/暗）、碧蓝档案、樱色协议、深空协议。自定义主题由主色/副色/子色生成面板、背景、边框和文字明暗，避免整页纯色。

## 布局

- 左侧固定导航：桌面 76px / 220px，移动端抽屉 240px；
- 内容最大宽度按页面类型控制；
- 档案库二级页统一 `max-w-6xl`、标题间距与缩写编号；
- 页脚在所有页面底部；
- 管理后台使用统一侧栏 + 后台子导航。

## 组件

- 边框：1px 细线，低对比；
- 按钮：方形、等宽字、少量金色/青色强调；
- 卡片：半透明面板、顶部渐变线；
- 标题：`[ CODE ] TITLE // 中文`；
- 动效：短、克制，尊重 `prefers-reduced-motion`。

## 3D 视觉

- 右侧档案面板：模块、摘要、元数据、页签；
- 档案浏览阶段关闭景深；
- 详情页玻璃解密之后必须恢复文字可读；
- ECharts 图表颜色读取页面主题变量。

## 响应式

- 1024px 以下使用手机抽屉；
- 1024–1279px 桌面侧栏为 76px 图标栏；
- 设置面板宽度跟随导航栏，不横向溢出；
- 图表容器使用 ResizeObserver 自动缩放。
