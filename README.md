# 🐙 aa-bridge · AA 连接器

**把 [AA](https://aau.cn/)（aardio autos 全自主智能体）的整个工具箱，接入任意 agent。**

![built with aardio](https://img.shields.io/badge/AA-aardio%20autos-449BBE) ![tools](https://img.shields.io/badge/tools-26%20base%20%2B%20skills-2EA043) ![auth](https://img.shields.io/badge/auth-X--AA--Token-0969DA) ![surface](https://img.shields.io/badge/HTTP%20%2B%20MCP-127.0.0.1-0078D4) ![license](https://img.shields.io/badge/license-MIT-yellow)

> AA 是 aardio 生态里的全自主智能体，会写代码、会 OCR、会开 Excel/WPS/PDF、会控浏览器、
> 还有自己的持久记忆和技能包。**这个连接器把它的全部能力暴露成一套带鉴权的本机 API**——
> zcode、Claude、Cursor、你自己写的智能体……只要能发 HTTP 请求，就能指挥这头鲸鱼干活。

## 🧩 这是什么

一个打在 AA 源码副本上的补丁（约 300 行，零依赖纯 aardio 标准库），让 AA 进程内多出一个
**HTTP 服务**：

```
任意 agent ──HTTP(MCP 或 REST)──▶ AA 进程内桥 ──▶ AA 工具链
                                  127.0.0.1:9123      │
                                  X-AA-Token 鉴权      └─ execute_code（aardio 全家桶）
                                                       ├─ 技能包 browser/photoshop/excel/pdf/word/逆向…
                                                       ├─ 记忆四件套（与 AA 双向共享）
                                                       ├─ 截图 + 视觉分析
                                                       ├─ aardio 库文档/源码查询
                                                       ├─ 下载 / GitHub 三件套
                                                       └─ ide_* 五件套（带「禁改 AA 源码」护栏）
```

- **双协议**：`/mcp`（MCP streamable HTTP，2025-06-18 规范）+ `/api/*`（原生 REST）
- **零依赖**：只用 aardio 标准库；token 鉴权 + 仅绑 127.0.0.1
- **随时开关**：AA「设置」里的「外部桥」勾选框，秒级启停，持久化
- **安全护栏**：`ide_replace_code` 拒绝替换 AA 源码；`ide_*` 之外还屏蔽了微信/飞书发送等 13 个工具
- **不需要 AA 运行**：[`connector/aacli`](connector/aacli/) 把桥剥成无界面独立 exe，后台常驻，
  托盘一个小图标；26 个工具、记忆、技能包原样可用

## 😵 AA 老用户的痛，连接器一贴就灵

| 老大难（源码级取证 → [完整调研](docs/PAIN-POINTS.md)） | aa-bridge 之后 |
|---|---|
| **会话切换麻烦**：单线聊天流，清空当前会话才能开新的；主记忆只在新建会话时加载（autos.aardio L1172） | 每个 agent 独立会话**并行跑**，工具走无状态 HTTP，AA 聊天流零占用，长期记忆依旧全局共享 |
| **长会话卡顿**：聊天界面是 IE/Trident 内嵌渲染，DOM 只增不减，超长只能自动清理（L1205） | aacli.exe **纯后台进程零渲染**，工具调用纯 JSON，永远不卡 |
| **订阅套餐绑定特定 agent**：AA 只吃裸 API key，GLM Coding Plan 等套餐额度用不上；订了套餐的 zcode 又没有 AA 的工具 | **模型与工具解耦**：套餐留在 agent 侧，工具从桥来——zcode 长出 26+ 工具，订阅一点不浪费 |
| **本事接不出来**：对外只有微信/飞书两条遥控通道，本地零接口 | HTTP + MCP 双协议、四类客户端即插即用，aacli 连 AA 本体都不用跑 |

## ⚡ 三分钟接入

```text
1. 起服务（二选一，★推荐 aacli 纯后台）：
   a) ★ aacli：构建 connector/aacli（README 三步）→ aacli.exe 直接跑，
      无界面托盘常驻，连 IDE 都不用开，agent 随时拉起
   b) 带 AA 聊天界面：connector/aa-patched-autos.aardio 用 aardio IDE 打开 →
      F5 → 设置里勾「外部桥」
   （首次启动自动生成 token：%LocalAppData%\aardio\autos\aa-bridge.table；
     与 b 并存时 aacli 用 --port 换端口）
2. AA「设置」→ 勾选底部「外部桥」→ 绿色提示「外部桥已就绪」（仅 b 需要）
3a. zcode 用户：把 connector/aa-bridge 目录注册为本地插件/技能（SKILL.md 会教 agent 全部用法）
3b. dsh 用户：独立插件仓库 github.com/lim12137/dsh-aa-bridge（源码同步内置于 connector/dsh-aa-bridge）
3c. 其他 agent：直接 curl ——
       curl -H "X-AA-Token: <token>" http://127.0.0.1:9123/api/tools        # 看工具箱
       curl -H "X-AA-Token: <token>" -H "Content-Type: application/json" \
            http://127.0.0.1:9123/api/tools/call \
            -d '{"name":"execute_code","arguments":{"code":"return 1+1"}}'
```

工具总数是**动态的**：基础 26 个（40 原生 − 17 黑名单 + 3 元工具），
`load_skill` 加载技能包（browser / photoshop / excel / pdf / word / webSearch /
reverseSkill 逆向知识库 / skillCreator 等 13 个）后继续增加，运行时以 `GET /api/tools` 为准。

## 🎨 用它做的作品（showcase/）

### ① [WhaleTray · 鲸鱼托盘](showcase/dshtray/)（DshTray）

2.8 MB 的 aardio 托盘程序，管理 DeepSeek harness 网页服务。
**它的 v1.5 升级（dsh 0.1.5.x token 鉴权适配）就是由 AA 通过本连接器的能力自主完成的**：
加载 `aardioProjectBuilder` 技能包 → 修改 `main.aardio` → `loadcode` 编译检查 →
`pb.publishCurrent()` 一键发布 → 真机实测升级命令。全程无人工编码。
[进.showcase/dshtray 看它的故事 →](showcase/dshtray/README.md)

> 你的 aardio 工程也可以成为下一个 showcase。

## 📁 仓库结构

```
├─ connector/                     # 连接器全家桶（组件地图见 connector/README.md）
│  ├─ aa-patched-autos.aardio     # AA 副本（补丁版，F5 即用，带聊天界面）
│  ├─ aacli/                      # ★ 无界面桥服务（独立 exe，后台常驻，不需要 AA）
│  ├─ aa-runner/                  # 无头单发执行器（执行 aardio 代码 / 驱动 IDE）
│  ├─ aa-client/                  # 零依赖 ESM 客户端（Node ≥18）
│  ├─ aa-cli/                     # 命令行客户端（桥优先 / aa-runner 兜底）
│  ├─ dsh-aa-bridge/              # DeepSeek harness 插件（独立仓库：lim12137/dsh-aa-bridge）
│  ├─ aa-bridge/                  # zcode 插件（skills + commands + aa.ps1）
│  │  └─ aa-patch/                # 打好补丁的 AA 源码快照 + 补丁说明
│  └─ test/                       # api-curl.sh / mcp-curl.sh 验收脚本
└─ showcase/dshtray/              # 作品① WhaleTray（DshTray 鲸鱼托盘）
```

## 🔒 安全设计

- 只监听 `127.0.0.1`；所有端点要求 `X-AA-Token`（首次启动随机生成，持久化于 aa-bridge.table）
- 黑名单 17：微信/飞书发送（未配置）+ 普通文件/进程/HTTP 工具（agent 原生已覆盖）
- `ide_replace_code` 双重护栏：活动编辑器为 AA 源码（autos.aardio / lib\autos / aa-bridge）时拒绝；无活动编辑器也拒绝
- 关桥即全关：`POST /api/shutdown` 或 AA 设置取消勾选；重开必须本人在 AA 设置里操作

## 🙏 引用

- [AA（aardio autos）全自主智能体](https://aau.cn/) —— 被接入的那头鲸鱼
- [aardio 官网](https://www.aardio.com/) · [aardio 论坛](https://bbs.aardio.com/) —— 一切的基础
- [MCP 规范 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18) —— /mcp 端点遵循
- 作品① [WhaleTray](showcase/dshtray/) 管理的 [DeepSeek harness (dsh)](https://www.npmjs.com/package/@deepseek-ai/dsh)

## License

MIT
