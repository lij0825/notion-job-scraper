import { defineConfig } from 'wxt';

export default defineConfig({
	// React 모듈 활성화
	modules: ['@wxt-dev/module-react'],

	manifest: {
		name: 'Notion Job Scraper',
		description: '한국 채용 공고를 스크래핑하여 Notion 데이터베이스에 자동 동기화합니다.',
		version: '1.0.0',
		// Firefox 확장 ID 고정 — Redirect URI가 리빌드마다 변경되지 않도록 방지
		browser_specific_settings: {
			gecko: {
				id: 'notion-job-scraper@lij0825.com',
				data_collection_permissions: {
					required: []
				}
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
		// 스크래핑 대상 사이트 + Notion API 접근 허용
		host_permissions: [
			'https://jasoseol.com/*',
			'https://*.jasoseol.com/*',
			'https://www.wanted.co.kr/*',
			'https://www.saramin.co.kr/*',
			'https://www.jobkorea.co.kr/*',
			'https://api.notion.com/*',
		],
	},

	// Vite 설정: PROXY_URL 기본값 주입
	// .env 파일에 VITE_PROXY_URL=https://your-vercel-app.vercel.app 로 설정 가능
	vite: () => ({
		define: {
			// VITE_PROXY_URL 환경변수가 없으면 로컬 개발 서버 URL을 기본값으로 사용
			'import.meta.env.VITE_PROXY_URL': JSON.stringify(
				process.env['VITE_PROXY_URL'] ?? 'http://localhost:3000'
			),
			// NOTION_CLIENT_ID는 공개 정보이므로 클라이언트에 노출 가능
			'import.meta.env.VITE_NOTION_CLIENT_ID': JSON.stringify(
				process.env['VITE_NOTION_CLIENT_ID'] ?? ''
			),
		},
	}),
});
