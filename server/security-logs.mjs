import crypto from 'node:crypto'
import { execute, query } from './db.mjs'
import { isStaff } from './auth.mjs'

export const REQUEST_LOG_RETENTION_DAYS = 180
const REQUEST_LOG_RETENTION_SQL = `DATE_ADD(NOW(), INTERVAL ${REQUEST_LOG_RETENTION_DAYS} DAY)`

const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'access_token',
  'code',
  'password',
  'email',
  'authorization',
])

function cleanIp(value) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  return text.replace(/^::ffff:/i, '').slice(0, 64)
}

export function clientIp(req) {
  return cleanIp(req.ip || req.socket?.remoteAddress || '')
}

function queryKeysOf(req) {
  return Object.keys(req.query ?? {})
    .map((key) => (SENSITIVE_QUERY_KEYS.has(key.toLowerCase()) ? `${key}:redacted` : key))
    .slice(0, 20)
    .join(',')
    .slice(0, 255)
}

function isStaticAsset(req) {
  if (req.path.startsWith('/uploads/')) return false
  if (/^\/(?:assets|rhine-lab\/assets|fonts|icons|images)\//i.test(req.path)) return true
  return /\.(?:js|mjs|css|map|woff2?|ttf|otf|png|jpe?g|webp|avif|gif|ico|svg)$/i.test(req.path)
}

function shouldLogRequest(req) {
  if (req.method === 'OPTIONS') return false
  if (req.path === '/api/health') return false
  return !isStaticAsset(req)
}

function requestTarget(req) {
  const hostHeader = String(req.headers.host ?? '').trim()
  const hostOnly = hostHeader.replace(/:\d+$/, '')
  return {
    host: (req.hostname || hostOnly || '').slice(0, 255),
    port: Number(req.socket?.localPort) || null,
  }
}

export function requestLogger(req, res, next) {
  const started = process.hrtime.bigint()
  req.requestId = crypto.randomUUID()
  res.setHeader('X-Request-Id', req.requestId)
  if (!shouldLogRequest(req)) return next()

  res.once('finish', () => {
    const target = requestTarget(req)
    const durationMs = Number((process.hrtime.bigint() - started) / 1000000n)
    const userAgent = String(req.headers['user-agent'] ?? '').slice(0, 512)
    const deviceHash = userAgent
      ? crypto.createHash('sha256').update(userAgent).digest('hex')
      : null
    void execute(
      `INSERT INTO request_logs
        (request_id, user_id, username, method, path, query_keys, status, duration_ms,
         ip, remote_port, target_host, target_port, user_agent, device_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${REQUEST_LOG_RETENTION_SQL})`,
      [
        req.requestId,
        req.user?.id ?? null,
        req.user?.username ?? null,
        req.method.slice(0, 12),
        req.path.slice(0, 512),
        queryKeysOf(req) || null,
        res.statusCode,
        Math.min(durationMs, 2_147_483_647),
        clientIp(req) || null,
        Number(req.socket?.remotePort) || null,
        target.host || null,
        target.port,
        userAgent || null,
        deviceHash,
      ],
    ).catch((error) => console.error('[request-log]', error.message))
  })
  next()
}

let auditQueue = Promise.resolve()

/**
 * Append-only security audit entry. Entries are chained with SHA-256 so that
 * deleting or rewriting a middle row is detectable. All writes in this process
 * are serialized, which is sufficient while the app runs as one Node process.
 */
export function audit(event) {
  const write = async () => {
    const rows = await query(
      'SELECT entry_hash FROM security_audit_logs ORDER BY id DESC LIMIT 1',
    )
    const prevHash = rows[0]?.entry_hash ?? 'GENESIS'
    const createdAt = new Date()
    const occurredAt = createdAt.toISOString()
    const record = {
      requestId: event.requestId ? String(event.requestId).slice(0, 64) : null,
      actorId: event.actorId ?? null,
      actorUsername: event.actorUsername
        ? String(event.actorUsername).slice(0, 64)
        : null,
      action: String(event.action ?? 'unknown').slice(0, 120),
      targetType: event.targetType ? String(event.targetType).slice(0, 64) : null,
      targetId: event.targetId ? String(event.targetId).slice(0, 64) : null,
      targetLabel: event.targetLabel ? String(event.targetLabel).slice(0, 200) : null,
      method: event.method ? String(event.method).slice(0, 12) : null,
      path: event.path ? String(event.path).slice(0, 512) : null,
      status: Number(event.status) || 0,
      ip: event.ip ? cleanIp(event.ip) : null,
      userAgent: event.userAgent ? String(event.userAgent).slice(0, 512) : null,
      detail: event.detail ? JSON.stringify(event.detail).slice(0, 8000) : null,
    }
    const material = [
      prevHash,
      record.requestId ?? '',
      record.actorId ?? '',
      record.actorUsername ?? '',
      record.action,
      record.targetType ?? '',
      record.targetId ?? '',
      record.targetLabel ?? '',
      record.method ?? '',
      record.path ?? '',
      record.status,
      record.ip ?? '',
      record.userAgent ?? '',
      record.detail ?? '',
      occurredAt,
    ].join('\n')
    const entryHash = crypto.createHash('sha256').update(material).digest('hex')
    await execute(
      `INSERT INTO security_audit_logs
        (request_id, actor_id, actor_username, action, target_type, target_id,
         target_label, method, path, status, ip, user_agent, detail, prev_hash,
         entry_hash, created_at, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.requestId,
        record.actorId,
        record.actorUsername,
        record.action,
        record.targetType,
        record.targetId,
        record.targetLabel,
        record.method,
        record.path,
        record.status,
        record.ip,
        record.userAgent,
        record.detail,
        prevHash,
        entryHash,
        createdAt,
        occurredAt,
      ],
    )
  }
  auditQueue = auditQueue.then(write, write)
  return auditQueue.catch((error) => console.error('[security-audit]', error.message))
}

export function auditRequest(req, event) {
  return audit({
    ...event,
    requestId: req.requestId,
    actorId: event.actorId ?? req.user?.id ?? null,
    actorUsername: event.actorUsername ?? req.user?.username ?? null,
    ip: event.ip ?? clientIp(req),
    userAgent: event.userAgent ?? String(req.headers['user-agent'] ?? '').slice(0, 512),
  })
}

export function adminAuditMiddleware(req, res, next) {
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
  const adminPath = req.path.startsWith('/api/admin')
  const staffPath =
    req.path.startsWith('/api/forum/') || req.path.startsWith('/api/messages')
  if (
    !req.user ||
    !mutation ||
    (!adminPath && !(staffPath && isStaff(req.user)))
  ) {
    return next()
  }
  const started = process.hrtime.bigint()
  res.once('finish', () => {
    const route = req.route?.path ?? req.path
    const targetId =
      req.params?.id ?? req.params?.userId ?? req.body?.id ?? req.query?.id ?? null
    const targetLabel =
      req.body?.title ?? req.body?.name ?? req.body?.username ?? null
    void auditRequest(req, {
      action: `${req.method} ${route}`,
      targetType: String(route).split('/').filter(Boolean).slice(0, 4).join('/').slice(0, 64),
      targetId,
      targetLabel,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      detail: {
        route,
        durationMs: Number((process.hrtime.bigint() - started) / 1000000n),
        queryKeys: queryKeysOf(req),
      },
    })
  })
  next()
}

export async function pruneSecurityLogs() {
  try {
    await execute('DELETE FROM request_logs WHERE expires_at <= NOW() LIMIT 10000')
    await execute('DELETE FROM access_logs WHERE expires_at <= NOW() LIMIT 10000')
  } catch (error) {
    console.error('[security-log-prune]', error.message)
  }
}

export function startSecurityLogMaintenance() {
  void pruneSecurityLogs()
  const timer = setInterval(() => void pruneSecurityLogs(), 6 * 60 * 60 * 1000)
  timer.unref?.()
  return timer
}
