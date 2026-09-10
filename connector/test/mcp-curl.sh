#!/bin/bash
# MCP 端点协议验收（工蜂E §1.1，2025-06-18）：bash /l/121/aa-bridge/test/mcp-curl.sh
set -e
TABLE="$LOCALAPPDATA/aardio/autos/aa-bridge.table"
[ -f "$TABLE" ] || { echo "❌ aa-bridge.table 不存在"; exit 1; }
TOKEN=$(grep -o 'token *= *"[^"]*"' "$TABLE" | sed 's/.*"\(.*\)"/\1/')
B=http://127.0.0.1:9123/mcp
H1='Content-Type: application/json'; H2='Accept: application/json, text/event-stream'
HA="X-AA-Token: $TOKEN"

echo "== 1) initialize（响应头应含 Mcp-Session-Id）=="
curl -si $B -H "$HA" -H "$H1" -H "$H2" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}' | grep -i "mcp-session-id\|protocolVersion" | head -3
echo "== 2) notifications/initialized 应 202 =="
curl -s -o /dev/null -w "%{http_code}\n" $B -H "$HA" -H "$H1" -H "$H2" -d '{"jsonrpc":"2.0","method":"notifications/initialized"}'
echo "== 3) tools/list 工具数（基础 26+，随技能包加载动态变化）=="
curl -s $B -H "$HA" -H "$H1" -H "$H2" -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | grep -o '"name"' | wc -l
echo "== 4) tools/call aa_status =="
curl -s $B -H "$HA" -H "$H1" -H "$H2" -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"aa_status","arguments":{}}}'; echo
echo "== 5) GET 应 405 =="
curl -s -o /dev/null -w "%{http_code}\n" $B -H "$HA" -H 'Accept: text/event-stream'
