import { invalidateContentCache } from './contentCache'

export const CONTENT_UPDATED_EVENT = 'rhine:content-updated'

/** 后台修改内容后通知前台重新拉取，并清掉本地内容缓存 */
export function notifyContentUpdated() {
  invalidateContentCache()
  window.dispatchEvent(new Event(CONTENT_UPDATED_EVENT))
}
