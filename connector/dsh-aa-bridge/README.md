# dsh-aa-bridge

[aa-bridge](../aa-client/)（aardio autos 智能体的 HTTP 桥，默认 `http://127.0.0.1:9123`）的 **DeepSeek Harness（dsh）连接器插件**：启动时从桥拉取工具目录（`GET /api/tools`），把每个桥工具动态注册为 harness 原生工具；调用经 `POST /api/tools/call` 转发，桥返回体（`{result, isError}`）原样透传。

适配 dsh 0.1.5-rc.1（profile bundle-patch 机制）。官方名称是 **DeepSeek harness**（不是 "DeepSeek CLI"）。

## 工作方式

- 插件是 cordis 插件：`export const name / inject / apply(ctx)`，经自带 `cordis.patch.yml` 以 bundle patch 层挂载（`- insert: [{id: aa-bridge, name: dsh-aa-bridge}]`）。
- `apply` 为 async 且 await 激活完成：loader fiber 等注册落地后才算启动完成，一次性 runner（`loader.await()`）等消费方能观察到稳定注册；目录拉取受 `AA_BRIDGE_BOOT_TIMEOUT_MS` 预算约束。桥不可达时只打一行 warning、不注册任何工具、**绝不弄崩宿主**（代价最多是启动多等一个预算周期）。
- 注册为一次性快照：启动时桥在线才注册；运行中桥断开不影响已注册工具（调用会报错），重启 dsh 后恢复。
- 工具互斥执行（未声明 `isConcurrencySafe`）——桥侧本就串行化 tools/call。

## 工具命名规则

`<前缀><桥工具名>`，前缀默认 `aa_`（`AA_BRIDGE_TOOL_PREFIX` 可改）：

- 桥工具名已带前缀则**不叠加**：`aa_status` 仍注册为 `aa_status`；
- 其余加前缀：`execute_code` → `aa_execute_code`。

目的：与 harness 内建工具（bash/read/edit…）命名空间隔离，避免撞名。description 一律用桥返回原文。

## 安装（junction 方式）

前提：桥的 token 文件在默认路径（`%LOCALAPPDATA%\aardio\autos\aa-bridge.table`），且 aa-client 已 junction 到本插件 `node_modules`（见下）。

```sh
# 1) 本插件的依赖 aa-client（Layer 0，零依赖 ESM 客户端）
#    （仓库内已做好则跳过）cmd 需要管理员或开发者模式时用 mklink 的 junction 无需特权：
cmd /c mklink /J "M:\Agent\DshTray\connector\dsh-aa-bridge\node_modules\aa-client" "M:\Agent\DshTray\connector\aa-client"

# 2) 建测试 profile（首次会从 web 模板初始化；已建过跳过）
dsh --profile aabtest --from-default-profile web -h

# 3) 插件装入 profile（junction + 声明依赖 + 加入 bundles）
cmd /c mklink /J "C:\Users\hopemyl\.dsh\profiles\aabtest\node_modules\dsh-aa-bridge" "M:\Agent\DshTray\connector\dsh-aa-bridge"

# 4) 编辑 C:\Users\hopemyl\.dsh\profiles\aabtest\package.json：
#    dependencies 加  "dsh-aa-bridge": "file:M:/Agent/DshTray/connector/dsh-aa-bridge"
#    dsh.profile.bundles 数组末尾加  "dsh-aa-bridge"
#    （也可用官方通道：dsh plugin --profile aabtest add M:/Agent/DshTray/connector/dsh-aa-bridge，
#      它转发 pnpm 并自动 reconcile bundles 列表）

# 5) 启动（端口自选，勿与他人实例冲突）
dsh --profile aabtest --port 7399 --no-open
# 启动日志出现：
#   [dsh-aa-bridge] registered N/M tool(s) from http://127.0.0.1:9123: aa_status, ...
# 桥不可达时则是：
#   [dsh-aa-bridge] AA bridge unreachable, no tools registered (...)
```

卸载：删 junction 与 bundles 里的 `dsh-aa-bridge` 一行即可。

## 配置

优先级：loader 行 config > 环境变量 > 内置默认。**变量名不要用 `DSH_` 前缀**（harness 启动守卫会拒绝启动期 .env 里的 `DSH_*` 变量）。

| 环境变量 | 默认 | 说明 |
| --- | --- | --- |
| `AA_BRIDGE_URL` | `http://127.0.0.1:9123` | 桥根地址 |
| `AA_BRIDGE_TOKEN` | 从 table 文件发现 | 显式 token（`X-AA-Token` 头） |
| `AA_BRIDGE_TABLE` | `%LOCALAPPDATA%\aardio\autos\aa-bridge.table` | token 发现文件（正则 `token\s*=\s*"([^"]+)"`） |
| `AA_BRIDGE_TOOL_PREFIX` | `aa_` | 工具名前缀 |
| `AA_BRIDGE_TIMEOUT_MS` | `120000` | 单次桥请求超时（也是工具 deadline 基数 +5s 余量） |
| `AA_BRIDGE_BOOT_TIMEOUT_MS` | `6000` | 启动时拉工具目录的预算，超时视为桥不可达（降级不注册） |

## 已知边界

- token 错 → 桥 401；桥关（enabled=false）→ 403；AA 不在线 → 连接拒绝。三者都走降级路径（warning，不注册）。
- `exec.signal` 不透传到桥（aa-client 未支持 signal），取消靠工具 deadline 兜底。
- 注册的是启动时刻的工具目录快照；AA 侧 load_skill 动态增删工具需重启 dsh 生效。
- 桥侧自带黑名单（如 weixin_send_message）；本插件不再二次过滤，策略点在桥。

## 坑清单（实测实录，dsh 0.1.5-rc.1 / cordis 4.0.2）

- **`ctx.effect(fn, label)` 的 fn 是"立即执行的动作"，其返回值/生成器产出才是清理器**。参考插件式写法 `ctx.effect(disposer, label)` 会把 disposer **当场执行** = 注册即注销：注册计数正常、无任何报错，但模型的工具表里没有你的工具（探针实测：register 后 schemas 26，ctx.effect 后立刻掉回 25）。正确写法是生成器让出：`ctx.effect(function* () { yield disposer; }, label)`。
- **异步注册必须 await**：apply 若同步返回、后台注册，一次性 runner（headless）的 `loader.await()` 等不到注册完成，与首次工具组装竞态。apply 写成 async 并 await 激活（预算受 `AA_BRIDGE_BOOT_TIMEOUT_MS` 约束）即可——loader fiber 会等 apply 的 promise。
- bundle 的 `cordis.patch.yml` 只能 insert 没有任何更早层创建过的 id，重复插入会让整个 profile 启动崩溃（`duplicate loader entry id: ...`）。
- 裸导入（如 `aa-client`）必须能从插件**真实路径**的 node_modules 解析：宿主经 junction 装入时 Node 按 realpath 解析，junction 进 profile node_modules 不等于宿主隐式依赖可用。

## License

MIT
