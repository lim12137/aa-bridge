# aa-runner · 无头 aardio 执行器

单发执行器：读一个请求 JSON → 执行 aardio 代码或驱动 aardio IDE → stdout 输出一行 JSON。
**不弹任何界面**（全链路 try/catch，错误也走 JSON），aa-cli 桥离线时的兜底执行通道。

## 用法

```bash
aa-runner.exe request.json        # 请求文件
cat request.json | aa-runner.exe  # 或 stdin
```

请求（action 省略默认 exec）：

```json
{"action":"exec","code":"print(\"hi\"); return {sum=1+2}"}
{"action":"ide","method":"get_code","args":{}}
{"action":"tools"}
```

- exec：print 捕获进 `printOutput`；编译失败回传 `error`（可能带 aifix 修复建议 `fixedCode`）；
  运行期 msgbox 自动应答不弹窗；`win.loopMessage` 3 秒防卡死
- ide：`open_file / new_code / get_code / replace_code / get_project`（replace_code 带
  「禁改 AA 源码」护栏：活动编辑器命中 autos.aardio / lib\autos / aa-bridge 即拒绝）

输出：`{"ok":true,"result":...,"printOutput":[...]}` 或 `{"ok":false,"error":"..."}`

## 构建

1. aardio IDE 打开 `default.aproj` → 发布(F7) → `dist\aa-runner.exe`
2. `powershell -NoProfile -ExecutionPolicy Bypass -File setup-libs.ps1` 补运行时动态库
   （ide 动作需要 dist\lib\ide 等；纯 exec 可不装）

注意：发布入口必须是 `main.aardio`（IDE 工程约定，自定义入口文件名会被 IDE 自动生成的
模板 main.aardio 抢占，见 已测不可用清单 2026-09-11）。

## 验证记录（2026-09-11，5/5）

exec+print ✅ / stdin ✅ / 编译错误干净回传 ✅ / ide get_code ✅ / 护栏拒绝 ✅
