# app\ 自包含运行时构建记录（v2.0）

发行目录 `dist\app\` 全部可由本机一条条命令复现（2026-09-11 实测）：

```sh
SRC="C:/<你的node目录>/node-v24.15.0-win-x64"      # 便携 node（单文件 node.exe + 自带 npm）
DST="<发行目录>/app"
mkdir -p "$DST/node" "$DST/home" "$DST/logs"

# 1) node.exe 单文件
cp "$SRC/node.exe" "$DST/node/node.exe"

# 2) npm（仅用于「升级 dsh」/装插件；node 直接跑 npm-cli.js，不需要 npm.cmd）
mkdir -p "$DST/node/npm-cli"
cp -r "$SRC/node_modules/npm/." "$DST/node/npm-cli/"
rm -rf "$DST/node/npm-cli/man"                     # 文档不随发行

# 3) dsh 本体 + 依赖
node.exe node/npm-cli/bin/npm-cli.js install --prefix "$DST/dsh" @deepseek-ai/dsh@0.1.5-rc.1 --no-fund --no-audit

# 4) 砍非 x64 平台二进制与 wasm 后备（-27MB；x64 Windows 运行不需要）
rm -rf "$DST/dsh/node_modules/node-pty/prebuilds/darwin-arm64" \
       "$DST/dsh/node_modules/node-pty/prebuilds/darwin-x64" \
       "$DST/dsh/node_modules/node-pty/prebuilds/linux-arm64" \
       "$DST/dsh/node_modules/node-pty/prebuilds/linux-x64" \
       "$DST/dsh/node_modules/node-pty/prebuilds/win32-arm64" \
       "$DST/dsh/node_modules/@img/sharp-wasm32"
```

体积：node+npm ≈ 102M，dsh+依赖 ≈ 250M（pruned 后）。

## 自包含原理

启动命令注入 `set "USERPROFILE=<app>\home" && set "HOME=<app>\home"`：
- node 的 `os.homedir()` 跟随 USERPROFILE → dsh 的 `~/.dsh`（profiles/sessions/settings）
  与 `~/.env` 全部落到发行目录 `app\home\`
- npm 缓存同样跟随 → 升级/装插件不写用户全局
- 「升级 dsh」= `node.exe npm-cli\bin\npm-cli.js install --prefix app\dsh @deepseek-ai/dsh@latest`

## 验证（2026-09-11）

- 7390 端口拉起：LISTENING + 日志出现带 token 地址 ✓
- `app\home\.dsh\profiles|storages` 自动生成（不碰用户全局 ~/.dsh）✓
- DshTray.exe v2.0 托盘启动，boot 日志 ✓
