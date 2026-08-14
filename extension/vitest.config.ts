import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./vitest.setup.ts'],
		include: ['**/*.test.{ts,tsx}'],
	},
	resolve: {
		alias: {
			'@': path.resolve(dirname, './'),
			'~': path.resolve(dirname, './'),
		},
	},
});
