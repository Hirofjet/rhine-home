import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, UserPlus, UserRound, UserMinus } from 'lucide-react'
import {
  errorMessage,
  resolveMediaUrl,
  ROLE_LABELS,
  userApi,
  type PublicProfile,
} from '../lib/api'
import { useSession } from '../components/auth/useSession'
import { formatDate } from '../lib/format'

export function PublicUserPage() {
  const { id = '0' } = useParams()
  const userId = Number(id)
  const { user: me } = useSession()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [posts, setPosts] = useState<
    Array<{ id: number; title: string; createdAt: string; board: { slug: string; name: string } }>
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    userApi
      .profile(userId)
      .then((data) => {
        if (!alive) return
        setProfile(data.user)
        setPosts(data.posts)
      })
      .catch((err: unknown) => {
        if (alive) setError(errorMessage(err))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [userId])

  const toggleFollow = async () => {
    if (!profile) return
    try {
      if (profile.isFollowing) await userApi.unfollow(profile.id)
      else await userApi.follow(profile.id)
      const data = await userApi.profile(profile.id)
      setProfile(data.user)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 pb-24 pt-28 sm:px-6">
        <p className="animate-pulse-soft font-mono text-xs tracking-[0.3em] text-rhine-faint">
          LOADING USER …
        </p>
      </section>
    )
  }

  if (error || !profile) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 pb-24 pt-28 sm:px-6">
        <Link to="/forum" className="font-mono text-[10px] text-rhine-faint hover:text-rhine-gold">
          <ArrowLeft className="mr-1 inline h-3 w-3" /> 返回论坛
        </Link>
        <p className="mt-5 border border-rhine-red/40 bg-rhine-red/5 px-4 py-3 font-mono text-[11px] text-rhine-red">
          {error || '用户不存在'}
        </p>
      </section>
    )
  }

  const avatar = profile.avatarUrl ? resolveMediaUrl(profile.avatarUrl) : ''
  const self = me?.id === profile.id

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-24 pt-28 sm:px-6">
      <Link
        to="/forum"
        className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-rhine-faint hover:text-rhine-gold"
      >
        <ArrowLeft className="h-3 w-3" /> 返回论坛
      </Link>

      <div className="mt-5 flex flex-wrap items-center gap-5 border border-rhine-line/70 bg-rhine-panel/40 p-5">
        {avatar ? (
          <img
            src={avatar}
            alt={profile.nickname}
            className="h-24 w-24 rounded-full border border-rhine-gold/50 object-cover"
          />
        ) : (
          <span className="flex h-24 w-24 items-center justify-center rounded-full border border-rhine-line bg-rhine-abyss text-rhine-gold">
            <UserRound className="h-8 w-8" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-rhine-ink">
            {profile.nickname || profile.username}
          </h1>
          <p className="mt-1 font-mono text-[10px] tracking-wider text-rhine-faint">
            @{profile.username} · {ROLE_LABELS[profile.role]} · 加入于 {formatDate(profile.createdAt)}
          </p>
          {profile.bio && (
            <p className="mt-2 text-sm leading-relaxed text-rhine-dim">{profile.bio}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(profile.tags ?? []).map((tag) => (
              <span
                key={tag}
                className="border border-rhine-line px-1.5 py-0.5 font-mono text-[9px] text-rhine-cyan"
              >
                #{tag}
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 font-mono text-[10px] text-rhine-dim">
            <span>{profile.followers ?? 0} 粉丝</span>
            <span>{profile.following ?? 0} 关注</span>
            {!self &&
              (me ? (
                <button
                  type="button"
                  onClick={() => void toggleFollow()}
                  className={`inline-flex items-center gap-1 border px-3 py-1.5 text-[10px] ${
                    profile.isFollowing
                      ? 'border-rhine-line text-rhine-dim'
                      : 'border-rhine-gold/60 bg-rhine-gold/10 text-rhine-gold'
                  }`}
                >
                  {profile.isFollowing ? (
                    <>
                      <UserMinus className="h-3 w-3" /> 已关注
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3 w-3" /> 关注
                    </>
                  )}
                </button>
              ) : (
                <Link
                  to="/profile"
                  className="border border-rhine-line px-3 py-1.5 text-[10px] text-rhine-cyan"
                >
                  登录后关注
                </Link>
              ))}
          </div>
        </div>
      </div>

      <div className="mt-5 border border-rhine-line/70 bg-rhine-panel/30">
        <p className="border-b border-rhine-line/60 px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-rhine-faint">
          发布的帖子
        </p>
        {posts.length === 0 ? (
          <p className="px-4 py-6 font-mono text-[10px] text-rhine-faint">还没有公开帖子</p>
        ) : (
          <ul className="divide-y divide-rhine-line/50">
            {posts.map((post) => (
              <li key={post.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <Link
                  to={`/forum/post/${post.id}`}
                  className="min-w-0 flex-1 truncate text-xs text-rhine-ink hover:text-rhine-gold"
                >
                  {post.title}
                </Link>
                <span className="font-mono text-[9px] text-rhine-faint">
                  {post.board.name} · {formatDate(post.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="mt-3 font-mono text-[10px] text-rhine-red">{error}</p>}
    </section>
  )
}
