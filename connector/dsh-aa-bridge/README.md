> ⭐ 独立插件仓库：[lim12137/dsh-aa-bridge](https://github.com/lim12137/dsh-aa-bridge)（本目录与其保持同步，装插件建议直接用独立仓库）

# dsh-aa-bridge · 把 AA 的整个工具箱装进 DeepSeek Harness

[![dsh](https://img.shields.io/badge/DeepSeek-harness-4D6BFE)](https://www.npmjs.com/package/@deepseek-ai/dsh)
[![tools](https://img.shields.io/badge/tools-26%2B%20dynamic-2EA043)](https://github.com/lim12137/aa-bridge)
[![deps](https://img.shields.io/badge/npm%20deps-0-00B8A9)](#安装)
[![license](https://img.shields.io/badge/license-MIT-yellow)](#license)

一个 [DeepSeek Harness (dsh)](https://www.npmjs.com/package/@deepseek-ai/dsh) 插件：
启动时从 [aa-bridge](https://github.com/lim12137/aa-bridge) HTTP 桥拉取工具目录
（`GET /api/tools`），把 **AA(aardio autos 智能体) 的 26+ 个工具**动态注册成 harness
原生工具；调用经 `POST /api/tools/call` 转发，返回体原样透传。

装好后，你的 dsh agent 会多出这些本事：

```
aa_execute_code        执行任意 aardio 代码（含报错回传、aifix 修复建议）
aa_search_web          AA 的联网搜索
aa_write_memory 等     AA 的持久记忆四件套
aa_download_* / aa_github_*   下载与 GitHub 三件套
aa_capture_screenshot / aa_analyze_image   截图 + 视觉分析
aa_ide_*               驱动 aardio IDE（含「禁改 AA 源码」护栏）
aa_load_skill          加载技能包后工具集继续动态增加（browser/photoshop/excel/pdf/word…）
```

## 🩺 为什么需要它 —— AA 的四大痛点

AA 很能干，但它是个"单机聊天智能体"，想把它接出来用，个个都是坑
（源码级取证见 [aa-bridge/docs/PAIN-POINTS.md](https://github.com/lim12137/aa-bridge/blob/master/docs/PAIN-POINTS.md)）：

| 痛点 | 具体表现（AA v4.9.26 源码实测） | 本插件/桥如何解决 |
|---|---|---|
| **会话切换麻烦** | 单线聊天流，清空当前会话才能开新的；主记忆只在新建会话时加载（autos.aardio L1172）；忙时任务排队 | 工具调用是**无状态 HTTP**，dsh 的会话与 AA 的聊天流完全解耦，多 agent 并行互不抢占；AA 长期记忆依旧共享 |
| **长会话卡顿** | 聊天界面是 IE/Trident 内嵌渲染，DOM 只增不减；超长只能自动清理（L1205）——卡了就得清 | 用 aacli.exe（无界面桥）时 **AA 侧零渲染**；长文本在你的 dsh 终端里展示 |
| **订阅套餐绑定特定 agent** | AA 只吃裸 API key（web.rest.aiChat 手填配置）；GLM Coding Plan 等订阅额度 AA 用不上 | **模型与工具解耦**：订阅留在 dsh/agent 侧，工具从桥来——一份订阅两头的价值都拿到 |
| **本事接不出来** | AA 对外只有微信/飞书两条遥控道，本地零端口零 IPC | 桥 = HTTP + MCP 双协议、127.0.0.1 + token 鉴权；本插件即插即用，桥断了也不崩宿主 |

## 📦 前提：先让桥跑起来（本地构建 aacli.exe）

桥是工具的来源。两条路（**推荐 b，纯后台无界面**）：

**a) 带 AA 界面**：克隆 [aa-bridge](https://github.com/lim12137/aa-bridge) 仓库 →
用 [aardio IDE](https://www.aardio.com/) 打开 `connector/aa-patched-autos.aardio` → F5 运行 →
AA「设置」勾选「外部桥」。

**b) 本地构建 aacli.exe（无界面后台服务，推荐）**：

```text
1. git clone https://github.com/lim12137/aa-bridge.git
2. 用 aardio IDE 打开 connector/aacli/default.aproj
3. 「发布(F7)」→ 得到 connector/aacli/dist/aacli.exe（约 4MB，静态依赖已内嵌）
4. 补运行时动态库（只需一次）：
   powershell -NoProfile -ExecutionPolicy Bypass -File connector/aacli/setup-libs.ps1 ^
     -AardioLib "你的aardio安装目录\lib"
   （缺了这步工具请求会静默挂死——sessionHandler 等库不在内嵌范围）
5. 运行 aacli.exe → 托盘出现图标 → 验证：
   curl -H "X-AA-Token: <token>" http://127.0.0.1:9123/api/status
   token 在 %LOCALAPPDATA%\aardio\autos\aa-bridge.table（首次运行自动生成）
```

注意：与 IDE-F5 版 AA 互斥（同占 9123，先停一个）；停止用
`POST /api/shutdown` 或托盘右键退出；`--port 9124` 可换端口并存测试。

## 🔧 安装本插件

```sh
# 1) 建一个 dsh profile（首次从 web 模板初始化，已建过跳过）
dsh --profile aabridge --from-default-profile web -h

# 2) 插件 junction 进 profile（本仓库 node_modules/aa-client 已内置，无需另装依赖）
cmd /c mklink /J "C:\Users\<你>\.dsh\profiles\aabridge\node_modules\dsh-aa-bridge" "本仓库路径"

# 3) 编辑 profile 的 package.json：
#    dsh.profile.bundles 数组末尾加  "dsh-aa-bridge"

# 4) 重启 dsh，看日志：
#    [dsh-aa-bridge] registered 26/26 tool(s) from http://127.0.0.1:9123
```

## ⚙️ 配置（profile 行内 config 优先于环境变量）

| config | env | 默认 |
|---|---|---|
| baseUrl | `AA_BRIDGE_URL` | `http://127.0.0.1:9123` |
| token | `AA_BRIDGE_TOKEN` | 从 `%LOCALAPPDATA%\aardio\autos\aa-bridge.table` 自动发现 |
| tablePath | `AA_BRIDGE_TABLE` | 同上默认路径 |
| toolPrefix | `AA_BRIDGE_TOOL_PREFIX` | `aa_` |
| callTimeoutMs | `AA_BRIDGE_TIMEOUT_MS` | `120000` |
| bootTimeoutMs | `AA_BRIDGE_BOOT_TIMEOUT_MS` | `6000` |

工具命名：`aa_ + 桥工具名`（桥已带前缀不叠加：`aa_status` 仍是 `aa_status`，
`execute_code` 变 `aa_execute_code`），与 harness 内建工具命名空间隔离。

## 🧯 行为与坑

- **降级契约**：桥不可达（AA/aacli 没开、token 不对、超时）只打一行 warning，
  不注册任何工具，**绝不弄崩宿主启动**（最多多等一个 boot 预算周期）。
- 注册是启动时的一次性快照：运行中桥断开不影响已注册工具（调用报错），重启 dsh 恢复。
- 适配 dsh 0.1.5-rc.1（cordis 4.0.2）。最大坑：**`ctx.effect(fn)` 的 fn 是立即执行的动作**，
  disposer 必须用生成器让出形式 `ctx.effect(function*(){ yield disposer; })`——
  直接传 disposer = 注册即注销（探针实测）。给 harness 写插件的都建议读一遍源码注释。

## License

MIT
