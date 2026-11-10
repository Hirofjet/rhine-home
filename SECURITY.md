# 安全策略 / Security Policy

## 支持版本

当前维护版本：`2.5.x`。旧版本不保证安全更新。

## 报告安全问题

请优先使用 GitHub 的私密漏洞报告功能：

https://github.com/Hirofjet/rhine-home/security/advisories/new

如果该入口不可用，请通过仓库 Issues 联系维护者，并只提供最少必要的复现信息，不要在公开 Issue 中粘贴：

- 真实用户密码、Cookie、Token 或会话；
- 数据库连接、SMTP 授权码、`.env` 内容；
- 未公开的个人资料、上传文件或访问日志；
- 可直接利用的完整攻击链细节。

## 范围

重点关注：

- 鉴权、会话、权限提升；
- 上传文件类型/路径穿越；
- SQL 注入、XSS、CSRF；
- 越权读取论坛、成员、访问日志；
- 3D iframe 与 postMessage 来源校验；
- 依赖供应链与构建脚本。

## 处理原则

- 先确认影响范围与可复现性；
- 修复前不公开细节；
- 修复后更新 `VERSION_HISTORY.md` 与安全说明；
- 不要求报告者提供真实用户数据。

## 安全部署

- 生产环境设置 `ALLOW_DEV_CODES=0`；
- 使用强密码与独立数据库账号；
- 配置 HTTPS；
- 定期备份数据库与上传目录；
- 不提交 `.env`、`server/uploads`、`server/data`。
