# 部署

## 架构

```text
浏览器
  ├── 静态前端 dist/
  ├── /api       → Node/Express :3001
  ├── /uploads   → Node 静态上传
  └── /rhine-lab → 3D 静态资源
```

生产必须使用 MySQL/MariaDB。会话、用户、内容、论坛、权限、访问日志都在数据库中。

## 1. 服务器准备

- Ubuntu 22.04+ / Debian 12+
- Node.js 22+
- MySQL 8 或 MariaDB 10.6+
- Nginx
- 2GB 内存起步，3D 资源会占用较多带宽/缓存空间

## 2. 拉取与安装

```bash
cd /www/wwwroot/rhine-home
git pull origin main
npm install
cd server && npm install && cd ..
```

创建数据库并配置 `server/.env`。生产环境：

```ini
NODE_ENV=production
ALLOW_DEV_CODES=0
```

上传与数据目录建议放在项目外，并确保运行用户有写权限。

## 3. 构建

```bash
npm run build
```

3D 资源修改后需要重新构建 `lab-src` 并复制到 `public/rhine-lab`。

## 4. 后端服务

systemd 示例：

```ini
[Unit]
Description=RHINE HOME API
After=network.target mysql.service

[Service]
WorkingDirectory=/www/wwwroot/rhine-home/server
EnvironmentFile=/www/wwwroot/rhine-home/server/.env
ExecStart=/usr/bin/node index.mjs
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now rhine-home
```

也可以使用 PM2：

```bash
cd server
pm2 start ecosystem.config.cjs
pm2 save
```

## 5. Nginx

```nginx
server {
  listen 80;
  server_name example.com;
  root /www/wwwroot/rhine-home/dist;
  index index.html;
  client_max_body_size 500m;

  location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 300s;
  }

  location /uploads/ {
    proxy_pass http://127.0.0.1:3001;
  }

  location /rhine-lab/ {
    try_files $uri $uri/ /rhine-lab/index.html;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

HTTPS 使用 Certbot 或云厂商证书。

## 6. 更新

```bash
git pull origin main
npm install
npm run build
systemctl restart rhine-home
```

更新不会删除数据库和 `server/uploads`。清理 `dist`、`node_modules` 前先备份。

## 7. 回滚

```bash
git log --oneline -10
git checkout <上一个稳定提交>
npm install
npm run build
systemctl restart rhine-home
```

数据库结构若已升级，回滚代码前先备份数据库。

## 8. 3D 离线缓存

部署新 3D 资源后，老用户浏览器可能仍有旧缓存。需要：

- 站点设置中「清除本地资源」；
- 或 DevTools → Application → Clear site data；
- 或控制台删除 `rhine-lab-3d-*` 缓存并注销 Service Worker。

## 9. 检查表

- `/api/health` 返回正常；
- 首页、档案库、论坛、留言板、后台可访问；
- 登录/注册/找回密码可用；
- 图片上传与 `/uploads` 可访问；
- 3D 资源返回 200；
- HTTPS、CORS、上传大小和超时配置正确；
- 数据库备份任务已配置。
