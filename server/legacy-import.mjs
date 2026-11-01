/* ============================================================
   旧版数据导入 / 重新部署后的内容恢复
   ------------------------------------------------------------
   当 MySQL 内容表为空时，自动从以下位置恢复旧内容：
   · src/assets/articles/*.md  → articles
   · src/assets/logs/*.md      → logs
   · server/data/*.json        → 旧版 JSON 存储（若存在）
   手动执行：npm run import-legacy
   也可在部署后单独执行，不会重复导入已存在的内容。
   ============================================================ */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')

async function listFiles(dir, ext) {
  try {
    const names = await fs.readdir(dir)
    return names
      .filter((name) => name.toLowerCase().endsWith(ext))
      .sort()
      .map((name) => path.join(dir, name))
  } catch {
    return []
  }
}

function parseMarkdown(raw, filename) {
  const heading = /^#\s+(.+)$/m.exec(raw)?.[1]?.trim()
  const dateMatch = /(\d{4}-\d{2}-\d{2})/.exec(filename)
  return {
    title: (heading ?? filename.replace(/\.md$/i, '')).slice(0, 200),
    date: dateMatch?.[1] ?? new Date().toISOString().slice(0, 10),
    markdown: raw,
  }
}

async function readLegacyJson(name) {
  try {
    const raw = await fs.readFile(path.join(__dirname, 'data', `${name}.json`), 'utf8')
    const parsed = JSON.parse(raw)
    const rows = Array.isArray(parsed) ? parsed : (parsed.items ?? [])
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

async function isEmpty(query, table) {
  const rows = await query(`SELECT COUNT(*) AS n FROM ${table}`)
  return Number(rows[0].n) === 0
}

const asText = (value, max = 500) => String(value ?? '').slice(0, max)
const asTags = (value) =>
  JSON.stringify(
    Array.isArray(value)
      ? value.filter((item) => typeof item === 'string')
      : [],
  )

export async function importLegacyIfEmpty({ query, execute }) {
  const summary = []
  const superRows = await query(
    'SELECT id FROM users WHERE is_super = 1 ORDER BY id ASC LIMIT 1',
  )
  const adminId = superRows.length ? Number(superRows[0].id) : null

  // 文章
  if (await isEmpty(query, 'articles')) {
    let imported = 0
    const legacy = await readLegacyJson('articles')
    for (const item of legacy) {
      if (!item?.markdown) continue
      await execute(
        `INSERT INTO articles (title, date, tags, markdown, downloads, author_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          asText(item.title, 200) || '未命名文章',
          asText(item.date, 32) || new Date().toISOString().slice(0, 10),
          asTags(item.tags),
          String(item.markdown),
          JSON.stringify(Array.isArray(item.downloads) ? item.downloads : []),
          adminId,
        ],
      )
      imported += 1
    }
    if (imported === 0) {
      for (const file of await listFiles(path.join(PROJECT_ROOT, 'src/assets/articles'), '.md')) {
        const raw = await fs.readFile(file, 'utf8')
        const parsed = parseMarkdown(raw, path.basename(file))
        await execute(
          `INSERT INTO articles (title, date, tags, markdown, downloads, author_id)
           VALUES (?, ?, '[]', ?, '[]', ?)`,
          [parsed.title, parsed.date, parsed.markdown, adminId],
        )
        imported += 1
      }
    }
    if (imported) summary.push(`articles:${imported}`)
  }

  // 日志
  if (await isEmpty(query, 'logs')) {
    let imported = 0
    const legacy = await readLegacyJson('logs')
    for (const item of legacy) {
      if (!item?.markdown) continue
      await execute(
        `INSERT INTO logs (title, date, markdown, author_id) VALUES (?, ?, ?, ?)`,
        [
          asText(item.title, 200) || '未命名日志',
          asText(item.date, 32) || new Date().toISOString().slice(0, 10),
          String(item.markdown),
          adminId,
        ],
      )
      imported += 1
    }
    if (imported === 0) {
      for (const file of await listFiles(path.join(PROJECT_ROOT, 'src/assets/logs'), '.md')) {
        const raw = await fs.readFile(file, 'utf8')
        const parsed = parseMarkdown(raw, path.basename(file))
        await execute(
          `INSERT INTO logs (title, date, markdown, author_id) VALUES (?, ?, ?, ?)`,
          [parsed.title, parsed.date, parsed.markdown, adminId],
        )
        imported += 1
      }
    }
    if (imported) summary.push(`logs:${imported}`)
  }

  // 照片
  if (await isEmpty(query, 'photos')) {
    const legacy = await readLegacyJson('photos')
    let imported = 0
    for (const item of legacy) {
      if (!item?.url) continue
      await execute(
        `INSERT INTO photos (url, name, date, description, uploaded_by)
         VALUES (?, ?, ?, ?, ?)`,
        [
          asText(item.url, 500),
          asText(item.name, 500) || 'photo',
          asText(item.date, 32),
          asText(item.description, 300),
          adminId,
        ],
      )
      imported += 1
    }
    if (imported) summary.push(`photos:${imported}`)
  }

  // 视频
  if (await isEmpty(query, 'videos')) {
    const legacy = await readLegacyJson('videos')
    let imported = 0
    for (const item of legacy) {
      if (!item?.src) continue
      await execute(
        `INSERT INTO videos (title, description, tags, src, poster, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          asText(item.title, 200) || '未命名视频',
          asText(item.description, 2000),
          asTags(item.tags),
          asText(item.src, 500),
          asText(item.poster, 500),
          adminId,
        ],
      )
      imported += 1
    }
    if (imported) summary.push(`videos:${imported}`)
  }

  return summary
}

/** 手动执行：node legacy-import.mjs（或 npm run import-legacy） */
async function main() {
  const { initSchema, query, execute, pool } = await import('./db.mjs')
  await initSchema()
  const summary = await importLegacyIfEmpty({ query, execute })
  console.log(
    summary.length
      ? `[legacy] 已恢复：${summary.join(', ')}`
      : '[legacy] 没有需要恢复的数据（内容表非空或没有旧文件）',
  )
  await pool.end()
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('[legacy] 导入失败：', error)
    process.exit(1)
  })
}
