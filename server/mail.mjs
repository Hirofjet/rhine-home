/* ============================================================
   邮件发送（SMTP 可选）
   ------------------------------------------------------------
   · 配置 SMTP_HOST 等环境变量后通过 nodemailer 发送验证码；
   · 未配置时仅打印到服务端日志，便于本地/内网环境测试。
   ============================================================ */
import nodemailer from 'nodemailer'
import { config } from './config.mjs'

let transporter = null
if (config.smtp.host) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth:
      config.smtp.user && config.smtp.pass
        ? { user: config.smtp.user, pass: config.smtp.pass }
        : undefined,
  })
}

export function mailConfigured() {
  return Boolean(transporter)
}

/** 发送验证码邮件；未配置 SMTP 时仅记录日志 */
export async function sendCodeMail(email, code, purpose) {
  const subject =
    purpose === 'register' ? 'RHINE//HOME 注册验证码' : 'RHINE//HOME 重置密码验证码'
  const text = `你的验证码是 ${code}，10 分钟内有效。若非本人操作请忽略。`
  if (!transporter) {
    console.log(`[mail:dev] ${email} => ${code} (${purpose})`)
    return
  }
  await transporter.sendMail({
    from: config.smtp.from,
    to: email,
    subject,
    text,
  })
}
