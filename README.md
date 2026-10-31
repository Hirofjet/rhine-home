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
| 后端 | Node + Express 5：鉴权、内容 CRUD、文件上传、留言板；MySQL 8 或 JSON 文件存储 |
| 管理后台 | `/admin` 独立入口（不出现在前台导航），账号 + 模块权限 |

> 项目使用 **npm**（扁平 `node_modules` 布局，Windows + 中文路径下最稳）。请使用 `npm install`。

## 快速开始

```bash
npm install          # 前端依赖
npm run dev          # 前端开发服务器 → http://localhost:5173
npm run build        # 类型检查 + 生产构建（产物在 dist/）
npm run preview      # 本地预览构建产物
npm run lint         # oxlint 检查
```

另开一个终端启动后端（管理后台 / 上传 / 留言板 / 内容接口都依赖它）：

```bash
cd server
npm install
npm start            # → http://localhost:3001（自动建表 / 初始化管理员）
```

- 开发服务器已配置代理，前端用 `/api`、`/uploads` 访问后端，无需额外配置；
- **管理后台入口：`http://localhost:5173/admin`**（前台导航中不出现，可用 `VITE_ADMIN_PATH` 改成自己的路径）；
- 初始管理员默认 `admin / admin123`（首次启动自动创建，请尽快修改或通过 `ADMIN_USER` / `ADMIN_PASSWORD` 环境变量覆盖）。

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
│   │   └── content/      ArticleBlock / VideoBlock / PhotoTimeline / ArticlesFeed / VideosFeed
│   ├── guestbook/        DanmakuWall（留言弹幕墙）
│   └── admin/            管理后台：登录、控制台、文章 / 日志 / 照片 / 视频 / 成员面板
├── pages/                HomePage / ArchivePage / ProjectsPage / LogsPage / GuestbookPage / AdminPage / NotFoundPage
├── hooks/                useTypewriter / useClock / useActiveSection / useCopy
├── lib/                  cx / motion（动画预设）/ contentApi（公开内容接口）/ adminApi（后台接口）/ api（留言板）
├── assets/
│   ├── articles/         ← 文章 markdown 放这里
│   ├── logs/             ← 日志 markdown 放这里（每篇自动生成一个可展开模块）
│   └── photos/           ← 照片放这里（自动读取拍摄时间排序）
└── App.tsx               路由注册（前台 / 后台分离、非首页按需加载）+ 开机门

server/                   后端服务：鉴权、内容 CRUD、上传、留言板（MySQL 或 JSON 存储）
├── index.mjs             Express 主程序（API + /uploads 静态 + 生产环境托管 dist）
├── store.mjs             存储层（MySQL / JSON 文件双实现）
├── auth.mjs              密码哈希（scrypt）与权限清单
├── schema.sql            MySQL 建表语句（启动时会自动建表，此文件供参考）
└── uploads/              上传文件目录（运行时生成）
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
| `<ArticleBlock file="..." title="" tags={[]} downloads={[]} />` | 渲染 markdown 文章（支持 GFM：表格、任务列表、删除线、代码块、图片等）；可在文末附本地文件下载链接 | markdown 放 `src/assets/articles/`；附件放 `public/downloads/` |
| `<VideoBlock src="" title="" description="" tags={[]} />` | 标题 + 简介 + 播放器（`src` 留空显示占位；播放器限高 420px） | 视频放 `public/videos/` |
| `<PhotoTimeline />` | 照片时间线：自动读取 EXIF 拍摄时间排序，按年份分组 | 照片放 `src/assets/photos/` |

小提示：

- 文章文件路径可以写完整路径 `/src/assets/articles/hello.md`，也可以只写文件名 `hello.md`；
- markdown 里引用图片可以写 `/favicon.svg` 这类 public 路径；
- 照片没有 EXIF 时，会尝试从文件名解析 `YYYY-MM-DD`，都没有则归入「未知时间」；
- 照片和文章都是构建时静态加载 —— 增删文件后重新构建即可；
- 展开面板最小高度为 `640px`（`SlotGrid.tsx` 的 `PANEL_MIN_HEIGHT`），足够完整显示视频与文案，可按需调整。

**文章附件下载**：把文件放进 `public/downloads/`，然后给 `ArticleBlock` 传 `downloads`：

```tsx
<ArticleBlock
  file="/src/assets/articles/hello.md"
  title="文章标题"
  tags={['随笔']}
  downloads={[
    { label: '本文 PDF 版', file: 'hello.pdf', size: '1.2 MB' },
    { label: '源码压缩包', file: 'source.zip', note: '含示例代码' },
    // file 也可写完整路径 '/downloads/x.zip' 或 https 外链
  ]}
/>
```

渲染在文章正文下方、标签上方；链接带 `download` 属性，点击即下载（跨域外链会由浏览器决定打开方式）。

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

## 部署（推荐：后端直接托管站点）

**方式一：后端托管（推荐，带管理后台）**

1. `npm run build` 生成 `dist/`；
2. `cd server && npm install && npm start`；
3. 后端会自动托管 `dist/` 并通过 `/uploads` 提供上传文件，访问 `http://localhost:3001` 即可。

**方式二：前后端分离**

- `dist/` 交给静态托管（需 SPA 回退），后端单独部署；
- 前端 `.env` 配置 `VITE_API_BASE=https://api.example.com`，后端设置 `CORS_ORIGIN=https://example.com`。

Nginx 静态托管需要 `try_files $uri /index.html;`；部署在子路径时还要设置 `base` 与 `basename`。

---

## 管理后台（/admin）

- 入口：`/admin`（**不出现在前台导航**；可用 `VITE_ADMIN_PATH` 改成自定义路径，例如 `/console-x7k2`，构建时生效）；
- 鉴权：登录后获得 12 小时会话令牌；连续失败登录会限流；
- 权限：owner 拥有全部权限；新增成员时可勾选模块权限（文章 / 日志 / 照片 / 视频 / 成员）；
- **文章**：标题、日期、标签、markdown 正文（可预览）、附件 —— 每条附件都有「使用文件链接」勾选框：勾选填链接，不勾选直接上传本地文件；
- **日志**：可直接导入 `.md` 文件（自动识别 `# 标题` 与文件名日期），也可手写；
- **照片**：批量上传（服务端读取 EXIF 拍摄日期用于排序）或用链接添加；
- **视频**：标题 + 简介 + 视频文件（上传或链接）+ 封面；
- **成员**：创建账号、勾选模块权限、重置密码、删除（owner 或拥有「成员」权限的账号可操作）；
- 上传文件存放在 `server/uploads/`，通过 `/uploads/...` 访问。

---

## 后端与存储

- 支持 **MySQL 8**（配置 `DB_HOST` 等环境变量，启动自动建表）与 **JSON 文件**（默认，无需数据库，适合弱性能服务器）；
- 配置见 `server/.env.example`：`ADMIN_USER` / `ADMIN_PASSWORD` / `DB_*` / `CORS_ORIGIN` / `UPLOAD_DIR` 等；
- 公开接口（前台读取，无需登录）：`GET /api/content/articles|logs|photos|videos`、`GET/POST /api/messages`；
- 后台接口（需要令牌）：`/api/admin/*`（登录、内容 CRUD、上传、成员管理）；
- 健康检查：`GET /api/health`。

---

## 性能与动效（本轮增强）

性能：

- 路由级代码分割：首页主包约 443KB（gzip 140KB），markdown / EXIF / 后台面板均在进入对应页面时才加载；
- 后端开启 gzip 压缩；`/uploads` 与 `dist/assets` 带长缓存头（immutable），其余静态资源 1 小时缓存；
- 照片懒加载 + `decoding="async"`；内容接口带 30 秒缓存；
- 后台页面不加载前台特效与导航，减少管理端开销；
- 接口不可用时自动回退本地静态内容，站点照常可用。

动效：

- 前台页面切换过渡（淡入 + 上移）；
- Hero 徽记鼠标视差 + 环绕轨道粒子；
- 按钮跟随鼠标的柔光；
- 背景缓慢漂移的光束。

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
- 管理后台：`/admin` 独立入口 + 登录鉴权 + 模块权限；文章 / 日志 / 照片 / 视频 / 成员管理，文件上传或链接二选一
- 前台内容联动：后台发布的文章、日志、照片、视频无需重新构建即可在对应模块显示（接口不可用时回退本地内容）
- 页面切换过渡、Hero 鼠标视差与轨道粒子、按钮柔光、背景漂移光束
- 无障碍：`prefers-reduced-motion` 下自动关闭动画（留言改为静态排列）

---

## 声明

本项目为个人练习与展示用的**非官方同人风格模板**；《明日方舟》及莱茵生命相关设定、素材版权归鹰角网络所有，请勿用于商业用途。占位文字与示例数据请在正式使用前替换为自己的内容。
