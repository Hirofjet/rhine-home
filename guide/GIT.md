# Git 与发布

## 分支与标签

- 主分支：`main`；
- 版本标签：`vX.Y.Z`；
- 当前发布：`v2.1.1`；
- 标签使用 annotated tag。

## 日常提交

```bash
git status
git add -A
git commit -m "feat: 说明"
git push origin main
```

## 发布新版本

1. 更新 `package.json` 与 `package-lock.json` 的版本；
2. 更新 `VERSION_HISTORY.md`；
3. 构建与测试：

```bash
npm run build
npm run lint
```

4. 提交并打标签：

```bash
git add -A
git commit -m "release: vX.Y.Z - 说明"
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin main
git push origin vX.Y.Z
```

也可以使用：

```bash
npm run release -- "release: vX.Y.Z - 说明"
```

发布脚本会提交、打 tag、推送，并把版本号 bump 到下一个补丁版；执行前确认版本号。

## 不进入 Git 的内容

- `.env`；
- `node_modules`、`dist`；
- `server/uploads`、`server/data`；
- `logs/`；
- 个人资料备份、临时测试文件。

## 覆盖项目前

```bash
git status
git diff --stat
```

确认没有未提交的运行数据；正式项目覆盖后重新安装依赖并构建。

## 回滚

```bash
git checkout <commit>
# 或
git revert <commit>
```

数据库升级后回滚代码前先备份数据库。
