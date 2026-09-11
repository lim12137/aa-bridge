/**
 * aa-client 自测（对活桥）：node test\test.mjs
 * 逐行输出 ✅/❌；全过 exit 0，否则 exit 1。
 * 注：AA 存在重启窗口期，连接拒绝自动重试 3 次（见 L:\121\aa-bridge\research\已测不可用清单.md）。
 */

import { AABridgeClient, AABridgeError } from '../aa-client.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TABLE = process.env.AA_BRIDGE_TABLE || 'C:/Users/hopemyl/AppData/Local/aardio/autos/aa-bridge.table';

let failed = 0;

function report(name, ok, detail = '') {
  const line = ok ? '✅' : '❌';
  console.log(`${line} ${name}${detail ? ' —— ' + detail : ''}`);
  if (!ok) failed++;
}

/** 连接拒绝类错误重试（AA 重启窗口期） */
async function withRetry(fn, times = 3, delayMs = 3000) {
  let lastErr;
  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const refused = e instanceof AABridgeError && e.kind === 'network' &&
        (e.code === 'ECONNREFUSED' || e.code === 'EHOSTUNREACH');
      if (!refused || i === times - 1) throw e;
      console.log(`⏳ 连接被拒（第 ${i + 1} 次），${delayMs / 1000}s 后重试（AA 可能正在重启窗口期）…`);
      await sleep(delayMs);
    }
  }
  throw lastErr;
}

// ── 1. discoverToken 找到 token ─────────────────────────────────────────
let token;
try {
  token = AABridgeClient.discoverToken(TABLE);
  report(
    'discoverToken 找到 token',
    typeof token === 'string' && token.length >= 8,
    `len=${token?.length}`,
  );
} catch (e) {
  report('discoverToken 找到 token', false, e.message);
}

if (!token) {
  console.log('（无 token，后续用例跳过）');
  process.exit(1);
}

// ── 2. status().bridge === true ─────────────────────────────────────────
const client = new AABridgeClient({ token });
try {
  const s = await withRetry(() => client.status());
  report('status().bridge === true', s?.bridge === true, `pid=${s?.pid} port=${s?.port}`);
} catch (e) {
  report('status().bridge === true', false, e.message);
}

// ── 3. tools() 数量 >= 20 ───────────────────────────────────────────────
let toolCount = -1;
try {
  const t = await withRetry(() => client.tools());
  const list = Array.isArray(t) ? t : (t?.tools ?? []);
  toolCount = list.length;
  report('tools() 数量 >= 20', toolCount >= 20, `count=${toolCount}`);
} catch (e) {
  report('tools() 数量 >= 20', false, e.message);
}

// ── 4. call('aa_status', {}) 成功 ───────────────────────────────────────
try {
  const r = await withRetry(() => client.call('aa_status', {}));
  const ok = r && r.isError === false && r.result !== undefined;
  report("call('aa_status',{}) 成功", ok, `isError=${r?.isError}`);
} catch (e) {
  report("call('aa_status',{}) 成功", false, e.message);
}

// ── 5. 错 token 收 401（预期失败断言）──────────────────────────────────
try {
  const bad = new AABridgeClient({ token: 'definitely-wrong-token', baseUrl: client.baseUrl });
  let got401 = false;
  try {
    await bad.status();
  } catch (e) {
    got401 = e instanceof AABridgeError && e.status === 401;
    report('错 token 收 401', got401, `status=${e.status} msg=${e.message}`);
  }
  if (!got401 && !(failed > 0)) report('错 token 收 401', false, '未抛异常（意外成功）');
} catch (e) {
  report('错 token 收 401', false, e.message);
}

console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`);
process.exit(failed === 0 ? 0 : 1);
