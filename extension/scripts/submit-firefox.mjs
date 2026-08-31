import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import packageJson from '../package.json' with { type: 'json' };

const version = packageJson.version;
const releaseDir = path.resolve(`.output/releases/v${version}`);

const firefoxZip = path.join(releaseDir, `notion-job-scraper-${version}-firefox.zip`);
const sourcesZip = path.join(releaseDir, `notion-job-scraper-${version}-sources.zip`);

if (!fs.existsSync(firefoxZip)) {
	console.error(`❌ Firefox zip not found: ${firefoxZip}`);
	process.exit(1);
}

console.log(`📦 Preparing Firefox Add-ons submission for v${version}...`);
console.log(`  - Extension Zip: ${firefoxZip}`);
if (fs.existsSync(sourcesZip)) {
	console.log(`  - Sources Zip:   ${sourcesZip}`);
}

const args = ['wxt', 'submit', '--firefox-zip', `"${firefoxZip}"`];
if (fs.existsSync(sourcesZip)) {
	args.push('--firefox-sources-zip', `"${sourcesZip}"`);
}

const cmd = `npx ${args.join(' ')}`;
console.log(`🚀 Executing: ${cmd}\n`);

try {
	execSync(cmd, { stdio: 'inherit', env: process.env });
} catch (err) {
	process.exit(1);
}
