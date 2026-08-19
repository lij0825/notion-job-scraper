import { browser } from 'wxt/browser';
import { scrapeJasoseol } from './scrapers/jasoseol';
import { scrapeWanted, watchWantedNavigation } from './scrapers/wanted';
import { scrapeSaramin } from './scrapers/saramin';
import { scrapeJobkorea } from './scrapers/jobkorea';
import type { JobData, SiteKey, ScrapeResponse } from './types';

/**
 * Content Script 메인 엔트리포인트
 * 지원하는 4개 채용 사이트에서 스크래핑을 처리합니다.
 */
export default defineContentScript({
	// 스크래핑 대상 사이트 URL 패턴
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
		// 현재 사이트 감지
		const siteKey = detectSite(window.location.href);

		// Popup에서 보내는 SCRAPE 메시지 수신 리스너 등록
		browser.runtime.onMessage.addListener(
			(message: unknown, _sender, sendResponse: (response: ScrapeResponse) => void): true => {
				const msg = message as { type: string };
				if (msg.type !== 'SCRAPE') {
					sendResponse({ success: false, error: '지원하지 않는 메시지입니다.' });
					return true;
				}

				// 비동기 스크래핑 실행 후 응답 전송
				console.log('[Content Script Listener] Message RECEIVED in content script:', msg);
				
				scrapeCurrentPage(siteKey).then((result) => {
					console.log('[Content Script Listener] Sending response back to Popup:', result);
					sendResponse(result);
				}).catch(err => {
					console.error('[Content Script Listener] Error during scrapeCurrentPage:', err);
					sendResponse({ success: false, error: String(err) });
				});
				
				// true 반환 = 비동기 응답 (sendResponse를 나중에 호출함)
				return true;
			}
		);

		// 원티드 SPA 네비게이션 감지 등록
		// 다른 채용 공고로 이동해도 최신 데이터를 스크래핑할 수 있도록 합니다.
		if (siteKey === 'wanted') {
			watchWantedNavigation((_newUrl) => {
				// URL이 변경되면 background에 알림을 보내지 않고
				// Popup이 열릴 때 SCRAPE 메시지를 재전송하므로 별도 처리 불필요.
				// (현재 구현에서는 캐싱 없이 요청 시점에 스크래핑)
			});
		}
	},
});

/**
 * 현재 페이지를 스크래핑하고 결과를 반환합니다.
 * 스크래핑 실패 시 에러 메시지와 함께 실패 응답을 반환합니다.
 */
async function scrapeCurrentPage(siteKey: SiteKey): Promise<ScrapeResponse> {
	try {
		let jobData: JobData | null = null;

		switch (siteKey) {
			case 'jasoseol':
				jobData = await scrapeJasoseol();
				break;
			case 'wanted':
				jobData = scrapeWanted();
				break;
			case 'saramin':
				jobData = scrapeSaramin();
				break;
			case 'jobkorea':
				jobData = scrapeJobkorea();
				break;
			default:
				return { success: false, error: '지원하지 않는 사이트입니다.' };
		}

		if (!jobData) {
			return {
				success: false,
				error: '채용 공고 데이터를 찾을 수 없습니다. 채용 공고 상세 페이지인지 확인해 주세요.',
			};
		}

		return { success: true, data: jobData };
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
		return { success: false, error: `스크래핑 중 오류: ${errorMessage}` };
	}
}

/**
 * URL을 분석하여 현재 사이트를 식별합니다.
 * 각 사이트의 고유 도메인 패턴으로 매칭합니다.
 */
function detectSite(url: string): SiteKey {
	if (url.includes('jasoseol.com')) return 'jasoseol';
	if (url.includes('wanted.co.kr')) return 'wanted';
	if (url.includes('saramin.co.kr')) return 'saramin';
	if (url.includes('jobkorea.co.kr')) return 'jobkorea';
	return 'unknown';
}
