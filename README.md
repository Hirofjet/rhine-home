# RHINE//HOME — 莱茵生命风格个人主页

> 二次元 × 科幻终端风格的交互式个人主页模板。
> 视觉语言致敬《明日方舟》莱茵生命（Rhine Lab）：黑曜石底色、白金与数据青点缀、四角刻度面板、扫描线与开机终端动画。
> 目前所有文字内容均为**占位内容**，详见下方「如何填充内容」。

---

## 技术栈

| 能力 | 选择 |
| --- | --- |
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS v4（设计令牌集中在 `src/index.css` 的 `@theme`） |
| 动画 | Framer Motion（`framer-motion`） |
| 路由 | React Router v7（`BrowserRouter`） |
| 图标 | lucide-react |
| 字体 | `@fontsource` 本地打包拉丁子集（Orbitron / Rajdhani / Share Tech Mono）；中文走系统字体栈 |

> 项目使用 **npm**（扁平 `node_modules` 布局，Windows + 中文路径下最稳）。请使用 `npm install`。

## 快速开始

```bash
npm install          # 安装依赖
npm run dev          # 开发服务器 → http://localhost:5173
npm run build        # 类型检查 + 生产构建（产物在 dist/）
npm run preview      # 本地预览构建产物
npm run lint         # oxlint 检查
```

环境要求：Node.js ≥ 20.19（本机为 24.x）。

---

## 目录结构

```
src/
├── content/              ← 所有内容配置（以后主要改这里）
│   ├── site.ts           站点名 / 导航 / 页脚文案
│   ├── profile.ts        干员档案（Hero 大标题、档案正文、信赖值、标签）
│   ├── abilities.ts      能力模块卡片
│   ├── projects.ts       项目档案
│   ├── links.ts          联络方式 + 直连邮箱
│   ├── slots.tsx         档案库槽位数据（文章 / 视频 / 照片时间线入口）
│   ├── logs.tsx          日志页数据（自动扫描 src/assets/logs/*.md 生成模块）
│   └── index.ts          统一出口（slots / logs 因含重依赖单独引入，见文件内注释）
├── components/
│   ├── ui/               莱茵风格 UI 原语：Panel / CornerFrame / SectionTitle /
│   │                     GlowButton / StatusDot / TypingText / ProgressBar / Tag / Barcode
│   ├── layout/           NavBar / Footer / BackgroundFX（背景特效）/ ModulePlaceholder（占位页模板）
│   ├── boot/             BootScreen（开机终端动画）
│   ├── home/             首页五大区块：Hero / Dossier / Abilities / Projects / Contact
│   ├── slots/            SlotGrid（可展开槽位网格）
│   │   └── content/      ArticleBlock（markdown 文章）/ VideoBlock（视频）/ PhotoTimeline（照片时间线）
│   └── guestbook/        DanmakuWall（留言弹幕墙）
├── pages/                HomePage / ArchivePage / ProjectsPage / LogsPage / GuestbookPage / NotFoundPage
├── hooks/                useTypewriter / useClock / useActiveSection / useCopy
├── lib/                  cx / motion（动画预设）/ api（留言板接口层）
├── assets/
│   ├── articles/         ← 文章 markdown 放这里
│   ├── logs/             ← 日志 markdown 放这里（每篇自动生成一个可展开模块）
│   └── photos/           ← 照片放这里（自动读取拍摄时间排序）
└── App.tsx               路由注册（非首页按需加载）+ 开机门 + 滚动管理

server/                   留言板后端示例（Express + MySQL，可选启用）
public/videos/            ← 视频文件放这里（VideoBlock 的 src 填 /videos/xxx.mp4）
```

---

## 如何填充内容（最常见的操作）

### 1. 个人信息与档案
编辑 `src/content/profile.ts`：

- `realName` → 主页大标题
- `codeName` → 代号（CODENAME）
- `roles` → Hero 区打字机轮换的身份
- `intro` → 一句话简介
- `dossier[]` → 档案正文段落
- `occupation / affiliation / status / location` → 档案基础信息
- `specialties[] / traits[]` → 专精与特性标签
- `trust` → 信赖值（0–200）

### 2. 能力模块
编辑 `src/content/abilities.ts`，每项一行卡片：
- `icon` 可选：`code` / `design` / `research` / `game` / `data` / `music`
- `level` 为 0–100 的熟练度（进度条动画自动触发）
- `grade` 为 `S` / `A` / `B`

想要新图标：在 `src/components/home/AbilitiesSection.tsx` 的 `ICONS` 映射里加一个 lucide 图标，并在 `AbilityIcon` 联合类型中补上名字。

### 3. 项目卡片
编辑 `src/content/projects.ts`：
- `status` 可选：`ACTIVE` / `IN PROGRESS` / `COMPLETED` / `ARCHIVED`（颜色自动对应）
- `link` 填外链则出现「查看详情」；不填则显示「待接入」
- 首页与「项目库」页面共用同一份数据，新增条目自动出现在两处

### 4. 联络方式
编辑 `src/content/links.ts`：
- `contactLinks[]` → 通讯频道列表（icon 可选：`github` / `bilibili` / `mail` / `music` / `chat`）
- `emailAddress` → 直连邮箱（页面上的复制按钮用它）

### 5. 站点信息
编辑 `src/content/site.ts`：站点名、副标题、干员编号、时区、页脚声明与导航项。

---

## 如何扩展新内容

### A. 新增一个首页区块

1. 在 `src/components/home/` 新建组件（可参考 `DossierSection.tsx`，复用 `Panel` / `SectionTitle` / 动画预设 `fadeUp` / `stagger`）；
2. 在 `src/pages/HomePage.tsx` 中插入，外层加 `<section id="你的id">`；
3. 在 `src/content/site.ts` 的 `navItems` 里加一项：
   ```ts
   { id: 'blog', label: '日志', labelEn: 'BLOG', href: '/#blog', section: 'blog' }
   ```
   导航与页脚会自动出现该项，并支持滚动高亮。

### B. 新增一个独立页面

1. 新建 `src/pages/BlogPage.tsx`（可直接用 `ModulePlaceholder` 占位，或参考 `ProjectsPage.tsx` 接入数据）；
2. 在 `src/App.tsx` 的 `<Routes>` 中注册：
   ```tsx
   <Route path="/blog" element={<BlogPage />} />
   ```
3. 在 `src/content/site.ts` 的 `moduleLinks` 中加导航入口 → 导航/页脚自动出现。

### C. 换肤（改主题色/字体）

`src/index.css` 顶部的 `@theme`：

- `--color-gold` / `--color-cyan` / `--color-abyss` 等 → 全局强调色与底色
- `--font-*` → 字体栈
- `--animate-*` + `@keyframes` → 动画节奏

改一处，全站生效。

### D. 调整开机动画

`src/components/boot/BootScreen.tsx` 中的 `BOOT_LINES`。行为：
- 点击任意位置可跳过；
- 同一浏览器会话只播放一次（`sessionStorage` 记录，刷新页面不再播放）。

### E. 新增 UI 原语

在 `src/components/ui/` 新建组件并从 `ui/index.ts` 导出；颜色直接使用主题类名（`text-rhine-gold`、`border-rhine-line` 等）。

### F. 槽位模块（SLOT）交互与隐藏内容

数据在 `src/content/slots.tsx`（`archiveSlots`），每个槽位：

```tsx
{
  id: 'articles',            // 唯一 id（展开动画定位用）
  label: '文章',              // 卡片与面板标题
  labelEn: 'ARTICLES',
  summary: 'Markdown 文章列表',
  content: {                 // ← 展开后的隐藏内容
    paragraphs: ['正文段落'],  // 普通文字（可选）
    items: [{ label: '条目', value: '值' }],
    link: { label: '外链', href: 'https://example.com' },
    custom: (                 // 富内容组件（文章 / 视频 / 照片时间线）
      <div className="space-y-4">
        <ArticleBlock file="/src/assets/articles/hello.md" title="标题" tags={['标签']} />
      </div>
    ),
  },
}
```

交互规则（`src/components/slots/SlotGrid.tsx`）：

- 面板从**被点击模块所在行**的顶部向下展开：第三排不会盖住前两排，第四排不会盖住前三排；
- 展开方向从模块自身位置朝网格中心方向（右上→左下、左下→右上等自动计算），收回时缩回自己所在的角；
- 已展开时点击可见的其他模块：**先收回当前面板，再展开目标模块**；
- **展开过程中触发收回**（再次点击 / ✕ / `ESC` / 点空白）：取消剩余展开动画，**从当前裁剪进度直接反向收回**；
- 收回方式：再次点击当前模块 / 面板右上 ✕ / `ESC` / **点击面板外空白**；
- **增加槽位**：数组里追加一项即可 —— 行数变化后展开方向、面板位置全部自适应。

**富内容组件**（`src/components/slots/content/`，标签显示在组件底部）：

| 组件 | 用途 | 数据位置 |
| --- | --- | --- |
| `<ArticleBlock file="..." title="" tags={[]} />` | 渲染 markdown 文章（支持 GFM：表格、任务列表、删除线、代码块、图片等） | markdown 放 `src/assets/articles/` |
| `<VideoBlock src="" title="" description="" tags={[]} />` | 标题 + 简介 + 播放器（`src` 留空显示占位；播放器限高 420px） | 视频放 `public/videos/` |
| `<PhotoTimeline />` | 照片时间线：自动读取 EXIF 拍摄时间排序，按年份分组 | 照片放 `src/assets/photos/` |

小提示：

- 文章文件路径可以写完整路径 `/src/assets/articles/hello.md`，也可以只写文件名 `hello.md`；
- markdown 里引用图片可以写 `/favicon.svg` 这类 public 路径；
- 照片没有 EXIF 时，会尝试从文件名解析 `YYYY-MM-DD`，都没有则归入「未知时间」；
- 照片和文章都是构建时静态加载 —— 增删文件后重新构建即可；
- 展开面板最小高度为 `640px`（`SlotGrid.tsx` 的 `PANEL_MIN_HEIGHT`），足够完整显示视频与文案，可按需调整。

### G. 留言板与后端接口（MySQL）

留言板页面：`/guestbook`（导航「GUESTBOOK」）。留言以弹幕形式滚动整页，提交后立即出现。

- 弹幕规则：**每条留言只生成一个弹幕元素**，动画走完一屏后才会重新出现，因此同一条留言不会同时出现在屏幕上两次；
- 前端接口层：`src/lib/api.ts`
  - `GET {API_BASE}/api/messages` → `{ messages: [{ id, name, content, createdAt }] }`
  - `POST {API_BASE}/api/messages` `{ name, content }` → 单条留言
  - `id` 为**自增序号**（第一条 = 1，第二条 = 2 …）：后端用 MySQL `AUTO_INCREMENT`，本地回退取现有最大 id + 1，保证同名留言也不会互相顶掉；
- **未配置后端时自动回退 localStorage**，静态部署也能直接使用；
- 配置后端：见 `server/README.md`（含 MySQL 建表语句 `server/schema.sql` 与 Express 示例 `server/index.mjs`）；
- 前端指向后端：复制 `.env.example` 为 `.env`，改 `VITE_API_BASE=http://localhost:3001`。

### H. 日志页（/logs）

导航「日志」对应 `/logs`，每篇日志都是一个可展开 / 收回的模块，展开后渲染 markdown 正文（和文章组件同款排版）。

**新增日志不需要改代码**：

1. 在 `src/assets/logs/` 下新建 markdown 文件，文件名以日期开头，例如 `2026-11-01-rainy-day.md`；
2. 文件第一行写 `# 标题`，作为模块标题（也用于卡片）；第一段正文会作为卡片摘要；
3. 保存后模块自动出现，并按文件名日期从新到旧排序。

排序与标题解析逻辑在 `src/content/logs.tsx`（`logSlots`），想改标签 / 日期展示格式也在那里改。

---

## 设计令牌速查

| 变量 | 用途 | 默认值 |
| --- | --- | --- |
| `--color-rhine-abyss` | 页面底色 | `#05070b` |
| `--color-rhine-panel` | 面板底色 | `#0b111a` |
| `--color-rhine-line` | 描边 | `#1e2a37` |
| `--color-rhine-ink` | 主文字 | `#e2e9f2` |
| `--color-rhine-dim` / `--color-rhine-faint` | 次级/弱化文字 | `#8b9bad` / `#54657a` |
| `--color-rhine-gold` | 莱茵金（主强调） | `#d3b27a` |
| `--color-rhine-cyan` | 数据青（信息强调） | `#63d4dc` |
| `--color-rhine-green` / `--color-rhine-red` | 状态色 | `#7ee2a0` / `#ff6b6b` |

Tailwind 中使用：`bg-rhine-*` / `text-rhine-*` / `border-rhine-*`（主题前缀会自动拼接为 `rhine-abyss` 等）。

---

## 部署

- `npm run build` 后将 `dist/` 部署到任意静态托管（Vercel / Netlify / GitHub Pages / 自建 Nginx）；
- 本项目使用 `BrowserRouter`，托管端需开启 SPA 回退：
  - Nginx：`try_files $uri /index.html;`
  - Netlify / Vercel：默认支持
- 若部署在子路径（如 GitHub Pages 的 `/<repo>/`）：在 `vite.config.ts` 设置 `base: '/<repo>/'`，并给 `BrowserRouter` 传入 `basename="/<repo>"`；
- 若想用纯静态托管且不想配置回退，可把 `BrowserRouter` 换成 `HashRouter`（`App.tsx`）。

---

## 已实现的交互细节

- 开机终端动画：逐行打印 + 进度条 + 点击跳过（会话内只播一次）
- 全站背景：数据网格 + CRT 扫描线 + 漂浮菱形粒子 + 旋转六边形
- Hero：身份打字机、实时本地时钟、状态读数面板、扫描线徽记、滚动提示
- 导航：滚动区块高亮、移动端全屏菜单、实时时钟状态条
- 能力模块：进入视口时进度条动画填充
- 项目卡片：悬停上浮 + 扫描光带
- 联络终端：邮箱一键复制（带 COPIED 反馈）、可玩的迷你讯号终端（输入→回显）
- 槽位模块：点击展开隐藏内容（面板只向下覆盖、方向随行列自适应）、先收回再切换、点空白/ESC/✕ 收回、展开中打断会从当前进度反向收回
- 日志页：`src/assets/logs/` 下每篇 markdown 自动生成一个可展开模块，按日期倒序排列
- 文章组件：读取 `src/assets/articles/` 的 markdown，支持 GFM 表格 / 任务列表 / 代码块 / 图片等
- 视频组件：预留视频路径，填入后渲染原生播放器（留空显示占位）
- 照片时间线：读取照片 EXIF 拍摄时间，按年份分组、时间升序排列（无 EXIF 时回退文件名日期）
- 留言板：留言以弹幕滚动整页，可提交新留言；每条留言串行播放（播完才再出现）；留言 id 为自增序号；未配置后端时本地存储，配置 MySQL 后端后自动走接口
- 无障碍：`prefers-reduced-motion` 下自动关闭动画（留言改为静态排列）

---

## 声明

本项目为个人练习与展示用的**非官方同人风格模板**；《明日方舟》及莱茵生命相关设定、素材版权归鹰角网络所有，请勿用于商业用途。占位文字与示例数据请在正式使用前替换为自己的内容。
