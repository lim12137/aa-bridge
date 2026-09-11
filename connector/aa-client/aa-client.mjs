/**
 * aa-client —— aa-bridge 零依赖 ESM 客户端（Layer 0）
 *
 * 仅用 Node 内置能力（fetch / fs / path），无任何 npm 依赖。
 * 所有网络/HTTP 错误均抛 AABridgeError，message 为中文，带 .status / .code / .kind 字段。
 *
 * 环境变量覆盖：
 *   AA_BRIDGE_URL    桥地址（默认 http://127.0.0.1:9123）
 *   AA_BRIDGE_TOKEN  显式 token（跳过从 table 文件发现）
 *   AA_BRIDGE_TABLE  aa-bridge.table 路径（默认 C:/Users/hopemyl/AppData/Local/aardio/autos/aa-bridge.table）
 *   AA_BRIDGE_TIMEOUT_MS  默认请求超时（毫秒，默认 120000）
 */

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_TABLE = 'C:/Users/hopemyl/AppData/Local/aardio/autos/aa-bridge.table';
const DEFAULT_BASE_URL = 'http://127.0.0.1:9123';
const DEFAULT_TIMEOUT_MS = 120000;

/** 桥客户端错误。kind: 'http'（拿到 HTTP 响应但非 2xx）| 'network'（连接/超时层失败） */
export class AABridgeError extends Error {
  /**
   * @param {string} message 中文错误信息
   * @param {object} [opts]
   * @param {number} [opts.status] HTTP 状态码；网络层错误为 0
   * @param {string} [opts.code]   错误码：如 'ECONNREFUSED' / 'ETIMEDOUT' / HTTP 码字符串
   * @param {'http'|'network'} [opts.kind]
   * @param {*} [opts.body] 响应体原文（尽力截取）
   */
  constructor(message, opts = {}) {
    super(message);
    this.name = 'AABridgeError';
    this.status = opts.status ?? 0;
    this.code = opts.code ?? '';
    this.kind = opts.kind ?? (opts.status ? 'http' : 'network');
    this.body = opts.body ?? null;
  }
}

function httpErrorMessage(status, bodyText) {
  if (status === 401) return 'token 不匹配（aa-bridge.table 与运行实例不一致？）';
  if (status === 403) return '桥已关闭';
  if (status === 404 || status === 405) return `接口不存在或方法不允许（HTTP ${status}）`;
  const detail = bodyText ? `: ${bodyText.slice(0, 160)}` : '';
  return `桥返回 HTTP ${status}${detail}`;
}

/** 把 fetch 抛出的底层异常归一为 AABridgeError（中文信息） */
function normalizeNetworkError(e) {
  // Node fetch 连接失败 → TypeError('fetch failed')，真实原因在 e.cause
  const cause = e && typeof e === 'object' ? e.cause : undefined;
  const code = cause && cause.code ? String(cause.code) : '';
  const causeMsg = cause && cause.message ? String(cause.message) : '';
  // undici 对部分端口（如 9/19 等保留端口）直接拒连，报 'bad port' 而非 ECONNREFUSED
  if (code === 'ECONNREFUSED' || code === 'EHOSTUNREACH' || code === 'ENETUNREACH' || causeMsg === 'bad port') {
    return new AABridgeError('桥未开启或 AA 副本未运行', {
      status: 0, code: code || 'EBADPORT', kind: 'network',
    });
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return new AABridgeError(`桥地址无法解析（${code}）`, { status: 0, code, kind: 'network' });
  }
  if (code === 'ECONNRESET' || code === 'EPIPE') {
    return new AABridgeError('连接被桥中断', { status: 0, code, kind: 'network' });
  }
  if (e && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
    return new AABridgeError('请求超时', { status: 0, code: 'ETIMEDOUT', kind: 'network' });
  }
  const msg = e && e.message ? e.message : String(e);
  return new AABridgeError(`网络错误：${msg}`, { status: 0, code: code || 'ENETWORK', kind: 'network' });
}

export class AABridgeClient {
  /**
   * @param {object} [opts]
   * @param {string} [opts.baseUrl]    桥根地址，结尾斜杠会被去掉
   * @param {string} [opts.token]      显式 token；缺省时按 tablePath / 环境变量 / 默认路径发现
   * @param {string} [opts.tablePath]  aa-bridge.table 路径（仅 token 未显式给出时用于发现）
   * @param {number} [opts.timeoutMs]  默认请求超时毫秒
   */
  constructor(opts = {}) {
    this.baseUrl = String(opts.baseUrl ?? process.env.AA_BRIDGE_URL ?? DEFAULT_BASE_URL)
      .trim()
      .replace(/\/+$/, '');
    this.tablePath = path.resolve(
      opts.tablePath ?? process.env.AA_BRIDGE_TABLE ?? DEFAULT_TABLE,
    );
    this.timeoutMs = Number(opts.timeoutMs ?? process.env.AA_BRIDGE_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
    // 缺 token 时自动发现（tablePath → 环境变量 → 默认路径）；发现失败会抛 AABridgeError
    this.token = opts.token ?? process.env.AA_BRIDGE_TOKEN ?? AABridgeClient.discoverToken(this.tablePath);
  }

  /**
   * 从 aa-bridge.table 抓 token（正则 token\s*=\s*"([^"]+)"）。
   * 文件带 BOM 不影响 utf8 读取与正则。
   * @param {string} [tablePath]
   * @returns {string} token
   * @throws {AABridgeError} 文件不存在或未匹配到 token
   */
  static discoverToken(tablePath = process.env.AA_BRIDGE_TABLE ?? DEFAULT_TABLE) {
    const p = path.resolve(tablePath);
    let text;
    try {
      text = fs.readFileSync(p, 'utf8');
    } catch (e) {
      throw new AABridgeError(`无法读取 aa-bridge.table（${p}）：${e.message}`, {
        status: 0, code: 'ENOENT', kind: 'network',
      });
    }
    const m = text.match(/token\s*=\s*"([^"]+)"/);
    if (!m) {
      throw new AABridgeError(`未在 ${p} 中匹配到 token（token = "..."）`, {
        status: 0, code: 'ETOKEN', kind: 'network',
      });
    }
    return m[1];
  }

  /** 内部通用请求 */
  async _request(method, apiPath, bodyObj, timeoutMs) {
    const url = this.baseUrl + apiPath;
    const effectiveTimeout = timeoutMs ?? this.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new AABridgeError('请求超时', { status: 0, code: 'ETIMEDOUT', kind: 'network' })),
      effectiveTimeout,
    );
    let res;
    try {
      res = await fetch(url, {
        method,
        headers: {
          'X-AA-Token': this.token,
          ...(bodyObj !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined,
        signal: controller.signal,
      });
    } catch (e) {
      throw normalizeNetworkError(e);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AABridgeError(httpErrorMessage(res.status, text), {
        status: res.status, code: String(res.status), kind: 'http', body: text.slice(0, 1024),
      });
    }

    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json')) {
      try {
        return await res.json();
      } catch {
        const text = await res.text().catch(() => '');
        throw new AABridgeError(`桥响应不是合法 JSON：${text.slice(0, 160)}`, {
          status: res.status, code: 'EBADJSON', kind: 'http', body: text,
        });
      }
    }
    return res.text();
  }

  /** GET /api/status → 桥状态（bridge/pid/port/version...） */
  async status() {
    return this._request('GET', '/api/status');
  }

  /** GET /api/tools → 工具清单 */
  async tools() {
    return this._request('GET', '/api/tools');
  }

  /**
   * POST /api/tools/call 调用工具。
   * @param {string} name 工具名
   * @param {object} [args] 工具参数（路径一律用正斜杠，避免双层转义坑）
   * @param {object} [opts] { timeoutMs }
   * @returns {Promise<object>} 桥返回体原样（含 isError / result 字段，不拆包）
   */
  async call(name, args = {}, opts = {}) {
    return this._request('POST', '/api/tools/call', { name, arguments: args ?? {} }, opts.timeoutMs);
  }

  /**
   * 健康检查：任何情况下不抛异常。
   * @returns {Promise<{alive:boolean, reason?:string, [k:string]:*}>}
   *   活：{ alive:true, bridge:true, pid, port, ... }（status 响应展开）
   *   死：{ alive:false, reason:'中文原因' }
   */
  async health() {
    try {
      const s = await this.status();
      return { alive: true, ...s };
    } catch (e) {
      const err = e instanceof AABridgeError ? e : normalizeNetworkError(e);
      return { alive: false, reason: err.message };
    }
  }
}

export default AABridgeClient;
