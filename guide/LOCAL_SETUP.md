# 本地开发

## 环境要求

- Node.js 22+
- MySQL 8 或 MariaDB 10.6+
- npm
- 可选：Git、PM2

## 1. 数据库

```sql
CREATE DATABASE rhine_home CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rhine'@'127.0.0.1' IDENTIFIED BY '替换为强密码';
GRANT ALL PRIVILEGES ON rhine_home.* TO 'rhine'@'127.0.0.1';
FLUSH PRIVILEGES;
```

## 2. 后端

```bash
cd server
npm install
cp .env.example .env
```

至少填写：

```ini
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=rhine
DB_PASSWORD=替换为强密码
DB_NAME=rhine_home
PORT=3001
ADMIN_USER=admin
ADMIN_PASSWORD=替换为管理员密码
```

启动：

```bash
npm start
```

首次启动会自动建表；用户表为空时创建超级管理员。开发环境如需在接口返回邮箱验证码：

```ini
ALLOW_DEV_CODES=1
```

生产环境必须设置为 `0`。

### 上传目录

建议将上传与运行时数据放在项目外：

```ini
UPLOAD_DIR=/var/lib/rhine-home/uploads
DATA_DIR=/var/lib/rhine-home/data
```

## 3. 前端

```bash
npm install
npm run dev
```

默认地址：

- 前台：`http://localhost:5173`
- 后台：`http://localhost:5173/admin`

Vite 已把 `/api` 与 `/uploads` 代理到 `http://127.0.0.1:3001`。

## 4. 3D Lab 资源

`public/rhine-lab` 是已构建资源。修改 `lab-src` 后需要重新构建并复制：

```bash
cd lab-src
npx tsc
npx vite build --base /rhine-lab/ --outDir dist-home
```

然后把 `dist-home` 的内容复制到 `public/rhine-lab`，保留 `LICENSE`。

## 5. 常用命令

```bash
npm run dev       # 前端开发
npm run build     # 类型检查 + 构建
npm run lint      # oxlint
cd server && npm start
```

## 6. 常见问题

### 后端连不上数据库

检查 `DB_PORT`、账号授权、数据库字符集；查看后端终端错误。

### 登录后接口 401

清理浏览器 `rhine:token`，重新登录；确认后端会话表未被清空。

### 3D 档案库打不开

先清除站点离线缓存，再刷新。缓存版本为 `rhine-lab-3d-v2`。

### 上传图片后 Lab 不更新

Lab 档案不会在页面打开时自动重载；刷新页面即可读取最新内容。上传期间不会触发强制刷新循环。
