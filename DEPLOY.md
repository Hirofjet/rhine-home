# RHINE//HOME 部署教程（MySQL + Node + Nginx）

> 目标：**同一个域名**下同时提供前台、论坛、管理后台与 API，避免「后台有时连不上」。
> 推荐拓扑：`浏览器 → Nginx(443) → 静态 dist + /api、/uploads 反向代理 → Node(3001) → MySQL(3306)`。

---

## 0. 为什么之前会出现「后台连不上」

常见原因与本项目的处理方式：

| 原因 | 表现 | 本项目的处理 |
| --- | --- | --- |
| 前端静态托管，没有把 `/api` 转发到后端 | 前台能开、登录一直转圈或报网络错误 | 前端默认**同源相对路径** `/api`；Nginx 统一转发 |
| 前端配置了错误的 `VITE_API_BASE` / 跨域 | 本地正常、线上 401/CORS | 默认不配置；同域部署无需 CORS |
| 后端进程崩溃后没有自动拉起 | 时好时坏、502 | systemd `Restart=always`（或 PM2） |
| Node 与 MySQL 之间空闲断连 | 偶发 500、`PROTOCOL_CONNECTION_LOST` | 连接池 keepAlive + 断连自动重试 |
| 登录后服务重启，内存会话丢失 | 刷新就退出登录 | 会话存 **MySQL**，重启不掉线 |
| Nginx 上传限制/超时 | 大图/视频上传失败、502/413 | `client_max_body_size` 与超时配置 |
| 服务器时间不同步 | 令牌刚登录就过期 | 部署时开启 NTP；会话按数据库时间判断 |

> 只要按下面步骤部署，前端与后端在同域，`/api` 一定可达，后台不会再「时而连不上」。

---

## 1. 服务器要求

- Linux（Ubuntu 22.04 / Debian 12 推荐）或 Windows Server；
- Node.js ≥ 20.19（推荐 22 LTS）；
- MySQL ≥ 8.0（MariaDB ≥ 10.6 也可）；
- Nginx ≥ 1.20；
- 域名（可选但强烈建议）与 HTTPS 证书。

内存建议：1 GB 可跑（MySQL 调小），2 GB 更稳。

---

## 2. 安装并初始化 MySQL

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y mysql-server
sudo systemctl enable --now mysql
sudo mysql_secure_installation   # 按提示设置 root 密码、移除匿名用户
```

### 创建数据库与专用账号（必须）

登录 MySQL：

```bash
sudo mysql
```

执行（把密码换成你自己的强密码）：

```sql
CREATE DATABASE rhine_home CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rhine'@'127.0.0.1' IDENTIFIED BY '请替换为强密码';
GRANT ALL PRIVILEGES ON rhine_home.* TO 'rhine'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

验证：

```bash
mysql -h 127.0.0.1 -u rhine -p rhine_home -e "SELECT 1;"
```

> 表结构会在后端首次启动时自动创建（`IF NOT EXISTS`），无需手动导入；
> 想手动建表可执行 `mysql -u rhine -p rhine_home < server/schema.sql`。

### Windows

1. 安装 MySQL 8（官方 MSI 或便携版），初始化并记住 root 密码；
2. 用 MySQL Workbench 或命令行执行上面的建库/建用户 SQL；
3. 确认 `127.0.0.1:3306` 可连接。

### 时区与字符集

```sql
SET GLOBAL time_zone = '+08:00';   -- 或写入 my.cnf
```

`my.cnf` 推荐：

```ini
[mysqld]
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
default-time-zone = '+08:00'
innodb_buffer_pool_size = 256M   # 1GB 内存服务器可设 256M
max_connections = 100
```

---

## 3. 上传代码与构建前端

把项目放到 `/srv/rhine-home`（示例）：

```bash
sudo mkdir -p /srv/rhine-home
sudo chown -R $USER:$USER /srv/rhine-home
# 用 git clone 或 scp/git 上传项目文件
cd /srv/rhine-home

# 前端依赖与构建
npm ci
npm run build      # 产物 dist/
```

> 若服务器内存较小，可在本地 `npm run build` 后只上传 `dist/`。
> 前端默认使用相对路径 `/api`，**不需要**配置 `VITE_API_BASE`。

可选环境变量（构建时生效）：

```bash
# 自定义后台入口（默认 /admin），例如：
VITE_ADMIN_PATH=/console-x7k2 npm run build
```

---

## 4. 配置后端

```bash
cd /srv/rhine-home/server
npm ci --omit=dev
cp .env.example .env
nano .env
```

最小可用配置：

```ini
PORT=3001
NODE_ENV=production

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=rhine
DB_PASSWORD=请替换为强密码
DB_NAME=rhine_home

ADMIN_USER=admin
ADMIN_PASSWORD=请替换为强密码
SESSION_HOURS=12

UPLOAD_DIR=/srv/rhine-home/server/uploads
ALLOW_DEV_CODES=0
```

### 邮件（注册 / 找回密码验证码）

不配置 SMTP 时，验证码只会打印在服务端日志中（适合内网测试，**正式站点必须配置**）。

QQ 邮箱示例：

```ini
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_SECURE=1
SMTP_USER=你的QQ邮箱@qq.com
SMTP_PASS=邮箱授权码          # 不是登录密码
SMTP_FROM=RHINE//HOME <你的QQ邮箱@qq.com>
```

163 邮箱：`SMTP_HOST=smtp.163.com`，端口 `465`，`SMTP_SECURE=1`。

> 配置后重启后端，注册页「发送验证码」会真正发信。

---

## 5. 启动后端

先手动验证：

```bash
cd /srv/rhine-home/server
node index.mjs
# 另开终端：
curl http://127.0.0.1:3001/api/health
# 期望：{"ok":true,"storage":"mysql",...}
```

### systemd（推荐）

`/etc/systemd/system/rhine-home.service`：

```ini
[Unit]
Description=RHINE//HOME backend
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/srv/rhine-home/server
EnvironmentFile=/srv/rhine-home/server/.env
ExecStart=/usr/bin/node index.mjs
Restart=always
RestartSec=3
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

```bash
sudo chown -R www-data:www-data /srv/rhine-home/server/uploads
sudo systemctl daemon-reload
sudo systemctl enable --now rhine-home
sudo systemctl status rhine-home
journalctl -u rhine-home -n 100 -f
```

### 或者 PM2

```bash
npm i -g pm2
cd /srv/rhine-home/server
pm2 start index.mjs --name rhine-home --update-env
pm2 save
pm2 startup
```

> 保持**单实例**即可（会话存数据库，单实例足够，且避免上传目录竞争）。

---

## 6. Nginx 反向代理（关键）

方式 A（推荐）：Nginx 直接托管静态文件，并把 `/api`、`/uploads` 转发给 Node。

`/etc/nginx/sites-available/rhine-home`：

```nginx
server {
    listen 80;
    server_name example.com;

    root /srv/rhine-home/dist;
    index index.html;

    client_max_body_size 500m;

    # 前端
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 带 hash 的静态资源长缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 上传文件（由 Node 提供）
    location /uploads/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        expires 7d;
    }

    # API（关键：登录、后台、论坛都走这里）
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
        proxy_request_buffering off;   # 大文件上传更稳
    }
}
```

启用：

```bash
sudo ln -s /etc/nginx/sites-available/rhine-home /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

方式 B：让 Node 托管 `dist/`（Nginx 只做反代）：

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

> **两种方式不要混用**：方式 A 的 `root` 必须指向最新的 `dist/`；方式 B 不要再用 `root`。
> 混用或忘记 `/api` 反代，正是「前台能开、后台连不上」的最常见原因。

---

## 7. HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com
sudo certbot renew --dry-run
```

HTTPS 后请确认：

- 前端地址为 `https://example.com`；
- 若曾用 `http://` 登录，清一次浏览器缓存/令牌（`localStorage` 的 `rhine:token`），避免协议切换导致请求失败。

---

## 8. 防火墙

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

**不要**把 3001/3306 暴露到公网；它们只监听 127.0.0.1。

---

## 9. 首次使用

1. 打开 `https://example.com/admin`（或你构建时设置的 `VITE_ADMIN_PATH`）；
2. 用 `.env` 里的 `ADMIN_USER` / `ADMIN_PASSWORD` 登录；
3. 立刻到「设置」修改超级管理员密码（需原密码 + 新密码两次确认）；
4. 配置 SMTP 后，注册用户才能收到验证码；
5. 在「板块管理」创建/调整论坛板块；
6. 在「成员与权限」添加管理员：

### 角色与权限规则（重要）

| 角色 | 条件 | 能力 |
| --- | --- | --- |
| 超级用户 | 部署时创建（is_super） | 全部；不可删除；密码只能本人在「设置」修改 |
| 管理员用户 | 拥有 `管理成员` 或 `授权权限` | 管理成员；不能操作其他管理类账号 |
| 论坛管理员 | 拥有任意 `forum.*` 权限 | 审核所授权板块的内容、管理板块内容 |
| 普通用户 | 无管理权限 | 论坛发帖 / 回复 / 上传（需邮箱验证） |

权限树：

- 档案：`archive`（全部）或 `archive.articles` / `archive.photos` / `archive.videos`
- 日志：`logs`
- 论坛：`forum`（全部板块）或 `forum.<板块ID>`（在成员权限弹窗中按板块勾选）
- 管理成员：`members.manage`
- 授权权限：`members.grant`

关键规则：

- 只有拥有「授权权限」的账号能修改他人权限；
- 任何人都不能修改**自己的**权限；
- 拥有管理类权限（`members.*`）的账号之间不能互相操作，只有超级用户能；
- 超级管理员不可删除；
- 所有非超级用户必须填写邮箱；注册用户必须完成邮箱验证码。

---

## 10. 备份与恢复

### 数据库

```bash
mkdir -p /srv/backup
mysqldump -u rhine -p --single-transaction --routines rhine_home \
  | gzip > /srv/backup/rhine-$(date +%F).sql.gz
```

`crontab -e` 每天 03:30：

```cron
30 3 * * * mysqldump -u rhine -p'密码' --single-transaction rhine_home | gzip > /srv/backup/rhine-$(date +\%F).sql.gz
```

恢复：

```bash
gunzip -c /srv/backup/rhine-2026-11-01.sql.gz | mysql -u rhine -p rhine_home
```

### 上传文件

```bash
rsync -a --delete /srv/rhine-home/server/uploads/ /srv/backup/uploads/
```

---

## 11. 重新部署与旧数据恢复

**数据不会因为更新代码而消失**：内容都在 MySQL 的 `rhine_home` 数据库里，`dist/` 只是前端静态文件，重新构建 / 重新上传代码不会清空数据库。

需要一起保留的还有：

- MySQL 数据目录（容器部署务必挂载 volume，例如 `mysql-data:/var/lib/mysql`）；
- `server/uploads/`（上传的图片、视频、附件）；
- `server/.env`（数据库密码、SMTP、管理员初始密码）。

如果数据库被重建为空，后端首次启动会自动恢复旧内容：

1. 从 `src/assets/articles/*.md` 恢复文章；
2. 从 `src/assets/logs/*.md` 恢复日志；
3. 如果存在旧版 `server/data/*.json`，优先导入其中的文章 / 日志 / 照片 / 视频。

自动恢复只会在对应内容表为空时执行，不会覆盖已有数据；也可以手动执行：

```bash
cd server
npm run import-legacy
```

新服务器部署时，把旧站的 `src/assets`、`server/data`、`server/uploads` 一起带过去即可恢复内容与附件。

## 12. 升级流程

```bash
cd /srv/rhine-home
git pull                # 或重新上传代码
npm ci
npm run build
cd server && npm ci --omit=dev
sudo systemctl restart rhine-home
sudo systemctl reload nginx
curl -fsS https://example.com/api/health
```

数据库结构使用 `CREATE TABLE IF NOT EXISTS`，升级不会清空数据。

---

## 13. 性能优化建议

- **MySQL**：`innodb_buffer_pool_size` 设为内存的 50%–60%；已建索引（帖子按板块+状态、回复按帖子+状态、会话按过期时间）；
- **Nginx**：开启 gzip（见下）、静态资源 `immutable` 长缓存、HTTP/2；
- **Node**：单实例即可；`compression` 已开启；内容接口带 30 秒缓存；
- **上传**：图片建议先压缩；视频建议 ≤ 200 MB；
- **前端**：已按路由分包（首页 gzip ≈ 100 KB，后台/论坛按需加载）；图片懒加载；
- 若访问量增大，再加一层 CDN（只缓存静态 `/assets`，不要缓存 `/api`）。

Nginx gzip 片段：

```nginx
gzip on;
gzip_comp_level 5;
gzip_min_length 1024;
gzip_types text/plain text/css application/javascript application/json image/svg+xml;
```

---

## 14. 故障排查：后台连不上

### 第 1 步：确认后端活着

```bash
curl -i http://127.0.0.1:3001/api/health
sudo systemctl status rhine-home
journalctl -u rhine-home -n 100 --no-pager
```

### 第 2 步：确认经 Nginx 也活着

```bash
curl -i https://example.com/api/health
```

- 若第 1 步 OK、第 2 步失败 → **Nginx 没有配置 /api 反代**（最常见）；
- 若返回 502 → 后端没启动/端口不对；
- 若返回 504 → 调大 `proxy_read_timeout`，或数据库卡住。

### 第 3 步：按现象排查

| 现象 | 排查 |
| --- | --- |
| 登录按钮转圈后提示网络错误 | 打开浏览器 F12 → Network，看 `/api/auth/login` 是否 404/502；检查 Nginx `/api/` 区块 |
| 登录成功但刷新就退出 | 检查 `sessions` 表是否有记录；服务器时间是否准确（`date`）；`SESSION_HOURS` |
| 后台打开是前台 404 页面 | 构建时 `VITE_ADMIN_PATH` 与访问路径不一致；重新构建 |
| 账号密码正确却提示错误 | 确认连接的是不是同一个数据库；可临时查 `SELECT username,is_super,status FROM users;` |
| 上传图片失败 | `client_max_body_size`；`server/uploads` 目录权限；`proxy_request_buffering off` |
| 验证码收不到 | SMTP 配置/授权码；查看后端日志；Gmail/QQ 拦截 |
| 页面样式全丢 | `dist/` 路径不对或 `root` 指向错误 |
| 502 间歇出现 | `systemctl status` 看是否 OOM；`free -h`；PM2 日志 |
| MySQL 连接失败 | `journalctl -u mysql`；`DB_HOST` 用 127.0.0.1；账号授权 host 是否为 `127.0.0.1` |
| 中文乱码 | 数据库/表 `utf8mb4`；连接串已固定 `utf8mb4` |

### 第 4 步：临时调试

```bash
# 直接请求后端，绕过 Nginx
curl -s -X POST http://127.0.0.1:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"你的密码"}'
```

能返回 token 说明后端正常，问题一定在 Nginx / 域名 / HTTPS / 前端构建路径。

---

## 15. 安全清单

- [ ] 修改默认 `ADMIN_PASSWORD`，并在后台「设置」再次修改；
- [ ] `ALLOW_DEV_CODES=0`（生产环境绝不能返回验证码）；
- [ ] MySQL 只监听 127.0.0.1，使用专用账号与强密码；
- [ ] 开启 HTTPS，HTTP 自动跳转；
- [ ] 上传目录仅作为静态文件，不执行脚本；
- [ ] 定期备份数据库与 `server/uploads`；
- [ ] 不要把 `server/.env` 提交到 git。
