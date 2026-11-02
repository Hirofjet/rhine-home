# RHINE//HOME 使用与部署指南（合并版）

> 本文件是统一入口。详细的腾讯云/宝塔步骤见 [TENCENT_DEPLOY.md](TENCENT_DEPLOY.md)，Git 命令见 [GIT_GUIDE.md](GIT_GUIDE.md)，通用部署见 [DEPLOY.md](DEPLOY.md)。

## 1. 本地启动

```bash
# 前端
npm install
npm run dev            # http://localhost:5173

# 后端（另开终端）
cd server
npm install
cp .env.example .env   # 修改数据库、管理员、SMTP
npm start              # http://localhost:3001
```

MySQL 建库：

```sql
CREATE DATABASE rhine_home CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rhine'@'127.0.0.1' IDENTIFIED BY '强密码';
GRANT ALL PRIVILEGES ON rhine_home.* TO 'rhine'@'127.0.0.1';
FLUSH PRIVILEGES;
```

## 2. 生产环境

- 腾讯云轻量应用服务器，Ubuntu 22.04，2C2G 起；
- 安装 Node 22、MySQL 8、Nginx；
- 代码放在 `/www/wwwroot/rhine-home`；
- Nginx：静态 `dist` + `/api`、`/uploads` 反向代理到 `127.0.0.1:3001`；
- 后台进程推荐 systemd 或 PM2（`server/ecosystem.config.cjs`）；
- 域名解析、HTTPS、备案详见腾讯云指南。

## 3. 更新与部署

```bash
# 本地发布：提交 + 版本号 + 推送 GitHub
npm run release -- "fix: 本次更新说明"

# 服务器：正常网络
cd /www/wwwroot/rhine-home
./scripts/deploy.sh

# 服务器：国内网络（cnfast）
./scripts/deploy-cn.sh
```

脚本自动拉取、安装依赖、构建、重启并做健康检查；失败会回滚，数据库与 `server/uploads` 不受影响。

## 4. 主题与鼠标

- 导航栏调色板切换：**莱茵生命 / 碧蓝档案 / 樱色协议 / 深空协议**；
- 主题保存在浏览器 `localStorage`，全站生效；
- 鼠标直接使用原始 Blue Archive `.cur` 文件（`public/cursors/bluearchive/`），浏览器原生渲染，无自绘覆盖层、无重叠。

## 5. 后台与权限

- `/admin`：主页资料、项目库、文章、照片、视频、日志、留言板、论坛、成员、设置；
- **只有 admin** 能修改主页资料和档案（含个人信息）；
- 项目库、日志、论坛、留言板可以授权给其他用户；
- 项目库字段：名称、简称、描述、类型/标签、作者、状态、编号、创建/更新时间、版本号、GitHub、详情。

## 6. 主页资料本地备份

后台「主页资料」：

- 保存时写入 MySQL，同时写入浏览器 `localStorage`；
- 「导出本地」得到 `rhine-home-profile.json`；
- 「导入本地」可在数据库重置后恢复；
- 个人备份文件已被 `.gitignore` 排除，禁止提交公开仓库。

## 7. 项目外数据目录

为了避免更新网站时覆盖个人数据，本地上传与旧数据已经移到项目外：

```text
F:\文档\rhine-local\rhine-data\
├── uploads\     # 头像、照片、视频、附件
└── data\        # 旧版 JSON 数据
```

在 `server/.env` 或系统环境变量中设置：

```ini
UPLOAD_DIR=F:\文档\rhine-local\rhine-data\uploads
DATA_DIR=F:\文档\rhine-local\rhine-data\data
```

`server/.env` 已被 `.gitignore` 排除；部署时同样建议把这两个目录放到项目目录之外，并定期备份。

## 8. 隐私与示例数据

- 仓库默认内容中的昵称、邮箱、GitHub 账号、所在地等均为示例；
- 真实资料只保存在数据库/浏览器本地，不进入 Git；
- 上传前检查：

```bash
git status
git diff --staged
```

不要提交 `.env`、`server/uploads`、`server/data`、`rhine-home-profile.json`。

## 9. 快捷命令

```bash
npm run lint
npm run build
cd server && npm run import-legacy
```

版本历史见 [VERSION_HISTORY.md](VERSION_HISTORY.md)。
