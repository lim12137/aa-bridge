#!/usr/bin/env node
/**
 * aa-cli —— aa-bridge 命令行（Layer 2）
 *
 * 子命令：
 *   status                     桥状态
 *   tools                      工具清单
 *   call <工具名> [JSON参数]    调用桥工具
 *   run --code "return 40+2"   执行 aardio 代码
 *   run <代码文件路径>          执行代码文件
 *
 * stdout 恒输出单行 JSON；成功 exit 0，失败 exit 1。
 * run 桥优先：桥连接拒绝时自动降级 aa-runner.exe（env AA_RUNNER 可覆盖路径）。
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import { AABridgeClient, AABridgeError } from '../aa-client/aa-client.mjs';

const USAGE = '用法: aa.mjs status | tools | call <工具名> [JSON参数] | run --code "代码" | run <代码文件路径>';
const RUNNER_TIMEOUT_MS = Number(process.env.AA_RUNNER_TIMEOUT_MS) || 120000;

// ── 输出：恒单行 JSON ────────────────────────────────────────────────────
function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}
function fail(cmd, error, extra = {}) {
  emit({ ok: false, cmd, error, ...extra });
  process.exit(1);
}

// ── run 结果值解包：剥掉 {ok:true,result:v} / {value:v} 等常见包裹 ───────
function pickValue(execPayload) {
  if (execPayload && typeof execPayload === 'object' && !Array.isArray(execPayload)) {
    if ('result' in execPayload) return execPayload.result;
    if ('value' in execPayload) return execPayload.value;
    if ('ret' in execPayload) return execPayload.ret;
  }
  return execPayload;
}

// ── 降级：aa-runner.exe（独立执行器，不依赖桥）──────────────────────────
function runnerPath() {
  if (process.env.AA_RUNNER) return path.resolve(process.env.AA_RUNNER);
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', 'aa-runner', 'dist', 'aa-runner.exe');
}

/** 走 aa-runner.exe 执行代码：写 %TEMP% 请求文件 → cmd /c 跑 exe 重定向到 out → 解析单行 JSON */
function runViaRunner(code) {
  const exe = runnerPath();
  if (!fs.existsSync(exe)) {
    return { ok: false, error: `降级失败：aa-runner.exe 不存在（${exe}，可用环境变量 AA_RUNNER 指定）` };
  }
  const reqFile = path.join(os.tmpdir(), `aa-cli-req-${process.pid}-${Date.now()}.json`);
  const outFile = path.join(os.tmpdir(), `aa-cli-out-${process.pid}-${Date.now()}.txt`);
  try {
    fs.writeFileSync(reqFile, JSON.stringify({ action: 'exec', code }), 'utf8');
    execSync(`cmd /c ""${exe}" "${reqFile}" > "${outFile}" 2>&1"`, {
      timeout: RUNNER_TIMEOUT_MS,
      stdio: 'ignore',
    });
    const raw = fs.readFileSync(outFile, 'utf8').trim();
    const line = raw.split(/\r?\n/).filter((l) => l.trim()).pop() || '';
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      return { ok: false, error: `降级输出不是合法 JSON：${raw.slice(0, 200)}` };
    }
    if (parsed.ok !== true) {
      return { ok: false, error: parsed.error || 'aa-runner 执行失败' };
    }
    return { ok: true, result: pickValue(parsed), printOutput: parsed.printOutput };
  } catch (e) {
    return { ok: false, error: `aa-runner 运行失败：${e.message}` };
  } finally {
    for (const f of [reqFile, outFile]) {
      try { fs.rmSync(f, { force: true }); } catch { /* 忽略清理失败 */ }
    }
  }
}

/** 判断是否「桥不可达」（唯一触发降级的条件：连接拒绝类错误，含 undici bad port） */
function isConnRefused(e) {
  return e instanceof AABridgeError && e.kind === 'network' &&
    ['ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'EBADPORT', 'ENOTFOUND', 'EAI_AGAIN'].includes(e.code);
}

// ── 主逻辑 ──────────────────────────────────────────────────────────────
async function main() {
  const [cmd, ...rest] = process.argv.slice(2);

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    fail('help', USAGE);
  }

  let client;
  try {
    client = new AABridgeClient();
  } catch (e) {
    fail(cmd, e.message);
  }

  try {
    switch (cmd) {
      case 'status': {
        const s = await client.status();
        emit({ ok: true, cmd, ...s });
        process.exit(0);
        break;
      }
      case 'tools': {
        const t = await client.tools();
        const list = Array.isArray(t) ? t : (t?.tools ?? []);
        emit({ ok: true, cmd, count: list.length, names: list.map((x) => x.name) });
        process.exit(0);
        break;
      }
      case 'call': {
        const name = rest[0];
        if (!name) fail('call', USAGE);
        let args = {};
        if (rest[1] !== undefined) {
          try {
            args = JSON.parse(rest[1]);
          } catch (e) {
            fail('call', `参数不是合法 JSON：${e.message}`);
          }
        }
        const body = await client.call(name, args);
        if (body?.isError === true) {
          fail('call', '工具返回 isError', { name, result: body.result });
        }
        emit({ ok: true, cmd, name, ...body });
        process.exit(0);
        break;
      }
      case 'run': {
        let code;
        if (rest[0] === '--code' || rest[0] === '-c') {
          code = rest[1];
          if (code === undefined) fail('run', '用法: run --code "return 40+2"');
        } else if (rest[0]) {
          const file = rest[0];
          try {
            code = fs.readFileSync(file, 'utf8');
          } catch (e) {
            fail('run', `无法读取代码文件 ${file}：${e.message}`);
          }
        } else {
          fail('run', USAGE);
        }

        try {
          const body = await client.call('execute_code', { code });
          if (body?.isError === true) {
            fail('run', '工具返回 isError', { via: 'bridge', result: body.result });
          }
          emit({ ok: true, cmd, via: 'bridge', result: pickValue(body?.result) });
          process.exit(0);
        } catch (e) {
          if (isConnRefused(e)) {
            const r = runViaRunner(code);
            if (r.ok) {
              emit({ ok: true, cmd, via: 'runner', ...r });
              process.exit(0);
            }
            fail('run', r.error, { via: 'runner' });
          }
          fail(cmd, e.message, e instanceof AABridgeError ? { status: e.status } : {});
        }
        break;
      }
      default:
        fail(cmd, `未知子命令「${cmd}」。${USAGE}`);
    }
  } catch (e) {
    fail(cmd, e instanceof AABridgeError ? e.message : `执行失败：${e.message}`);
  }
}

main();
