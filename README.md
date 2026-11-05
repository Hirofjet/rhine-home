# RHINE//HOME

> 莱茵生命风格的个人主页、档案库、论坛、留言板与管理系统。  
> 当前版本：**v2.2.1**

RHINE//HOME 是一个面向个人创作者与小型社区的全栈站点。它把「个人档案」「内容发布」「论坛社交」「3D 档案库」和「后台治理」放在同一套视觉与权限体系中，既保留二次元终端风格的界面，也提供可长期维护的数据与权限结构。

---

## 致谢与开源声明

### 3D Lab 场景

- 原始视觉、场景、模型、动画与环境音来自 **LBEILC / [RhineLabUI](https://github.com/LBEILC/RhineLabUI)**。
- Web 性能提取参考 **PR #15**，贡献者 **PacificSauryMan**；适配、性能优化与整理由 **OpenAI Codex** 协助，原始 PR 保持独立。
- 来源与修改说明保留在 [`lab-src/PR15-ATTRIBUTION.md`](lab-src/PR15-ATTRIBUTION.md) 与 `public/rhine-lab/LICENSE`。
- 本项目不主张对原始 Lab 场景、模型、动画、音频拥有版权；再分发时请保留原作者署名、MIT 许可证与修改说明。

### 字体、图标、光标与其他资源

- MiSans 字体版权归小米/原作者所有，使用与再分发请遵守字体许可。
- Blue Archive 相关光标、图标与参考素材仅用于个人非商业展示，相关权利归原权利方。
- React、Vite、Tailwind CSS、Express、ECharts、Three.js、Framer Motion、Lucide 等依赖遵循各自开源许可证。
- 本站原创代码用于个人站点与学习交流；第三方素材不因本项目开源而改变其原始许可。

### 开源承诺

1. 保留所有第三方版权声明、LICENSE、NOTICE 与来源链接。
2. 不将他人模型、场景、音频或美术资源宣称为本项目原创。
3. 不删除或隐藏原作者署名与 PR 归属。
4. 二次分发时附带本 README、Lab 的 LICENSE/ATTRIBUTION 与相关字体许可。
5. 如权利人认为某资源使用不当，可通过仓库 Issue 联系移除或替换。

---

## 当前系统

### 五个同级页面

| 页面 | 路径 | 作用 |
| --- | --- | --- |
| 主页 | `/` | 个人资料、能力、项目与入口 |
| 档案库 | `/archive` | 日志、文章、照片、视频、项目库 |
| 论坛 | `/forum` | 板块、帖子、回复、审核与社交 |
| 留言板 | `/guestbook` | 公共留言与弹幕式展示 |
| 后台 | `/admin` | 内容、论坛、成员、权限、日志、主题与设置 |

五个页面共用左侧可收起导航、内容区和页脚。桌面导航可收起，移动端使用三横杠抽屉。

### Lab / Archive 双模式

档案库和论坛共享两种呈现模式：

- **LAB MODE**：3D 档案阵列与 3D 论坛，使用 Lab 场景；
- **ARCHIVE MODE**：传统长页面档案/论坛列表。

模式记忆保存在 `localStorage` 的 `rhine:view-mode`。重新进入时恢复上次模式；刷新档案库时默认内容页为日志。

### 3D Lab

- 五个模块列：日志、文章、照片、视频、项目库；
- 论坛模式下每列对应一个可访问板块，行对应帖子；
- 右侧档案面板展示模块、文件编号、摘要、关键元数据与页签；
- 论坛档案包含「回复」页签，帖子回复随内容同步；
- 支持设备刷新率检测、GPU 渲染、自适应渲染比例、可选 FPS HUD；
- 支持 Service Worker 离线缓存，首次加载自动保存，设置中可手动保存/清除。

### 权限与身份体系

| 角色 | 说明 |
| --- | --- |
| 超级管理员 | 全部权限，不可删除，只能本人修改密码 |
| 管理员 | 管理成员、内容、论坛与审核 |
| 版主 / 身份组 | 按板块或身份组授予权限 |
| 普通用户 | 注册、发帖、回复、关注、私信 |
| 访客 | 浏览公开内容，不可发帖/关注 |

权限树覆盖：

```text
archive / archive.articles / archive.photos / archive.videos
logs
projects
forum / forum.<boardId>
members.manage / members.grant
guestbook
access_logs
```

规则：

- 只有拥有授权权限的账号可以修改他人权限；
- 任何人不能修改自己的权限；
- 管理类账号之间不能互相操作，只有超级管理员例外；
- 超级管理员不可删除，其他账号不能修改超级管理员密码；
- 注册与找回密码均使用邮箱验证码；
- 封禁会立即使该账号的会话失效。

### 内容系统

- 文章：Markdown、附件下载、标签；
- 照片：文件或 URL，支持 EXIF 拍摄时间或手动发布时间；
- 视频：文件或 URL、封面、描述；
- 项目库：编号、名称、简介、标签、状态、版本、GitHub、详情；
- 日志：Markdown 或导入 `.md`；
- 留言板：公共留言、后台删除、访客令牌；
- 论坛：板块访问等级、帖子、回复、附件、置顶、公告、审核、删除审批。

### 后台与 ECharts

后台概览页的可视化全部由 **ECharts** 渲染：

- 7 天社区活跃度折线图；
- 档案内容分布环形图；
- 帖子状态柱状图；
- 板块发帖量横向柱状图；
- 成员角色饼图。

图表按需引入 ECharts Core，颜色读取页面主题 CSS 变量，随明暗主题刷新。

### 主题与视觉

- 页面主题：莱茵生命（亮/暗）、碧蓝档案、樱色协议、深空协议，以及后台自定义主题；
- 3D 档案主题：独立亮/暗，不与页面主题混用；
- 自定义主题支持主色、副色、子色与三色命名；
- 统一 Lab 面板、等宽标签、细线边框、终端式标题与响应式导航。

### 离线与 PWA

- 首次加载自动缓存 `/rhine-lab/` 下的 3D 核心资源；
- 入口页网络优先，资源缓存优先；
- 缓存版本 `rhine-lab-3d-v2`，新版本激活时清理旧缓存；
- 设置中可手动保存/清除；
- 缓存为空时自动重新下载；
- 启动失败时清空一次缓存并重试。

---

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 19、TypeScript、Vite 8、Tailwind CSS v4、Framer Motion、React Router v7 |
| 内容 | react-markdown、remark-gfm、exifr |
| 图表 | ECharts 6（按需 Core） |
| 后端 | Node.js、Express 5 |
| 数据库 | MySQL 8 / MariaDB 10.6+（必需） |
| 鉴权 | scrypt 密码哈希 + 数据库会话 |
| 邮件 | nodemailer SMTP 验证码 |
| 上传 | multer，本地 `/uploads` |
| 3D | Three.js / 原始 RhineLabUI 场景 |
| 离线 | Service Worker + Cache Storage |

---

## 目录结构

```text
src/                 前台页面、组件、主题、API
server/              Express API、鉴权、数据库、上传
lab-src/             3D Lab 源码与静态资源
public/rhine-lab/    构建后的 3D 静态资源
guide/               教程、权限、部署、测试、需求演进
logs/                本地版本日志（不提交 Git）
docs/                截图与媒体资料
scripts/             发布与部署脚本
```

---

## 快速开始

完整步骤见 [`guide/LOCAL_SETUP.md`](guide/LOCAL_SETUP.md)。

```bash
# 前端
npm install
npm run dev

# 后端
cd server
npm install
cp .env.example .env
npm start
```

---

## 教程索引

- [本地开发](guide/LOCAL_SETUP.md)
- [后台管理](guide/ADMIN.md)
- [权限体系](guide/PERMISSIONS.md)
- [内容系统](guide/CONTENT.md)
- [Lab 与离线](guide/LAB.md)
- [部署](guide/DEPLOYMENT.md)
- [腾讯云部署](guide/TENCENT_CLOUD.md)
- [Git 与发布](guide/GIT.md)
- [测试清单](guide/TESTING.md)
- [视觉系统](guide/DESIGN.md)
- [需求演进汇总](guide/REQUIREMENTS_HISTORY.md)

---

## 版本演进

| 版本 | 主题 |
| --- | --- |
| v0.1 | 初始主页与 slot 模块 |
| v0.2 | 可展开 slot 与动画 |
| v0.3 | 留言板、markdown/视频/照片内容块 |
| v0.4 | 日志驱动的 Lab 页面 |
| v0.5 | 管理后台、鉴权、模块权限、上传 |
| v0.6 | 论坛、角色权限、邮箱验证、MySQL-only |
| v0.7 | 标签、置顶、公告、通知、私信、审核 |
| v0.8 | 板块访问等级、关注、公开用户页、移动端 |
| v0.9 | 四主题视觉重制、好友、隐私整理 |
| v1.0 | 身份权限、论坛治理、审核平台、索引 |
| v1.0.x | 移动后台、删除审批、注册入口、图标与 SEO |
| v2.0.0 | 五页结构、Lab/Archive 双模式、3D 档案、统一侧栏 |
| v2.1.0 | 后台 ECharts、统一认证、3D 回复、离线缓存、消息铃铛 |
| v2.1.1 | 照片上传 Lab 稳定性热修复 |
| v2.2.0 | 社交发现、照片日期选择、导航自适应与文档体系 |
| v2.2.1 | EXIF 日期时区、社交入口与文档补丁 |

每个版本的详细本地日志位于 `logs/`（不提交 Git）。

---

## 隐私与安全

- `.env`、数据库、上传文件、个人资料备份不进入 Git；
- 只有公开资料、公开帖子和公开留言对访客可见；
- 访客发布留言使用一次性令牌；
- 管理操作与登录会话记录在数据库；
- 部署时请设置强密码、关闭开发验证码 `ALLOW_DEV_CODES=0`，并配置 HTTPS。

---

## 许可证

本项目原创代码用于个人站点与学习交流。第三方代码与素材遵循其各自许可证；尤其是 `lab-src/` 与 `public/rhine-lab/` 下的 RhineLabUI 资源，再分发时必须保留原作者署名与 MIT 许可文本。
