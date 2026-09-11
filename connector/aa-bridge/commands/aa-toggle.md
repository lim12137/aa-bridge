---
description: 开/关 aa-bridge 桥（API+MCP :9123，宿主为 aacli.exe 或 AA 副本）/ 查看状态并指导切换。
---

用户要开或关 aa-bridge 桥。先运行 `aa.ps1 status` 查看当前 `bridge` 字段，然后按目标操作：

**关闭（可远程，立即生效）**：
```bash
powershell -NoProfile -ExecutionPolicy Bypass -File "${ZCODE_PLUGIN_ROOT}/skills/aa-bridge/scripts/aa.ps1" shutdown
```
效果：端口 9123 释放、选择持久化（宿主重启后仍为关）。对 aacli.exe 宿主：进程会干净退出。

**重新开启（标准方式 = 启动 aacli.exe，无需打开任何界面）**：
- 运行 aacli.exe（仓库 connector/aacli，构建见其 README；已构建则直接 `dist\aacli.exe`）→
  托盘出现图标即桥已就绪。`--port 9124` 可换端口并存测试。
- 备选（带 AA 聊天界面）：打开 AA 窗口 → 点「设置」→ 底部勾选「外部桥」复选框 →
  绿色提示「外部桥已就绪」。出于安全设计，AA 宿主的桥关闭后不接受远程唤醒，必须本人在界面开启；
  aacli 宿主则随时可直接拉起进程。

最后再跑一次 `aa.ps1 status` 确认 `bridge` 字段已变化，并向用户确认结果。
