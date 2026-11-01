# RHINE//HOME — 莱茵生命风格个人主页 + 论坛

> 二次元 × 科幻终端风格的个人站点：首页、档案库、日志、论坛、留言板与完整管理后台。
> 视觉致敬《明日方舟》莱茵生命：黑曜石底色、白金与数据青、四角刻度面板、扫描线与开机终端动画。

---

## 技术栈

| 能力 | 选择 |
| --- | --- |
| 前端 | React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Framer Motion + React Router v7 |
| 内容渲染 | react-markdown + remark-gfm（文章 / 日志 / 论坛正文） |
| 后端 | Node.js + Express 5（MySQL 8 / MariaDB 10.6+） |
| 数据 | **MySQL 必选**；会话、验证码、内容、论坛、权限全部入库 |
| 上传 | multer（图片 / 视频 / 文件），照片自动读取 EXIF 拍摄日期 |
| 邮件 | nodemailer（SMTP 验证码；未配置时验证码打印到后端日志） |
| 鉴权 | scrypt 密码哈希 + 数据库会话令牌（重启不掉线） |

---

## 快速开始（本地）

### 1. 准备 MySQL

```sql
CREATE DATABASE rhine_home CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rhine'@'127.0.0.1' IDENTIFIED BY '你的密码';
GRANT ALL PRIVILEGES ON rhine_home.* TO 'rhine'@'127.0.0.1';
FLUSH PRIVILEGES;
```

### 2. 启动后端

```bash
cd server
npm install
cp .env.example .env     # 填写 DB_*、ADMIN_USER、ADMIN_PASSWORD
npm start                # http://localhost:3001
```

首次启动自动建表，并在用户表为空时创建超级管理员。

### 3. 启动前端

```bash
npm install
npm run dev              # http://localhost:5173
```

Vite 已配置 `/api`、`/uploads` 代理到 `http://127.0.0.1:3001`。

- 前台：<http://localhost:5173>
- 论坛：<http://localhost:5173/forum>
- 后台：<http://localhost:5173/admin>（默认 `admin / <ADMIN_PASSWORD>`，**不在前台导航中**）

> 生产部署请看 **[DEPLOY.md](DEPLOY.md)**（MySQL、systemd、Nginx、HTTPS、备份、故障排查）。

---

## 目录结构

```
src/
├── content/            站点文案 / 档案 / 能力 / 项目 / 槽位（静态兜底内容）
├── components/
│   ├── auth/           SessionProvider（全站登录态）
│   ├── forum/          ForumAuthModal / ContentComposer / AttachmentGrid
│   ├── admin/          AdminDashboard、AdminLogin、PermissionTree、AdminUi
│   │   └── panels/     概览 / 文章 / 照片 / 视频 / 日志 / 板块 / 审核 / 成员 / 设置
│   ├── slots/          首页可展开槽位与内容组件（文章、视频、照片时间线）
│   ├── layout/         NavBar / Footer / BackgroundFX
│   └── guestbook/      弹幕留言墙
├── pages/              Home / Archive / Projects / Logs / Forum* / Guestbook / Admin
├── lib/                api.ts（统一接口层）/ format.ts / motion.ts / cx.ts
└── assets/             本地兜底文章、日志、照片

server/
├── index.mjs           全部 API（账号 / 内容 / 论坛 / 审核 / 上传 / 静态托管）
├── db.mjs              连接池 + 建表 + 断连重试
├── auth.mjs            密码 / 会话 / 权限树
├── mail.mjs            SMTP 验证码
├── schema.sql          完整表结构（供查看/手动建库）
└── uploads/            上传文件（运行时生成）
```

---

## 功能一览

### 前台

- 首页：开机终端动画、Hero 打字机 + 鼠标视差徽记、能力进度条、项目卡片；
- 档案库：文章（markdown + 附件下载）、照片时间线（EXIF 排序）、视频模块；
- 日志：后台发布的日志以可展开模块展示；
- 论坛：板块、帖子、回复、图片/视频/文件附件，页面切换与卡片动画；
- 留言板：弹幕滚动、串行播放；发送者可在本次页面会话内删除自己刚发的留言，后台「留言板」模块可搜索 / 删除任意留言（`guestbook` 权限）。

### 论坛

- 任何注册用户可发帖 / 回复；**注册需邮箱验证码**；
- 帖子支持标题、标签、markdown 正文、图片 / 视频 / 文件附件；图片会插入光标位置，预览为完整渲染效果；
- 普通用户的帖子进入审核队列；**拥有该板块论坛权限的管理员发帖直接发布**；
- 回复即时发布，只允许图片 / GIF（≤30MB），支持回复楼中楼；
- 帖主 / 回复人 / 版主可以删除自己的或不当的回复；帖主与版主可删除帖子；
- 版主可置顶、隐藏（封禁）帖子，隐藏后所有人不可见，仅后台可恢复；
- 论坛公告仅论坛管理员可发布；板块与帖子均支持搜索，帖子支持标签筛选；
- **板块访问等级**：公开（含游客）/ 特殊（需申请或授权）/ 核心（仅超级管理员与授权成员）；特殊板块可向板块管理员申请访问；
- 后台「帖子管理」可直接进入板块管理帖子，并内置帖子预览弹窗，不会跳回前台。

### 个人主页

- `/profile`：头像（≤20MB，圆形裁切显示）、**昵称（可修改）**、性别、生日、简介、标签；
- 用户名仅用于登录，不可修改；昵称会显示在论坛、私信与导航栏；
- **关注系统**：可关注/取消关注其他成员，查看关注与粉丝列表；
- 公开主页 `/u/:id`：展示昵称、简介、标签、粉丝/关注数与公开帖子，可直接关注；
- 通知中心：审核结果、权限变更、封禁、关注、私信提醒；
- 私信：成员之间一对一聊天，未读数提示；
- 我的帖子：查看自己帖子的审核 / 发布状态；「我的回复」一并展示；
- 账号页：修改密码（原密码 + 两次确认）、重新绑定邮箱（验证码）、退出登录；
- 导航头像旁的通知按钮合并通知与私信未读数，重要通知高亮显示。

### 账号与封禁

- 成员列表支持搜索与角色筛选（含「已封禁」）；
- 管理员可设置封禁期限（1–3650 天）或永久封禁；永久封禁会拉黑邮箱，无法再注册；
- 封禁会立即清除该账号的登录会话。

### 管理后台（/admin）

| 模块 | 能力 |
| --- | --- |
| 概览 | 各模块数量、待审数量、MySQL 连接状态 |
| 档案 | 文章 / 照片 / 视频的增删改；链接或上传二选一 |
| 日志 | 手写或导入 `.md` |
| 留言板 | 查看 / 搜索 / 删除留言（`guestbook` 权限） |
| 论坛 | 板块创建/编辑/删除（公开 / 特殊 / 核心）；帖子管理（置顶 / 隐藏 / 删除 / 恢复 / 预览弹窗）；公告发布；访问申请审批；内容审核（完整渲染预览 + 通过 / 拒绝 + 备注） |
| 成员 | 搜索、角色筛选、权限树、重置密码、封禁（期限 / 永久拉黑邮箱）、删除 |
| 设置 | 修改自己的密码（需原密码 + 两次确认） |

---

## 账号 / 角色 / 权限规则

| 角色 | 条件 | 说明 |
| --- | --- | --- |
| 超级用户 | 部署时创建 | 全部权限；**不可删除**；密码只能本人在「设置」修改 |
| 管理员用户 | 拥有「管理成员」或「授权权限」 | 管理成员；不能操作其他管理类账号 |
| 论坛管理员 | 拥有任意论坛板块权限 | 审核授权板块的内容 |
| 普通用户 | 注册用户 | 论坛发帖 / 回复 / 上传 |

权限树（授权时可勾选父级或子级）：

- **档案**：`archive`（全部）→ `archive.articles` / `archive.photos` / `archive.videos`
- **日志**：`logs`
- **论坛**：`forum`（全部板块）→ `forum.<板块ID>`（按板块授权）
- **管理成员**：`members.manage`
- **授权权限**：`members.grant`

规则：

1. 只有拥有「授权权限」的账号可以修改他人权限；
2. 任何人（包括管理员）不能修改自己的权限；
3. 拥有管理类权限的账号之间不能互相操作，只有超级用户可以；
4. 超级管理员不可删除，其他账号无法修改超级管理员的密码；
5. 除超级用户外，所有账号必须有邮箱；注册与找回密码都走邮箱验证码；
6. 用户自助改密码：原密码 + 新密码两次确认；管理员重置他人密码无需原密码。

---

## 内容与上传

- 文章附件、照片、视频、论坛附件都通过 `POST /api/upload?kind=file|photo|video` 上传；
- 照片服务端读取 EXIF `DateTimeOriginal`，无 EXIF 时回退文件名日期；
- 上传文件保存在 `server/uploads/{file,photo,video}`，通过 `/uploads/...` 公开访问；
- 档案内容由有对应权限的管理员维护；论坛内容统一进入审核队列。

---

## 部署

完整步骤见 **[DEPLOY.md](DEPLOY.md)**，核心要点：

- 单域名同源：前端默认请求相对路径 `/api`，Nginx 同时转发 `/api`、`/uploads`；
- Node 用 systemd / PM2 常驻并自动重启；
- 会话存 MySQL，服务重启不影响登录；
- 必须配置 `ADMIN_PASSWORD`、生产环境 `ALLOW_DEV_CODES=0`；
- 大文件上传记得 `client_max_body_size 500m` 与长超时。

---

## 常用命令

```bash
npm run dev        # 前端开发
npm run build      # 类型检查 + 生产构建（dist/）
npm run lint       # oxlint
cd server && npm start
cd server && npm run import-legacy   # 从旧版 markdown / JSON 恢复内容
```

## 数据持久化

- 内容全部保存在 MySQL，重新部署代码不会清空数据库；
- 容器部署需要给 MySQL 挂载 volume，并保留 `server/uploads`；
- 若数据库为空，后端首次启动会自动从 `src/assets/articles`、`src/assets/logs`、旧版 `server/data/*.json` 恢复内容；
- 详见 [DEPLOY.md](DEPLOY.md) 的「重新部署与旧数据恢复」。

---

## 性能

- 路由级代码分割：首页主包 gzip ≈ 100KB；后台、论坛、markdown 按需加载；
- 后端 gzip + 静态资源长缓存（`/assets` immutable，`/uploads` 7 天）；
- 内容接口 30 秒缓存；图片懒加载 + `decoding="async"`；
- 论坛列表分页（每页 12），审核队列分页；
- MySQL 已建索引：帖子（板块 + 状态）、回复（帖子 + 状态）、会话（过期时间）。

---

## 声明

个人练习与展示用的非官方同人风格项目；《明日方舟》及莱茵生命相关设定与素材版权归鹰角网络所有，请勿用于商业用途。
