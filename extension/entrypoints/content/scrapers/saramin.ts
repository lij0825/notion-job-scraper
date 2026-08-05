import type { JobData } from '../types';
import { sanitizeText, parseDeadline } from '../../../utils/sanitize';

/**
 * 사람인 (saramin.co.kr) 채용 공고 스크래퍼
 * URL 패턴: https://www.saramin.co.kr/zf_user/jobs/view?rec_idx={id}
 *
 * 사람인은 SSR 기반 사이트입니다.
 * 다중 CSS 선택자 fallback + JSON-LD 구조화 데이터 파싱을 조합합니다.
 */
export function scrapeSaramin(): JobData | null {
	// 1차: JSON-LD 구조화 데이터 파싱 시도 (가장 신뢰성 높음)
	const fromJsonLd = scrapeFromJsonLd();
	if (fromJsonLd) return fromJsonLd;

	// 2차: DOM 선택자 fallback
	return scrapeFromDom();
}

/** JSON-LD 스크립트 태그에서 JobPosting 스키마 데이터를 추출합니다. */
function scrapeFromJsonLd(): JobData | null {
	const jsonLdScripts = document.querySelectorAll<HTMLScriptElement>(
		'script[type="application/ld+json"]'
	);

	for (const script of jsonLdScripts) {
		try {
			const data = JSON.parse(script.textContent ?? '');
			// JobPosting 스키마 타입 확인
			if (data['@type'] !== 'JobPosting') continue;

			const title: string = data['title'] ?? data['name'] ?? '';
			const company: string =
				data['hiringOrganization']?.name ?? data['hiringOrganization'] ?? '';
			const rawDeadline: string | null = data['validThrough'] ?? null;
			const description: string = sanitizeText(data['description'] ?? '');

			if (!title && !company) continue;

			return {
				title,
				company,
				url: window.location.href,
				deadline: rawDeadline ? parseDeadline(rawDeadline) : null,
				description,
				site: 'saramin',
			};
		} catch {
			// 파싱 실패 시 다음 스크립트 시도
			continue;
		}
	}

	return null;
}

/** DOM 선택자 기반 사람인 스크래퍼 */
function scrapeFromDom(): JobData | null {
	const title = extractTitle();
	const company = extractCompany();
	const deadline = extractDeadline();
	const description = extractDescription();

	if (!title && !company) return null;

	return {
		title: title || '(제목 없음)',
		company: company || '(회사명 없음)',
		url: window.location.href,
		deadline,
		description,
		site: 'saramin',
	};
}

/** 직무명 추출 */
function extractTitle(): string {
	const selectors = [
		'.job_tit .tit',
		'.tit_job',
		'h1.job_tit',
		'.recruit_title h1',
		'.job-title h1',
		'.jv_title',
		'[class*="title"] h1',
	];

	for (const selector of selectors) {
		const text = document.querySelector<HTMLElement>(selector)?.textContent?.trim();
		if (text) return text;
	}

	// og:title fallback
	const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
	return ogTitle?.content?.split('|')[0]?.trim() ?? '';
}

/** 회사명 추출 */
function extractCompany(): string {
	const selectors = [
		'.company_nm .str_tlt',
		'.company_nm a',
		'.corp_name a',
		'.company-name a',
		'.jv_company .tit',
		'[class*="company"] [class*="name"]',
		'[class*="corp"] [class*="name"]',
	];

	for (const selector of selectors) {
		const text = document.querySelector<HTMLElement>(selector)?.textContent?.trim();
		if (text) return text;
	}

	return '';
}

/** 마감일 추출 */
function extractDeadline(): string | null {
	const selectors = [
		'.job_date .date',
		'.deadlines',
		'.info_period dd',
		'[class*="deadline"]',
		'[class*="period"]',
		'.deadline_text',
		'.date_info',
	];

	for (const selector of selectors) {
		const text = document.querySelector<HTMLElement>(selector)?.textContent?.trim();
		if (text) {
			const parsed = parseDeadline(text);
			// parseDeadline 결과가 null이어도 "상시채용" 패턴이면 null이 맞음
			return parsed;
		}
	}

	return null;
}

/** 직무 설명 추출 */
function extractDescription(): string {
	const selectors = [
		'.jv_cont',
		'.job_description',
		'.info_detail_wrap',
		'.recruit_info',
		'.job_info',
		'[class*="recruit_contents"]',
		'[class*="job_cont"]',
	];

	for (const selector of selectors) {
		const text = document.querySelector<HTMLElement>(selector)?.textContent?.trim();
		if (text) return sanitizeText(text);
	}

	return '';
}
