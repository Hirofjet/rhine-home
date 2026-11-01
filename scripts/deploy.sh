#!/usr/bin/env bash
# ============================================================
# RHINE//HOME 服务器自动重新部署脚本
# ------------------------------------------------------------
# 用法（在服务器上执行）：
#   cd /www/wwwroot/rhine-home
#   ./scripts/deploy.sh
#
# 可选环境变量：
#   APP_DIR=/www/wwwroot/rhine-home  项目目录
#   BRANCH=main                    要部署的分支
#   SERVICE=rhine-home             systemd 服务名
#   HEALTH_URL=http://127.0.0.1:3001/api/health
#   PULL_WRAPPER=cnfast            用包装命令拉取（国内环境，如 cnfast）
#   FORCE_BUILD=1                  没有新提交也强制重新构建
#   ALLOW_DIRTY=1                  允许有未提交的已跟踪改动（默认拒绝）
#
# 流程：fetch → pull --ff-only → 安装依赖 → 构建 → 重启 → 健康检查
# 失败时自动回滚到部署前的 commit（数据库与 uploads 不受影响）。
# ============================================================
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/www/wwwroot/rhine-home}"
BRANCH="${BRANCH:-main}"
SERVICE="${SERVICE:-rhine-home}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3001/api/health}"
PM2_APP="${PM2_APP:-rhine-home}"
FORCE_BUILD="${FORCE_BUILD:-0}"
ALLOW_DIRTY="${ALLOW_DIRTY:-0}"

log() {
  printf '[deploy] %s %s\n' "$(date '+%F %T')" "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

command -v git >/dev/null 2>&1 || fail "未安装 git"
command -v node >/dev/null 2>&1 || fail "未安装 Node.js"
command -v npm >/dev/null 2>&1 || fail "未安装 npm"
command -v curl >/dev/null 2>&1 || fail "未安装 curl（用于健康检查）"

[ -d "$APP_DIR" ] || fail "项目目录不存在：$APP_DIR"
cd "$APP_DIR"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "不是 Git 仓库：$APP_DIR"

# 防止并发部署
LOCK_FILE="$APP_DIR/.deploy.lock"
if command -v flock >/dev/null 2>&1; then
  exec 9>"$LOCK_FILE"
  flock -n 9 || fail "已有部署任务在运行"
fi

if [ "$ALLOW_DIRTY" != "1" ]; then
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    git status --short
    fail "检测到未提交的已跟踪改动，请先处理（或 ALLOW_DIRTY=1）"
  fi
fi

PREV="$(git rev-parse HEAD)"
log "部署前版本：$(git log --oneline -1)"

restart_app() {
  if command -v systemctl >/dev/null 2>&1 \
    && systemctl list-unit-files --no-legend 2>/dev/null | grep -q "^${SERVICE}\.service"; then
    if [ "$(id -u)" -eq 0 ]; then
      systemctl restart "$SERVICE"
    else
      sudo systemctl restart "$SERVICE"
    fi
    log "已重启 systemd 服务：$SERVICE"
    return
  fi

  if command -v pm2 >/dev/null 2>&1; then
    if [ -f "$APP_DIR/server/ecosystem.config.cjs" ]; then
      (cd "$APP_DIR/server" && pm2 startOrReload ecosystem.config.cjs --update-env)
    else
      pm2 restart "$PM2_APP" --update-env
    fi
    log "已通过 PM2 重载：$PM2_APP"
    return
  fi

  fail "未找到 ${SERVICE}.service，也没有 pm2，无法重启后端"
}

health_check() {
  for _ in $(seq 1 30); do
    if curl -fsS --max-time 3 "$HEALTH_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

DEPLOY_STARTED=0
ROLLED_BACK=0

rollback() {
  local status=$?
  trap - ERR
  if [ "$DEPLOY_STARTED" = "1" ] && [ "$ROLLED_BACK" = "0" ]; then
    ROLLED_BACK=1
    log "部署失败（退出码 $status），回滚到 ${PREV:0:7}"
    git reset --hard "$PREV" || true
    npm ci || log "回滚：前端依赖安装失败"
    npm run build || log "回滚：前端构建失败"
    (cd server && npm ci --omit=dev) || log "回滚：后端依赖安装失败"
    restart_app || log "回滚：服务重启失败"
  fi
  exit "$status"
}
trap rollback ERR

if [ -n "${PULL_WRAPPER:-}" ]; then
  command -v "$PULL_WRAPPER" >/dev/null 2>&1 \
    || fail "找不到拉取命令：$PULL_WRAPPER（请先安装 cnfast）"
  log "使用 $PULL_WRAPPER 拉取（国内加速模式）"
  "$PULL_WRAPPER" git pull --ff-only
else
  log "拉取 origin/$BRANCH"
  git fetch --prune origin "$BRANCH"
  git pull --ff-only origin "$BRANCH"
fi

NEW="$(git rev-parse HEAD)"
if [ "$PREV" = "$NEW" ] && [ "$FORCE_BUILD" != "1" ]; then
  log "已经是最新版本，无需重新构建（FORCE_BUILD=1 可强制执行）"
  exit 0
fi

DEPLOY_STARTED=1
log "新版本：$(git log --oneline -1)"

log "安装前端依赖"
npm ci

log "构建前端"
npm run build

log "安装后端依赖"
(cd server && npm ci --omit=dev)

log "重启后端"
restart_app

log "健康检查：$HEALTH_URL"
if ! health_check; then
  log "健康检查未通过"
  false
fi

log "部署完成：$(git log --oneline -1)"
log "前端目录：$APP_DIR/dist；后端：$APP_DIR/server"
