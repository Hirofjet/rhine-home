#!/usr/bin/env bash
# ============================================================
# 国内环境部署入口：通过 cnfast 加速 git pull
# ------------------------------------------------------------
# 用法：
#   cd /www/wwwroot/rhine-home
#   ./scripts/deploy-cn.sh
#
# 前提：服务器已安装 cnfast，且 `cnfast git pull --ff-only` 可正常使用。
# 其余流程（构建、重启、健康检查、失败回滚）与 deploy.sh 完全一致。
# ============================================================
set -Eeuo pipefail

# 如 cnfast 不在 PATH 中，可显式指定：
#   PULL_WRAPPER=/usr/local/bin/cnfast ./scripts/deploy-cn.sh
export PULL_WRAPPER="${PULL_WRAPPER:-cnfast}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/deploy.sh"
