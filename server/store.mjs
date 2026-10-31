/**
 * 内容存储层
 * ------------------------------------------------------------
 * - 配置了 DB_HOST 时使用 MySQL；
 * - 否则退化为 JSON 文件存储（server/data/*.json），
 *   方便本地开发、弱性能服务器或没有数据库时直接运行。
 *
 * 两套实现暴露相同的接口：
 *   store.articles / logs / photos / videos / users / messages
 *   .list() .get(id) .create(data) .update(id, patch) .remove(id)
 *   .findBy(field, value) .count()
 */
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data')

/** 集合定义：字段名 → 存储列（蛇形） */
const COLLECTIONS = {
  articles: {
    table: 'articles',
    fields: ['title', 'date', 'tags', 'markdown', 'downloads', 'createdAt'],
    jsonFields: ['tags', 'downloads'],
  },
  logs: {
    table: 'logs',
    fields: ['title', 'date', 'markdown', 'createdAt'],
  },
  photos: {
    table: 'photos',
    fields: ['url', 'name', 'date', 'createdAt'],
  },
  videos: {
    table: 'videos',
    fields: ['title', 'description', 'tags', 'src', 'poster', 'createdAt'],
    jsonFields: ['tags'],
  },
  users: {
    table: 'admin_users',
    fields: ['username', 'passwordHash', 'role', 'permissions', 'createdAt'],
    jsonFields: ['permissions'],
  },
  messages: {
    table: 'guest_messages',
    fields: ['name', 'content', 'createdAt'],
  },
}

const toSnake = (field) =>
  field.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)

const nowIso = () => new Date().toISOString()

// ============================================================
// JSON 文件存储
// ============================================================
function createJsonStore() {
  const cache = new Map()
  const fileOf = (name) => path.join(DATA_DIR, `${name}.json`)

  async function load(name) {
    if (cache.has(name)) return cache.get(name)
    let list = []
    try {
      const parsed = JSON.parse(await fsp.readFile(fileOf(name), 'utf8'))
      if (Array.isArray(parsed)) list = parsed
    } catch {
      /* 首次运行，文件不存在 */
    }
    cache.set(name, list)
    return list
  }

  async function save(name) {
    await fsp.mkdir(DATA_DIR, { recursive: true })
    await fsp.writeFile(
      fileOf(name),
      JSON.stringify(cache.get(name) ?? [], null, 2),
      'utf8',
    )
  }

  const nextId = (list) =>
    list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1

  const make = (name) => ({
    async list() {
      return [...(await load(name))]
    },
    async get(id) {
      return (await load(name)).find((x) => Number(x.id) === Number(id)) ?? null
    },
    async create(data) {
      const list = await load(name)
      const item = {
        ...data,
        id: nextId(list),
        createdAt: data.createdAt ?? nowIso(),
      }
      list.push(item)
      await save(name)
      return item
    },
    async update(id, patch) {
      const list = await load(name)
      const index = list.findIndex((x) => Number(x.id) === Number(id))
      if (index < 0) return null
      list[index] = { ...list[index], ...patch, id: list[index].id }
      await save(name)
      return list[index]
    },
    async remove(id) {
      const list = await load(name)
      const next = list.filter((x) => Number(x.id) !== Number(id))
      if (next.length === list.length) return false
      cache.set(name, next)
      await save(name)
      return true
    },
    async findBy(field, value) {
      return (await load(name)).find((x) => x[field] === value) ?? null
    },
    async count() {
      return (await load(name)).length
    },
  })

  return Object.fromEntries(
    Object.keys(COLLECTIONS).map((name) => [name, make(name)]),
  )
}

// ============================================================
// MySQL 存储
// ============================================================
async function createMysqlStore() {
  const mysql = (await import('mysql2/promise')).default
  const pool = mysql.createPool({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'rhine_home',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 5,
    dateStrings: true,
  })

  // ---- 建表（幂等） ----
  for (const [name, spec] of Object.entries(COLLECTIONS)) {
    const columns = spec.fields
      .filter((field) => field !== 'createdAt')
      .map((field) => {
        const column = toSnake(field)
        const type =
          field === 'markdown'
            ? 'MEDIUMTEXT'
            : field === 'description'
              ? 'TEXT'
              : field === 'passwordHash'
                ? 'VARCHAR(255)'
                : field === 'content'
                  ? 'VARCHAR(120)'
                  : field === 'username'
                    ? 'VARCHAR(64)'
                    : field === 'title'
                      ? 'VARCHAR(200)'
                      : 'VARCHAR(500)'
        return `\`${column}\` ${type} NULL`
      })
      .join(',\n  ')
    const unique =
      name === 'users' ? ',\n  UNIQUE KEY uk_username (username)' : ''
    await pool.query(
      `CREATE TABLE IF NOT EXISTS \`${spec.table}\` (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ${columns},
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)${unique}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    )
  }

  const make = (name, spec) => {
    const jsonFields = spec.jsonFields ?? []

    const toRow = (item) =>
      Object.fromEntries(
        Object.entries(item)
          .filter(([key]) => key !== 'createdAt')
          .map(([key, value]) => [
            toSnake(key),
            jsonFields.includes(key) && value != null
              ? JSON.stringify(value)
              : value,
          ]),
      )

    const fromRow = (row) => {
      const out = { id: Number(row.id) }
      for (const field of spec.fields) {
        const value = row[toSnake(field)]
        out[field] =
          jsonFields.includes(field) && typeof value === 'string'
            ? JSON.parse(value)
            : value
      }
      if (row.created_at) {
        out.createdAt = new Date(row.created_at).toISOString()
      }
      return out
    }

    return {
      async list() {
        const [rows] = await pool.query(
          `SELECT * FROM \`${spec.table}\` ORDER BY id DESC`,
        )
        return rows.map(fromRow)
      },
      async get(id) {
        const [rows] = await pool.query(
          `SELECT * FROM \`${spec.table}\` WHERE id = ? LIMIT 1`,
          [id],
        )
        return rows[0] ? fromRow(rows[0]) : null
      },
      async create(data) {
        const row = toRow(data)
        if (data.createdAt) row.created_at = data.createdAt
        const columns = Object.keys(row)
        const sql = columns.length
          ? `INSERT INTO \`${spec.table}\` (${columns
              .map((c) => `\`${c}\``)
              .join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
          : `INSERT INTO \`${spec.table}\` () VALUES ()`
        const [result] = await pool.query(sql, columns.map((c) => row[c]))
        return this.get(result.insertId)
      },
      async update(id, patch) {
        const row = toRow(patch)
        const columns = Object.keys(row)
        if (columns.length) {
          const sql = `UPDATE \`${spec.table}\` SET ${columns
            .map((c) => `\`${c}\` = ?`)
            .join(', ')} WHERE id = ?`
          await pool.query(sql, [...columns.map((c) => row[c]), id])
        }
        return this.get(id)
      },
      async remove(id) {
        const [result] = await pool.query(
          `DELETE FROM \`${spec.table}\` WHERE id = ?`,
          [id],
        )
        return result.affectedRows > 0
      },
      async findBy(field, value) {
        const [rows] = await pool.query(
          `SELECT * FROM \`${spec.table}\` WHERE \`${toSnake(field)}\` = ? LIMIT 1`,
          [value],
        )
        return rows[0] ? fromRow(rows[0]) : null
      },
      async count() {
        const [rows] = await pool.query(
          `SELECT COUNT(*) AS total FROM \`${spec.table}\``,
        )
        return Number(rows[0]?.total ?? 0)
      },
    }
  }

  return Object.fromEntries(
    Object.entries(COLLECTIONS).map(([name, spec]) => [name, make(name, spec)]),
  )
}

/** 创建存储实例（MySQL 优先，未配置则 JSON） */
export async function createStore() {
  if (process.env.DB_HOST) {
    const store = await createMysqlStore()
    return { mode: 'mysql', store }
  }
  return { mode: 'json', store: createJsonStore() }
}

export { COLLECTIONS, DATA_DIR }
