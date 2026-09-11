# aacli · 无界面 AA 桥服务（独立 exe）

改造自 autos.aardio 的 AA-BRIDGE 补丁：**剥掉主窗体/聊天 UI/微信/飞书/LLM 会话循环**，
只保留 HTTP(MCP) 桥 + autos 工具直通。编译后是一个后台进程——不需要 IDE、不需要 AA 在线、
不弹任何界面，托盘常驻一个小图标。

## 与其它组件的关系

```
aacli.exe（本组件，后台常驻 9123）←  一切的工具来源
    ├── aa-cli（命令行客户端，桥优先/aa-runner 兜底）
    ├── dsh-aa-bridge（DeepSeek harness 插件）
    ├── aa-bridge（zcode 插件）
    └── 任意 HTTP/MCP 客户端
```

## 使用

```
aacli.exe                 前台启动（读 %LOCALAPPDATA%\aardio\autos\aa-bridge.table 的 token/enabled，端口 9123）
aacli.exe --port 9124     指定端口（会话级，便于与 IDE 版 AA 并存测试）
```

- 托盘图标：左键双击 = 气泡报状态；右键 = 打开工作目录 / 退出
- 停止：`POST /api/shutdown`（带 X-AA-Token）或托盘菜单退出
- 开机日志：`dist\aacli-boot.log`（分阶段启动日志，排障用）

配置与 AA **完全共享**（agent.table、workspace、~memory、aa-bridge.table），
所以 token 不变、zcode 插件 / aa-cli / dsh 插件全部无缝切换宿主。

⚠️ 与 IDE-F5 版 AA **互斥**（同占 9123）：先停一个再开另一个。

## 从源码构建

1. 用 aardio IDE 打开 `default.aproj`（启动文件必须是 `main.aardio`——
   IDE 会给工程目录自动生成模板 main.aardio 抢占入口，见 已测不可用清单 2026-09-11 条目）
2. 「发布(F7)」→ `dist\aacli.exe`（约 4MB，lib\autos 等静态依赖已内嵌）
3. 补齐运行时动态加载库（仅需一次）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File setup-libs.ps1 -AardioLib "I:\1Tools\aardio\lib"
```

4. `dist\autos.ico` 需与 exe 同目录（托盘图标）；启动验证看 `dist\aacli-boot.log`

## 完整验证记录（2026-09-11）

| 验证项 | 结果 |
|---|---|
| /api/status | `{"bridge":true,"headless":true,...}` ✓ |
| /api/tools | 26 个工具与 AA 桥一致 ✓ |
| execute_code | `return 40+2` → `42` ✓ |
| MCP /mcp initialize | 2025-06-18 握手 ✓ |
| /api/shutdown | 进程干净退出（无需 kill）✓ |
| 界面 | 无可见窗体；托盘图标 + 右键菜单 ✓ |
| dsh 插件端到端 | 26/26 注册、headless agent 真调 aa_status 成功 ✓ |
