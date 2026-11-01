# Git 常用操作指南（RHINE//HOME）

> 面向本项目（React + Node + MySQL）的日常 Git 使用手册。
> 命令以 Windows PowerShell / Git Bash 为例；带 `#` 的是注释。

---

## 0. 先确认环境

```bash
git --version
# 没有安装：https://git-scm.com/download/win
```

项目当前位置（迁移后）：

```text
F:\文档\GitHub\rhine-home
```

---

## 1. 首次配置（每台电脑一次）

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱@example.com"
git config --global init.defaultBranch main

# Windows 换行处理：提交时转 LF，检出时保留仓库原样
git config --global core.autocrlf input
```

查看配置：

```bash
git config --list --show-origin
```

### 连接 GitHub：SSH（推荐）

```bash
ssh-keygen -t ed25519 -C "你的邮箱@example.com"
# 一路回车；默认生成 C:\Users\你\.ssh\id_ed25519.pub

# 查看公钥并复制到 GitHub → Settings → SSH and GPG keys → New SSH key
cat ~/.ssh/id_ed25519.pub

# 测试
ssh -T git@github.com
# 看到 "Hi 用户名! You've successfully authenticated" 即成功
```

### 或者 HTTPS + Token

GitHub 已不支持账号密码推送，需要使用 **Personal Access Token**：

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens；
2. 勾选仓库读写权限；
3. 推送时用户名填 GitHub 用户名，密码填 token（可让 Git 凭据管理器记住）。

---

## 2. 仓库与远程

### 已有本地项目，第一次推到 GitHub

```bash
cd F:\文档\GitHub\rhine-home

git status                     # 确认是 Git 仓库
git remote -v                  # 看有没有 origin

# 在 GitHub 新建空仓库（不要勾选 README/.gitignore），然后：
git remote add origin git@github.com:你的用户名/rhine-home.git
# 已有 origin 则改地址：
# git remote set-url origin git@github.com:你的用户名/rhine-home.git

git branch -M main             # 统一主分支名
git push -u origin main
```

### 换电脑 / 新目录拉取

```bash
git clone git@github.com:你的用户名/rhine-home.git
cd rhine-home
npm install
cd server && npm install
```

> 数据库、`.env`、上传文件**不在仓库里**，需要单独准备（见第 9 节）。

---

## 3. 日常开发循环（最常用）

```bash
git pull --rebase               # 先同步远程，避免分叉
git status                      # 看改了哪些文件
git diff                        # 看具体改动
git add src/pages/ForumPage.tsx # 精确添加；不要无脑 git add .
git add -A                      # 确认没有敏感文件后再整体添加
git commit -m "feat: 论坛支持置顶"
git push
```

### 提交信息建议

```text
feat: 新功能
fix: 修复 bug
docs: 文档
style: 样式/格式
refactor: 重构
chore: 构建/依赖/杂项
```

例：

```bash
git commit -m "fix: 修复论坛标签导致的页面崩溃"
```

### 查看历史

```bash
git log --oneline --graph --decorate -20
git show <commit>
git log -p -- src/pages/ForumPage.tsx
```

---

## 4. 分支与合并

```bash
git switch -c feature/forum-tags   # 新建并切换
git switch main                    # 切回主分支
git branch                         # 本地分支
git branch -a                      # 含远程分支

# 功能完成后合并到 main
git switch main
git pull --rebase
git merge --no-ff feature/forum-tags
git push

# 删除分支
git branch -d feature/forum-tags
git push origin --delete feature/forum-tags
```

### 变基（让历史更直）

```bash
git switch feature/forum-tags
git rebase main
# 有冲突时按提示解决后：
git add <冲突文件>
git rebase --continue
# 放弃变基：
git rebase --abort
```

> 已经推送到远程、别人也在用的分支，不要随意 rebase。

---

## 5. 撤销与回退（最容易出错，先看再敲）

### 还没提交

```bash
git restore src/pages/ForumPage.tsx     # 丢弃工作区修改（不可恢复）
git restore --staged file.tsx           # 取消暂存，保留修改
git diff --staged                       # 看已暂存内容
git commit --amend                      # 修改上一条提交（尚未推送时）
```

### 已经提交、还没推送

```bash
git reset --soft HEAD~1    # 撤销提交，改动回到暂存区
git reset --mixed HEAD~1   # 撤销提交，改动回到工作区（默认）
git reset --hard HEAD~1    # 丢弃提交和改动（危险）
```

### 已经推送

```bash
git revert <commit>        # 生成一条“反向提交”，安全
git push
```

### 误删/误 reset 恢复

```bash
git reflog
# 找到之前的 commit，然后：
git reset --hard <commit>
```

---

## 6. 暂存现场（stash）

```bash
git stash push -m "临时保存"
git stash list
git stash pop              # 恢复并删除暂存
git stash apply            # 恢复但保留暂存
git stash drop             # 删除
```

适合：改到一半要切分支、临时拉取远程代码。

---

## 7. 解决冲突

1. `git pull --rebase` 或 `git merge` 提示冲突；
2. `git status` 查看 `both modified` 文件；
3. 打开文件，处理 `<<<<<<<`、`=======`、`>>>>>>>` 标记；
4. 保存后：

```bash
git add <文件>
git rebase --continue   # 如果是在 rebase
# 或
git commit              # 如果是在 merge
```

放弃这次合并/变基：

```bash
git merge --abort
git rebase --abort
```

---

## 8. 标签与发布

```bash
git tag -a v1.0.0 -m "首个稳定版"
git push origin v1.0.0
git tag                 # 查看
```

GitHub → Releases 可基于 tag 发布。

---

## 9. 本项目的 Git 工作流（重要）

### 不要提交的内容

`.gitignore` 已忽略：

```text
node_modules/
dist/
.env
server/node_modules/
server/data/
server/uploads/
```

- `.env` 含数据库密码、SMTP 授权码、管理员密码；
- `server/data`、`server/uploads` 是运行数据；
- 数据库内容不在 Git 里，重新部署不会因为 `git pull` 丢失（见 DEPLOY.md）。

### 推荐流程

```bash
# 本地开发
git pull --rebase
# 改代码 → 本地测试
npm run lint
npm run build
git add <按需>
git commit -m "feat: ..."
git push
```

服务器更新：

```bash
cd /srv/rhine-home
git pull --ff-only
npm ci
npm run build
cd server && npm ci --omit=dev
sudo systemctl restart rhine-home
sudo systemctl reload nginx
```

### 内容与代码分开

- 文章/日志 markdown、图片等可以进 Git（静态兜底内容）；
- 后台新增的文章、论坛帖子、用户、留言在 MySQL 中，**不随 Git 走**；
- 备份数据库和 `server/uploads`，不要依赖 Git 恢复这些数据。

### 提交前自查

```bash
git status
git diff --staged
# 确认没有 .env、数据库密码、上传的大文件
```

如果不小心提交了 `.env`：

```bash
git rm --cached .env
git commit -m "chore: remove env from git"
# 并立刻更换泄露的密码；历史里仍存在时可用 git filter-repo 清理
```

---

## 10. 常见问题

| 现象 | 原因 / 解决 |
| --- | --- |
| `rejected ... non-fast-forward` | 远程有新提交：`git pull --rebase` 后再 `git push` |
| `fatal: refusing to merge unrelated histories` | 两边历史无关：`git pull origin main --allow-unrelated-histories` |
| `Authentication failed` | HTTPS 用了密码；改用 token 或 SSH key |
| `Permission denied (publickey)` | SSH key 没加到 GitHub；`ssh -T git@github.com` 检查 |
| 提示 `LF will be replaced by CRLF` | Windows 换行提示，通常不影响；团队统一 `core.autocrlf input` |
| `detached HEAD` | 切到了某个提交而不是分支：`git switch main` 或新建分支 |
| `Your branch is ahead/behind` | 本地/远程不同步；`git pull --rebase` 或 `git push` |
| `Please commit your changes or stash them` | 有未提交修改阻止切换：commit 或 `git stash` |
| 大文件推送失败 | GitHub 单文件 100MB 限制；用 Git LFS 或不要提交视频/依赖 |
| 想撤销已推送的提交 | `git revert <commit>`，不要对公共分支 `reset --hard` |
| 分支太多 | `git branch -vv` 查看；合并后删除本地/远程分支 |

---

## 11. 命令速查表

| 目的 | 命令 |
| --- | --- |
| 看状态 | `git status` |
| 看改动 | `git diff` / `git diff --staged` |
| 添加 | `git add <file>` / `git add -A` |
| 提交 | `git commit -m "msg"` |
| 同步 | `git pull --rebase` |
| 推送 | `git push` |
| 历史 | `git log --oneline --graph` |
| 分支 | `git switch -c <name>` / `git switch main` |
| 合并 | `git merge --no-ff <branch>` |
| 变基 | `git rebase main` |
| 暂存 | `git stash` / `git stash pop` |
| 撤销工作区 | `git restore <file>` |
| 撤销暂存 | `git restore --staged <file>` |
| 撤销提交 | `git reset --soft HEAD~1` |
| 反做提交 | `git revert <commit>` |
| 找回误删 | `git reflog` |
| 远程 | `git remote -v` / `git remote set-url origin <url>` |
| 标签 | `git tag -a v1.0.0 -m "..."` / `git push origin v1.0.0` |

---

## 12. 本项目快捷命令

```bash
# 迁移后的项目目录
cd F:\文档\GitHub\rhine-home

# 开发
npm run dev
npm run lint
npm run build

# 后端
cd server
npm start
npm run import-legacy   # 从旧版 markdown / JSON 恢复内容

# 查看当前提交
git log --oneline -5
```

> 更完整的部署说明见 [DEPLOY.md](DEPLOY.md) 与 [TENCENT_DEPLOY.md](TENCENT_DEPLOY.md)。
