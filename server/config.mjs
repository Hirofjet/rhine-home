/* ============================================================
   配置（全部来自环境变量；生产环境请使用 .env 或系统环境变量）
   ============================================================ */

export const config = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  // MySQL（必填，默认全部开启）
  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'rhine_home',
  },

  // 管理员初始账号（首次启动、用户表为空时创建）
  adminUser: process.env.ADMIN_USER ?? 'admin',
  adminPassword: process.env.ADMIN_PASSWORD ?? '',

  // 会话时长（小时）
  sessionHours: Number(process.env.SESSION_HOURS ?? 12),

  // 上传目录
  uploadDir: process.env.UPLOAD_DIR ?? '',

  // 跨域（默认同源部署，留空即可）
  corsOrigin: process.env.CORS_ORIGIN ?? '',

  // SMTP（可选；不配置时验证码打印到服务端日志）
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? '1') === '1',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'RHINE//HOME <no-reply@localhost>',
  },

  // 是否在响应里返回开发用验证码（仅本地调试开启）
  allowDevCodes: (process.env.ALLOW_DEV_CODES ?? '0') === '1',
}
