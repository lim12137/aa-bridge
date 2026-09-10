#!/bin/bash
# aa-bridge API 验收脚本：AA 副本(开桥)运行后执行  bash /l/121/aa-bridge/test/api-curl.sh
# 全程只读探测，不向 AA 会话注入任何消息（prompt 注入工具已按用户要求移除）
set -e
TABLE="$LOCALAPPDATA/aardio/autos/aa-bridge.table"
[ -f "$TABLE" ] || { echo "❌ aa-bridge.table 不存在（AA 副本未运行/桥未开过）"; exit 1; }
TOKEN=$(grep -o 'token *= *"[^"]*"' "$TABLE" | sed 's/.*"\(.*\)"/\1/')
[ -n "$TOKEN" ] || { echo "❌ token 解析失败"; exit 1; }
B=http://127.0.0.1:9123
H="X-AA-Token: $TOKEN"

echo "== 1) 无 token 应 401 =="
curl -s -o /dev/null -w "%{http_code}\n" $B/api/status
echo "== 2) /api/status 应 200 且 bridge=true =="
curl -s -H "$H" $B/api/status; echo
echo "== 3) /api/tools 工具数（基础 26；load_skill 加载技能包后会动态增加）=="
curl -s -H "$H" $B/api/tools | grep -o '"name"' | wc -l
echo "== 4) /api/tools/call aa_status =="
curl -s -H "$H" -H "Content-Type: application/json" $B/api/tools/call -d '{"name":"aa_status","arguments":{}}'; echo
echo "== 5) /api/reply（只读最近回复，不向 AA 注入任何消息）=="
curl -s -H "$H" $B/api/reply; echo
echo "== 6) 黑名单工具 weixin_send_message 应 404 =="
curl -s -o /dev/null -w "%{http_code}\n" -H "$H" -H "Content-Type: application/json" $B/api/tools/call -d '{"name":"weixin_send_message","arguments":{}}'
echo "== 7) GET 未路由 /api 路径应 405 =="
curl -s -o /dev/null -w "%{http_code}\n" -H "$H" $B/api/nothing
echo "== 8) /api/prompt 已移除，应 404 =="
curl -s -o /dev/null -w "%{http_code}\n" -H "$H" -H "Content-Type: application/json" -X POST $B/api/prompt -d '{"text":"x"}'
echo "（谨慎）9) shutdown：curl -s -H \"$H\" -X POST $B/api/shutdown"
