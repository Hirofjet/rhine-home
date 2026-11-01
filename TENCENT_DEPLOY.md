# 腾讯云轻量应用服务器部署指南（RHINE//HOME）

> 面向腾讯云 **轻量应用服务器 Lighthouse** 的实际操作步骤。
> 目标架构：`浏览器 → 域名/DNS → Nginx(443) → 静态 dist + /api、/uploads → Node(3001) → MySQL(3306)`。
>
> 本项目是 Node + MySQL 动态站点，**不能只放静态文件**；后台、论坛、留言、上传都依赖 Node 与 MySQL。

---

## 一、购买与镜像选择（最关键的一步）

### 1. 推荐配置

| 项目 | 推荐 | 说明 |
| --- | --- | --- |
| 地域 | 靠近访问者的地域（如广州/上海/北京）；无备案选中国香港 | 国内地域绑定域名需要 ICP 备案 |
| 套餐 | **2 核 2G** 起步，预算允许选 **2 核 4G** | 2G 也能跑，构建前端时要加 Swap；4G 更稳 |
| 系统盘 | 50 GB SSD 起 | 系统 + MySQL + 上传文件 |
| 带宽 | 3–5 Mbps | 图片/视频多时选大带宽或配合 COS |
| 流量包 | 按套餐（常见 1–3 TB/月） | 视频多要算流量，避免超额 |
| 镜像 | **系统镜像：Ubuntu 22.04 LTS 64 位** | 兼容性最好；也可选 Ubuntu 24.04 / Debian 12 |
| 登录方式 | SSH 密钥 或 自定义密码 | 密钥更安全，控制台可重置 |

> **不要选 Windows 镜像**：本项目是 Node + Nginx + MySQL，Linux 更合适。
> **不建议选 CentOS 7**：已停止维护，Node 22 / MySQL 8 安装麻烦。

### 2. 镜像选型：三种方案

| 方案 | 镜像 | 适合谁 | 优缺点 |
| --- | --- | --- | --- |
| **A. 系统镜像 + 命令行（推荐）** | Ubuntu 22.04 LTS | 想要稳定、可控、性能好 | 需要按本文敲命令；资源占用最低 |
| **B. 应用镜像：宝塔 Linux 面板** | 腾讯云「宝塔 Linux 面板」应用镜像 | 偏好可视化、不想记命令 | 有 Web 面板管理网站/数据库/SSL；会多占内存，需注意面板安全 |
| C. 应用镜像：Node.js / LNMP | 腾讯云 Node.js 应用镜像等 | 想快速起步 | 版本可能偏旧，仍要自己配 MySQL/Nginx/进程守护 |

**本教程以方案 A 为主**，最后附「方案 B：宝塔面板」的操作差异。
如果你的服务器只有 2G 内存，建议用方案 A，并在构建前端前加 Swap（见下文）。

### 3. 购买时的「经典案例」对应

腾讯云轻量应用服务器的经典教程通常是：

> 购买轻量服务器 → 选择「宝塔 Linux 面板」或「LNMP」应用镜像 → 控制台防火墙放行 80/443 → 绑定域名 → 申请 SSL → 上传网站。

本项目与 WordPress 教程的区别只有一点：**站点不是 PHP，而是 Node 服务**，所以 Nginx 需要把 `/api` 和 `/uploads` 反向代理到 `127.0.0.1:3001`，而不是交给 PHP-FPM。

---

## 二、初始化服务器（控制台操作）

1. 打开腾讯云控制台 → **轻量应用服务器** → 实例列表；
2. 首次使用先 **重置密码** 或 **绑定 SSH 密钥**；
3. 记录 **公网 IP**；
4. 进入实例 → **防火墙**，先放行：

| 协议 | 端口 | 用途 |
| --- | --- | --- |
| TCP | 22 | SSH / OrcaTerm |
| TCP | 80 | HTTP（申请证书、跳转 HTTPS） |
| TCP | 443 | HTTPS |

> 轻量服务器的「防火墙」是腾讯云侧的安全组，**和系统里的 ufw 是两回事**。
> 只要这里没放行，服务器里怎么配都访问不了。
> **不要**放行 3001、3306 到公网。

5. 登录方式任选：
   - 控制台「登录」→ **OrcaTerm 网页终端**（最方便，免本地 SSH）；
   - 本地终端：`ssh ubuntu@公网IP`（Ubuntu 镜像默认用户是 `ubuntu`；若你设置的是 root 密码则 `ssh root@公网IP`）；
   - 腾讯云「密钥」登录。

6. **建议先创建快照**：实例 → 快照 → 创建快照。以后每次大改前都做一次。

### 日常管理方式推荐

| 需求 | 腾讯云功能 |
| --- | --- |
| 远程登录 | 控制台 OrcaTerm / 本地 SSH |
| 看 CPU、内存、流量 | 实例「监控」；可配置告警 |
| 改防火墙 | 实例「防火墙」 |
| 备份整机 | 「快照」（升级前必做） |
| 备份数据库 | `mysqldump` + 定时任务；可再传 COS |
| 域名解析 | 腾讯云 DNSPod / 云解析 |
| HTTPS 证书 | 腾讯云 SSL 证书（免费 DV）或 certbot |
| 批量执行命令 | 自动化助手 TAT（可选） |
| 可视化管理 | 宝塔面板 / 1Panel（可选，见方案 B） |

---

## 三、系统初始化（SSH 内执行）

```bash
# 1) 更新系统
sudo apt update && sudo apt upgrade -y

# 2) 时区（很重要：会话/验证码都按时间判断）
sudo timedatectl set-timezone Asia/Shanghai
date

# 3) 基础工具
sudo apt install -y curl git unzip build-essential ufw

# 4) 2G 内存建议加 2G Swap（避免 npm build / MySQL 被 OOM）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

### 系统防火墙（可选，但建议）

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

> 轻量控制台防火墙 + ufw 两层都放行即可；不要在没放行 22 的情况下开 ufw，避免把自己锁在外面。

---

## 四、安装运行环境

### 1. Node.js 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v    # v22.x
npm -v

# 国内服务器建议换 npm 镜像
npm config set registry https://registry.npmmirror.com
```

### 2. MySQL 8

```bash
sudo apt install -y mysql-server
sudo systemctl enable --now mysql
sudo mysql_secure_installation
```

按提示设置 root 密码、移除匿名用户、禁止 root 远程登录（都选 Y）。

创建数据库和专用账号：

```bash
sudo mysql
```

```sql
CREATE DATABASE rhine_home CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rhine'@'127.0.0.1' IDENTIFIED BY '换成你的强密码';
GRANT ALL PRIVILEGES ON rhine_home.* TO 'rhine'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

验证：

```bash
mysql -h 127.0.0.1 -u rhine -p rhine_home -e "SELECT 1;"
```

> MySQL 只监听本机即可，**不要**在轻量防火墙放行 3306。
> 若 `127.0.0.1` 连接失败，检查 `/etc/mysql/mysql.conf.d/mysqld.cnf` 的 `bind-address = 127.0.0.1`。

### 3. Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx
```

### 4. 上传代码

任选一种：

```bash
# 方式 1：Git
sudo mkdir -p /srv && sudo chown -R $USER:$USER /srv
cd /srv
git clone <你的仓库地址> rhine-home

# 方式 2：本地打包上传
# 本地执行：scp -r rhine-home ubuntu@公网IP:/srv/
```

目录约定：`/srv/rhine-home`（前端根目录）、`/srv/rhine-home/server`（后端）。

### 5. 构建前端

```bash
cd /srv/rhine-home
npm ci
npm run build
```

> 2G 内存机器如果构建被 Killed，先确认 Swap 已开启；仍不行就在本地 `npm run build`，只上传 `dist/`。

### 6. 配置并启动后端

```bash
cd /srv/rhine-home/server
npm ci --omit=dev
cp .env.example .env
nano .env
```

`.env` 至少改这几项：

```ini
PORT=3001
NODE_ENV=production

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=rhine
DB_PASSWORD=上一步的数据库密码
DB_NAME=rhine_home

ADMIN_USER=admin
ADMIN_PASSWORD=换成强密码
SESSION_HOURS=12
UPLOAD_DIR=/srv/rhine-home/server/uploads
ALLOW_DEV_CODES=0
```

邮件（注册验证码）建议配置：

```ini
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_SECURE=1
SMTP_USER=你的QQ邮箱@qq.com
SMTP_PASS=邮箱授权码
SMTP_FROM=RHINE//HOME <你的QQ邮箱@qq.com>
```

先手动验证：

```bash
cd /srv/rhine-home/server
node index.mjs
# 另开终端：
curl http://127.0.0.1:3001/api/health
# 期望 {"ok":true,"storage":"mysql",...}
```

### 7. 用 systemd 常驻

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
```

> 也可以用 PM2：`sudo npm i -g pm2 && pm2 start index.mjs --name rhine-home && pm2 save && pm2 startup`。
> 二选一即可，不要同时用。

---

## 五、Nginx 配置（单域名同源）

`/etc/nginx/sites-available/rhine-home`：

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    root /srv/rhine-home/dist;
    index index.html;

    client_max_body_size 500m;

    # 前端 SPA
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

    # API（后台、论坛、留言都走这里）
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
        proxy_request_buffering off;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/rhine-home /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

验证：

```bash
curl -I http://公网IP/
curl http://公网IP/api/health
```

---

## 六、域名、备案与 HTTPS

### 1. 域名解析

- 腾讯云 → **云解析 DNSPod** → 添加域名；
- 添加 A 记录：`@` 和 `www` 指向服务器公网 IP；
- 等待几分钟，用 `ping example.com` 或 `dig example.com` 验证。

### 2. ICP 备案（国内地域必看）

- 轻量服务器在中国大陆地域（广州/上海/北京等）时，域名对公网提供网站服务需要 **ICP 备案**；
- 在腾讯云「备案」按指引提交（需要域名实名、服务器满足备案要求）；
- 不想备案可选 **中国香港** 地域（无需 ICP，但大陆访问延迟略高）。

### 3. HTTPS 两种方式

**方式 A：Let's Encrypt（免费自动续期）**

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
sudo certbot renew --dry-run
```

**方式 B：腾讯云免费 SSL 证书**

1. 腾讯云 → SSL 证书 → 申请免费 DV 证书；
2. 下载 **Nginx** 格式，上传 `.crt` / `.key` 到服务器；
3. 在 Nginx 加 443 server 块并把 80 重定向到 443；
4. 续期前重新申请并替换证书。

HTTPS 生效后检查：

```bash
curl -I https://example.com
curl https://example.com/api/health
```

---

## 七、首次使用与后台

- 前台：`https://example.com`
- 论坛：`https://example.com/forum`
- 后台：`https://example.com/admin`（默认隐藏路径，可在构建时用 `VITE_ADMIN_PATH` 修改）

首次登录用 `.env` 中的 `ADMIN_USER` / `ADMIN_PASSWORD`；登录后立刻到「设置」改密码。
生产环境必须保持 `ALLOW_DEV_CODES=0`，并配置 SMTP，否则注册用户收不到验证码。

---

## 八、备份、快照与数据恢复

### 数据库备份

```bash
mkdir -p /srv/backup
mysqldump -u rhine -p --single-transaction rhine_home | gzip > /srv/backup/rhine-$(date +%F).sql.gz

# 每天 03:30
crontab -e
30 3 * * * mysqldump -u rhine -p'你的密码' --single-transaction rhine_home | gzip > /srv/backup/rhine-$(date +\%F).sql.gz
```

恢复：

```bash
gunzip -c /srv/backup/rhine-2026-11-01.sql.gz | mysql -u rhine -p rhine_home
```

### 上传文件

```bash
rsync -a /srv/rhine-home/server/uploads/ /srv/backup/uploads/
```

### 整机快照

腾讯云控制台 → 实例 → 快照 → 创建快照。升级系统、换 Nginx 配置、迁移前先做快照。

### 重新部署后恢复旧内容

- 数据库/上传目录保留，重新部署代码不会清空内容；
- 若数据库为空，后端启动会自动从 `src/assets/articles`、`src/assets/logs`、旧版 `server/data/*.json` 恢复；
- 也可手动：`cd server && npm run import-legacy`。

---

## 九、方案 B：宝塔面板完整部署（可视化）

> 适合不想长期敲命令、希望用面板管理网站/数据库/SSL/文件/计划任务的人。
> 方案 B 与方案 A **只能二选一**：宝塔自带 Nginx、MySQL，不要再安装系统 apt 版 Nginx/MySQL，否则 80/443/3306 会冲突。

### B.0 资源与取舍

- 宝塔面板本身约占 200–400MB 内存；
- 2G 内存：必须开 2G Swap，MySQL 缓冲池调小；
- 推荐 **2 核 4G**，体验明显更好；
- 面板方便，但攻击面比纯命令行大：面板端口不要对全网开放。

### B.1 购买：选择宝塔应用镜像

1. 腾讯云 → 轻量应用服务器 → 新建实例；
2. 地域、套餐按需（建议 2C4G，系统盘 50GB+）；
3. 镜像选择 **应用镜像 → 宝塔 Linux 面板**（若列表没有，选系统镜像 Ubuntu 22.04，装好系统后按 B.2 安装宝塔）；
4. 设置 root 密码或绑定 SSH 密钥；
5. 创建完成后，进入实例详情，找到 **应用管理 / 应用信息**，记录：
   - 面板访问地址（通常是 `http://公网IP:8888/随机安全路径`）
   - 面板初始用户名
   - 面板初始密码

如果控制台没有显示面板信息，用 OrcaTerm / SSH 登录后执行：

```bash
sudo bt default
# 或
sudo /etc/init.d/bt default
```

会输出面板地址、用户名、密码。常用面板命令：

```bash
bt status      # 状态
bt start       # 启动
bt restart     # 重启
bt stop        # 停止
bt default     # 查看默认入口与账号
bt 14          # 查看面板端口（不同版本可能不同，以 bt 菜单为准）
```

### B.2 放行端口并首次登录

腾讯云控制台 → 实例 → **防火墙**：

| 协议 | 端口 | 说明 |
| --- | --- | --- |
| TCP | 22 | SSH / OrcaTerm |
| TCP | 80 | HTTP |
| TCP | 443 | HTTPS |
| TCP | 8888（或你改后的面板端口） | 宝塔面板，建议只对你的公网 IP 开放 |

> 轻量防火墙是腾讯云侧的安全组，**必须放行**，否则面板和网站都打不开。
> 不要放行 3001、3306。

浏览器打开面板地址，用初始账号登录。首次登录建议立即做：

1. 修改面板密码为强密码；
2. 面板设置 → 修改面板端口（不要用 8888）；
3. 开启面板 SSL（可用自签或域名证书）；
4. 设置面板 IP 白名单 / 绑定域名；
5. 绑定宝塔账号（可选，用于证书与插件）。

改完端口后，记得在腾讯云防火墙放行新端口，并关闭旧端口。

### B.3 安装运行环境（软件商店）

进入面板 → **软件商店**，安装：

| 软件 | 版本 | 说明 |
| --- | --- | --- |
| Nginx | 1.24 / 1.26 | 网站与反向代理 |
| MySQL | 8.0 | 数据库 |
| Node.js | 22 LTS | 运行后端（二选一，见下） |
| PM2 | 最新 | 进程守护（也可用面板 Node 项目管理） |

**Node 的两种安装方式：**

- 方式 1（面板）：软件商店 → Node.js 版本管理器 → 安装 22.x；面板会显示 Node 安装路径（如 `/www/server/nodejs/v22.x.x/bin`），后续命令要用绝对路径或加入 PATH。
- 方式 2（推荐，路径统一）：用系统 NodeSource 安装：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

> 不要安装 PHP 站点环境（本项目是 Node，不需要 PHP-FPM）；phpMyAdmin 可装可不装，装了就限制访问。

安装 MySQL 时设置 root 密码，并记录。2G 内存可在 MySQL 设置里把 `innodb_buffer_pool_size` 调到 256M 左右。

### B.4 创建数据库与账号

面板 → **数据库** → 添加数据库：

- 数据库名：`rhine_home`
- 用户名：`rhine`
- 密码：强密码
- 访问权限：本地服务器（localhost）

宝塔创建的账号通常是 `'rhine'@'localhost'`。本项目 Node 通过 `127.0.0.1` 连接，如果启动时报 `Access denied`，用面板终端补一个 `127.0.0.1` 授权：

```bash
mysql -uroot -p
```

```sql
CREATE USER IF NOT EXISTS 'rhine'@'127.0.0.1' IDENTIFIED BY '同一个强密码';
GRANT ALL PRIVILEGES ON rhine_home.* TO 'rhine'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

验证：

```bash
mysql -h 127.0.0.1 -u rhine -p rhine_home -e "SELECT 1;"
```

> 表结构不用手动导入，后端首次启动会自动建表；也可以导入 `server/schema.sql`。

### B.5 上传代码

项目目录约定：`/www/wwwroot/rhine-home`

**方式 1：面板文件管理器（适合本地打包）**

1. 本地把项目打包（排除 `node_modules`、`dist` 可选）；
2. 面板 → 文件 → 进入 `/www/wwwroot` → 上传 zip；
3. 右键解压，确认目录为 `/www/wwwroot/rhine-home`（不要多一层文件夹）。

**方式 2：Git（推荐，方便更新）**

面板 → 终端：

```bash
cd /www/wwwroot
git clone <你的仓库地址> rhine-home
cd rhine-home
git status
```

如果是私有仓库，先在面板终端配置 SSH key 或使用 HTTPS token。

### B.6 安装依赖与构建

面板 → 终端：

```bash
cd /www/wwwroot/rhine-home
npm config set registry https://registry.npmmirror.com
npm ci
npm run build          # 产出 dist/

cd server
npm ci --omit=dev
cp .env.example .env
nano .env
```

`.env` 关键内容：

```ini
PORT=3001
NODE_ENV=production

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=rhine
DB_PASSWORD=B.4 设置的密码
DB_NAME=rhine_home

ADMIN_USER=admin
ADMIN_PASSWORD=强密码
SESSION_HOURS=12
UPLOAD_DIR=/www/wwwroot/rhine-home/server/uploads
ALLOW_DEV_CODES=0
```

SMTP 按需填写（QQ 邮箱示例）：

```ini
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_SECURE=1
SMTP_USER=你的QQ邮箱@qq.com
SMTP_PASS=邮箱授权码
SMTP_FROM=RHINE//HOME <你的QQ邮箱@qq.com>
```

> 2G 内存构建时如果进程被 Killed：
> - 先开 Swap（见 B.12）；
> - 或在本地 `npm run build`，只上传 `dist/` 到服务器。

先手动测试后端：

```bash
cd /www/wwwroot/rhine-home/server
node index.mjs
# 另开终端：
curl http://127.0.0.1:3001/api/health
```

看到 `{"ok":true,"storage":"mysql"}` 后 `Ctrl+C`。

### B.7 用 PM2 启动后端

面板终端：

```bash
npm i -g pm2

cd /www/wwwroot/rhine-home/server
pm2 start index.mjs --name rhine-home
pm2 save

# 设置开机自启（按输出提示执行它给出的命令）
pm2 startup
```

常用：

```bash
pm2 status
pm2 logs rhine-home --lines 100
pm2 restart rhine-home
pm2 stop rhine-home
```

验证：

```bash
curl http://127.0.0.1:3001/api/health
```

权限说明：

- 如果你用 root 跑 PM2，上传目录属于 root，Nginx 只是反代 `/uploads`，不需要直接读文件；
- 如果你改成 `www` 用户运行，执行 `chown -R www:www /www/wwwroot/rhine-home/server/uploads`，并确认 `.env` 可读；
- 生产环境更推荐专用用户，但宝塔默认 root，先保证能跑通。

### B.8 新建站点（纯静态）

面板 → **网站** → 添加站点：

| 项 | 值 |
| --- | --- |
| 域名 | `example.com`、`www.example.com` |
| 根目录 | `/www/wwwroot/rhine-home/dist` |
| PHP 版本 | **纯静态**（不要选 PHP） |
| 数据库 | 不创建（已在 B.4 建好） |
| FTP | 不需要 |

创建后先访问 `http://example.com`，应能看到首页。此时 `/api` 还不通，下一步配置。

### B.9 配置 `/api` 与 `/uploads` 反向代理

**方式 1：面板反向代理（如果版本支持“代理目录”）**

站点设置 → 反向代理 → 添加反向代理：

| 名称 | 代理目录 | 目标 URL | 发送域名 |
| --- | --- | --- | --- |
| api | `/api` | `http://127.0.0.1:3001` | `$host` |
| uploads | `/uploads` | `http://127.0.0.1:3001` | `$host` |

保存后访问 `http://example.com/api/health` 验证。

**方式 2：直接改站点配置文件（最稳）**

站点设置 → 配置文件，在 `server { ... }` 内加入/确认：

```nginx
client_max_body_size 500m;

location ^~ /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 10s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    proxy_request_buffering off;
}

location ^~ /uploads/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    expires 7d;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

保存后：

```bash
nginx -t
nginx -s reload
# 或面板 → 软件商店 → Nginx → 重载配置
```

> 注意不要用“整站反向代理”把 `/` 也代理到 3001；`/` 必须由 Nginx 直接读 `dist`，否则静态资源会 404。

### B.10 绑定域名与 HTTPS

1. 腾讯云 DNSPod/云解析：添加 A 记录 `@`、`www` 指向轻量服务器公网 IP；
2. 大陆地域需要 ICP 备案；香港地域不需要；
3. 面板 → 网站 → 站点设置 → **SSL**：
   - 选择 Let's Encrypt；
   - 勾选域名，申请；
   - 开启“强制 HTTPS”；
4. 若面板申请失败（80 未放行、DNS 未生效、Let's Encrypt 限流），可在腾讯云 SSL 申请免费证书，下载 Nginx 格式，粘贴证书与私钥到面板 SSL 的“其他证书”。

验证：

```bash
curl -I https://example.com
curl https://example.com/api/health
```

### B.11 面板与服务器安全加固

- 面板端口改成随机端口，且只对你的 IP 开放；用完可关闭公网访问；
- 面板开启 SSL，强密码，开启登录失败限制；
- 删除不用的 PHP 版本、phpMyAdmin（或加 IP 限制）；
- 宝塔“安全”页面：修改 SSH 端口、开启 Fail2ban、关闭不必要端口；
- 腾讯云轻量防火墙仍是第一道防线：只放 22/80/443/面板端口；
- **不要**在轻量防火墙放行 3001、3306；
- 不要把 `.env`、`server/data`、`server/uploads` 提交到 Git；
- 定期更新宝塔、Nginx、MySQL 补丁。

### B.12 Swap、备份与恢复

**2G 内存加 Swap：**

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

**宝塔计划任务备份：**

面板 → 计划任务：

- 备份数据库 `rhine_home`：每天一次，保留 7 份；
- 备份站点 `/www/wwwroot/rhine-home`：每天一次（会包含 uploads，注意体积）；
- 可选：备份到腾讯云 COS（安装 COS 插件）。

**恢复：**

- 数据库：面板数据库 → 导入备份 SQL；
- 站点：解压备份到 `/www/wwwroot/rhine-home`，保留 `.env`；
- 整机：腾讯云快照回滚。

### B.13 后续更新项目

**Git 方式（推荐）：**

```bash
cd /www/wwwroot/rhine-home
git pull --ff-only

npm ci
npm run build

cd server
npm ci --omit=dev
pm2 restart rhine-home
```

**Zip 上传方式：**

1. 备份数据库和 uploads；
2. 上传新代码覆盖（**不要覆盖 `.env` 和 `server/uploads`**）；
3. 重新 `npm ci && npm run build`；
4. `pm2 restart rhine-home`。

> 数据库内容不会因为更新代码而消失；宝塔的数据库备份与快照是最后保障。

### B.14 宝塔方案常见问题

| 现象 | 处理 |
| --- | --- |
| 面板打不开 | 轻量防火墙未放行面板端口；面板服务未启动：`bt status` / `bt start`；端口被改过：`bt default` 查看 |
| 网站 502 | Node 没跑：`pm2 status`、`pm2 logs rhine-home`；`curl 127.0.0.1:3001/api/health` |
| 前台正常、`/api` 404 | 反向代理未配或路径写错；检查站点配置文件与 `nginx -t` |
| 静态资源 404 | 站点根目录不是 `dist`；`location /` 的 `try_files` 被覆盖 |
| MySQL `Access denied` | 账号 host 不是 `127.0.0.1`；按 B.4 补授权；密码错误；端口不是 3306 |
| `node: command not found` | 面板 Node 未加入 PATH；用绝对路径，或按 B.3 方式 2 安装系统 Node |
| 构建被 Killed | 内存不足：开 Swap，或本地构建后只传 `dist` |
| 上传大文件失败 | 站点配置 `client_max_body_size 500m`；PHP 不参与，不用改 PHP 上传限制 |
| SSL 申请失败 | 域名未解析、80 未放行、Let's Encrypt 限流；改用腾讯云证书 |
| 80/443 被占用 | 同时装了系统 Nginx 与宝塔 Nginx；停用其中一个，不要混装 |
| 面板很卡 | 2G 内存偏小；关掉不用的插件，升级套餐 |
| 更新后页面没变 | 浏览器缓存；`npm run build` 是否成功；Nginx 是否指向新 `dist` |

### B.15 方案 A 与方案 B 对比

| 维度 | 方案 A：命令行 | 方案 B：宝塔面板 |
| --- | --- | --- |
| 上手难度 | 需要熟悉命令 | 可视化，简单 |
| 内存占用 | 低 | 多 200–400MB |
| 可控性 | 高 | 中（面板封装） |
| 安全面 | 小 | 面板本身需加固 |
| 适合 | 长期稳定、性能敏感 | 不想折腾命令、需要文件/数据库/SSL 图形化管理 |

### B.16 宝塔方案上线检查清单

- [ ] 轻量防火墙：22/80/443/面板端口（面板限制 IP）
- [ ] 宝塔已改端口、强密码、SSL、IP 白名单
- [ ] Nginx + MySQL 8 + Node 22 + PM2 已装好
- [ ] 数据库 `rhine_home` 与 `rhine` 账号可连
- [ ] 代码在 `/www/wwwroot/rhine-home`，`dist` 已构建
- [ ] `.env` 已配置，`ALLOW_DEV_CODES=0`，SMTP 可用
- [ ] `pm2 status` 中 rhine-home 为 online，开机自启已保存
- [ ] 站点根目录指向 `dist`，`/api`、`/uploads` 反代正常
- [ ] HTTPS 正常，强制跳转已开
- [ ] 数据库/站点计划任务备份 + 腾讯云快照
- [ ] 后台已改初始密码

---

## 十、性能与流量建议

- 2G 内存：务必开 Swap；MySQL `innodb_buffer_pool_size` 设 256M 左右；
- 图片先压缩再上传；视频建议 ≤ 200MB，或放对象存储 COS + CDN；
- 轻量套餐有月流量上限，视频/大图多时监控流量；
- Nginx 开启 gzip、静态资源长缓存；
- 前台已做路由分包；后台/论坛按需加载；
- 定期清理 `server/uploads` 中不再使用的文件（删除内容记录不会自动删文件）。

---

## 十一、常见问题（腾讯云特有）

| 现象 | 原因 / 处理 |
| --- | --- |
| 域名打不开、IP 能打开 | DNS 未生效 / 未备案（大陆）/ 防火墙未放行 80、443 |
| 后台登录转圈、前台正常 | Nginx 没配 `/api` 反代，或 Node 没启动：`curl 127.0.0.1:3001/api/health` |
| 502 Bad Gateway | Node 挂了：`systemctl status rhine-home`；或端口不是 3001 |
| 上传大文件失败 | Nginx `client_max_body_size`；轻量防火墙；`proxy_request_buffering off` |
| 构建时 Killed | 内存不足：开 Swap，或本地构建后上传 `dist` |
| 验证码收不到 | SMTP 未配/授权码错误；检查 `journalctl -u rhine-home` |
| MySQL 连不上 | 用户 host 是否是 `127.0.0.1`；`bind-address`；密码；`systemctl status mysql` |
| 登录后马上退出 | 服务器时间不对：`timedatectl set-timezone Asia/Shanghai` + NTP |
| 面板打不开 | 宝塔端口未在**轻量防火墙**放行；面板服务未启动 |
| 流量超了 | 视频/图片直出过多；改用 COS/CDN，或升级套餐 |

---

## 十二、上线检查清单

- [ ] 镜像：Ubuntu 22.04/24.04；2C2G 起；Swap 已开
- [ ] 轻量防火墙只放行 22/80/443（宝塔另加 8888 且限制 IP）
- [ ] Node 22、MySQL 8、Nginx 已安装并开机自启
- [ ] `.env` 已改强密码；`ALLOW_DEV_CODES=0`
- [ ] SMTP 已配置并能收到验证码
- [ ] `npm run build` 成功，Nginx root 指向 dist
- [ ] `/api`、`/uploads` 反代正常
- [ ] 域名解析 + HTTPS 正常
- [ ] 后台已改初始密码，创建好管理员/版主
- [ ] 数据库与 uploads 有备份；已创建首次快照
- [ ] 监控告警已配置（CPU/内存/磁盘/流量）

---

## 附：最短路径命令汇总

```bash
# 系统
sudo apt update && sudo apt upgrade -y
sudo timedatectl set-timezone Asia/Shanghai

# Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx mysql-server git

# MySQL
sudo mysql -e "CREATE DATABASE rhine_home CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'rhine'@'127.0.0.1' IDENTIFIED BY '强密码'; GRANT ALL ON rhine_home.* TO 'rhine'@'127.0.0.1'; FLUSH PRIVILEGES;"

# 代码
sudo mkdir -p /srv && sudo chown -R $USER:$USER /srv
cd /srv && git clone <仓库> rhine-home
cd rhine-home && npm ci && npm run build
cd server && npm ci --omit=dev && cp .env.example .env && nano .env
node index.mjs   # 先测试，Ctrl+C 后配 systemd

# 服务
sudo systemctl enable --now rhine-home
sudo nginx -t && sudo systemctl reload nginx

# 证书
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

> 详细故障排查见项目根目录 [DEPLOY.md](DEPLOY.md)。
