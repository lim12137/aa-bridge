# 🐳 WhaleTray · 鲸鱼托盘（DshTray）

**2.8 MB 的 aardio 托盘程序，管住 300 MB 的 DeepSeek CLI 网页服务。**

![built with aardio](https://img.shields.io/badge/built%20with-aardio-07374F?logo=data:image/svg%2bxml;base64 PHN2Zy8+) ![exe size](https://img.shields.io/badge/exe-2.8%20MB-2EA043) ![dsh](https://img.shields.io/badge/dsh-0.1.5.x%20ready-0969DA) ![platform](https://img.shields.io/badge/Windows-10%20%2F%2011-0078D4) ![license](https://img.shields.io/badge/license-MIT-yellow)

> 常驻系统托盘的小鲸鱼 🐳，一键启动 / 重启 / 升级 [dsh (DeepSeek CLI)](https://www.npmjs.com/package/@deepseek-ai/dsh) 网页服务，
> 自带 WebView2 浏览器壳、自绘通知、token 鉴权适配——**发布出来只有一个 2.8 MB 的 exe**。

![鲸鱼图标](whale_preview.png)

## ✨ 功能

- 🐳 托盘鲸鱼图标（GDIP 逐帧自绘，8 种尺寸合一枚 .ico），右键菜单实时显示状态（未运行 / 正在启动 / 网页已运行，每 5 秒后台刷新）
- 🌐 **打开网页**：自动启动 dsh web 并用内置 WebView2 浏览器壳打开（常驻，不自动关闭）
- 🔑 **dsh 0.1.5.x token 鉴权适配**：新版网页强制一次性 token（裸地址 401），自动从运行日志提取最新带 token 地址（v1.5）
- 🚀 **启动 dsh**：仅启动网页服务，不打开浏览器（`--no-open`）
- 🔄 **重启 dsh**：真正结束所有 dsh 进程（等待端口释放）后重新启动
- ⬆️ **升级 dsh**：结束 dsh 进程后执行 `npm install -g @deepseek-ai/dsh@latest`，成功后自动重启服务（已在 0.1.5-rc.1 实测）
- 🚪 **退出**：一键关闭 dsh 进程 + 浏览器壳 + 托盘
- 🔔 自绘通知弹窗（右下角滑入，不受 Win11 通知设置影响，无系统气泡乱码问题）
- 🔒 单实例互斥锁；日志写入 `%LOCALAPPDATA%\DshTray\dsh-tray.log`
- 🛠️ 自动修复 `%USERPROFILE%\.env` 中新版 dsh 禁止的 `DSH_*` 等引导变量（转为环境变量注入，配置不丢失）
- ⏱️ 耗时操作在后台线程执行，界面不卡，操作期间菜单自动禁用

## 🚀 使用

### 方式一：自包含版（推荐）

下载 Release 中的 `DshTray` 文件夹（约 300MB），双击 `DshTray.exe`：

```
DshTray\
├── DshTray.exe        # 托盘程序
└── res\
    ├── nodejs\        # Node.js v24 便携版
    └── dsh\dsh\       # dsh 包及全部依赖
```

启动 dsh 时优先使用内置资源；`res\` 缺失时自动回退到系统 PATH 中安装的 dsh。

启动失败排查：先看 `%LOCALAPPDATA%\DshTray\dsh-web.log` 的崩溃栈（v1.4 起弹窗直接展示关键原因）。
第三方插件（`link:` junction 安装）裸导入 `@deepseek-ai/*` 解析失败会令 dsh 启动即崩，
解法见 `docs/2026-08-23-自包含启动失败-插件依赖解析修复.md`。

### 方式二：从源码构建

1. 用 [aardio](https://www.aardio.com/) 打开 `default.aproj`
2. 一键「发布」（F7）得到 `dist\DshTray.exe`（库内嵌，单文件即可运行）
3. 组装自包含文件夹：

   ```powershell
   # 1. 下载 Node.js 便携版（zip）解压到 res\nodejs\
   # 2. 用该 node 执行: npm install --prefix res\dsh @deepseek-ai/dsh
   # 3. 将 DshTray.exe 放入文件夹根目录
   ```

## 💡 为什么 aardio 使用者值得看这个仓库

这是一个**全部用 aardio 标准库**写出来的生产级托盘应用，可以当模板抄：

| 你能在这里看到 | 用的标准库 |
|---|---|
| GDIP 逐帧绘制多尺寸托盘图标 + .ico 打包 | `gdip` / `gdip.icoBuilder` / `win.image` |
| WebView2 浏览器壳（常驻导航） | `web.view` |
| 无边框自绘右下角通知弹窗（置顶不抢焦点） | `win.form` + `plus` 控件 + `SetWindowPos` |
| 后台线程跑耗时操作、UI 不卡 | `thread.invoke` + 线程共享状态 |
| WMI 轮询进程树 + taskkill + 端口释放确认 | `com.wmi` / `process.popen` |
| 单实例互斥锁 | `Kernel32.CreateMutexW` |
| `*.aproj` 工程配置（发布目录 / 图标 / 版本号） | 工程文件即 XML |

**总代码量约 640 行**，发布 2.8 MB 单文件 exe——这就是 aardio 的答案。

## 🤖 本次 v1.5 升级由 AA（aardio autos）自主完成

![maintained with AA](https://img.shields.io/badge/maintained%20with-AA%20(aardio%20autos)-449BBE)

v1.5 的全部工程改动——0.1.5.x token 鉴权调研与适配、`loadcode` 编译检查、
`pb.publishCurrent()` 一键发布、升级命令 `npm install -g @deepseek-ai/dsh@latest`
的真机实测验证——**不是人手写的，是 [AA 智能体](https://aau.cn/)干的**：

```
AA（aardio autos v4.9.26，aardio 写的全自主智能体）
 └─ load_skill("autos.skills.aardioProjectBuilder")   ← 加载工程构建技能包
     ├─ 读取 .res/skill.md 规约 → 定位 0.1.5.x token 鉴权根因
     ├─ 修改 main.aardio + loadcode 编译检查          ← execute_code
     ├─ pb.getCurrentProjectInfo() → pb.publishCurrent() ← 发布 dist\DshTray.exe
     └─ 真机实测升级命令与插件兼容性
```

也就是说：**这个仓库本身就是「aardio 写智能体、智能体再写 aardio」的活例子**。
AA 的工具链（38+ 工具：aardio 代码执行、库文档查询、截图视觉、记忆、技能包……）
对任何 aardio 使用者都是即插即用的生产力，[点这里了解 AA](https://aau.cn/)。

> 💡 更进一步：AA 的工具箱是 **agent 无关**的——它把全部能力暴露成本机 HTTP API
> （`/api/tools`、`/api/tools/call`）与 MCP 端点，带 token 鉴权。
> 理论上可以接入**任意 agent** 里运行：zcode、Claude、Cursor、你自己写的智能体……
> 只要能发 HTTP 请求，就能驱动 aardio 的整个生态。

## 📦 版本

- **v1.5**（2026-09-10）：适配 dsh 0.1.5.x token 鉴权；实测升级命令 `npm install -g @deepseek-ai/dsh@latest` 正确升到 0.1.5-rc.1；详见 [docs/2026-09-10-dsh-0.1.5-token鉴权适配.md](docs/2026-09-10-dsh-0.1.5-token鉴权适配.md)
- v1.4：启动失败弹窗展示真实崩溃原因；自包含升级改用 `npm --prefix res\dsh`（`-g` 会装错位置）
- v1.3：自包含版（内置 Node.js + dsh）
- v1.2 / v1.1：WebView2 浏览器壳、自绘通知、.env 引导变量自动修复

## 📚 踩坑记录（[docs/](docs/)）

| 坑 | 解决 |
|---|---|
| dsh 0.1.5.x 网页强制 token 鉴权，裸地址 401 | 从 `dsh-web.log` 提取最新带 token 地址（含 aardio 模式匹配避坑：冒号是特殊符号、方括号类最稳） |
| `process.popen` 对象的 `.exitCode` 属性不存在（`readAll()` 后对象已关闭） | 从 `readAll()` 返回值取退出码 |
| 新版 dsh 禁止 `%USERPROFILE%\.env` 中的 `DSH_*`/`XDG_*` 等变量，启动即崩 | 启动前移出并转为环境变量注入 |
| dsh web 默认自动打开浏览器 | 加 `--no-open` |
| Win11 托盘气泡应用名乱码、且受系统通知设置拦截 | 自绘右下角通知窗 |
| 自包含模式下进程命令行不含 `@deepseek-ai`，旧 WMI 查询匹配不到进程 | 改用 `Name='node.exe' AND CommandLine LIKE '%dsh%lib%bin.js%'` |
| taskkill 后端口未立即释放导致重启误判 | 轮询等待进程消失 + 端口释放 |
| 第三方插件 junction 裸导入 `@deepseek-ai/*` 解析失败，dsh 启动即崩 | 见 [docs/2026-08-23-自包含启动失败-插件依赖解析修复.md](docs/2026-08-23-自包含启动失败-插件依赖解析修复.md) |

## 🔗 引用与致谢

- [aardio 官网](https://www.aardio.com/) · [aardio 论坛](https://bbs.aardio.com/) —— 桌面极速开发的答案
- [AA（aardio autos）全自主智能体](https://aau.cn/) —— v1.5 的自主升级与维护者（见上文 🤖 章节）
- [@deepseek-ai/dsh](https://www.npmjs.com/package/@deepseek-ai/dsh) —— DeepSeek CLI，本托盘管理的对象
- [Node.js](https://nodejs.org/) v24 便携版

## 系统要求

- Windows 10/11（内置 WebView2 运行时，Win11 自带）
- 自包含版无需安装 Node.js；回退模式需要系统已安装 Node.js ≥ 22 与 dsh

## License

MIT
