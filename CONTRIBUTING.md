# 贡献指南 / Contributing

感谢关注 RHINE//HOME。本项目是个人站点，但仍欢迎问题反馈与范围明确的改进。

## 提交 Issue

请说明：

- 复现步骤、预期结果与实际结果；
- 浏览器、操作系统、Node 版本；
- 是否涉及 3D Lab、后台权限、上传或数据库；
- 相关截图或控制台错误（不要包含 Token、密码、`.env`）。

## 提交 Pull Request

1. 从 `main` 创建分支；
2. 保持改动聚焦，避免无关格式化；
3. 前端改动运行：

```bash
npm run build
npm run lint
```

4. 若修改 `lab-src`，同时重建并更新 `public/rhine-lab`；
5. 更新相关文档或 `VERSION_HISTORY.md`；
6. 确认没有提交 `.env`、上传文件、数据库导出的个人数据。

## 贡献许可

除非另有书面约定，提交到本仓库的原创代码贡献视为按根目录 [LICENSE](LICENSE) 的 MIT 许可证授权。

请勿提交：

- 未获授权的第三方模型、场景、音频、字体或美术素材；
- 真实用户隐私数据、访问日志或数据库快照；
- 删除原作者署名、LICENSE/NOTICE 的改动。

## 素材与同人声明

Arknights、Blue Archive 及相关名称、角色、设定与美术资源归原权利方所有。贡献者应确保自己有权提交相关素材；本项目不代为授予第三方权利。

## 行为规范

参与讨论与贡献即表示同意遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。
