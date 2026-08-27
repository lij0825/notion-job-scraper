import { defineConfig } from 'wxt';
import fs from 'node:fs';
import path from 'node:path';
import packageJson from './package.json';

const DEFAULT_PROD_PROXY_URL = 'https://notion-job-scraper-server.vercel.app';
const DEFAULT_DEV_PROXY_URL = 'http://localhost:3000';

// 릴리즈 패키징 폴더 자동 보장
const releaseDir = path.resolve('.output/releases/v' + packageJson.version);
if (!fs.existsSync(releaseDir)) {
	fs.mkdirSync(releaseDir, { recursive: true });
}

export default defineConfig({
	// React 모듈 활성화
	modules: ['@wxt-dev/module-react'],

	manifest: {
		name: 'Notion Job Scraper',
		description: '한국 채용 공고를 스크래핑하여 Notion 데이터베이스에 자동 동기화합니다.',
		version: packageJson.version,
		// Firefox 확장 ID 고정 — Redirect URI가 리빌드마다 변경되지 않도록 방지
		browser_specific_settings: {
			gecko: {
				id: 'notion-job-scraper@lij0825.com',
				strict_min_version: '142.0',
				// @ts-expect-error Mozilla AMO mandatory data consent declaration
				data_collection_permissions: {
					required: ['none'],
				},
			},
		},
		// 확장 프로그램 아이콘 (Chrome 웹 스토어 + 툴바 표시)
		icons: {
			16: 'icon/16.png',
			32: 'icon/32.png',
			48: 'icon/48.png',
			128: 'icon/128.png',
		},
		// MV3 필수 권한
		permissions: ['storage', 'identity', 'tabs', 'scripting', 'activeTab'],
		// 스크래핑 대상 사이트 + Notion API + Vercel 프록시 서버 접근 허용
		host_permissions: [
			'https://jasoseol.com/*',
			'https://*.jasoseol.com/*',
			'https://www.wanted.co.kr/*',
			'https://www.saramin.co.kr/*',
			'https://www.jobkorea.co.kr/*',
			'https://api.notion.com/*',
			'https://*.vercel.app/*',
			'https://notion-job-scraper-server.vercel.app/*',
			'http://localhost/*',
			'http://127.0.0.1/*',
		],
	},

	// Zip 패키징 설정: 빌드된 배포 파일들을 releases/v{{version}}/ 폴더에 자동 분류
	zip: {
		artifactTemplate: 'releases/v{{version}}/{{name}}-{{version}}-{{browser}}.zip',
		sourcesTemplate: 'releases/v{{version}}/{{name}}-{{version}}-sources.zip',
	},

	hooks: {
		'zip:start': () => {
			import('node:fs').then((fs) => {
				import('node:path').then((path) => {
					const releaseDir = path.resolve('.output/releases/v' + packageJson.version);
					fs.mkdirSync(releaseDir, { recursive: true });
				});
			});
		},
	},

	// Vite 설정: 환경별 PROXY_URL 검증 및 주입
	vite: (env) => {
		const isProduction = env.mode === 'production' || env.command === 'build';
		const rawProxyUrl = process.env['VITE_PROXY_URL'];

		let resolvedProxyUrl: string;

		if (isProduction) {
			if (rawProxyUrl && (rawProxyUrl.includes('localhost') || rawProxyUrl.includes('127.0.0.1'))) {
				if (!process.env['ALLOW_LOCAL_PROXY_IN_PROD']) {
					throw new Error(
						`[Build Error] 프로덕션 빌드에 로컬 프록시 URL(${rawProxyUrl})이 지정되었습니다. ` +
						`VITE_PROXY_URL을 Vercel 프로덕션 도메인(${DEFAULT_PROD_PROXY_URL})으로 설정하거나 환경변수를 비워주세요.`
					);
				}
			}
			resolvedProxyUrl = rawProxyUrl || DEFAULT_PROD_PROXY_URL;
		} else {
			resolvedProxyUrl = rawProxyUrl || DEFAULT_DEV_PROXY_URL;
		}

		console.log(`[WXT Build] Mode: ${env.mode}, Resolved Proxy URL: ${resolvedProxyUrl}`);

		return {
			define: {
				'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
				'import.meta.env.VITE_SENTRY_DSN': JSON.stringify(
					process.env['VITE_SENTRY_DSN'] ?? ''
				),
				'import.meta.env.VITE_PROXY_URL': JSON.stringify(resolvedProxyUrl),
				'import.meta.env.VITE_NOTION_CLIENT_ID': JSON.stringify(
					process.env['VITE_NOTION_CLIENT_ID'] ?? ''
				),
			},
		};
	},
});
