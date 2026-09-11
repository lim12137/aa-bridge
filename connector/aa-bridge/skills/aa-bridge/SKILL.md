---
name: aa-bridge
description: 使用 AA(aardio autos) 的工具箱干活：zcode 当大脑，经本机 HTTP API 直接调用 AA 桥的基础 26 个工具（40 原生 − 17 黑名单【机器人 4 + 普通 13】+ 3 元工具；load_skill 加载技能包后动态增加，运行时以 GET /api/tools 实时为准）——用 execute_code 跑 aardio 代码借 .NET/COM/Office/OCR/WebView2/桌面自动化全家桶、load_skill 加载 AA 技能包（browser/photoshop/excel/word/pdf/webSearch 等）、capture_screenshot/analyze_image 截屏与视觉分析、读写与 AA 共享的长期记忆（read_memory/write_memory/switch_memory/list_memory）、get_library_source/lookup_library_reference 查 aardio 库源码与文档、ide_* 直接操控 AA IDE 编辑器缓冲、search_web 联网搜索备胎通道、以及在 AA 环境做下载/GitHub 操作。当用户提到 AA、aardio autos、AA 工作区/AA 记忆、aardio 代码执行，或上述场景需要借用 AA 工具箱时使用。
---

# AA 工具箱操作手册（zcode 是大脑，AA 是工具箱）

## 定位

你（zcode/GLM 智能体）是大脑：负责理解意图、规划步骤、解读结果。
AA(aardio autos 全自主智能体) 是你的工具箱：它的基础 26 个工具（40 原生 − 17 黑名单【机器人 4 + 普通 13】+
3 元工具；load_skill 加载技能包后动态增加，运行时以 `GET /api/tools` 实时数据为准）通过本机 HTTP API 直接暴露给你，
**由你决定调哪个工具、传什么参数、怎么串步骤**——不是"让 AA 干活"，而是"你拿 AA 的工具干活"。
`POST /api/tools/call` 直调工具是唯一调用方式：要做什么，直接调用对应工具，多步编排由你完成。

工具分两档：

- **Tier 1 特色工具**（17 个）：zcode 没有的能力（aardio 全家桶、技能包、视觉、共享记忆、库文档、IDE 编辑器操控、搜索备胎），本文重点，逐个写清「什么时候用 + 怎么用 + 规约」。
- **Tier 2 普通工具**（保留 6 个）：下载/GitHub 操作（保留原因：AA 下载通道与 GitHub 工具仍有价值），仅在需要 AA 环境上下文时使用；其余 13 个普通工具已入黑名单（见 Tier 2 章节）。

## 桥接基本信息

- 桥地址：`http://127.0.0.1:9123`（AA 副本内置 HTTP 服务）
- 所有请求必须带 `X-AA-Token` 头
- token/开关存于 `%LocalAppData%\aardio\autos\aa-bridge.table`（文本文件，形如 `enabled=true;token="aa..."`）

读 token（Git Bash）：

```bash
TABLE="$LOCALAPPDATA/aardio/autos/aa-bridge.table"
TOKEN=$(grep -o 'token *= *"[^"]*"' "$TABLE" | sed 's/.*"\(.*\)"/\1/')
```

或直接用同目录 `scripts/aa.ps1`（自动读 token，见文末速查）。

## 核心工作循环（照此操作）

1. **探桥**：`GET /api/status` —— 确认桥活着（`bridge:true`）、看忙闲/PID/标题。
2. **拉工具**：`GET /api/tools` —— 按需获取工具清单（基础 26 个，load_skill 后动态增加）的 name/description/inputSchema。
   **勿死记参数**：inputSchema 是唯一权威，调用前先查（尤其 required 字段）。
   （注：文档按基础 26 写；AA 加载最新版桥之前，运行实例可能报 35/39 等旧数，以实时返回为准。）
3. **串行调用**：`POST /api/tools/call`，body `{"name":"...","arguments":{...}}`，一次只发一个。
4. **处理返回**：信封为 `{"result":...,"isError":bool}`；`isError:true` 时读 result 里的错误信息、
   修参数重试；收到 `"another tools/call is running"` 是串行化冲突（见下），稍等 1~2 秒原样重发。
5. **给足超时**：search_web / download_* / execute_code / load_skill 等长工具可能跑几十秒，
   curl 加 `--max-time 600`；aa.ps1 默认 600 秒。

调用示例：

```bash
curl -s --max-time 600 -H "X-AA-Token: $TOKEN" -H "Content-Type: application/json" \
     -d '{"name":"execute_code","arguments":{"code":"import win.clip; return win.clip.read()"}}' \
     http://127.0.0.1:9123/api/tools/call
```

## 调用约定（HTTP 层硬规约）

- **Content-Type 必带**：所有 POST 必须 `-H "Content-Type: application/json"`，
  否则服务端收不到 body → 400 "Invalid JSON body"（simpleHttpServer 靠它识别 JSON）。
- **串行化**：同一时刻只允许一个 tools/call；并发第二个返回
  `{"result":"another tools/call is running","isError":true}`（软串行化）。
  → 调用方必须串行调用；收到该错不是致命错误，稍等重试即可。
- **路径一律正斜杠**：arguments 里的 Windows 路径必须写 `L:/121/aa-bridge` 形式。
  反斜杠会被 JSON 转义 + aardio 转义吃两层（实测 `L:\121` 变成 `L:y` + BEL 控制符，报"目录不存在"）。
- **长任务超时**：见工作循环第 5 步；curl 加 `--max-time`，aa.ps1 用 `-TimeoutSec`。

### 没有消息注入通道（aa_send_prompt 已拆除）

aa_send_prompt 与 /api/prompt 已于 2026-09-10 按用户要求从桥上拆除。
不要试图把任务「投递给 AA 自主跑」——多步任务的规划与编排由你（zcode）逐个 `tools/call` 完成。

---

# Tier 1 特色工具（重点：zcode 没有的能力）

## 1. execute_code —— aardio 全家桶网关（最核心借力点）

**什么时候用**：凡是 zcode 原生做不到、但 Windows/aardio 生态能做到的事，都走这一个工具——

| 借力点 | aardio 里的路子 |
|---|---|
| OCR 文字识别 | 标准库 `dotNet.ocr`（或工具 analyze_image + useDotNetOcr） |
| Excel/WPS 表格 | `com.excel`（兼容 WPS） |
| Word/WPS 文档 | 标准库 `com.doc`（兼容 WPS） |
| PPT | COM `TryGetObject('PowerPoint.Application','WPP.Application')` |
| PDF 读写渲染 | `fsys.pdfium`；HTML→PDF 用 `web.view + cdp('Page.printToPDF')`；MD→HTML 用 `string.markdown`（C 组件，极快） |
| 内嵌浏览器/网页自动化 | `web.view`（WebView2）：`preloadScript` 注入 JS、`cdp` 系列方法、`waitEle/waitEle2` 等元素等待；`web.view.shared()` 创建跨调用持久驻留的共享浏览器 |
| 桌面/窗口自动化 | `winex`（控制外部窗口）、`key`（模拟键盘）、`mouse`（模拟鼠标）；后台点击 `winex.mouse.click(hwnd,x,y)`、`winex.key.click(hwnd,'SPACE')` |
| 调用其他语言 | `nodeJs`（现代 JS）、`py3`（Python）、`tcc`（编译 C 生成 DLL）、`dotNet.createCompiler('C#')`（最高 C# 4.0/5.0 语法）、`web.script`（JScript/VBScript） |
| 调 HTTP API | `web.rest.jsonClient` / `web.rest.jsonLiteClient`（无需专门 SDK） |
| 剪贴板/系统信息/安全删除 | `win.clip`、`win.version`、`sys.info`；`fsys.delete(path,true)` 删到回收站可 `fsys.recycleBin.restoreLast()` 找回 |
| 自动化测试 | `util.testRunner` 单元测试 |

**怎么用**：`POST /api/tools/call`，`{"name":"execute_code","arguments":{"code":"...aardio 代码..."}}`。
代码作为匿名函数执行；不确定的 API 先查 lookup_library_reference / get_library_source（见下）。

**规约（违反必翻车）**：

1. 代码是 **aardio 语法，不是 JavaScript/Python**。
2. **必须 `return` 返回值**，多值打包为表/数组；`print` 输出捕获在返回对象 `printOutput` 字段（二维数组）。
3. **严禁直接跑 console 库**（console.log / console.dumpJson 已被工具禁用）——用 `print` 或 `return` 替代。
4. 同步模式（默认）下工具自动把 `win.loopMessage` 替换为 5 秒延时防无限阻塞，并捕获全部 msgbox 对话框（**3 秒超时自动关闭**，参数记录在 `msgboxOutput` 字段）。
5. 代码在**工作线程**执行——不要在里面操作 UI / AA 主窗口。
6. **HostPath ≠ GuestVAP**：工具参数里的 `/x` 以 AA 工作区为根；代码内字符串 `"/x"` 以 Effective AppBase 为根（显式 `appBaseDirectory` > 代码源文件所在目录 > 工作区根）。E≠`/` 时同一 `/x` 指向不同文件，转换式 `G="/" + relative(H,E)`。
7. 写代码前先测试关键假设（util.testRunner 无头断言），不要过早生成完整代码再填坑；验证 GUI 优先无头断言而非"跑起来截图看"。

### 异步长任务：threadMode="async" + wait_async_result

**什么时候用**：常驻 GUI 程序、监听循环、跑几十秒以上的代码——同步模式会占住串行化锁。
**怎么用**：`execute_code` 传 `"threadMode":"async"` 立即返回 threadId（async 线程里不会替换
win.loopMessage，可创建真实界面线程），随后 `wait_async_result(threadId, timeout毫秒)` 取结果
（返回 result/error/printOutput/status）。async 界面线程里还可在代码中用 `autos.waitAsyncForm()`
取首个窗体对象，跨线程调其属性方法。
**规约**：同步执行卡住别干等——改 `process_popen` 跑外部命令，或切 async 模式。

## 2. load_skill —— AA 技能包（浏览器/PS/Office/搜索/逆向）

**什么时候用**：需要成套领域能力时，先加载对应技能包，而不是自己手写 aardio 裸调。
**怎么用**：`{"name":"load_skill","arguments":{"library":"browser"}}`。
**规约**：**加载后必须先读该技能返回的文档/要点再调用相关工具**
（技能包正文位于 `I:/1Tools/aardio/lib/autos/skills/<包名>/.res/skill.md`），
按 AA 提示词的要点调用，不要凭自己的猜测直接上手。
本机已装技能包（`I:/1Tools/aardio/lib/autos/skills/`）：

| 技能包 | 用途 |
|---|---|
| browser | WebView2 共享浏览器自动化（getShared/click/input/evalJs/cdpCall） |
| chromiumWebDriver | chrome.driver 操作外部 Chrome/Edge（WebDriver/CDP） |
| excel | com.excel 高保真操作 Excel/WPS；无 Office 时 xlsx Open XML 只读 |
| word | com.doc 高保真操作 Word/WPS；无 Office 时 docx Open XML 只读 |
| powerPoint | COM 操作 PowerPoint/WPP，可导出 PDF/JPG/PNG |
| pdf | fsys.pdfium 读/渲染/拆分合并 PDF；HTML/MD 转 PDF |
| photoshop | COM 控制 Photoshop（DoJavaScript 执行 ExtendScript） |
| webSearch | 夸克/必应搜索与结果提取，隐身浏览器降级 |
| webReverse | 网页逆向：元素/脚本/API/加密提取报告 |
| reverseSkill | 逆向/渗透技能路由包（先读其 routing.md 再动手） |
| aardioLibraryBuilder | aardio 扩展库构建与维护 |
| aardioProjectBuilder | aardio 工程脚手架 |
| skillCreator | 创建新技能包 |

## 3. capture_screenshot + analyze_image —— 截屏与视觉分析

**什么时候用**：看屏幕/某窗口当前状态、GUI 冒烟验证、识别图片内容/文字。
**怎么用**：先 `capture_screenshot`（无参=全屏；`x/y/width/height`=区域；`hwnd`=指定窗口；
`path`=保存路径，**正斜杠**），再 `analyze_image`（`imageUrlOrPath`=图片路径或 URL，
`prompt`=要它分析什么，可选 `system` 系统提示词）。
**规约**：

- analyze_image 是**独立隔离的视觉 AI 会话**，与 zcode 对话互不污染。
- **不可盲信视觉模型**——尽早用确定性代码断言（如 execute_code 里 getPixel）代替模糊的多模态感知。
- 仅需提取文本/位置时 `useDotNetOcr=true` 提速免流。

## 4. 记忆四件套 —— 与 AA 共享的持久记忆

**什么时候用**：跨会话持久化研究成果、存"大坑教训"、给 AA 留任务背景
（AA 新建会话读取主记忆后即知悉）。
**怎么用**：`list_memory` 列分枝 → `read_memory(branch)` 读 → `write_memory(content, branch?, overwrite?)` 写
→ `switch_memory(backup_branch, activate_branch?)` 备份并切换主记忆。
**规约**：

- `main.md` 是**主记忆**：AA 新建会话时自动注入其系统提示词 → **你写入的内容 AA 双向可见**。
- 阶段性成果/大坑教训才写；**无复用价值不写**，控制写入频率。
- 主记忆超 40KB 应先 read_memory 再 write_memory 整理修剪；换项目用 switch_memory（自动备份旧主记忆）。

## 5. get_library_source / lookup_library_reference —— aardio 库源码与文档查询

**什么时候用**：要写 aardio 代码（execute_code 之前）查 API 签名、用法、实现细节。
**怎么用**：

- `lookup_library_reference(library)` —— 取库参考文档（由库源码智能提示声明自动生成的 Markdown）。
- `get_library_source(library, startLine?, lineCount?)` —— 取库源码物理路径与顶部结构，深挖实现。
- 配套：库指南在 `~/docs/library-guide`、扩展库文档在 `~/docs/library`；这些目录用 zcode 原生
  Grep/文件工具直接搜读即可（search_text 已屏蔽）。

## 6. search_web —— 联网搜索备胎通道

**什么时候用**：zcode 内置 WebSearch 429/配额耗尽时的备胎（AA 走 Tavily/Exa 通道，
AA 设置里密钥兼容 Tavily/Exa/Bocha）。
**怎么用**：`{"name":"search_web","arguments":{"query":"...","maxResults":5}}`；
可选 timeRange/topic/startDate/endDate/includeDomains/excludeDomains。
**规约**：工具有**额度限制**，别拿来当首选搜索；可能跑几十秒，给足超时。

## 7. ide_* —— 直接操控 AA IDE 编辑器（带源码护栏）

**什么时候用**：要让代码出现在 AA IDE 的编辑器里（用户正盯着 IDE 看、需要 IDE 的智能提示/
编译环境即时联动）时，直接操作编辑器缓冲，而不是绕道磁盘文件——这是 zcode 文件工具做不到的。

| 工具 | 用途 |
|---|---|
| ide_open_file | 在 IDE 打开指定文件 |
| ide_new_code | 新建文档缓冲 |
| ide_get_code | 读活动编辑器内容 |
| ide_replace_code | 替换活动编辑器内容 |
| ide_get_project | 读工程信息 |

**护栏规则（必须知道）**：

- **ide_replace_code 会沿编辑器父窗口链检查标题，命中 `autos.aardio` / `lib\autos` / `aa-bridge`
  即拒绝执行**，报错文案以「已按「禁止修改 AA 源码」护栏拒绝」开头。
- **护栏只挡 AA 入口源码（autos.aardio）与 lib\autos**；其他同名文件不设防——同名/同路径
  但不在 AA 入口与 lib\autos 下的文件可正常读写，也不要试图借道绕过护栏去改 AA 源码。
- **实测教训：无活动编辑器时护栏现在直接拒绝**（旧版会放行，导致 handler 静默新建文档写入，已修）。

---

# Tier 2 普通工具（保留 6 个：下载 3 + GitHub 3）

**保留原因：AA 的下载通道与 GitHub 工具仍有价值**——下载走 inet.downBox / sevenZip / zlib httpFile
（自动解压），GitHub 三件套免去自己拼 REST 调用；zcode 原生亦可实现，仅在需要 AA 环境上下文或图省事时用。

| 工具 | 用途 |
|---|---|
| download_file | inet.downBox 下载文件 |
| download_7zip_file | 下载并解压 .7z |
| download_zip_file | 下载并解压 .zip |
| github_lookup_repo | GitHub API 查仓库信息 |
| github_get_repo_zip_url | 取仓库 zip 下载地址 |
| github_get_content | 读仓库指定文件内容（适合文本/小文件） |

### 已屏蔽（zcode 原生覆盖，调用返回 404）

黑名单扩容移除的 13 个普通工具（2026-09-10，文件 9 + 进程 3 + http_get）——

list_directory、read_text_file、save_files、load_string、search_text、patch_text_file、
edit_text_file、rollback_text_file、clean_backup_text_files、process_popen、process_execute、
process_powershell、http_get

这些需求直接用 zcode 原生 Bash/文件工具完成；需要 AA 环境内的同类操作走 execute_code。

## AA 系统提示词要点（调用工具必读）

以下硬规约提炼自 AA 内置系统提示词（`L:/121/aa-bridge/AA/autos.aardio` 内嵌 systemPrompt）与工具
description（`GET /api/tools` 可查原文）。Tier 1 各工具的详解已吸收大部分；此处是**全景速查清单**，
调用任何工具前对照一遍（其中涉及已屏蔽工具——文件 9/进程 3/http_get——的条目，改由 zcode 原生工具或
execute_code 等价执行，规约本身仍然适用）：

1. 【execute_code】代码是 aardio 语法，不是 JavaScript/Python；语法没把握先 lookup_library_reference 查库参考。
2. 【execute_code】必须 return 返回值，多值打包表/数组；print 输出在 printOutput 字段。
3. 【execute_code】严禁直接跑 console 库——用 print 或 return 替代。
4. 【execute_code】同步模式自动替换 win.loopMessage（5 秒延时防阻塞）+ 捕获全部 msgbox（3 秒超时关闭，参数记入 msgboxOutput）。
5. 【execute_code/wait_async_result】阻塞/长任务用 threadMode="async"，随后 wait_async_result 取结果。
6. 【execute_code】代码在工作线程执行，不要操作 UI。
7. 【execute_code】测试用 util.testRunner 并 return $.report()；优先无头/非阻塞验证，避免滥用截图识别+模拟鼠标键盘。
8. 【execute_code】同步执行卡住别干等：改 process_popen 或切 async。
9. 【所有工具】arguments 路径一律正斜杠（反斜杠被 JSON+aardio 双层转义损坏）。
10. 【execute_code】HostPath ≠ GuestVAP：参数路径以 AA 工作区为根，代码内路径以 Effective AppBase 为根，转换式 `G="/" + relative(H,E)`。
11. 【patch_text_file/edit_text_file】改文本首选 patch、次选 edit，不要用 PowerShell/CMD 编辑文本。
12. 【save_files/rollback_text_file/clean_backup_text_files】save_files 是覆盖式写；编辑自动留 .aa.bak.*，可回滚/清理。
13. 【write_memory/read_memory/switch_memory】main.md 主记忆会注入 AA 系统提示词；无复用价值不写；超 40KB 修剪；换项目 switch_memory。
14. 【analyze_image】不可盲信视觉模型，尽早用确定性代码断言代替；提取文本用 useDotNetOcr=true。
15. 【capture_screenshot】截图后配 analyze_image 用；GUI 验证优先无头断言。
16. 【process_popen/process_execute/process_powershell】外部命令用 popen（读输出）；只启动不等用 execute；PowerShell 仅必要时用。
17. 【lookup_library_reference/get_library_source】库参考/库源码查询；库指南 ~/docs/library-guide、扩展库文档 ~/docs/library；~/docs 与 ~/examples 用 zcode 原生 Grep 直接搜（search_text 已屏蔽）。
18. 【load_skill】加载技能包后必须先读技能文档/要点再调用相关工具。
19. 【execute_code】浏览器自动化优先 web.view.shared 共享浏览器（持久驻留、不阻塞对话）：eval/waitEle/cdp；外部 Chrome/Edge 走 chromiumWebDriver 技能包。
20. 【ide_replace_code】源码护栏：沿编辑器父窗口链查标题，命中 autos.aardio / lib\autos / aa-bridge 即拒绝执行（报错以「已按「禁止修改 AA 源码」护栏拒绝」开头）；护栏只挡 AA 入口与 lib\autos，其他同名文件不设防；无活动编辑器时也直接拒绝（旧版会放行并静默新建文档写入，已修）。

### load_skill 之后（单独强调）

`load_skill(library="<包名>")` 之后，**必须先读该技能返回的文档/要点，再调用相关工具**
（技能包正文在 `I:/1Tools/aardio/lib/autos/skills/<包名>/.res/skill.md`），
按 AA 提示词的要点调用，不要凭自己的猜测直接上手。可用技能包清单见 Tier 1 第 2 节。

## 查 AA 知识库的时机（写 aardio 代码前必读）

**工具——查 aardio 库文档有两个桥工具，不要靠试错摸索**：

- `lookup_library_reference{"library":"string","keyword":"模式匹配"}` —— 返回该库官方帮助文档
  Markdown（实测 string 库直达 docs/library-guide/builtin/string/matching.md 与 patterns.md 指针；
  keyword 非 schema 必填，实测可附）。
- `get_library_source{"library":"win.ui.grid","startLine":1,"lineCount":50}` —— 库源码。
- 也可直接只读 `I:/1Tools/aardio/docs/library-guide/` 下的 md 文件。

**什么时候必须查（硬性清单）**：

1. 写任何 execute_code/execute 的 aardio 代码**之前**——所用标准库 API（string 模式匹配、process、
   win、fsys、com 等）先查参数与返回值；**模式匹配必查 patterns.md**（冒号=任意多字节字符、
   转义规则、单双引号语义，全有官方定义）。
2. 行为与预期不符时——**试错上限 2 次，之后必须停手查文档**（aardio 模式匹配三个坑：冒号特殊符号、
   单引号=转义字符串/双引号=原样字符串与直觉相反、[x] 方括号类最稳——靠试错花了 5 轮，查文档 1 次全解释）。
3. load_skill 加载技能包后必读该包 skill.md（见上文「load_skill 之后」）。
4. 涉及 *.aproj 工程结构/属性时查 aardioProjectBuilder 技能。
5. 报错栈指向库内部实现时用 get_library_source 看源码。

**教训案例（实例）**：本次为提取 dsh-web.log 的 token URL，凭直觉写 string 模式连败 5 轮
（反斜杠转义、% 转义、冒号全踩坑），查 patterns.md 后 1 分钟定位——冒号=匹配任意多字节字符的
特殊符号、模式应写双引号原样串、[x] 方括号类零歧义。

## 工具速查表（按 Tier 分组，基础 26 个；load_skill 加载技能包后动态增加，以 GET /api/tools 实时数据为准）

基础清单来自 `GET /api/tools`（40 原生 − 17 黑名单【机器人 4 + 普通 13】+ 3 个 aa_* 元工具；AA 加载最新版桥之前运行实例可能报旧数，以实时返回为准）。Tier 明细列的是基础工具。

### 元工具（3 个，桥协议本身）

| 工具 | 用途 |
|---|---|
| aa_status | 查 AA 状态：桥/忙闲/重试、会话消息数、最近错误、PID |
| aa_read_reply | 读 AA 最近一条回复（Markdown） |
| aa_stop | 让 AA 中止当前任务（等价点「停止」） |

### Tier 1 特色工具（17 个，详见上文重点章节）

| 工具 | 用途 |
|---|---|
| execute_code | aardio 全家桶网关：.NET/COM/Office/OCR/WebView2/桌面自动化/多语言（见规约） |
| wait_async_result | 取 execute_code(threadMode="async") 的异步线程结果 |
| load_skill | 加载技能包（browser/photoshop/excel/webSearch 等），加载后先读文档 |
| capture_screenshot | 截屏：全屏/区域/指定窗口（hwnd） |
| analyze_image | 独立视觉 AI 会话分析图片；useDotNetOcr 提速免流 |
| write_memory | 写长期记忆分枝（main.md 主记忆注入 AA 系统提示词，双向可见） |
| read_memory | 读记忆分枝 |
| list_memory | 列出所有记忆分枝（*.md） |
| switch_memory | 备份主记忆并切换/清空 |
| get_library_source | 取 aardio 库源码路径与顶部结构 |
| lookup_library_reference | 取 aardio 库参考文档（Markdown） |
| search_web | Tavily/Exa 搜索通道（zcode WebSearch 429 时的备胎，有额度限制） |
| ide_open_file | 在 IDE 打开指定文件 |
| ide_new_code | 新建文档缓冲 |
| ide_get_code | 读活动编辑器内容 |
| ide_replace_code | 替换活动编辑器内容（源码护栏：命中 autos.aardio/lib\autos/aa-bridge 即拒绝） |
| ide_get_project | 读工程信息 |

### Tier 2 普通工具（保留 6 个，见上文一张表）

download_file、download_7zip_file、download_zip_file、github_lookup_repo、
github_get_repo_zip_url、github_get_content —— 其余 13 个普通工具已屏蔽，
见「Tier 2」章节的「已屏蔽」小节。

## 端点一览

| 端点 | 方法 | 说明 |
|---|---|---|
| /api/status | GET | 桥/忙闲/重试/消息数/PID/标题 |
| /api/tools | GET | 基础 26 个工具含 name/description/inputSchema；load_skill 后动态增加 |
| /api/tools/call | POST | `{"name":"...","arguments":{...}}` → `{"result":...,"isError":bool}`；必须带 Content-Type |
| /api/prompt | — | **已移除**（2026-09-10 用户要求），调用返回 404 |
| /api/reply | GET | AA 最近一条回复（Markdown） |
| /api/stop | POST | AA 停止当前任务 |
| /api/shutdown | POST | 关桥（持久化）——**严禁随意调用** |

## 开关与故障排查

| 现象 | 原因 | 处理 |
|---|---|---|
| 401 | token 错（aa-bridge.table 与运行实例不一致） | 重新读文件取 token |
| 403 或连接拒绝 | 桥关着；或宿主重启窗口期瞬断 | 标准修复：运行 aacli.exe（无界面桥宿主，仓库 connector/aacli，构建见其 README）——无需打开任何界面；备选：AA「设置」勾底部「外部桥」（不接受远程唤醒）；拒连先重试 3 次再下结论 |
| 400 "Invalid JSON body" | POST 缺 `Content-Type: application/json` | 补头 |
| `"another tools/call is running"` | 串行化冲突（一次只允许一个 tools/call） | 等 1~2 秒重试 |
| 工具不在清单（404） | 黑名单 17：机器人 4（微信/飞书）+ 普通 13（文件 9/进程 3/http_get） | 换 zcode 原生/execute_code 等价实现 |
| GET 未路由 /api/* 回 405 | apiHandle 先判方法再判路由 | 正常语义，按 405 处理 |

- 开：标准方式 = 运行 aacli.exe（无界面后台宿主，托盘图标，`--port` 可换端口）；备选 = 本人在 AA「设置」窗口勾选「外部桥」（带聊天界面时）。
- 关：`aa.ps1 shutdown`（即时、持久化，重启后仍关）——**本插件工作流严禁调用**，会把桥关死。

## aa.ps1 子命令速查

路径：插件内 `skills/aa-bridge/scripts/aa.ps1`。全部输出 JSON；失败路径输出 `{"error":"..."}` 且 exit 1。
`-TimeoutSec`（默认 600，可覆盖）作用于所有 HTTP 调用——长工具不再 100 秒默认超时。

```bash
powershell -File scripts/aa.ps1 status     # 探桥（bridge/busy/PID/标题）
powershell -File scripts/aa.ps1 tools      # 40 工具清单（含 inputSchema）
powershell -File scripts/aa.ps1 reply      # 读 AA 最近回复
powershell -File scripts/aa.ps1 call '{"name":"execute_code","arguments":{"code":"return 1+1"}}'
powershell -File scripts/aa.ps1 stop       # AA 停止当前任务
powershell -File scripts/aa.ps1 shutdown   # 关桥（危险，勿用）
```

## /mcp 备注

同端口提供标准 MCP 端点（`POST /mcp`，MCP 2025-06-18 规范，纯 JSON 应答，需同样带 token 头）。
本插件默认不用；需要时可直接 curl 直测。
