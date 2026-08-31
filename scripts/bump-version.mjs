import fs from 'node:fs';
import path from 'node:path';

const targetPackages = [
	'./package.json',
	'./extension/package.json',
	'./server/package.json',
	'./web/package.json',
];

const arg = process.argv[2];

if (!arg) {
	console.error('❌ 사용법: npm run bump <patch | minor | major | 특정버전(예: 1.1.1)>');
	process.exit(1);
}

// 루트 package.json의 현재 버전 읽기
const rootPkgPath = path.resolve('./package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
const currentVersion = rootPkg.version;

let newVersion = arg;

if (['patch', 'minor', 'major'].includes(arg)) {
	const parts = currentVersion.split('.').map(Number);
	if (parts.length !== 3 || parts.some(isNaN)) {
		console.error(`❌ 현재 버전 형식(${currentVersion})을 파싱할 수 없습니다.`);
		process.exit(1);
	}

	let [major, minor, patch] = parts;
	if (arg === 'patch') patch += 1;
	if (arg === 'minor') {
		minor += 1;
		patch = 0;
	}
	if (arg === 'major') {
		major += 1;
		minor = 0;
		patch = 0;
	}

	newVersion = `${major}.${minor}.${patch}`;
}

console.log(`🚀 버전 변경: v${currentVersion} ➔ v${newVersion}\n`);

for (const relPath of targetPackages) {
	const absPath = path.resolve(relPath);
	if (fs.existsSync(absPath)) {
		const content = fs.readFileSync(absPath, 'utf-8');
		const pkg = JSON.parse(content);
		pkg.version = newVersion;
		fs.writeFileSync(absPath, JSON.stringify(pkg, null, '\t') + '\n', 'utf-8');
		console.log(`  ✅ ${relPath} ➔ ${newVersion}`);
	}
}

console.log(`\n🎉 모든 패키지 버전이 v${newVersion}으로 성공적으로 업데이트되었습니다!`);
