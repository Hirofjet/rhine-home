# RHINE//HOME 后端

Express 5 + 文件存储服务：管理后台鉴权、内容 CRUD、文件上传、留言板，并可托管前端构建产物。

## 快速开始

```bash
cd server
npm install
npm start        # http://localhost:3001
```

首次启动会：

1. 自动建库表（MySQL 模式）或创建 `server/data/*.json`（JSON 模式）；
2. 在没有任何账号时创建初始管理员（默认 `admin / admin123`）。

> 生产环境请用环境变量覆盖初始账号，并在后台修改密码。

## 环境变量

复制 `.env.example` 为 `.env`（或直接设置环境变量）：

| 变量 | 说明 |
| --- | --- |
| `PORT` | 端口，默认 `3001` |
| `ADMIN_USER` / `ADMIN_PASSWORD` | 首次启动时创建的管理员账号 |
| `CORS_ORIGIN` | 前后端分域时允许的来源，逗号分隔（同域部署可留空） |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | 配置后使用 MySQL；不配置则用 JSON 文件 |
| `UPLOAD_DIR` / `DATA_DIR` | 自定义上传 / 数据目录（默认 `server/uploads`、`server/data`） |

## 存储

- **MySQL 8**：配置 `DB_HOST` 后自动建表（`schema.sql` 为参考 DDL）；
- **JSON 文件**：默认模式，数据保存在 `server/data/*.json`，无需数据库，适合弱性能服务器或本地调试。

两种模式共用同一套接口与数据模型。

## 接口一览

公开（前台读取，无需登录）：

- `GET /api/content/articles`
- `GET /api/content/logs`
- `GET /api/content/photos`
- `GET /api/content/videos`
- `GET /api/messages` / `POST /api/messages`（留言板）
- `GET /api/health`（健康检查）

后台（`Authorization: Bearer <token>`）：

- `POST /api/admin/login` `{ username, password }` → `{ token, user }`
- `POST /api/admin/logout`、`GET /api/admin/me`
- `GET/POST /api/admin/articles`、`PUT/DELETE /api/admin/articles/:id`
- 日志 / 照片 / 视频同上（`logs` / `photos` / `videos`）
- `POST /api/admin/upload?kind=file|photo|video`（multipart 字段名 `file`）
  - 照片会读取 EXIF `DateTimeOriginal`，返回 `{ url, name, size, date }`
- 成员管理（owner 或拥有 `members` 权限的账号）：
  - `GET /api/admin/users`
  - `POST /api/admin/users` `{ username, password, permissions }`
  - `PUT /api/admin/users/:id` `{ password?, permissions? }`
  - `DELETE /api/admin/users/:id`

权限模块：`articles` / `logs` / `photos` / `videos` / `members`。

## 部署

1. 在项目根目录执行 `npm run build` 生成 `dist/`；
2. 启动本服务（`npm start`）；
3. 服务会自动托管 `dist/`（SPA 回退），并通过 `/uploads` 提供上传文件；
4. 访问 `http://服务器:3001` 即为完整站点，管理后台在 `/admin`（或前端配置的 `VITE_ADMIN_PATH`）。

也可以前后端分离部署：前端配置 `VITE_API_BASE`，后端设置 `CORS_ORIGIN`。

## 安全提示

- 修改默认管理员密码；
- 生产环境建议挂在 Nginx 后面开启 HTTPS；
- 上传目录不要允许执行脚本（仅作为静态文件提供）。
