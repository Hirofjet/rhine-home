import { createContext } from 'react'
import type { ApiUser } from '../../lib/api'

export interface SessionValue {
  user: ApiUser | null
  loading: boolean
  staff: boolean
  login: (username: string, password: string) => Promise<ApiUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

export const SessionContext = createContext<SessionValue | null>(null)
