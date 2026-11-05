# 测试清单

## 构建

```bash
npm run build
npm run lint
```

要求：构建通过，lint 0 错误。

## 前台页面

- `/` 主页：Hero、资料、项目、页脚；
- `/archive`：Lab / Archive 模式切换、二级导航仅档案库可见；
- `/forum`：普通用户登录后可见，访客隐藏/拦截；
- `/guestbook`：留言展示、发布、删除自己的留言；
- `/login`：登录、注册、忘记密码三态切换；
- `/u/:id`：公开资料、关注/取消关注；
- 桌面、390px 手机：无横向溢出，侧栏可展开/收起。

## 普通用户社交

- 在论坛帖子顶部点击作者头像或「资料」进入公开主页；
- 公开主页可关注/取消关注；
- 互相关注后消息页可发私信；
- 个人资料「关注」页有发现成员提示。

## 后台

用超级管理员逐个切换：

```text
overview
home-profile
articles / photos / videos / projects / logs
forum-announcements / forum-create / forum-public / forum-special / forum-core
review-access / review-posts
guestbook
members / identities
access-logs / themes / settings
```

检查：

- 无空白面板、无运行时错误；
- 概览 5 个 ECharts canvas 正常；
- KPI 按钮跳转正确；
- 照片日期来源可选 EXIF/手动；
- 权限树、成员封禁、密码重置；
- 主题创建/删除。

## 3D Lab

- 档案库五列，第一列为日志；
- 上传一张照片后重新进入 Lab 不白屏；
- 照片列显示新照片；
- 论坛帖子详情有回复页签；
- 3D 主题亮/暗独立于页面主题；
- 设备刷新率、FPS HUD（默认关闭）；
- 清除缓存后自动重新下载；
- 服务器部署后清除旧 `rhine-lab-3d-*` 缓存。

## 安全

- 访客不能发帖/关注；
- 无权限账号不能进入后台；
- 管理接口后端校验；
- 上传大小与类型限制；
- `.env`、上传、日志未进入 Git。
