import fs from 'node:fs';
import path from 'node:path';

const OUTPUT_DIRS = ['.output/chrome-mv3', '.output/firefox-mv2'];
const FORBIDDEN_PATTERNS = ['localhost:3000', '127.0.0.1:3000'];

let hasError = false;

function scanDirectory(dir) {
	if (!fs.existsSync(dir)) return;

	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			scanDirectory(fullPath);
		} else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.json') || entry.name.endsWith('.html'))) {
			const content = fs.readFileSync(fullPath, 'utf-8');

			for (const pattern of FORBIDDEN_PATTERNS) {
				if (content.includes(pattern)) {
					console.error(`❌ [Bundle Integrity Violation] Found forbidden '${pattern}' in: ${fullPath}`);
					hasError = true;
				}
			}
		}
	}
}

console.log('🔍 [Bundle Integrity Check] Scanning production build artifacts for forbidden localhost references...');

for (const dir of OUTPUT_DIRS) {
	scanDirectory(dir);
}

if (hasError) {
	console.error('❌ Bundle verification FAILED: Production build contains localhost references!');
	process.exit(1);
} else {
	console.log('✅ Bundle verification PASSED: No forbidden localhost references found in production artifacts.');
}
