#!/usr/bin/env node
/** 部署后安全检查：HTTPS、安全响应头、健康检查。 */
const target = process.argv[2] || process.env.SITE_URL || 'https://hirofjet.cn'
const required = [
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
  'content-security-policy',
]

let failed = false
try {
  const response = await fetch(target, { redirect: 'follow' })
  console.log(`status: ${response.status} ${response.url}`)
  for (const name of required) {
    const value = response.headers.get(name)
    if (!value) {
      failed = true
      console.error(`MISSING ${name}`)
    } else {
      console.log(`OK ${name}: ${value.slice(0, 100)}`)
    }
  }
  if (!response.url.startsWith('https://')) {
    failed = true
    console.error('MISSING HTTPS')
  }
  const health = await fetch(new URL('/api/health', response.url))
  console.log(`health: ${health.status}`)
  if (!health.ok) failed = true
} catch (error) {
  failed = true
  console.error(error.message)
}
process.exit(failed ? 1 : 0)
