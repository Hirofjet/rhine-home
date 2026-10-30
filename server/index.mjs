// ============================================================
// 留言板后端示例（可选）：Express + MySQL
// 前端接口见 src/lib/api.ts；使用步骤见同目录 README.md
// ============================================================
import express from 'express'
import cors from 'cors'
import mysql from 'mysql2/promise'

const PORT = process.env.PORT ?? 3001

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'rhine_home',
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4',
})

const app = express()
app.use(cors())
app.use(express.json({ limit: '32kb' }))

// 拉取最新留言（前端每次进入留言板时调用）
app.get('/api/messages', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, content, created_at AS createdAt FROM guest_messages ORDER BY created_at DESC LIMIT 60',
    )
    res.json({ messages: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'db_error' })
  }
})

// 提交留言（前端表单调用）
app.post('/api/messages', async (req, res) => {
  const name = String(req.body?.name ?? '').trim().slice(0, 24)
  const content = String(req.body?.content ?? '').trim().slice(0, 120)
  if (!name || !content) {
    res.status(400).json({ error: 'invalid_input' })
    return
  }
  try {
    const [result] = await pool.execute(
      'INSERT INTO guest_messages (name, content) VALUES (?, ?)',
      [name, content],
    )
    const [rows] = await pool.query(
      'SELECT id, name, content, created_at AS createdAt FROM guest_messages WHERE id = ?',
      [result.insertId],
    )
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'db_error' })
  }
})

app.listen(PORT, () => {
  console.log(`guestbook api listening on http://localhost:${PORT}`)
})
