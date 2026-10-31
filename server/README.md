# RHINE//HOME 后端（MySQL）

Express 5 服务：账号 / 邮箱验证码 / 数据库会话 / 权限树 / 档案内容 / 日志 / 论坛 / 审核 / 上传，并可托管前端 `dist/`。

## 快速开始

```bash
cd server
npm install
cp .env.example .env    # 填写 DB_*、ADMIN_USER、ADMIN_PASSWORD
npm start               # http://localhost:3001
```

启动时自动建表；用户表为空时按环境变量创建超级管理员。

健康检查：

```bash
curl http://127.0.0.1:3001/api/health
# {"ok":true,"storage":"mysql","version":"2.0.0",...}
```

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `PORT` | 端口，默认 3001 |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | **必填**，MySQL 连接 |
| `ADMIN_USER` / `ADMIN_PASSWORD` | 首次启动创建超级管理员 |
| `SESSION_HOURS` | 会话时长（默认 12 小时，存 MySQL） |
| `UPLOAD_DIR` | 上传目录（默认 `server/uploads`） |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | 验证码邮件；不配置则打印到日志 |
| `ALLOW_DEV_CODES` | 本地调试返回验证码（生产必须 0） |
| `CORS_ORIGIN` | 前后端分域时允许的来源；同域留空 |

## 数据表

`users`、`sessions`、`email_codes`、`articles`、`photos`、`videos`、`logs`、`forum_boards`、`forum_posts`、`forum_replies`、`guest_messages`。完整 DDL 见 `schema.sql`。

## 权限

| key | 含义 |
| --- | --- |
| `archive` / `archive.articles` / `archive.photos` / `archive.videos` | 档案及子权限 |
| `logs` | 日志 |
| `forum` / `forum.<boardId>` | 论坛全部板块 / 指定板块 |
| `members.manage` | 管理成员（新增、删除、重置密码） |
| `members.grant` | 授权权限（修改他人权限） |

规则由服务端强制：

- 只有 `members.grant`（或超级用户）能修改权限；
- 不能修改自己的权限；
- 拥有 `members.*` 的账号之间不能互相操作（仅超级用户）；
- 超级管理员不可删除、不可被其他账号改密。

## 接口

### 公开

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查（含 MySQL ping） |
| POST | `/api/auth/login` | 登录（用户名或邮箱 + 密码） |
| POST | `/api/auth/email-code` | 发送注册/重置验证码 |
| POST | `/api/auth/register` | 注册（需验证码） |
| POST | `/api/auth/password/reset` | 邮箱验证码重置密码 |
| GET | `/api/content/articles` / `logs` / `photos` / `videos` | 前台内容 |
| GET | `/api/messages` | 留言板 |
| POST | `/api/messages` | 提交留言 |
| GET | `/api/forum/boards` | 板块列表 |
| GET | `/api/forum/boards/:slug` | 板块帖子（分页，仅已审核） |
| GET | `/api/forum/posts/:id` | 帖子详情 + 已审核回复 |

### 登录用户

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/auth/me` | 当前用户 |
| POST | `/api/auth/logout` | 退出 |
| POST | `/api/admin/me/password` | 修改自己的密码（原密码 + 两次确认） |
| POST | `/api/upload?kind=file\|photo\|video` | 上传（multipart 字段 `file`） |
| POST | `/api/forum/posts` | 发帖（进入待审核） |
| POST | `/api/forum/posts/:id/replies` | 回复（进入待审核） |
| GET | `/api/forum/my` | 我的帖子 / 回复及审核状态 |

### 管理后台（Bearer Token）

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| GET | `/api/admin/overview` | 任意管理权限 |
| GET/POST/PUT/DELETE | `/api/admin/articles`（及 `photos` / `videos` / `logs`） | 对应档案/日志权限 |
| GET | `/api/admin/users` | 成员管理或授权权限 |
| POST | `/api/admin/users` | `members.manage` |
| PUT | `/api/admin/users/:id` | `members.manage`（邮箱 / 密码 / 禁用） |
| PUT | `/api/admin/users/:id/permissions` | `members.grant` |
| DELETE | `/api/admin/users/:id` | `members.manage` |
| GET/POST/PUT/DELETE | `/api/admin/forum/boards` | 论坛权限（创建/删除需 `forum`） |
| GET | `/api/admin/forum/pending` | 论坛权限（按板块过滤） |
| POST | `/api/admin/forum/review` | 对应板块审核权限 |

## 上传

- 目录：`uploads/file`、`uploads/photo`、`uploads/video`；
- 单文件上限 500MB；
- 照片服务端读取 EXIF `DateTimeOriginal`，返回 `{ url, name, size, date }`；
- 静态访问：`/uploads/...`，缓存 7 天。

## 生产部署

见项目根目录 **[DEPLOY.md](../DEPLOY.md)**（MySQL、systemd、Nginx、HTTPS、备份、故障排查）。

## 注意

- 不要提交 `.env`；
- 生产环境设置 `ALLOW_DEV_CODES=0`；
- 修改默认管理员密码；
- 上传目录只作为静态文件提供，不执行脚本。
