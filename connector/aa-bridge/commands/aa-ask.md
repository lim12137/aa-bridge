---
description: 向 AA(aardio autos) 智能体投递提示词并取回回复 / 参数为要问 AA 的完整任务描述。
---

用户要把一条提示词交给 AA 智能体执行并拿回结果。参数 $ARGUMENTS 为提示词原文（保持用户原话，不要改写任务内容）。

执行：

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File "${ZCODE_PLUGIN_ROOT}/skills/aa-bridge/scripts/aa.ps1" prompt "$ARGUMENTS" -Wait
```

- `prompt` 默认立即返回 `queued`；加 `-Wait` 会轮询到 AA 完成后直接返回回复（默认最长等 600 秒，可用 `-TimeoutSec` 调整）。
- 返回 `queued=false, reason=busy/retrying` ⇒ AA 正忙：告知用户，并建议稍后重试或先运行 `aa.ps1 stop`。
- 成功后把 `reply` 字段（Markdown）转述给用户，注明「来自 AA」。
- 连接拒绝 ⇒ 桥未开：引导用户看 /aa-status。
