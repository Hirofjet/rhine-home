import { query } from './db.mjs'

let settingsCache = null
let settingsAt = 0
let termsCache = null
let termsAt = 0

export async function moderationSettings() {
  if (settingsCache && Date.now() - settingsAt < 10_000) return settingsCache
  try {
    const rows = await query(
      `SELECT emergency_stop AS emergencyStop,
              replies_require_review AS repliesRequireReview,
              guestbook_require_review AS guestbookRequireReview
       FROM moderation_settings WHERE id = 1 LIMIT 1`,
    )
    settingsCache = {
      emergencyStop: Boolean(rows[0]?.emergencyStop),
      repliesRequireReview: rows[0] ? Boolean(rows[0].repliesRequireReview) : true,
      guestbookRequireReview: rows[0] ? Boolean(rows[0].guestbookRequireReview) : true,
    }
  } catch {
    settingsCache = {
      emergencyStop: false,
      repliesRequireReview: true,
      guestbookRequireReview: true,
    }
  }
  settingsAt = Date.now()
  return settingsCache
}

export function invalidateModerationCache() {
  settingsCache = null
  settingsAt = 0
  termsCache = null
  termsAt = 0
}

export async function moderationTerms() {
  if (termsCache && Date.now() - termsAt < 10_000) return termsCache
  try {
    const rows = await query(
      'SELECT term, action FROM moderation_terms WHERE enabled = 1 ORDER BY id ASC',
    )
    termsCache = rows.map((row) => ({
      term: String(row.term).toLowerCase(),
      action: row.action === 'block' ? 'block' : 'review',
    }))
  } catch {
    termsCache = []
  }
  termsAt = Date.now()
  return termsCache
}

/** Returns the strongest matching rule for the supplied text. */
export async function matchModeration(text) {
  const source = String(text ?? '').toLowerCase()
  if (!source.trim()) return null
  const terms = await moderationTerms()
  let review = null
  for (const entry of terms) {
    if (!entry.term || !source.includes(entry.term)) continue
    if (entry.action === 'block') return { action: 'block', term: entry.term }
    review = review ?? { action: 'review', term: entry.term }
  }
  return review
}

export function moderationBlockedResponse(res, term) {
  return res.status(422).json({
    error: 'content_blocked',
    message: '内容包含不允许发布的词语，请修改后重试。',
    term: term ? String(term).slice(0, 40) : undefined,
  })
}

export function moderationReviewResponse(res) {
  return res.status(202).json({
    error: 'content_pending_review',
    message: '内容已提交人工审核。',
  })
}
