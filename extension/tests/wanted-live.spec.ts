import { test, expect, chromium, type BrowserContext, type Worker } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { JobData, ScrapeResponse } from '../utils/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToExtension = path.resolve(__dirname, '../.output/chrome-mv3');

test.describe('원티드(Wanted) 실시간 라이브 채용 공고 스크래핑 검증', () => {
	let context: BrowserContext;
	let backgroundWorker: Worker;

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
	});

	test.afterAll(async () => {
		if (context) {
			await context.close();
		}
	});

	/**
	 * ScrapeResponse가 성공 상태인지 검증하고 TypeScript 타입을 좁힙니다(Type Narrowing).
	 */
	function assertScrapeSuccess(
		response: ScrapeResponse
	): asserts response is { success: true; data: JobData } {
		expect(response.success).toBe(true);
		if (!response.success) {
			throw new Error(response.error || 'Scraping failed');
		}
	}

	test('Given 원티드 채용 목록(wdlist)에 접속하여 실시간 첫 번째 공고로 이동했을 때, When 확장이 데이터를 스크래핑하면, Then 실제 데이터가 정상 추출된다', async () => {
		test.setTimeout(60000);
		const page = await context.newPage();

		// 1. wdlist 페이지 이동
		await page.goto('https://www.wanted.co.kr/wdlist', { waitUntil: 'domcontentloaded' });

		// 첫 번째 채용 공고 링크 대기 및 클릭 (/wd/ 또는 /jobdetail/)
		const jobLinkLocator = page.locator('a[href*="/wd/"], a[href*="/jobdetail/"]').first();
		await jobLinkLocator.waitFor({ state: 'visible', timeout: 20000 });
		const jobHref = await jobLinkLocator.getAttribute('href');
		console.log(`[Wanted Live] Found first job href: ${jobHref}`);

		await jobLinkLocator.click();

		// 상세 페이지 로드 및 Content script 동작 대기
		await page.waitForURL(/.*(\/wd\/|\/jobdetail\/)\d+/, { timeout: 20000 });
		await page.waitForLoadState('domcontentloaded');
		await page.waitForTimeout(2000); // Next.js 하이드레이션 / DOM 렌더링 대기

		const currentUrl = page.url();
		console.log(`[Wanted Live] Navigated to job detail page: ${currentUrl}`);

		// 2. Background Worker를 통해 SCRAPE 메시지 전송
		const response = await backgroundWorker.evaluate(async (url: string): Promise<ScrapeResponse> => {
			const tabs = await chrome.tabs.query({});
			const targetTab = tabs.find((t) => t.url && (t.url.includes('/wd/') || t.url.includes('/jobdetail/')));
			if (!targetTab?.id) {
				return {
					success: false,
					error: `Target tab not found for URL: ${url}. Open tabs: ${tabs.map((t) => t.url).join(', ')}`,
				};
			}

			return await new Promise<ScrapeResponse>((resolve) => {
				chrome.tabs.sendMessage(
					targetTab.id as number,
					{ type: 'SCRAPE' },
					(res: unknown) => {
						if (chrome.runtime.lastError) {
							resolve({
								success: false,
								error: chrome.runtime.lastError.message || 'Messaging error',
							});
						} else {
							resolve(res as ScrapeResponse);
						}
					}
				);
			});
		}, currentUrl);

		console.log('[Wanted Live] Scraped Response:', JSON.stringify(response, null, 2));

		// 3. Assertion 검증
		assertScrapeSuccess(response);

		const jobData = response.data;
		expect(jobData.site).toBe('wanted');
		expect(jobData.title.trim().length).toBeGreaterThan(0);
		expect(jobData.company.trim().length).toBeGreaterThan(0);
		expect(jobData.url).toMatch(/(\/wd\/|\/jobdetail\/)\d+/);
		expect(jobData.description.trim().length).toBeGreaterThan(0);

		console.log('====================================');
		console.log('🎉 [Wanted Live] Final Scraped Job Data:');
		console.log(JSON.stringify(jobData, null, 2));
		console.log('====================================');

		await page.close();
	});
});
