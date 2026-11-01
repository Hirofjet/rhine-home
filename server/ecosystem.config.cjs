module.exports = {
  apps: [
    {
      name: 'rhine-home',
      script: 'index.mjs',
      // 核心：告诉 Node 引擎在启动时加载当前目录的 .env 文件
      node_args: '--env-file=.env',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}