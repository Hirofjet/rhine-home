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
- 留言板：弹幕滚动、串行播放、自增编号。

### 论坛

- 任何注册用户可发帖 / 回复；**注册需邮箱验证码**；
- 帖子与回复提交后状态为「待审核」，公开列表只显示已通过内容；
- 作者可在论坛首页「我的发布」查看自己的待审/通过/拒绝状态；
- 支持 markdown 正文 + 图片 / 视频 / 文件上传（单个 ≤ 500MB）。

### 管理后台（/admin）

| 模块 | 能力 |
| --- | --- |
| 概览 | 各模块数量、待审数量、MySQL 连接状态 |
| 档案 | 文章 / 照片 / 视频的增删改；链接或上传二选一 |
| 日志 | 手写或导入 `.md` |
| 论坛 | 板块创建/编辑/删除；内容审核（通过 / 拒绝 + 备注） |
| 成员 | 新增成员、权限树、重置密码、删除 |
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
```

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
