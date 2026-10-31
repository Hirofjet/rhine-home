import { useContext } from 'react'
import { SessionContext, type SessionValue } from './session'

export function useSession(): SessionValue {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used within SessionProvider')
  return context
}
