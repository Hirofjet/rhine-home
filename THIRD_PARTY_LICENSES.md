# 第三方许可清单 / Third-Party Licenses

本文件列出项目直接使用的主要第三方组件与素材。完整依赖树以 lockfile 为准；关键许可证全文位于 [`licenses/`](licenses/)。

## 前端依赖

| 组件 | 版本 | 许可 | 用途 | 上游 |
| --- | --- | --- | --- | --- |
| React / React DOM | 19.x | MIT | UI 运行时 | https://react.dev |
| Vite | 8.x | MIT | 构建与开发服务器 | https://vite.dev |
| TypeScript | 5.x | Apache-2.0 | 类型系统与编译 | https://www.typescriptlang.org |
| Tailwind CSS | 4.x | MIT | 样式工具 | https://tailwindcss.com |
| Framer Motion | 14.x | MIT | 动效 | https://www.framer.com/motion |
| React Router | 7.x | MIT | 路由 | https://reactrouter.com |
| React Markdown | 10.x | MIT | Markdown 渲染 | https://github.com/remarkjs/react-markdown |
| remark-gfm | 4.x | MIT | GFM 扩展 | https://github.com/remarkjs/remark-gfm |
| ECharts | 6.x | Apache-2.0 | 后台图表 | https://echarts.apache.org |
| exifr | 7.x | MIT | EXIF 日期读取 | https://github.com/MikeKovarik/exifr |
| Lucide | 1.x | ISC | 图标 | https://lucide.dev |
| marked | 18.x | MIT | 3D 档案 Markdown | https://marked.js.org |
| DOMPurify | 3.x | MPL-2.0 OR Apache-2.0 | HTML 安全清理 | https://github.com/cure53/DOMPurify |
| Three.js | 0.183.x | MIT | 3D 渲染 | https://threejs.org |

## 字体

| 字体 | 许可 | 说明 |
| --- | --- | --- |
| MiSans | 小米字体许可 | 许可 PDF：`licenses/MiSans-LICENSE.pdf` |
| Orbitron | SIL OFL 1.1 | Fontsource 包 |
| Rajdhani | SIL OFL 1.1 | Fontsource 包 |
| Share Tech Mono | SIL OFL 1.1 | Fontsource 包 |

## 后端依赖

| 组件 | 版本 | 许可 | 用途 |
| --- | --- | --- | --- |
| Express | 5.x | MIT | HTTP 服务 |
| MySQL2 | 3.x | MIT | 数据库驱动 |
| Nodemailer | 7.x | MIT | SMTP 邮件 |
| Multer | 2.x | MIT | 上传处理 |
| cors | 2.x | MIT | CORS |
| compression | 1.x | MIT | 响应压缩 |

## 3D Lab 与素材

| 素材 | 权利人 | 许可 / 状态 |
| --- | --- | --- |
| RhineLabUI 场景、模型、动画、环境音 | LBEILC | MIT，见 `licenses/RhineLabUI-MIT.txt` |
| PR #15 性能优化参考 | PacificSauryMan / OpenAI Codex | 随上游仓库，保留署名 |
| Blue Archive 光标、图标与参考素材 | 原权利方 | 仅个人非商业展示，不适用 MIT |
| Arknights / Blue Archive 名称与设定 | 原权利方 | 仅作为个人同人展示，不主张权利 |

## 合规要求

1. 再分发时必须保留 `LICENSE`、`NOTICE`、`COPYRIGHT.md`、`THIRD_PARTY_LICENSES.md` 与 `licenses/`。
2. 不得移除第三方文件中的版权声明与许可证文本。
3. 不得将第三方模型、场景、音频、字体或美术资源宣称为原创。
4. 若修改 Lab 场景或模型，应保留原 MIT 声明并说明修改内容。
5. 商业使用前需单独确认所有第三方素材的授权；本项目不代为授予第三方权利。
6. 如权利人认为某项素材使用不当，请通过仓库 Issues 联系移除或替换。

## 完整文本

- [MIT](licenses/MIT.txt)
- [Apache-2.0](licenses/Apache-2.0.txt)
- [MPL-2.0](licenses/MPL-2.0.txt)
- [ISC](licenses/ISC.txt)
- [OFL-1.1](licenses/OFL-1.1.txt)
- [RhineLabUI MIT](licenses/RhineLabUI-MIT.txt)
- [MiSans 字体许可](licenses/MiSans-LICENSE.pdf)
- [marked MIT](licenses/marked-MIT.txt)
