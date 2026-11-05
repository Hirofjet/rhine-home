# 腾讯云轻量应用服务器部署

本文是 [部署](DEPLOYMENT.md) 的腾讯云补充说明。

## 1. 镜像与规格

- Ubuntu 22.04 / 24.04；
- 2 核 2G 起步；3D 资源较多时建议 2 核 4G；
- 系统盘至少 40GB；
- 防火墙放行 22、80、443。

## 2. 安装

```bash
apt update
apt install -y nginx mysql-server git
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

也可以使用宝塔面板，但 Nginx 配置要与本文一致。

## 3. 数据库

```bash
mysql -uroot -p
```

创建数据库与用户后，把连接信息写入 `server/.env`。云数据库同样适用，注意放行内网地址和 SSL。

## 4. 代码与构建

```bash
cd /www/wwwroot
git clone git@github.com:Hirofjet/rhine-home.git
cd rhine-home
npm install
npm run build
cd server && npm install && cd ..
```

## 5. 进程守护

使用 systemd 或 PM2，参考 [部署](DEPLOYMENT.md)。确保 `server/.env` 权限为 600，运行用户可读。

## 6. Nginx 与 HTTPS

把 [部署](DEPLOYMENT.md) 中的 server 配置写入 `/etc/nginx/sites-available/rhine-home`，软链到 `sites-enabled`。

```bash
nginx -t
systemctl reload nginx
apt install -y certbot python3-certbot-nginx
certbot --nginx -d example.com
```

腾讯云安全组和系统防火墙都要放行 80/443。

## 7. 备份

- 数据库每日 `mysqldump`；
- `UPLOAD_DIR` 每日增量备份；
- 保留至少 7 天；
- 重要版本打 Git tag，服务器保留上一个稳定 commit。

## 8. 常见问题

| 问题 | 处理 |
| --- | --- |
| 502 | 后端未启动/端口不符，查 systemd/PM2 日志 |
| 上传 413 | Nginx `client_max_body_size` 太小 |
| 3D 加载慢 | 检查带宽、缓存、CDN；清除旧离线缓存 |
| HTTPS 后接口失败 | 检查反向代理 Host/Origin 与证书 |
| 邮件验证码失败 | 检查 SMTP 端口、授权码、发信域名 |
