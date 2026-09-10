# aa-patch：AA 副本补丁说明

本目录的 `autos.patched.aardio` 是打好 aa-bridge 补丁的 AA 入口副本（基于
`examples\AI\autos.aardio` v4.9.26，2026-09-09 版本，MD5 源 22260e4f...）。

## 补丁内容（4 处，约 333 行）

| # | 位置 | 作用 |
|---|---|---|
| 1 | 第 2 行后 | 读/建 `%LocalAppData%\aardio\autos\aa-bridge.table`（enabled + token）；开桥时窗口标题加 `[MCP:9123]` |
| 2 | btnSetting.oncommand 内 | 设置窗动态注入「外部桥」复选框（保存按钮左侧），点击即启停并持久化 |
| 3 | onDestroy 首行 | 退出 AA 时停止 HTTP 服务 |
| 4 | win.loopMessage() 前 | 内嵌 HTTP 桥：`/api/*`（status/tools/tools/call/reply/stop/shutdown）+ `/mcp`（MCP streamable HTTP 2025-06-18），全端点 X-AA-Token 门禁，只绑 127.0.0.1 |

## 运行方式

aardio IDE 打开本副本 → F5。桥的开关在 AA「设置」窗口底部「外部桥」复选框；
也可 `POST /api/shutdown` 远程关闭（持久化）。重开必须本人在设置里勾选。

## 安全

- 只监听 127.0.0.1；所有端点要求 `X-AA-Token` 头（token 首次运行自动生成并写入 aa-bridge.table，跨重启持久）。
- 对外基础工具 **26 = 40 原生 − 17 黑名单（机器人 4：微信/飞书；普通 13：文件 9/进程 3/http_get，zcode 原生已覆盖）+ 3 个 aa_* 元工具**，load_skill 加载技能包后动态增加（早期 35/39/42 均为历史时点值）。aa_send_prompt 与 `/api/prompt` 已按用户要求移除（2026-09-10）——zcode 直接调工具，不向 AA 会话注入消息。2026-09-10 起 `ide_*` 5 个工具按用户拍板放开：只读类全放，ide_replace_code 带「禁止修改 AA 源码」护栏（编辑器父窗口链标题命中 autos.aardio / lib\autos / aa-bridge 即拒绝）；微信/飞书 4 个发送工具仍黑名单，`/api/tools` 与 MCP tools/list 均不暴露。
- I: 盘（aardio 安装目录）零改动；运行数据与原版 AA 共享 `%LocalAppData%\aardio\autos\`（Tier1，勿同时运行两实例）。

## 接口行为注意

- `GET` 未路由的 `/api/*` 路径返回 **405**（而非 404）——apiHandle 先判方法再判路由，属设计行为，测试断言按 405 写。
- `POST /api/*` 必须带 **`Content-Type: application/json`** 请求头，否则服务端（simpleHttpServer）识别不到 JSON body，回 400 "Invalid JSON body"。

## 验收

AA 副本开桥后：
```bash
bash /l/121/aa-bridge/test/api-curl.sh   # API 七步
bash /l/121/aa-bridge/test/mcp-curl.sh   # MCP 协议五步
```
