export const CONTENT_UPDATED_EVENT = 'rhine:content-updated'

/** 后台修改内容后通知前台重新拉取 */
export function notifyContentUpdated() {
  window.dispatchEvent(new Event(CONTENT_UPDATED_EVENT))
}
