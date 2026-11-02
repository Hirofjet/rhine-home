/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { adminApi, errorMessage } from '../../../lib/api'
import { AdminButton, AdminError, AdminNotice, AdminPanel } from '../AdminUi'

interface AccessRequest {
  id: number
  boardName: string
  username: string
  status: string
  createdAt: string
}

interface DeletionRequest {
  id: number
  boardName: string
  requester: string
  status: string
  approvals: number
  canVote: boolean
}

export function ReviewAccessPanel() {
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [deletions, setDeletions] = useState<DeletionRequest[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      const [accessData, deletionData] = await Promise.all([
        adminApi.requests(),
        adminApi.deletionRequests(),
      ])
      setRequests(accessData.requests)
      setDeletions(deletionData.requests)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const reviewAccess = async (id: number, approve: boolean) => {
    try {
      await adminApi.reviewRequest(id, approve)
      setNotice(approve ? '已通过入站申请' : '已拒绝入站申请')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const voteDeletion = async (id: number, approve: boolean) => {
    try {
      await adminApi.voteDeletion(id, approve)
      setNotice(approve ? '已同意删除申请' : '已否决删除申请')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <AdminError message={error} />
      <AdminNotice message={notice} />
      <AdminPanel title="特殊申请" subtitle="SPECIAL APPLICATIONS">
        <div className="space-y-2">
          {requests.map((request) => (
            <div key={`access-${request.id}`} className="flex flex-wrap items-center gap-2 border border-rhine-line/60 bg-rhine-abyss/30 px-3 py-2">
              <span className="text-xs text-rhine-ink">{request.username}请求加入{request.boardName}</span>
              <span className="font-mono text-[9px] text-rhine-faint">
                申请人：{request.username} · 目标：{request.boardName} · 入站申请
              </span>
              <span className="font-mono text-[9px] text-rhine-gold">
                ({request.status === 'approved' ? '1' : request.status === 'rejected' ? '0' : '0'}/1)
              </span>
              {request.status === 'pending' && (
                <span className="ml-auto flex gap-2">
                  <AdminButton variant="ghost" onClick={() => void reviewAccess(request.id, true)}>同意</AdminButton>
                  <AdminButton variant="danger" onClick={() => void reviewAccess(request.id, false)}>拒绝</AdminButton>
                </span>
              )}
            </div>
          ))}
          {requests.length === 0 && <p className="text-xs text-rhine-faint">暂无入站申请</p>}
        </div>
      </AdminPanel>

      <AdminPanel title="删除论坛申请" subtitle="DELETION APPLICATIONS">
        <div className="space-y-2">
          {deletions.map((request) => (
            <div key={`del-${request.id}`} className="flex flex-wrap items-center gap-2 border border-rhine-line/60 bg-rhine-abyss/30 px-3 py-2">
              <span className="text-xs text-rhine-ink">{request.requester}请求删除{request.boardName}</span>
              <span className="font-mono text-[9px] text-rhine-faint">
                申请人：{request.requester} · 目标：{request.boardName} · 删除论坛申请
              </span>
              <span className="font-mono text-[9px] text-rhine-gold">({request.approvals}/3)</span>
              {request.status === 'pending' && request.canVote && (
                <span className="ml-auto flex gap-2">
                  <AdminButton variant="ghost" onClick={() => void voteDeletion(request.id, true)}>同意</AdminButton>
                  <AdminButton variant="danger" onClick={() => void voteDeletion(request.id, false)}>拒绝</AdminButton>
                </span>
              )}
            </div>
          ))}
          {deletions.length === 0 && <p className="text-xs text-rhine-faint">暂无删除申请</p>}
        </div>
      </AdminPanel>
    </div>
  )
}
