import { assetUrl } from "./asset-url";

const CACHE = "rhine-lab-3d-v2";
const AUTOSAVED = "rhine:lab-offline-autosaved";
let installPrompt: BeforeInstallPromptEvent | null = null;
let busy = false;
let lastStatus = "首次加载后会自动缓存 3D 资源。";
let notifier: ((message: string) => void) | null = null;

function announce(message: string) {
  lastStatus = message;
  notifier?.(message);
  refreshOfflinePanel();
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function statusText() {
  if (!("caches" in window)) return "当前浏览器不支持离线缓存。";
  if (!navigator.onLine) return "当前离线，将优先读取本地资源。";
  return lastStatus;
}

export function offlineSettingsMarkup() {
  return `<section id="offline-settings" class="pwa-settings" aria-label="主屏幕与离线使用">
    <h3>APP / 主屏幕与离线</h3>
    <p>首次加载后自动保存一次 3D 资源。后续进入时优先使用本地资源；版本更新后如出现不兼容，可清除后重新保存。</p>
    <p class="pwa-status" role="status">${statusText()}</p>
    <div class="pwa-actions">
      <button type="button" data-offline-action="save">保存 3D 资源 ↗</button>
      <button type="button" data-offline-action="clear">清除本地资源 ×</button>
      ${installPrompt ? '<button type="button" data-offline-action="install">安装到主屏幕 ↗</button>' : ""}
    </div>
  </section>`;
}

export function refreshOfflinePanel() {
  const panel = document.querySelector<HTMLElement>("#offline-settings");
  if (panel) panel.outerHTML = offlineSettingsMarkup();
}

async function cacheLoadedResources(announceResult = false) {
  if (!("caches" in window)) throw new Error("cache unsupported");
  const cache = await caches.open(CACHE);
  const indexUrl = new URL("index.html", location.href).href;
  const urls = new Set<string>([indexUrl]);
  for (const entry of performance.getEntriesByType("resource")) {
    try {
      const url = new URL(entry.name);
      if (url.origin !== location.origin) continue;
      if (!url.pathname.startsWith("/rhine-lab/")) continue;
      if (url.pathname.endsWith("/sw.js")) continue;
      if (!/\.(?:js|css|glb|gltf|json|webmanifest|html|svg|png|webp|jpe?g)$/i.test(url.pathname)) continue;
      urls.add(url.href);
    } catch {
      /* ignore */
    }
  }
  let saved = 0;
  const list = [...urls];
  let cursor = 0;
  const worker = async () => {
    while (cursor < list.length) {
      const url = list[cursor++];
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 3000);
        const response = await fetch(url, { cache: "reload", signal: controller.signal });
        window.clearTimeout(timeout);
        if (!response.ok) continue;
        await cache.put(url, response.clone());
        if (url === indexUrl) {
          // The manifest starts at ./?source=pwa. Keep a directory-keyed
          // copy so that launch URL is served locally as well.
          await cache.put(new URL("./", location.href).href, response.clone());
        }
        saved++;
      } catch {
        /* keep saving the rest */
      }
    }
  };
  await Promise.all(Array.from({ length: 10 }, () => worker()));
  localStorage.setItem(AUTOSAVED, "1");
  const message = `已保存 ${saved} 个 3D 资源，可在下次加载时优先使用本地缓存。`;
  lastStatus = message;
  if (announceResult) announce(message);
  else refreshOfflinePanel();
  return saved;
}

export async function clearOfflineResources(reload = true, announceResult = false) {
  if (!("caches" in window)) return;
  await caches.delete(CACHE);
  const registrations = await navigator.serviceWorker?.getRegistrations?.() ?? [];
  await Promise.all(registrations.map((registration) => registration.unregister()));
  localStorage.removeItem(AUTOSAVED);
  const message = "本地 3D 资源已清除，下次加载会重新从网络获取。";
  lastStatus = message;
  if (announceResult) announce(message);
  else refreshOfflinePanel();
  if (reload) window.setTimeout(() => location.reload(), 900);
}

export async function initOffline(notify?: (message: string) => void) {
  if (notify) notifier = notify;
  if (!("serviceWorker" in navigator)) {
    lastStatus = "当前环境不支持 Service Worker，无法离线缓存。";
    return;
  }
  try {
    await navigator.serviceWorker.register(assetUrl("sw.js"), { scope: "/rhine-lab/" });
    await navigator.serviceWorker.ready;
    const cache = await caches.open(CACHE);
    if ((await cache.keys()).length === 0) localStorage.removeItem(AUTOSAVED);
    if (localStorage.getItem(AUTOSAVED) !== "1") {
      // Let the first frame settle before competing for network/GPU.
      setTimeout(() => {
        void cacheLoadedResources(true).catch(() => {
          announce("自动保存 3D 资源未完成，可在设置中手动保存。");
        });
      }, 1600);
    } else {
      lastStatus = "本地 3D 资源已就绪，后续加载优先使用缓存。";
    }
  } catch {
    lastStatus = "离线模块初始化失败，可在设置中手动保存。";
  }
}

document.addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>("[data-offline-action]");
  if (!button || busy) return;
  const action = button.dataset.offlineAction;
  if (action === "install" && installPrompt) {
    void installPrompt.prompt();
    void installPrompt.userChoice.finally(() => {
      installPrompt = null;
      refreshOfflinePanel();
    });
    return;
  }
  busy = true;
  button.disabled = true;
  const started =
    action === "clear" ? "正在清除本地 3D 资源…" : "正在保存 3D 资源…";
  notifier?.(started);
  const status = document.querySelector<HTMLElement>("#offline-settings .pwa-status");
  if (status) status.textContent = started;
  button.textContent = action === "clear" ? "正在清除…" : "正在保存…";
  const done = () => {
    busy = false;
    refreshOfflinePanel();
  };
  if (action === "clear") void clearOfflineResources(true, true).finally(done);
  else
    void cacheLoadedResources(true)
      .catch(() => {
        announce("保存失败，请保持联网后重试。");
      })
      .finally(done);
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event as BeforeInstallPromptEvent;
  refreshOfflinePanel();
});
