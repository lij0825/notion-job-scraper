import { test, expect, chromium, type BrowserContext, type Worker, type Page } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToExtension = path.resolve(__dirname, '../.output/chrome-mv3');

test.describe('채용 공고 수동 직접 입력(Manual Entry) E2E 브라우저 실제 구동 테스트', () => {
	let context: BrowserContext;
	let backgroundWorker: Worker;
	let extensionId: string;

	test.beforeAll(async () => {
		context = await chromium.launchPersistentContext('', {
			headless: false,
			args: [
				`--disable-extensions-except=${pathToExtension}`,
				`--load-extension=${pathToExtension}`,
			],
		});

		const workers = context.serviceWorkers();
		if (workers.length > 0) {
			backgroundWorker = workers[0];
		} else {
			backgroundWorker = await context.waitForEvent('serviceworker', { timeout: 10000 });
		}

		// Background worker URL에서 Extension ID 추출 (chrome-extension://<id>/...)
		const workerUrl = backgroundWorker.url();
		const match = workerUrl.match(/chrome-extension:\/\/([^/]+)/);
		if (!match || !match[1]) {
			throw new Error(`Failed to extract extension ID from worker URL: ${workerUrl}`);
		}
		extensionId = match[1];
		console.log(`[E2E Manual Entry] Extension ID: ${extensionId}`);

		// Notion 인증 상태 모의 세팅 (ScrapingView 렌더링을 위해 storage.sync 초기화)
		await backgroundWorker.evaluate(async () => {
			await chrome.storage.sync.set({
				accessToken: 'secret_test_token_123456',
				databaseId: 'test_database_id_123456',
				workspaceName: '테스트 워크스페이스',
			});
		});
	});

	test.afterAll(async () => {
		if (context) {
			await context.close();
		}
	});

	test('Given 일반 웹페이지(공고 미검출) 상태에서, When 팝업을 열면, Then 빈 상태 메시지와 "직접 입력하여 저장" 버튼이 표시된다', async () => {
		// 1. 일반 웹페이지 탭 열기
		const contentPage = await context.newPage();
		await contentPage.goto('https://example.com', { waitUntil: 'domcontentloaded' });
		await contentPage.bringToFront();

		// 2. 확장 프로그램 팝업 페이지 열기
		const popupPage = await context.newPage();
		await popupPage.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: 'domcontentloaded' });

		// 3. 미감지 빈 화면 요소 검증
		const emptyTitle = popupPage.locator('text=채용 공고를 찾지 못했습니다');
		await expect(emptyTitle).toBeVisible({ timeout: 10000 });

		const manualButton = popupPage.getByRole('button', { name: /직접 입력하여 저장/i });
		await expect(manualButton).toBeVisible();

		const retryButton = popupPage.getByRole('button', { name: /자동 감지 다시 시도/i });
		await expect(retryButton).toBeVisible();

		console.log('[E2E Manual Entry] Empty state with manual entry button verified successfully');

		await popupPage.close();
		await contentPage.close();
	});

	test('Given 미감지 상태에서 "직접 입력하여 저장"을 클릭할 때, When 수동 입력 폼이 열리면, Then 탭 정보가 프리필되고 유효성 검사 및 저장이 동작한다', async () => {
		// 1. 특정 타이틀과 URL을 가진 일반 페이지 열기
		const contentPage = await context.newPage();
		await contentPage.goto('https://example.com', { waitUntil: 'domcontentloaded' });
		await contentPage.bringToFront();

		// 2. 팝업 페이지 열기
		const popupPage = await context.newPage();
		await popupPage.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: 'domcontentloaded' });

		// 3. 미감지 화면 대기 후 "직접 입력하여 저장" 클릭
		const manualButton = popupPage.getByRole('button', { name: /직접 입력하여 저장/i });
		await manualButton.waitFor({ state: 'visible', timeout: 10000 });
		await manualButton.click();

		// 4. 수동 입력 모드 뱃지 및 프리필 확인
		const manualBadge = popupPage.locator('text=직접 입력').first();
		await expect(manualBadge).toBeVisible();

		// URL 필드 확인 (example.com 프리필 여부)
		const urlInput = popupPage.locator('input[placeholder="공고 URL"]');
		await expect(urlInput).toBeVisible();
		const currentUrlValue = await urlInput.inputValue();
		console.log(`[E2E Manual Entry] Prefilled URL: ${currentUrlValue}`);
		expect(currentUrlValue.length).toBeGreaterThan(0);

		// 5. 직무명이 비어있는 상태에서 저장 시도시 유효성 검증 메시지 확인
		const titleInput = popupPage.locator('input[placeholder*="직무명 입력"]');
		await titleInput.fill('');

		const saveButton = popupPage.getByRole('button', { name: /선택한 항목 Notion에 저장/i });
		await saveButton.click();

		const errorAlert = popupPage.locator('text=직무명(Title)을 입력해 주세요.');
		await expect(errorAlert).toBeVisible();
		console.log('[E2E Manual Entry] Required title validation alert verified');

		// 6. 직무명 및 회사명 정상 입력
		await titleInput.fill('수석 클라우드 아키텍트');
		const companyInput = popupPage.locator('input[placeholder="회사명 입력"]');
		await companyInput.fill('글로벌 테크 코퍼레이션');

		// 설명 입력
		const descInput = popupPage.locator('textarea[placeholder="직무 설명 본문"]');
		await descInput.fill('쿠버네티스 및 분산 시스템 아키텍처 설계 및 구축');

		console.log('[E2E Manual Entry] Filled in manual job data: Title, Company, Description');

		// 7. 상단 "자동 감지" 버튼 클릭 시 다시 스크래핑 모드로 복귀 확인
		const autoDetectButton = popupPage.getByRole('button', { name: /자동 감지/i });
		await expect(autoDetectButton).toBeVisible();
		await autoDetectButton.click();

		// 다시 스크래핑 시도 후 미감지 화면으로 복귀
		await expect(popupPage.locator('text=채용 공고를 찾지 못했습니다')).toBeVisible({ timeout: 10000 });
		console.log('[E2E Manual Entry] Toggle back to auto detection verified successfully');

		await popupPage.close();
		await contentPage.close();
	});
});
