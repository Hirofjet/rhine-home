#!/usr/bin/env node
/* ============================================================
   一键发布到 GitHub
   ------------------------------------------------------------
   用法：
     npm run release -- "fix: 修复手机端通知溢出"
     npm run release -- "feat: 新增功能"

   行为：
     1. git add -A（受 .gitignore 限制，不含 .env / node_modules / dist）
     2. 生成带版本号的 commit
     3. 打 tag：v0.8.0 / v0.8.1 …
     4. 推送 main 与 tag 到 origin
     5. 自动把 package.json 版本 +1，提交“下一个版本”并推送

   第一次发布从 v0.8.0 开始。
   ============================================================ */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packagePath = path.join(root, 'package.json')
const lockPath = path.join(root, 'package-lock.json')

const git = (args, options = {}) =>
  execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : 'pipe',
    ...options,
  })

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const writeJson = (file, data) =>
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8')

const bumpPatch = (version) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) throw new Error(`版本号不是 x.y.z 格式：${version}`)
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`
}

const ensureIdentityArgs = () => {
  let name = ''
  let email = ''
  try {
    name = git(['config', 'user.name']).trim()
    email = git(['config', 'user.email']).trim()
  } catch {
    /* 未配置时使用仓库默认身份 */
  }
  return [
    ...(name ? ['-c', `user.name=${name}`] : ['-c', 'user.name=rhine-home']),
    ...(email ? ['-c', `user.email=${email}`] : ['-c', 'user.email=rhine-home@local']),
  ]
}

const main = () => {
  const pkg = readJson(packagePath)
  const version = pkg.version
  const tag = `v${version}`
  const message =
    process.argv.slice(2).join(' ').trim() || 'chore: update site'

  git(['add', '-A'])
  const staged = git(['diff', '--cached', '--name-only']).trim()
  if (!staged) {
    console.log('[release] 没有需要提交的改动')
    return
  }

  try {
    git(['rev-parse', '--verify', `refs/tags/${tag}`])
    console.error(
      `[release] 标签 ${tag} 已存在。请先修改 package.json 的 version，或删除本地标签后重试。`,
    )
    process.exit(1)
  } catch {
    /* 标签不存在，继续 */
  }

  const identity = ensureIdentityArgs()
  const branch = git(['branch', '--show-current']).trim() || 'main'

  console.log(`[release] 提交并发布 ${tag}`)
  git([...identity, 'commit', '-m', `${message} (v${version})`], {
    inherit: true,
  })
  git([...identity, 'tag', '-a', tag, '-m', tag], { inherit: true })

  console.log(`[release] 推送到 origin/${branch}`)
  git(['push', 'origin', branch, '--follow-tags'], { inherit: true })

  const nextVersion = bumpPatch(version)
  pkg.version = nextVersion
  writeJson(packagePath, pkg)

  if (fs.existsSync(lockPath)) {
    const lock = readJson(lockPath)
    lock.version = nextVersion
    if (lock.packages?.['']) lock.packages[''].version = nextVersion
    writeJson(lockPath, lock)
  }

  git(['add', 'package.json', 'package-lock.json'])
  git(
    [...identity, 'commit', '-m', `chore: start v${nextVersion}`],
    { inherit: true },
  )
  git(['push', 'origin', branch], { inherit: true })

  console.log(`[release] 完成：${tag} 已上传，下一版本 ${nextVersion}`)
}

try {
  main()
} catch (error) {
  console.error('[release] 失败：', error.message)
  console.error(
    '如果提交/标签已创建但推送失败，修复网络或 GitHub 权限后执行：\n' +
      '  git push origin main --follow-tags\n' +
      '然后手动把 package.json 版本 +1 并提交，或删除本地 tag 后重试。',
  )
  process.exit(1)
}
