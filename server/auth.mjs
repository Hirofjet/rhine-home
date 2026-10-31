/**
 * 密码哈希与会话工具
 * - 使用 node:crypto 的 scrypt，无需额外依赖
 * - 存储格式：scrypt$<salt>$<hash>
 */
import crypto from 'node:crypto'

/** 后台模块权限清单（成员管理里可勾选） */
export const PERMISSIONS = ['articles', 'logs', 'photos', 'videos', 'members']

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored ?? '').split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  try {
    const test = crypto.scryptSync(String(password), salt, 64)
    const expected = Buffer.from(hash, 'hex')
    return expected.length === test.length && crypto.timingSafeEqual(expected, test)
  } catch {
    return false
  }
}

export function newToken() {
  return crypto.randomBytes(32).toString('hex')
}
