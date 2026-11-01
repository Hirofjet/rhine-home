const path = require('node:path')

/**
 * PM2 配置（在 server 目录执行 `pm2 start ecosystem.config.cjs`）
 *
 * 之前的启动失败原因：
 *   1. 没有 cwd，PM2 的工作目录可能不是 server/；
 *   2. `node_args: '--env-file=.env'` 依赖当前目录，找不到 .env 时 Node 直接退出；
 *   3. 缺少单实例/重启策略，上传目录与会话也会不稳定。
 *
 * 现在：
 *   · cwd 固定为 server/，script 使用绝对路径；
 *   · .env 由 server/config.mjs 主动加载，不依赖启动参数；
 *   · 单实例 fork，崩溃自动重启。
 */
module.exports = {
  apps: [
    {
      name: 'rhine-home',
      cwd: __dirname,
      script: path.join(__dirname, 'index.mjs'),
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 20,
      max_memory_restart: '500M',
      time: true,
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
