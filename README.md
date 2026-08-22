# DshTray 鲸鱼托盘 🐳

常驻 Windows 系统托盘，一键管理 [dsh (DeepSeek CLI)](https://www.npmjs.com/package/@deepseek-ai/dsh) 网页服务。

**自包含版**：内置 Node.js 便携版 + dsh 包，拷到任何 Windows 电脑（无需安装 Node.js）双击即用。

![鲸鱼图标](whale_preview.png)

## 功能

- 🐳 托盘鲸鱼图标，右键菜单实时显示状态（未运行 / 正在启动 / 网页已运行，每 5 秒后台刷新）
- 🌐 **打开网页**：自动启动 dsh web 并用内置 WebView2 浏览器壳打开（常驻，不自动关闭）
- 🚀 **启动 dsh**：仅启动网页服务，不打开浏览器（`--no-open`）
- 🔄 **重启 dsh**：真正结束所有 dsh 进程（等待端口释放）后重新启动
- ⬆️ **升级 dsh**：结束 dsh 进程后执行 `npm install -g @deepseek-ai/dsh@latest`，成功后自动重启服务
- 🚪 **退出**：一键关闭 dsh 进程 + 浏览器壳 + 托盘
- 🔔 自绘通知弹窗（右下角滑入，不受 Win11 通知设置影响，无系统气泡乱码问题）
- 🔒 单实例互斥锁；日志写入 `%LOCALAPPDATA%\DshTray\dsh-tray.log`
- 🛠️ 自动修复 `%USERPROFILE%\.env` 中新版 dsh 禁止的 `DSH_*` 等引导变量（转为环境变量注入，配置不丢失）
- ⏱️ 耗时操作在后台线程执行，界面不卡，操作期间菜单自动禁用

## 使用

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

### 方式二：从源码构建

1. 用 [aardio](https://www.aardio.com/) 打开 `default.aproj`
2. 发布工程得到 `DshTray.exe`
3. 组装自包含文件夹：

   ```powershell
   # 1. 下载 Node.js 便携版（zip）解压到 res\nodejs\
   # 2. 用该 node 执行: npm install --prefix res\dsh @deepseek-ai/dsh
   # 3. 将 DshTray.exe 放入文件夹根目录
   ```

## 系统要求

- Windows 10/11（内置 WebView2 运行时，Win11 自带）
- 自包含版无需安装 Node.js；回退模式需要系统已安装 Node.js ≥ 22 与 dsh

## 技术要点（踩坑记录见 [docs/](docs/)）

| 坑 | 解决 |
|---|---|
| `process.popen` 对象的 `.exitCode` 属性不存在（`readAll()` 后对象已关闭） | 从 `readAll()` 返回值取退出码 |
| 新版 dsh 禁止 `%USERPROFILE%\.env` 中的 `DSH_*`/`XDG_*` 等变量，启动即崩 | 启动前移出并转为环境变量注入 |
| dsh web 默认自动打开浏览器 | 加 `--no-open` |
| Win11 托盘气泡应用名乱码、且受系统通知设置拦截 | 自绘右下角通知窗 |
| 自包含模式下进程命令行不含 `@deepseek-ai`，旧 WMI 查询匹配不到进程 | 改用 `Name='node.exe' AND CommandLine LIKE '%dsh%lib%bin.js%'` |
| taskkill 后端口未立即释放导致重启误判 | 轮询等待进程消失 + 端口释放 |

## License

MIT
