---
description: 查看 AA(aardio autos) 外部桥与智能体状态 / 桥是否开启、AA 是否忙碌、会话消息数、PID。
---

用户明确请求查看 AA 桥状态。执行方式（二选一，失败则换另一种）：

1. 优先运行插件脚本：
```bash
powershell -NoProfile -ExecutionPolicy Bypass -File "${ZCODE_PLUGIN_ROOT}/skills/aa-bridge/scripts/aa.ps1" status
```
2. 脚本不可用时用 curl（token 从 `%LocalAppData%\aardio\autos\aa-bridge.table` 里 `token="..."` 读取）：
```bash
TOKEN=$(grep -o 'token *= *"[^"]*"' "$LOCALAPPDATA/aardio/autos/aa-bridge.table" | sed 's/.*"\(.*\)"/\1/')
curl -s -H "X-AA-Token: $TOKEN" http://127.0.0.1:9123/api/status
```

如实汇报返回 JSON：`bridge`（桥开关）、`busy`（AA 是否思考中）、`retrying`、`messageCount`、`pid`、`title`。

- 连接拒绝（Connection refused）⇒ 桥未开启或 AA 副本未运行：告知用户需运行打好补丁的 AA 副本，并在其「设置」里勾选「外部桥」。
- 401 ⇒ token 不匹配：提醒 aa-bridge.table 与运行实例可能不是同一份（例如重装后旧文件残留）。
