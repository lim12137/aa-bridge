---
description: 开/关 AA 外部桥（API+MCP :9123）/ 查看当前开关状态并指导切换；关闭可远程执行，重新开启需在 AA 设置里勾选。
---

用户要开或关 AA 的外部桥。先运行 `aa.ps1 status` 查看当前 `bridge` 字段，然后按目标操作：

**关闭（可远程，立即生效）**：
```bash
powershell -NoProfile -ExecutionPolicy Bypass -File "${ZCODE_PLUGIN_ROOT}/skills/aa-bridge/scripts/aa.ps1" shutdown
```
效果：端口 9123 释放、窗口标题去掉 `[MCP:9123]` 后缀、选择持久化（重启 AA 后仍为关）。

**重新开启（需要用户在 AA 界面操作一次）**：
- 打开 AA 窗口 → 点「设置」→ 底部勾选「外部桥」复选框（位于「更新配置」按钮左侧）→ 立即生效，绿色提示「外部桥已就绪」。
- 说明：出于安全设计，桥关闭后不接受任何远程唤醒（否则等于没有关），必须本人在 AA 界面开启。

最后再跑一次 `aa.ps1 status` 确认 `bridge` 字段已变化，并向用户确认结果。
