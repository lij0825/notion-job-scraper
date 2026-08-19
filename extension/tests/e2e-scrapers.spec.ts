import { test, expect, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { JobData, ScrapeResponse } from '../utils/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pathToExtension = path.resolve(__dirname, '../.output/chrome-mv3');
const fixturesDir = path.resolve(__dirname, '../entrypoints/content/scrapers/__fixtures__');

const jasoseolHtml = fs.readFileSync(path.join(fixturesDir, 'jasoseol.html'), 'utf-8');
const wantedHtml = fs.readFileSync(path.join(fixturesDir, 'wanted.html'), 'utf-8');
const saraminHtml = fs.readFileSync(path.join(fixturesDir, 'saramin.html'), 'utf-8');
const jobkoreaHtml = fs.readFileSync(path.join(fixturesDir, 'jobkorea.html'), 'utf-8');

test.describe('채용 공고 스크래퍼 브라우저 E2E 자동화 검증 (Chrome MV3)', () => {
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
	 * Background Worker를 통해 현재 탭의 Content Script로 SCRAPE 메시지를 전송하고 결과를 수신합니다.
	 */
	async function sendScrapeMessageToTab(page: Page): Promise<ScrapeResponse> {
		const targetUrl = page.url();

		// Content Script 로드 및 리스너 등록 대기
		await page.waitForTimeout(300);

		return await backgroundWorker.evaluate(async (url: string) => {
			const tabs = await chrome.tabs.query({});
			const targetTab = tabs.find((t) => t.url && t.url.includes(url));
			if (!targetTab?.id) {
				return {
					success: false,
					error: `Target tab not found for URL: ${url}`,
				};
			}

			return await new Promise<ScrapeResponse>((resolve) => {
				chrome.tabs.sendMessage(
					targetTab.id as number,
					{ type: 'SCRAPE' },
					(response: unknown) => {
						if (chrome.runtime.lastError) {
							resolve({
								success: false,
								error: chrome.runtime.lastError.message || 'Messaging error',
							});
						} else {
							resolve(response as ScrapeResponse);
						}
					}
				);
			});
		}, targetUrl);
	}

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

	test('Given 자소설닷컴 공고 페이지(?ec=1234)에 접속했을 때, When 확장이 데이터를 스크래핑하면, Then 5개 필수 필드가 모두 정상 추출된다', async () => {
		// Given
		const targetUrl = 'https://jasoseol.com/recruit?ec=1234';
		const page = await context.newPage();
		await page.route('https://jasoseol.com/**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'text/html; charset=utf-8',
				body: jasoseolHtml,
			});
		});

		await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

		// When
		const response = await sendScrapeMessageToTab(page);

		// Then
		assertScrapeSuccess(response);

		const jobData = response.data;
		expect(jobData.title).toBe('2026 하반기 신입 소프트웨어 엔지니어 공개 채용');
		expect(jobData.company).toBe('네오테크놀로지');
		expect(jobData.url).toBe(targetUrl);
		expect(jobData.deadline).toBe('2026-09-30');
		expect(jobData.description).toContain('자소서 항목 확인 및 지원서 작성 가능');
		expect(jobData.site).toBe('jasoseol');

		// 5대 필수 필드 non-empty 검증
		expect(jobData.title.trim().length).toBeGreaterThan(0);
		expect(jobData.company.trim().length).toBeGreaterThan(0);
		expect(jobData.url.trim().length).toBeGreaterThan(0);
		expect(jobData.deadline).not.toBeNull();
		expect(jobData.description.trim().length).toBeGreaterThan(0);

		await page.close();
	});

	test('Given 원티드 공고 상세 페이지에 접속했을 때, When 확장이 데이터를 스크래핑하면, Then 5개 필수 필드가 모두 정상 추출된다', async () => {
		// Given
		const targetUrl = 'https://www.wanted.co.kr/jobdetail/123456';
		const page = await context.newPage();
		await page.route('https://www.wanted.co.kr/**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'text/html; charset=utf-8',
				body: wantedHtml,
			});
		});

		await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

		// When
		const response = await sendScrapeMessageToTab(page);

		// Then
		assertScrapeSuccess(response);

		const jobData = response.data;
		expect(jobData.title).toBe('시니어 프론트엔드 개발자');
		expect(jobData.company).toBe('테크스타트업');
		expect(jobData.url).toBe(targetUrl);
		expect(jobData.deadline).toBe('2026-12-31');
		expect(jobData.description).toContain('React 및 TypeScript');
		expect(jobData.site).toBe('wanted');

		// 5대 필수 필드 non-empty 검증
		expect(jobData.title.trim().length).toBeGreaterThan(0);
		expect(jobData.company.trim().length).toBeGreaterThan(0);
		expect(jobData.url.trim().length).toBeGreaterThan(0);
		expect(jobData.deadline).not.toBeNull();
		expect(jobData.description.trim().length).toBeGreaterThan(0);

		await page.close();
	});

	test('Given 사람인 공고 상세 페이지에 접속했을 때, When 확장이 데이터를 스크래핑하면, Then 5개 필수 필드가 모두 정상 추출된다', async () => {
		// Given
		const targetUrl = 'https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=123456';
		const page = await context.newPage();
		await page.route('https://www.saramin.co.kr/**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'text/html; charset=utf-8',
				body: saraminHtml,
			});
		});

		await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

		// When
		const response = await sendScrapeMessageToTab(page);

		// Then
		assertScrapeSuccess(response);

		const jobData = response.data;
		expect(jobData.title).toBe('클라우드 백엔드 엔지니어');
		expect(jobData.company).toBe('글로벌IT');
		expect(jobData.url).toBe(targetUrl);
		expect(jobData.deadline).toBe('2026-11-30');
		expect(jobData.description).toContain('대규모 분산 시스템 및 MSA');
		expect(jobData.site).toBe('saramin');

		// 5대 필수 필드 non-empty 검증
		expect(jobData.title.trim().length).toBeGreaterThan(0);
		expect(jobData.company.trim().length).toBeGreaterThan(0);
		expect(jobData.url.trim().length).toBeGreaterThan(0);
		expect(jobData.deadline).not.toBeNull();
		expect(jobData.description.trim().length).toBeGreaterThan(0);

		await page.close();
	});

	test('Given 잡코리아 공고 상세 페이지에 접속했을 때, When 확장이 데이터를 스크래핑하면, Then 5개 필수 필드가 모두 정상 추출된다', async () => {
		// Given
		const targetUrl = 'https://www.jobkorea.co.kr/Recruit/GI_Read/123456';
		const page = await context.newPage();
		await page.route('https://www.jobkorea.co.kr/**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'text/html; charset=utf-8',
				body: jobkoreaHtml,
			});
		});

		await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

		// When
		const response = await sendScrapeMessageToTab(page);

		// Then
		assertScrapeSuccess(response);

		const jobData = response.data;
		expect(jobData.title).toBe('빅데이터 플랫폼 엔지니어');
		expect(jobData.company).toBe('빅데이터랩스');
		expect(jobData.url).toBe(targetUrl);
		expect(jobData.deadline).toBe('2026-10-15');
		expect(jobData.description).toContain('실시간 데이터 파이프라인');
		expect(jobData.site).toBe('jobkorea');

		// 5대 필수 필드 non-empty 검증
		expect(jobData.title.trim().length).toBeGreaterThan(0);
		expect(jobData.company.trim().length).toBeGreaterThan(0);
		expect(jobData.url.trim().length).toBeGreaterThan(0);
		expect(jobData.deadline).not.toBeNull();
		expect(jobData.description.trim().length).toBeGreaterThan(0);

		await page.close();
	});
});
