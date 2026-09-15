// DshTray 本地插件挂载器（由托盘在 dsh 首启后调用，v2.0.4）
// 用法: node wire-plugins.mjs <localPluginsDir> <profilePackageJsonPath>
// 对 local-plugins 下每个插件：在 profile 的 dependencies 写 link: 行、
// 加入 dsh.profile.bundles；有变更时写回并向 stdout 输出 "WIRED:<name>"。
// 幂等：插件名已出现在 dependencies 或 bundles 即跳过。
import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [pluginsDir, pkgPath] = process.argv.slice(2);
if (!pluginsDir || !pkgPath) {
	console.error('usage: node wire-plugins.mjs <localPluginsDir> <profilePackageJsonPath>');
	process.exit(2);
}
if (!existsSync(pkgPath)) {
	console.error('profile package.json not found: ' + pkgPath);
	process.exit(2);
}

const pkgText = readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgText);
pkg.dependencies ??= {};
pkg.dsh ??= {};
pkg.dsh.profile ??= {};
pkg.dsh.profile.bundles ??= [];

let changed = false;
for (const entry of readdirSync(pluginsDir, { withFileTypes: true })) {
	if (!entry.isDirectory()) continue;
	const manifestPath = join(pluginsDir, entry.name, 'package.json');
	if (!existsSync(manifestPath)) continue;
	let name;
	try {
		name = JSON.parse(readFileSync(manifestPath, 'utf8')).name;
	} catch {
		console.warn(`skip ${entry.name}: unreadable package.json`);
		continue;
	}
	if (!name || name in pkg.dependencies || pkg.dsh.profile.bundles.includes(name)) continue;

	// link: 指向项目内的 local-plugins 绝对路径（HOME 已被托盘重定向，天然项目内）
	pkg.dependencies[name] = 'link:' + join(pluginsDir, entry.name).replaceAll('\\', '/');
	pkg.dsh.profile.bundles.push(name);
	pkg.dsh.profile.bundles.sort();
	changed = true;
	console.log('WIRED:' + name);
}

if (changed) {
	// 2 空格缩进 + 尾换行，与 dsh 生成的风格一致
	writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}
