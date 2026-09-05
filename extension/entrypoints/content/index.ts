import { browser } from 'wxt/browser';
import { defaultScraperRegistry } from './scrapers/scraper-registry';
import { watchWantedNavigation } from './scrapers/wanted';
import type { ScrapeResponse } from './types';

export default defineContentScript({
	matches: [
		'*://jasoseol.com/*',
		'*://*.jasoseol.com/*',
		'*://www.wanted.co.kr/*',
		'*://wanted.co.kr/*',
		'*://www.saramin.co.kr/zf_user/jobs/view*',
		'*://www.jobkorea.co.kr/Recruit/GI_Read/*',
	],
	runAt: 'document_idle',

	main() {
		browser.runtime.onMessage.addListener(
			(message: unknown, _sender, sendResponse: (response: ScrapeResponse) => void): true => {
				const isScrapeMessage = typeof message === 'object' &&
					message !== null &&
					'type' in message &&
					(message as { type: unknown }).type === 'SCRAPE';

				if (!isScrapeMessage) {
					sendResponse({ success: false, error: '지원하지 않는 메시지입니다.' });
					return true;
				}

				handleScrapeRequest()
					.then((result) => sendResponse(result))
					.catch((error: unknown) => {
						const errorMessage = error instanceof Error ? error.message : String(error);
						sendResponse({ success: false, error: `스크래핑 중 오류: ${errorMessage}` });
					});

				return true;
			}
		);

		const currentUrl = window.location.href;
		const scraper = defaultScraperRegistry.findScraper(currentUrl);
		if (scraper?.site === 'wanted') {
			watchWantedNavigation((_newUrl) => {
				// Popup이 열릴 때 실시간 스크래핑을 수행하므로 상태 변경 알림은 생략합니다.
			});
		}
	},
});

async function handleScrapeRequest(): Promise<ScrapeResponse> {
	const currentUrl = window.location.href;
	const scraper = defaultScraperRegistry.findScraper(currentUrl);

	if (!scraper) {
		return { success: false, error: '지원하지 않는 사이트입니다.' };
	}

	const jobData = await scraper.scrape();
	if (!jobData) {
		return {
			success: false,
			error: '채용 공고 데이터를 찾을 수 없습니다. 채용 공고 상세 페이지인지 확인해 주세요.',
		};
	}

	return { success: true, data: jobData };
}
