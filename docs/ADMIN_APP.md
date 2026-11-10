# 管理员 App（PWA）

管理 App 是独立入口 `/app/`，只允许 `isStaff` 的管理/版主账号登录，**没有注册入口**。普通用户即使打开这个地址，也只能看到登录页；登录会被服务端以 `app_staff_only` 拒绝。

## 安装

### 方式一：从正式站点安装

打开：

```text
https://www.hirofjet.cn/app/
```

- Chrome / Edge：地址栏右侧「安装」图标，或菜单 → 安装应用；
- Android Chrome：菜单 → 添加到主屏幕 / 安装应用；
- iPhone / iPad Safari：分享 → 添加到主屏幕；
- 安装后从桌面/程序启动，显示为独立窗口，不显示浏览器地址栏。

### 方式二：从 GitHub Pages 安装

仓库推送后，`Deploy admin app to GitHub Pages` 工作流会构建并部署：

```text
https://hirofjet.github.io/rhine-home/app/
```

需要在仓库 Settings → Pages 中选择 **GitHub Actions** 作为 Source。

### 方式三：GitHub Release

推送 `v*` 标签会触发 `Publish admin app release`，在 Releases 中生成：

- `rhine-admin-app.zip`：同一版本的静态构建产物；
- 在线安装仍推荐使用 Pages 或正式站点地址。

> 静态压缩包本身不能像 APK 一样双击安装；PWA 必须由 HTTPS 站点托管后，通过浏览器安装。若需要真正的 Android APK / iOS 包，需要另接 Capacitor / Bubblewrap 与签名证书。

## 登录与权限

- 登录接口使用 `appOnly: true`；
- 服务端在密码/MFA 校验后、创建 session 前检查 `isStaff(user)`；
- 非管理员返回 `403 app_staff_only`；
- App 内没有注册、找回密码或前台内容入口；
- 管理面板仍由原有权限系统控制，成员只能看到被授权的面板；
- Regulator 只读账号不属于 staff，不能登录 App。

## 通知

支持两类通知：

1. **站内通知列表**：App 顶栏铃铛，显示标题、正文、时间；20 秒刷新；
2. **系统推送**：Web Push，即使 App 在后台/关闭也能收到系统通知，正文会显示消息内容。

触发来源：

- 新举报工单；
- 新帖子待审核；
- 新回复待审核；
- 新留言待审核；
- 发给管理员的其他站内通知（私信、权限变更等）。

### 开启

进入 App → 顶栏「开启通知」→ 浏览器允许通知。

- iOS 需要 16.4+，且必须先添加到主屏幕；
- 必须 HTTPS（localhost 例外）；
- 点击「测试通知」可验证。

### 服务端 VAPID

生成密钥：

```bash
cd server
npx web-push generate-vapid-keys
```

写入 `server/.env`：

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:security@example.com
```

私钥不要提交到 Git。未配置时接口返回 `push_not_configured`，App 会显示提示。

## GitHub Pages 跨域

Pages App 的 API 在正式服务器。服务器需要允许 Pages 源：

```env
CORS_ORIGIN=https://hirofjet.github.io
```

默认配置已包含该来源；如果使用自定义 Pages 域名，改成实际来源，多个用逗号分隔。

## 构建变量

```env
VITE_API_BASE=https://www.hirofjet.cn
VITE_BASE_PATH=/rhine-home/
VITE_ADMIN_PATH=/admin
```

`VITE_BASE_PATH` 只用于 GitHub Pages 子路径构建；普通服务器部署保持 `/`。

## 安全边界

- App 是 PWA，不是原生 APK；安装包来自 HTTPS 站点；
- 管理数据由服务端权限控制，不能只靠前端隐藏；
- App 的 Service Worker 只缓存 App 壳与离线页，不缓存公开站点数据；
- 通知内容会显示在系统通知栏，敏感环境请关闭通知或使用受控设备；
- 注销/权限撤销后，服务端会拒绝已失效账号的 API 请求。

## 相关文件

- `src/pages/AdminAppPage.tsx`：入口、登录、安装与通知 UI
- `public/app-manifest.webmanifest`：PWA manifest
- `public/app-sw.js`：Service Worker 与 push 展示
- `server/push.mjs`：Web Push 发送
- `.github/workflows/pages.yml`：Pages 部署
- `.github/workflows/release-app.yml`：Release 打包
