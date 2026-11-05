# RHINE//HOME 教程索引

本目录是项目的统一教程入口。根目录不再保留分散的教程文件。

| 文档 | 内容 |
| --- | --- |
| [本地开发](LOCAL_SETUP.md) | 环境、数据库、前后端启动 |
| [后台管理](ADMIN.md) | 后台模块、内容运营、审核 |
| [权限体系](PERMISSIONS.md) | 角色、权限树、边界规则 |
| [内容系统](CONTENT.md) | 文章、照片、视频、日志、项目、留言 |
| [Lab 与离线](LAB.md) | 3D 模式、档案面板、缓存、FPS HUD |
| [部署](DEPLOYMENT.md) | Nginx、Node 服务、更新与回滚 |
| [腾讯云部署](TENCENT_CLOUD.md) | 腾讯云轻量应用服务器要点 |
| [Git 与发布](GIT.md) | 版本号、tag、发布脚本 |
| [测试清单](TESTING.md) | 构建、桌面、移动端、后台回归 |
| [视觉系统](DESIGN.md) | 主题、字体、布局、组件规则 |
| [需求演进汇总](REQUIREMENTS_HISTORY.md) | 项目从 v0.1 到 v2.1.1 的需求脉络 |

## 约定

- 所有命令默认在项目根目录执行，除非标注 `cd server`。
- 生产环境必须使用 MySQL/MariaDB，不要把 JSON 文件当数据库。
- `.env`、`server/uploads`、`server/data`、`logs/` 不进入 Git。
- 3D Lab 素材的署名与许可证见根目录 README 和 `lab-src/PR15-ATTRIBUTION.md`。
