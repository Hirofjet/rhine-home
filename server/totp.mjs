import crypto from 'node:crypto'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateTotpSecret(bytes = 20) {
  return base32Encode(crypto.randomBytes(bytes))
}

export function base32Encode(buffer) {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31]
  return output
}

export function base32Decode(input) {
  const clean = String(input ?? '').toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0
  let value = 0
  const output = []
  for (const char of clean) {
    const index = ALPHABET.indexOf(char)
    if (index < 0) continue
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(output)
}

export function totpCode(secret, counter) {
  const key = base32Decode(secret)
  const buf = Buffer.alloc(8)
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  buf.writeUInt32BE(counter >>> 0, 4)
  const digest = crypto.createHmac('sha1', key).update(buf).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  return String(binary % 1_000_000).padStart(6, '0')
}

export function verifyTotp(secret, code, window = 1) {
  const value = String(code ?? '').replace(/\s/g, '')
  if (!/^\d{6}$/.test(value) || !secret) return false
  const counter = Math.floor(Date.now() / 30_000)
  for (let offset = -window; offset <= window; offset += 1) {
    const candidate = totpCode(secret, counter + offset)
    if (
      candidate.length === value.length &&
      crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(value))
    ) {
      return true
    }
  }
  return false
}

export function totpUri(secret, label, issuer = 'RHINE//HOME') {
  const name = encodeURIComponent(`${issuer}:${label}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  })
  return `otpauth://totp/${name}?${params.toString()}`
}
