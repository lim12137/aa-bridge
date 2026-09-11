# aa-cli

aa-bridge 命令行（Layer 2），底层用 [../aa-client](../aa-client/)（Layer 0 零依赖 ESM 客户端）。

## 用法

```bash
node aa.mjs status                          # 桥状态
node aa.mjs tools                           # 工具清单（名称 + 数量）
node aa.mjs call aa_status '{}'             # 调用任意桥工具，第二个参数为 JSON
node aa.mjs run --code "return 40+2"        # 执行 aardio 代码
node aa.mjs run L:/121/aa-bridge/research/1.aardio   # 执行代码文件
```

stdout 恒输出**单行 JSON**；成功 exit 0，失败 exit 1。

- 成功：`{"ok":true,"cmd":"run","via":"bridge","result":42}`
- 失败：`{"ok":false,"cmd":"status","error":"桥未开启或 AA 副本未运行"}`

## run 的桥优先与降级逻辑

1. **桥优先**：桥可达时 `run` 映射为 `execute_code` 工具调用（`via:"bridge"`）。
2. **自动降级**：仅当桥**连接拒绝**（ECONNREFUSED，即 AA 未运行/桥未开启）时，降级到独立执行器
   `aa-runner.exe`（`via:"runner"`）——写 %TEMP% 请求文件 `{"action":"exec","code":...}` →
   `cmd /c "aa-runner.exe req.json > out.txt 2>&1"` → 解析 stdout 单行 JSON。
   token 不匹配（401）等其他错误**不降级**，直接报错。
3. 降级执行器路径：环境变量 `AA_RUNNER` 优先；默认解析为相对本文件的
   `..\aa-runner\dist\aa-runner.exe`。

## 环境变量

| 变量 | 说明 | 默认 |
|---|---|---|
| `AA_BRIDGE_URL` | 桥地址 | `http://127.0.0.1:9123` |
| `AA_BRIDGE_TOKEN` | 显式 token | 自动从 aa-bridge.table 发现 |
| `AA_BRIDGE_TABLE` | aa-bridge.table 路径 | `C:\Users\hopemyl\AppData\Local\aardio\autos\aa-bridge.table` |
| `AA_BRIDGE_TIMEOUT_MS` | 桥请求超时 | `120000` |
| `AA_RUNNER` | 降级执行器路径 | `..\aa-runner\dist\aa-runner.exe` |
| `AA_RUNNER_TIMEOUT_MS` | 执行器超时 | `120000` |

## 注意

- 路径参数一律用**正斜杠**（`L:/121`），反斜杠会被桥的双层转义破坏。
- AA 是用户的活程序：不要调 `POST /api/stop`、`POST /api/shutdown`。
