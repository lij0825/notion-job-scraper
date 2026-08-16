import type { JobData } from '../types';
import { sanitizeText, parseDeadline } from '../../../utils/sanitize';

/**
 * 잡코리아 (jobkorea.co.kr) 채용 공고 스크래퍼
 * URL 패턴: https://www.jobkorea.co.kr/Recruit/GI_Read/{id}
 *
 * 전략:
 *   1차: JSON-LD 구조화 데이터 파싱 (JobPosting 스키마)
 *   2차: DOM 선택자 fallback
 */
export function scrapeJobkorea(): JobData | null {
	// 1차: JSON-LD 구조화 데이터 파싱 시도
	const fromJsonLd = scrapeFromJsonLd();
	if (fromJsonLd) return fromJsonLd;

	// 2차: DOM 선택자 fallback
	return scrapeFromDom();
}

/** JSON-LD 스크립트에서 채용 공고 데이터를 추출합니다. */
function scrapeFromJsonLd(): JobData | null {
	const scripts = document.querySelectorAll<HTMLScriptElement>(
		'script[type="application/ld+json"]'
	);

	for (const script of scripts) {
		try {
			const data = JSON.parse(script.textContent ?? '');
			if (data['@type'] !== 'JobPosting') continue;

			const title: string = data['title'] ?? '';
			const company: string = data['hiringOrganization']?.name ?? '';
			const rawDeadline: string | null = data['validThrough'] ?? null;
			const description: string = sanitizeText(
				stripHtml(data['description'] ?? '')
			);

			if (!title && !company) continue;

			return {
				title,
				company,
				url: window.location.href,
				deadline: rawDeadline ? parseDeadline(rawDeadline) : null,
				description,
				site: 'jobkorea',
			};
		} catch {
			continue;
		}
	}

	return null;
}

/** DOM 선택자 기반 잡코리아 스크래퍼 */
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
		site: 'jobkorea',
	};
}

/** 직무명 추출 */
function extractTitle(): string {
	const selectors = [
		'.tit-job-offer',
		'.recruit-title h1',
		'.job-name',
		'.gi_title',
		'[class*="gi_con"] [class*="title"]',
		'.viewTitle',
		'h1[class*="tit"]',
	];

	for (const selector of selectors) {
		const text = document.querySelector<HTMLElement>(selector)?.textContent?.trim();
		if (text) return text;
	}

	const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
	return ogTitle?.content?.split('|')[0]?.trim() ?? '';
}

/** 회사명 추출 */
function extractCompany(): string {
	const selectors = [
		'.name-company',
		'.company-name',
		'.corp-name',
		'.gi_company a',
		'[class*="company"] a',
		'[class*="corp"] a',
		'.viewCompany a',
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
		'.date-limit',
		'.deadline',
		'.di-state',
		'[class*="deadline"]',
		'[class*="limit"]',
		'.viewDate',
	];

	for (const selector of selectors) {
		const el = document.querySelector<HTMLElement>(selector);
		if (el?.textContent) {
			return parseDeadline(el.textContent);
		}
	}

	// 테이블에서 마감일 행 검색
	const rows = document.querySelectorAll<HTMLElement>('tr, .info-row');
	for (const row of rows) {
		const text = row.textContent ?? '';
		if (/마감|접수.*기간|채용.*기간/i.test(text)) {
			const valueEl = row.querySelector<HTMLElement>('td, .value, dd');
			if (valueEl?.textContent) {
				return parseDeadline(valueEl.textContent);
			}
		}
	}

	return null;
}

/** 직무 설명 추출 */
function extractDescription(): string {
	const selectors = [
		'.cont-detail-info',
		'.job-description',
		'.gi_con',
		'.recruit-detail',
		'[class*="detail"] [class*="cont"]',
		'.viewContent',
		'.jobDetailContent',
	];

	for (const selector of selectors) {
		const el = document.querySelector<HTMLElement>(selector);
		if (el?.textContent?.trim()) {
			return sanitizeText(el.textContent);
		}
	}

	return '';
}

/**
 * HTML 태그를 제거하여 순수 텍스트를 추출합니다.
 * JSON-LD의 description 필드에 HTML이 포함된 경우 처리합니다.
 */
function stripHtml(html: string): string {
	const doc = new DOMParser().parseFromString(html, 'text/html');
	return doc.body.textContent ?? '';
}
