#!/usr/bin/env node
/**
 * 备份数据库与上传目录。
 *
 * 用法：
 *   node scripts/backup.mjs
 *   BACKUP_DIR=D:\backups node scripts/backup.mjs
 *
 * 依赖：mysqldump、tar 在 PATH 中。建议由系统计划任务每日执行。
 * 不要把备份目录放在 public/ 或 uploads/ 下。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { config } from '../server/config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const uploadDir = config.uploadDir
  ? path.resolve(config.uploadDir)
  : path.join(root, 'server', 'uploads')
const backupRoot = path.resolve(process.env.BACKUP_DIR || path.join(root, 'backups'))
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const target = path.join(backupRoot, stamp)
fs.mkdirSync(target, { recursive: true })

function run(command, args, options = {}) {
  console.log(`[backup] ${command} ${args.map((arg) => arg.replace(/password=.*/, 'password=***')).join(' ')}`)
  return execFileSync(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...options.env },
  })
}

const sqlFile = path.join(target, 'rhine_home.sql')
run(
  'mysqldump',
  [
    `--host=${config.db.host}`,
    `--port=${config.db.port}`,
    `--user=${config.db.user}`,
    '--single-transaction',
    '--routines',
    '--triggers',
    '--databases',
    config.db.database,
    `--result-file=${sqlFile}`,
  ],
  { env: { MYSQL_PWD: config.db.password } },
)

const uploadsArchive = path.join(target, 'uploads.tar.gz')
if (fs.existsSync(uploadDir)) {
  run('tar', ['-czf', uploadsArchive, '-C', path.dirname(uploadDir), path.basename(uploadDir)])
} else {
  console.warn('[backup] uploads directory missing, skipped')
}

const files = [sqlFile, uploadsArchive].filter((file) => fs.existsSync(file))
const manifest = {
  createdAt: new Date().toISOString(),
  database: config.db.database,
  files: files.map((file) => ({
    file: path.basename(file),
    bytes: fs.statSync(file).size,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
  })),
}
fs.writeFileSync(path.join(target, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`[backup] completed: ${target}`)
