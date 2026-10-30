# 留言板后端（可选）— Express + MySQL

前端已经在 `src/lib/api.ts` 里预留好了接口：

- `GET  {API_BASE}/api/messages` → `{ messages: GuestMessage[] }`
- `POST {API_BASE}/api/messages` `{ name, content }` → `GuestMessage`

`GuestMessage`：`{ id, name, content, createdAt }`（`id` 为自增序号，`createdAt` 为 ISO 时间字符串）。

**后端未启动时前端会自动回退到浏览器 localStorage**，所以本地预览、静态部署都能直接用。

## 启用步骤

1. 建表：

   ```bash
   mysql -u root -p < server/schema.sql
   ```

2. 安装后端依赖（在本目录执行，不会影响前端构建）：

   ```bash
   cd server
   npm init -y
   npm i express cors mysql2
   ```

3. 配置数据库连接（环境变量）：

   ```bash
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=你的密码
   DB_NAME=rhine_home
   PORT=3001
   ```

4. 启动：

   ```bash
   node index.mjs
   ```

5. 让前端指向后端：在项目根目录的 `.env` 中写入（参考 `.env.example`）：

   ```bash
   VITE_API_BASE=http://localhost:3001
   ```

6. 重新启动前端 `npm run dev`。

## 部署提示

- 生产环境把后端放在同域 `/api` 下时，可以省略 `VITE_API_BASE`；
- 跨域部署时，前端用 `VITE_API_BASE` 指向后端地址，后端已内置宽松 CORS；
- 防刷可以基于 `ip_hash` 字段做频率限制（示例里留了字段与注释，未实现限流）。
