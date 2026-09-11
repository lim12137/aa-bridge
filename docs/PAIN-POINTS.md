# AA 老用户的四大痛点 · 调研与解法

> 本文基于 AA(aardio autos) v4.9.26 源码副本与本机运行时数据的实测取证（引用处标注源码行号），
> 说明 aa-bridge 连接器如何逐一化解。2026-09-11。

## 痛点一：会话切换麻烦（多任务互扰）

**现状取证**

- AA 的对话是**一条单线聊天流**：`config.chatMessages = chatUi.chatMessages`（autos.aardio L299/L855/L1375/L1404），
  整个进程只有这一份会话上下文，存于 agent.table。
- 主记忆的加载时机绑死在会话生命周期上——系统提示词原话：
  「**写入主记忆不会影响当前上下文，只有用户清除当前会话并创建新会话时才会加载新的主记忆**」（L1172）。
  想让新写入的记忆生效？先手动清空当前会话。
- 忙时排队体验：AA 忙碌期间新消息走 `thread.set` 排队，完成后统一回一句"在吗？我已经忙完了！"。

**连接器之后**

- aacli（无头桥）**没有聊天流**这回事：工具调用是无状态 HTTP 请求，zcode 一个会话、dsh 一个会话、
  你自己的脚本一个会话，**多 agent 并行各聊各的**，互不抢占。
- 切换任务 = 切换终端窗口；AA 的记忆四件套（write/read/list/switch_memory）依旧全局共享，
  长期知识不随会话丢失。

## 痛点二：长会话卡顿

**现状取证**

- 聊天界面 = `web.form.chat` → `web.form`（**IE/Trident 内嵌浏览器渲染**）+ simpleMarkdown
  （lib\web\form\chat.aardio L2-3）。每条消息往同一个 HTML 页面里追加，DOM 只增不减。
- 超长对话的官方出路是"自动清理"——源码注释原话：
  「超长而自动清理时最多保留头部 2 个系统提示词」（L1205）。也就是说：**卡了，就只能清**。

**连接器之后**

- aacli.exe 是**纯后台进程，零渲染**：没有 IE、没有 DOM、没有卡顿。
- 工具调用走纯 HTTP JSON，长文本在 agent 侧（zcode/dsh/你的终端）渲染展示，
  AA 进程只当"无感觉的工具人"。

## 痛点三：订阅套餐绑定特定 agent（工具与模型互相够不着）

**现状取证**

- AA 的模型接入 = 设置里手填 **baseUrl + API key**（web.rest.aiChat 多配置列表），
  只能消费"裸 API"。
- 而主流订阅制套餐（智谱 GLM Coding Plan、Claude Pro/Max 等）**身份绑定在特定 agent 客户端上**，
  不给裸 key —— AA 吃不到套餐额度；**反过来**，订了套餐的 agent（例如 zcode）又没有 AA 的
  工具链（execute_code / 记忆 / 技能包 / 下载与 GitHub 三件套）。
- 结果：**订阅在左手浪费，本事在右手闲置**。

**连接器之后**

- 桥把「模型」与「工具」彻底解耦：订阅留在 agent 侧（zcode 照常用 GLM 套餐），
  工具经 HTTP/MCP 从 AA 来。zcode 长 26+ 工具，AA 的额度焦虑消失。
- 哪天想把 AA 换成别的 agent（Claude Code、Cursor…），工具箱原样搬家——这就是"连接器"三个字的分量。

## 痛点四：想把 AA 的本事接出来，没有正经接口

**现状取证**

- AA 的对外通道只有微信机器人、飞书机器人两条（都要扫码/配置，且是"遥控 AA 聊天"而非"调用工具"）；
  本地无任何端口/IPC 入口（netstat + 源码双确认）。

**连接器之后**

- HTTP（/api/*）+ MCP（/mcp，2025-06-18）双协议，127.0.0.1 + X-AA-Token 鉴权；
- 四类客户端即插即用：zcode 插件、DeepSeek harness 插件（dsh-aa-bridge）、aa-cli 命令行、裸 curl；
- aacli.exe 甚至不需要 AA 本体运行——工具箱脱离聊天进程独立常驻（托盘图标，右键退出）。

---

## 验证背书

以上解法全部实测：26 工具在三种宿主（zcode 插件 / dsh 插件 / aa-cli）注册与调用通过，
aacli.exe 完整验证矩阵见 [connector/README.md](../connector/README.md)。
