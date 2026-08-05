import type { JobData } from '../types';
import { sanitizeText, parseDeadline } from '../../../utils/sanitize';

/**
 * 자소설닷컴 (jasoseol.com) 채용 공고 스크래퍼
 * URL 패턴: https://jasoseol.com/recruit/{id}
 *
 * 자소설닷컴은 SSR 기반 사이트이므로 DOM 파싱으로 처리합니다.
 * 다중 CSS 선택자 fallback 전략을 사용합니다.
 */
export function scrapeJasoseol(): JobData | null {
	const title = extractTitle();
	const company = extractCompany();
	const deadline = extractDeadline();
	const description = extractDescription();

	// 최소한 제목 또는 회사명이 있어야 유효한 페이지로 판단
	if (!title && !company) {
		return null;
	}

	return {
		title: title || '(제목 없음)',
		company: company || '(회사명 없음)',
		url: window.location.href,
		deadline,
		description,
		site: 'jasoseol',
	};
}

/** 직무명 추출 — 다중 선택자 fallback */
function extractTitle(): string {
	const selectors = [
		'h2.name',
		'.recruit-title h2',
		'.job-info h2',
		'.title-area h2',
		'h1.title',
		'.corp_top_box h2',
		'[class*="title"] h2',
		'[class*="recruit"] h2',
	];

	for (const selector of selectors) {
		const el = document.querySelector<HTMLElement>(selector);
		const text = el?.textContent?.trim();
		if (text) return text;
	}

	// og:title 메타 태그 fallback
	const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
	return ogTitle?.content?.trim() ?? '';
}

/** 회사명 추출 — 다중 선택자 fallback */
function extractCompany(): string {
	const selectors = [
		'.company-name',
		'.corp-name',
		'.company_name',
		'a[class*="company"]',
		'.recruit-company',
		'[class*="company"] a',
		'[class*="corp"] a',
	];

	for (const selector of selectors) {
		const el = document.querySelector<HTMLElement>(selector);
		const text = el?.textContent?.trim();
		if (text) return text;
	}

	return '';
}

/** 마감일 추출 — 텍스트 파싱 후 YYYY-MM-DD 형식으로 정규화 */
function extractDeadline(): string | null {
	const selectors = [
		'.deadline',
		'.period',
		'.apply-date',
		'.date-info',
		'[class*="deadline"]',
		'[class*="period"]',
		'[class*="close"]',
	];

	for (const selector of selectors) {
		const el = document.querySelector<HTMLElement>(selector);
		if (el?.textContent) {
			const parsed = parseDeadline(el.textContent);
			// parseDeadline이 null이더라도 "상시채용" 텍스트가 포함된 경우 null 반환
			if (parsed !== undefined) return parsed;
		}
	}

	// 페이지 전체에서 마감 관련 텍스트 검색
	const bodyText = document.body.innerText;
	const deadlineSection = bodyText.match(/마감[일기한]?\s*[:\：]?\s*([^\n]+)/);
	if (deadlineSection?.[1]) {
		return parseDeadline(deadlineSection[1]);
	}

	return null;
}

/** 직무 설명 추출 및 정제 */
function extractDescription(): string {
	const selectors = [
		'.recruit-detail',
		'.job-description',
		'.content-area',
		'.recruit-content',
		'[class*="description"]',
		'[class*="content"]',
		'.main-content',
		'article',
	];

	for (const selector of selectors) {
		const el = document.querySelector<HTMLElement>(selector);
		if (el?.textContent?.trim()) {
			return sanitizeText(el.textContent);
		}
	}

	return '';
}
