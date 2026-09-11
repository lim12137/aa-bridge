# 🔌 connector · aa-bridge 连接器全家桶

把 AA（aardio autos 智能体）的工具箱接入任意 agent 的全套连接件。
五个组件，按需取用，互相独立又共享同一套鉴权（X-AA-Token，自动从
`%LOCALAPPDATA%\aardio\autos\aa-bridge.table` 读取）。

```
                        ┌─────────────────────────────────────────┐
                        │  工具来源（三选一，共享配置与 token）      │
                        │                                         │
                        │  ① AA + 桥补丁    IDE-F5 运行，带聊天界面 │
                        │  ② aacli.exe      无界面后台进程 ★推荐    │
                        │  ③ aa-runner.exe  单发执行器（无服务）    │
                        └───────────────┬─────────────────────────┘
                                        │ HTTP :9123（X-AA-Token）
                 ┌──────────┬───────────┼────────────┬─────────────┐
                 ▼          ▼           ▼            ▼             ▼
            aa-cli        zcode      dsh-aa-bridge  curl/脚本   你自己的 agent
          (命令行客户端)  (插件)   (DeepSeek harness 插件)
```

## 组件一览

| 组件 | 目录 | 一句话 | 运行要求 |
|---|---|---|---|
| **aacli** | [`aacli/`](aacli/) | 无界面 AA 桥服务，独立 exe 后台常驻（托盘图标） | 编译需 aardio IDE；运行**不需要** |
| **aa-runner** | [`aa-runner/`](aa-runner/) | 无头单发执行器：执行 aardio 代码 / 驱动 IDE，stdout 单行 JSON | 同上 |
| **aa-client** | [`aa-client/`](aa-client/) | 零依赖 ESM 客户端（status/tools/call/health，自动发现 token） | Node ≥18 |
| **aa-cli** | [`aa-cli/`](aa-cli/) | 命令行：`status / tools / call / run`，桥优先、aa-runner 兜底 | Node ≥18 |
| **dsh-aa-bridge** | [`dsh-aa-bridge/`](dsh-aa-bridge/) | DeepSeek harness 插件：动态注册桥工具为 harness 工具 | dsh 0.1.5+ |
| **aa-bridge** | [`aa-bridge/`](aa-bridge/) | zcode 插件（skills + 命令 + ps1 客户端） | zcode |
| AA 桥补丁 | [`aa-patched-autos.aardio`](aa-patched-autos.aardio) | 打在 AA 源码副本上的桥补丁（4 个 PATCH 标记） | aardio IDE |

## 60 秒上手

```bash
# 1. 起服务（二选一）
#    a) 有 AA：IDE 打开 aa-patched-autos.aardio 按 F5，设置里勾「外部桥」
#    b) 无 AA：构建 aacli.exe（见 aacli/README.md）后直接运行，后台常驻

# 2. 命令行验证
node aa-cli/aa.mjs status
node aa-cli/aa.mjs run --code "return 40+2"      # → 42

# 3. 接入你的 agent
#    zcode：安装 aa-bridge 插件
#    dsh：  dsh plugin --profile <名> add connector/dsh-aa-bridge
#    其它：  POST http://127.0.0.1:9123/api/tools/call  { "name": "...", "arguments": {} }
#           或 POST /mcp（MCP Streamable HTTP 2025-06-18）
```

## 工具面（26 基础 + 技能包动态增加）

execute_code（aardio 全家桶，报错回传）、search_web、ide_* 五件套（含「禁改 AA 源码」护栏）、
write/read/list/switch_memory、download_file/7z/zip、github_lookup/get_zip_url/get_content、
capture_screenshot、analyze_image、load_skill（加载后工具集动态变化）、aa_status 等元工具。

微信/飞书/普通文件/进程工具已在桥内屏蔽（zcode 等宿主原生能力已覆盖，仅保留下载与 GitHub 两套）。

## 验证矩阵（2026-09-11 全部实测）

- aa-runner：exec / stdin / 编译错误 / ide get_code / 护栏拒绝 — 5/5 ✅
- aa-cli：status / run(桥) / run(降级 aa-runner) / tools — 全过 ✅
- aa-client：单测 5/5 ✅
- aacli.exe：status / tools / execute_code / MCP initialize / shutdown 优雅退出 / 无窗体+托盘 — 全过 ✅
- dsh-aa-bridge：26/26 注册、headless agent 真调 aa_status、降级不崩宿主 — 全过 ✅

踩坑记录见 [`research/已测不可用清单.md`](../../aa-bridge/research/已测不可用清单.md)（工作区副本）。
