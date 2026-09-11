/**
 * dsh-aa-bridge — DeepSeek Harness (dsh) connector for the aa-bridge HTTP API.
 *
 * A cordis plugin mounted through the profile bundle-patch mechanism. At boot
 * it asks the aa-bridge HTTP server for its tool catalog (GET /api/tools) and
 * registers every bridge tool as a native harness tool through `ctx.tools`:
 *
 *   name         aa_<bridge tool name>  (no double prefix when the bridge
 *                                     name already starts with the prefix)
 *   description  the bridge's description, verbatim
 *   parameters   the bridge's inputSchema, verbatim (object-rooted JSON Schema)
 *   execute      POST /api/tools/call {name, arguments} — the bridge response
 *                body ({result, isError}) is passed through as the tool value
 *
 * Degradation contract: if the bridge is unreachable (AA closed / bridge off /
 * token missing / timeout), the plugin logs ONE warning line and registers
 * nothing. It never throws out of apply(), so the host boot cannot crash.
 *
 * apply() is async and the activation is awaited: the loader's fiber only
 * settles once the tools are registered, so consumers that wait for the
 * loader (`ctx.get("loader")?.await()`, one-shot runners) observe a stable
 * registry. The catalog fetch is bounded by bootTimeoutMs, so a dead bridge
 * costs the boot at most that budget.
 *
 * Configuration (loader row config wins over environment):
 *   config / env                    default
 *   baseUrl   / AA_BRIDGE_URL       http://127.0.0.1:9123
 *   token     / AA_BRIDGE_TOKEN     discovered from aa-bridge.table
 *   tablePath / AA_BRIDGE_TABLE     aa-client default (~AppData aa-bridge.table)
 *   toolPrefix / AA_BRIDGE_TOOL_PREFIX  "aa_"
 *   callTimeoutMs / AA_BRIDGE_TIMEOUT_MS  120000 (also the per-call deadline)
 *   bootTimeoutMs / AA_BRIDGE_BOOT_TIMEOUT_MS  6000 (catalog fetch budget at boot)
 *
 * NOTE: do not rename these variables with a `DSH_` prefix — the harness boot
 * rejects any `DSH_*` name found in a boot-time .env layer.
 */

import { AABridgeClient } from 'aa-client';

const LOG_TAG = '[dsh-aa-bridge]';

/** Cordis plugin name used by loader diagnostics. */
export const name = 'aa-bridge';

/** The seams this plugin consumes. */
export const inject = ['tools'];

function str(value, fallback) {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function positiveInt(value, fallback, minimum) {
	const n = parseInt(value, 10);
	if (!Number.isFinite(n) || n <= 0) return fallback;
	return n < minimum ? minimum : n;
}

function isObjectRootSchema(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value) && value.type === 'object';
}

export async function apply(ctx, config = {}) {
	const cfg = {
		baseUrl: str(config.baseUrl ?? process.env.AA_BRIDGE_URL, 'http://127.0.0.1:9123'),
		token: str(config.token ?? process.env.AA_BRIDGE_TOKEN, ''),
		tablePath: str(config.tablePath ?? process.env.AA_BRIDGE_TABLE, ''),
		toolPrefix: str(config.toolPrefix ?? process.env.AA_BRIDGE_TOOL_PREFIX, 'aa_'),
		callTimeoutMs: positiveInt(config.callTimeoutMs ?? process.env.AA_BRIDGE_TIMEOUT_MS, 120000, 1000),
		bootTimeoutMs: positiveInt(config.bootTimeoutMs ?? process.env.AA_BRIDGE_BOOT_TIMEOUT_MS, 6000, 1000)
	};

	try {
		await activate();
	} catch (error) {
		// Contained degradation: warn and settle — never fail the boot fiber.
		console.warn(`${LOG_TAG} AA bridge unreachable, no tools registered (${error?.message ?? error})`);
	}

	async function activate() {
		const client = new AABridgeClient({
			baseUrl: cfg.baseUrl,
			...(cfg.token !== '' ? { token: cfg.token } : {}),
			...(cfg.tablePath !== '' ? { tablePath: cfg.tablePath } : {}),
			timeoutMs: cfg.callTimeoutMs
		});
		// Bounded catalog fetch: a dead bridge cannot stall the boot longer than
		// bootTimeoutMs. (client.tools() has no per-call timeout parameter; the
		// race below abandons — not aborts — the pending request.)
		const catalog = await withBudget(client.tools(), cfg.bootTimeoutMs);
		const tools = Array.isArray(catalog?.tools) ? catalog.tools : [];
		if (tools.length === 0) {
			console.warn(`${LOG_TAG} bridge at ${cfg.baseUrl} answered with an empty tool catalog; nothing to register`);
			return;
		}

		const seen = new Set();
		let registered = 0;
		for (const tool of tools) {
			const bridgeName = typeof tool?.name === 'string' ? tool.name.trim() : '';
			if (bridgeName.length === 0) continue;
			// aa_ + <bridge name>, without doubling when the bridge is already prefixed
			// (aa_status stays aa_status; execute_code becomes aa_execute_code).
			const harnessName = bridgeName.startsWith(cfg.toolPrefix) ? bridgeName : cfg.toolPrefix + bridgeName;
			if (seen.has(harnessName)) {
				console.warn(`${LOG_TAG} duplicate tool name after prefixing, skipped: ${harnessName}`);
				continue;
			}
			seen.add(harnessName);
			try {
				const disposer = ctx.tools.register({
					name: harnessName,
					description: typeof tool.description === 'string' && tool.description.length > 0
						? tool.description
						: `AA bridge tool "${bridgeName}".`,
					parameters: isObjectRootSchema(tool.inputSchema) ? tool.inputSchema : { type: 'object', properties: {} },
					async execute(args) {
						// Pass the bridge response body through verbatim ({result, isError}).
						// Transport/HTTP failures throw — the harness renders them as a
						// failed tool call; business errors (isError: true) stay data.
						return await client.call(bridgeName, args ?? {}, { timeoutMs: cfg.callTimeoutMs });
					},
					output: {
						schema: { type: 'object', additionalProperties: true },
						render(_args, value) {
							return [{ type: 'text', text: JSON.stringify(value ?? {}) }];
						}
					},
					// The bridge serializes calls itself; the deadline needs headroom
					// over the per-request timeout for queueing on the bridge side.
					timeoutMs: cfg.callTimeoutMs + 5000
				});
				// The disposer must be YIELDED from a generator effect: on this cordis
				// build ctx.effect(fn, label) RUNS fn immediately (fn is the action;
				// its return/yield is the cleanup), so passing the disposer directly
				// would unregister the tool during boot.
				ctx.effect(function* () { yield disposer; }, `aa-bridge: tool ${harnessName}`);
				registered += 1;
			} catch (error) {
				console.warn(`${LOG_TAG} failed to register tool ${harnessName}, skipped (${error?.message ?? error})`);
			}
		}
		console.log(`${LOG_TAG} registered ${registered}/${tools.length} tool(s) from ${cfg.baseUrl}: ${[...seen].join(', ')}`);
	}

	/** Race a promise against a boot budget; the loser side is abandoned, not aborted. */
	function withBudget(promise, ms) {
		let timer;
		const timeout = new Promise((_, reject) => {
			timer = setTimeout(() => reject(new Error(`no answer within ${ms}ms`)), ms);
		});
		return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
	}
}
