import type { JobData } from '../types';
import { sanitizeText, parseDeadline } from '../../../utils/sanitize';

// ---------------------------------------------------------------
// 원티드(Wanted) Next.js SPA 스크래퍼
// URL 패턴: https://www.wanted.co.kr/jobdetail/{id} 또는 /wd/{id}
//
// 전략:
//   1차: __NEXT_DATA__ JSON 파싱 (가장 신뢰할 수 있는 구조화 데이터)
//   2차: DOM 선택자 fallback
//   SPA 네비게이션: popstate + MutationObserver로 URL 변경 감지
// ---------------------------------------------------------------

/** __NEXT_DATA__ 내 채용 공고 데이터 구조 (Wanted API 응답 스키마) */
interface WantedNextData {
	props?: {
		pageProps?: {
			job?: WantedJob;
			initialJobData?: WantedJob;
			initialData?: WantedJob;
		};
	};
}

interface WantedJob {
	id?: number;
	position?: string;
	company?: {
		name?: string;
		company_name?: string;
	};
	due_time?: string | null;
	intro?: string;
	main_tasks?: string;
	requirements?: string;
	preferred_points?: string;
	benefits?: string;
	detail?: {
		intro?: string;
		main_tasks?: string;
		requirements?: string;
		preferred_points?: string;
		benefits?: string;
	};
}

/**
 * 원티드 채용 공고를 스크래핑합니다.
 * __NEXT_DATA__ JSON을 우선 파싱하고, 실패 시 DOM을 파싱합니다.
 */
export function scrapeWanted(): JobData | null {
	// 1차: __NEXT_DATA__ JSON 파싱 시도
	const fromNextData = scrapeFromNextData();
	if (fromNextData) return fromNextData;

	// 2차: DOM 선택자 fallback
	return scrapeFromDom();
}

/** __NEXT_DATA__ 스크립트에서 채용 정보를 추출합니다. */
function scrapeFromNextData(): JobData | null {
	const scriptEl = document.getElementById('__NEXT_DATA__');
	if (!scriptEl?.textContent) return null;

	let parsed: WantedNextData;
	try {
		parsed = JSON.parse(scriptEl.textContent) as WantedNextData;
	} catch {
		// JSON 파싱 실패 — DOM fallback으로 위임
		return null;
	}

	const pageProps = parsed.props?.pageProps;
	// job, initialJobData 또는 initialData 중 존재하는 것 사용
	const job = pageProps?.job ?? pageProps?.initialJobData ?? pageProps?.initialData;
	if (!job) return null;

	const title = job.position ?? '';
	const company = job.company?.name ?? job.company?.company_name ?? '';
	if (!title && !company) return null;

	const description = buildDescription(job);

	return {
		title,
		company,
		url: window.location.href,
		deadline: parseWantedDueTime(job.due_time),
		description: sanitizeText(description),
		site: 'wanted',
	};
}

/**
 * Wanted API의 job 객체에서 직무 설명 텍스트를 조립합니다.
 * 각 섹션(intro, 주요 업무, 자격 요건, 우대 사항, 혜택)을 순서대로 연결합니다.
 */
function buildDescription(job: WantedJob): string {
	const detail = job.detail;
	const sections: Array<{ label: string; content?: string }> = [
		{ label: '포지션 소개', content: detail?.intro || job.intro },
		{ label: '주요 업무', content: detail?.main_tasks || job.main_tasks },
		{ label: '자격 요건', content: detail?.requirements || job.requirements },
		{ label: '우대 사항', content: detail?.preferred_points || job.preferred_points },
		{ label: '혜택 및 복지', content: detail?.benefits || job.benefits },
	];

	return sections
		.filter((section) => section.content?.trim())
		.map((section) => `[${section.label}]\n${section.content}`)
		.join('\n\n');
}

/**
 * 원티드 API의 due_time 필드를 YYYY-MM-DD 형식으로 변환합니다.
 * null이거나 상시채용이면 null 반환합니다.
 */
function parseWantedDueTime(dueTime: string | null | undefined): string | null {
	if (!dueTime) return null;

	// 원티드 API 응답 형식: "2024-12-31T15:00:00.000Z" 또는 "2024-12-31"
	const match = dueTime.match(/^(\d{4}-\d{2}-\d{2})/);
	return match ? match[1] : parseDeadline(dueTime);
}

/** DOM 선택자 기반 fallback 스크래퍼 */
function scrapeFromDom(): JobData | null {
	const titleSelectors = [
		'h1[class*="JobHeader"]',
		'h1',
		'h2[data-cy="job-position"]',
		'.JobHeader_className',
		'h2.position',
		'.job-title h2',
		'[class*="JobDetail"] h2',
		'[class*="position"]',
	];

	const companySelectors = [
		'a[data-cy="company-name"]',
		'a[data-attribute-id="company__click"]',
		'[class*="JobHeader"] a[href*="/company/"]',
		'.CompanyInfo_name',
		'.company-name a',
		'[class*="CompanyInfo"] [class*="name"]',
		'[class*="company"] a',
	];

	const descriptionSelectors = [
		'[class*="JobDescription_JobDescription"]',
		'[class*="JobDescription"]',
		'[class*="job-description"]',
		'[class*="Description"]',
		'[data-testid="job-detail-description"]',
		'article',
	];

	const title = queryTextContent(titleSelectors);
	const company = queryTextContent(companySelectors);

	if (!title && !company) return null;

	const deadlineText =
		document.querySelector<HTMLElement>(
			'[class*="deadline"], [class*="due"], .job-due, [class*="Deadline"]'
		)?.textContent ?? '';

	let description = '';
	for (const selector of descriptionSelectors) {
		const el = document.querySelector<HTMLElement>(selector);
		if (el?.textContent?.trim()) {
			description = el.textContent;
			break;
		}
	}

	return {
		title,
		company,
		url: window.location.href,
		deadline: parseDeadline(deadlineText),
		description: sanitizeText(description),
		site: 'wanted',
	};
}

/** 여러 선택자 중 처음으로 텍스트 내용이 있는 요소의 텍스트를 반환합니다. */
function queryTextContent(selectors: string[]): string {
	for (const selector of selectors) {
		const text = document.querySelector<HTMLElement>(selector)?.textContent?.trim();
		if (text) return text;
	}
	return '';
}

// ---------------------------------------------------------------
// SPA 네비게이션 감지
// 원티드는 Next.js SPA이므로 페이지 이동 시 DOM만 교체됩니다.
// popstate 이벤트와 MutationObserver를 조합하여 URL 변경을 감지합니다.
// ---------------------------------------------------------------

type SpaChangeCallback = (url: string) => void;

/**
 * 원티드 SPA 페이지 이동 감지 리스너를 등록합니다.
 * URL이 /jobdetail/ 또는 /wd/ 패턴으로 변경될 때마다 callback을 호출합니다.
 *
 * @returns 리스너 정리(cleanup) 함수
 */
export function watchWantedNavigation(callback: SpaChangeCallback): () => void {
	let lastUrl = window.location.href;

	// history.pushState를 monkey-patch하여 SPA 내부 라우팅 감지
	// Next.js의 router.push는 pushState를 내부적으로 호출합니다.
	const originalPushState = history.pushState.bind(history);
	history.pushState = function (...args) {
		originalPushState(...args);
		handleUrlChange();
	};

	const originalReplaceState = history.replaceState.bind(history);
	history.replaceState = function (...args) {
		originalReplaceState(...args);
		handleUrlChange();
	};

	// 브라우저 뒤로가기/앞으로가기 감지
	window.addEventListener('popstate', handleUrlChange);

	// DOM 변경을 감지하여 URL 변경 후 컨텐츠 로드 완료 시점을 탐지
	const observer = new MutationObserver(() => {
		const currentUrl = window.location.href;
		if (currentUrl !== lastUrl && isJobDetailUrl(currentUrl)) {
			lastUrl = currentUrl;
			// Next.js 하이드레이션 완료 대기 (200ms)
			setTimeout(() => callback(currentUrl), 200);
		}
	});

	observer.observe(document.body, { childList: true, subtree: true });

	function handleUrlChange() {
		const currentUrl = window.location.href;
		if (currentUrl !== lastUrl && isJobDetailUrl(currentUrl)) {
			lastUrl = currentUrl;
			setTimeout(() => callback(currentUrl), 200);
		}
	}

	// cleanup 함수 반환
	return () => {
		window.removeEventListener('popstate', handleUrlChange);
		observer.disconnect();
		// monkey-patch 복원
		history.pushState = originalPushState;
		history.replaceState = originalReplaceState;
	};
}

/** 현재 URL이 원티드 채용 공고 상세 페이지인지 확인합니다. */
function isJobDetailUrl(url: string): boolean {
	return url.includes('wanted.co.kr/jobdetail/') || url.includes('wanted.co.kr/wd/');
}
