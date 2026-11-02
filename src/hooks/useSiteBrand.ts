import { useEffect, useState } from 'react'
import { site } from '../content'
import { siteApi } from '../lib/api'

const listeners = new Set<(brand: string) => void>()
const STORAGE_KEY = 'rhine:brand'
let currentBrand = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) || site.title
  } catch {
    return site.title
  }
})()
let initialized = false

const brandFromCodeName = (codeName: string | null | undefined) => {
  const clean = String(codeName ?? '').trim().replace(/\/\/HOME$/i, '')
  return clean ? `${clean}//HOME` : site.title
}

export function setSiteBrandName(codeName: string | null | undefined) {
  const next = brandFromCodeName(codeName)
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* ignore */
  }
  document.title = `${next} · 个人主页`
  if (next === currentBrand) return
  currentBrand = next
  for (const listener of listeners) listener(next)
}

export function useSiteBrand(): string {
  const [brand, setBrand] = useState(currentBrand)

  useEffect(() => {
    listeners.add(setBrand)
    if (!initialized) {
      initialized = true
      siteApi
        .home()
        .then((data) => {
          if (data.profile?.codeName) setSiteBrandName(data.profile.codeName)
        })
        .catch(() => undefined)
    }
    return () => {
      listeners.delete(setBrand)
    }
  }, [])

  useEffect(() => {
    document.title = `${brand} · 个人主页`
  }, [brand])

  return brand
}
