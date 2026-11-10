import { sendNotification, setVapidDetails } from 'web-push'
import { config } from './config.mjs'
import { execute, query } from './db.mjs'

let configured = false
if (config.vapid.publicKey && config.vapid.privateKey) {
  try {
    setVapidDetails(
      config.vapid.subject,
      config.vapid.publicKey,
      config.vapid.privateKey,
    )
    configured = true
  } catch (error) {
    console.error('[push] VAPID 配置无效：', error.message)
  }
} else {
  console.warn('[push] 未配置 VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY，Web Push 已禁用')
}

export const pushConfigured = () => configured

/** 发送给某个用户的所有设备；无效订阅自动删除。 */
export async function sendPushToUser(userId, payload) {
  if (!configured || !userId) return 0
  const rows = await query(
    'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
    [userId],
  )
  let sent = 0
  await Promise.all(
    rows.map(async (row) => {
      const subscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      }
      try {
        await sendNotification(
          subscription,
          JSON.stringify({
            title: payload.title || 'HIROFJET ADMIN',
            body: payload.body || '',
            url: payload.url || '/app',
            tag: payload.tag || 'admin',
          }),
          { TTL: 60 * 60, urgency: 'high' },
        )
        sent += 1
      } catch (error) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await execute('DELETE FROM push_subscriptions WHERE id = ?', [row.id]).catch(
            () => undefined,
          )
        } else {
          console.error('[push] send failed:', error?.statusCode, error?.message)
        }
      }
    }),
  )
  return sent
}

export async function sendPushToUsers(userIds, payload) {
  const ids = [...new Set(userIds.filter(Boolean))]
  return Promise.all(ids.map((id) => sendPushToUser(id, payload)))
}
