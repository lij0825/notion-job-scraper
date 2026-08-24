import type { JobData } from '../types';
import { sanitizeText, parseDeadline } from '../../../utils/sanitize';

/**
 * 사람인 (saramin.co.kr) 채용 공고 스크래퍼
 * URL 패턴:
 * - https://www.saramin.co.kr/zf_user/jobs/view?rec_idx={id}
 * - https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx={id}
 *
 * 사람인은 일반 뷰와 릴레이 뷰(AJAX 기반) 등 다양한 렌더링 방식을 사용합니다.
 * 1. JSON-LD 구조화 데이터
 * 2. DOM 선택자
 * 3. Meta Tags (og:title, og:description, meta description)
 * 4. Document Title Fallback
 */
export function scrapeSaramin(): JobData | null {
	// 1차: JSON-LD 구조화 데이터 파싱 시도 (가장 신뢰성 높음)
	const fromJsonLd = scrapeFromJsonLd();
	if (fromJsonLd) return fromJsonLd;

	// 2차: DOM 선택자 & 메타 태그 종합 추출
	return scrapeFromDomAndMeta();
}

/** JSON-LD 스크립트 태그에서 JobPosting 스키마 데이터를 추출합니다. */
function scrapeFromJsonLd(): JobData | null {
	const jsonLdScripts = document.querySelectorAll<HTMLScriptElement>(
		'script[type="application/ld+json"]'
	);

	for (const script of jsonLdScripts) {
		try {
			const data = JSON.parse(script.textContent ?? '');
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
			continue;
		}
	}

	return null;
}

/** DOM 선택자 및 메타 태그 기반 추출 */
function scrapeFromDomAndMeta(): JobData | null {
	let title = extractTitle();
	let company = extractCompany();
	let deadline = extractDeadline();
	let description = extractDescription();

	// Meta Tag 파싱 보강 (relay/view 등 AJAX 로딩 지연 시)
	const metaParsed = parseMetaTags();
	if (metaParsed) {
		if (!title || title === '(제목 없음)') title = metaParsed.title;
		if (!company || company === '(회사명 없음)') company = metaParsed.company;
		if (!deadline) deadline = metaParsed.deadline;
		if (!description) description = metaParsed.description;
	}

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
		'.jv_header .title',
		'[class*="title"] h1',
	];

	for (const selector of selectors) {
		const text = document.querySelector<HTMLElement>(selector)?.textContent?.trim();
		if (text) return text;
	}

	return '';
}

/** 회사명 추출 */
function extractCompany(): string {
	const selectors = [
		'.company_nm .str_tlt',
		'.company_nm a',
		'.corp_name a',
		'.company-name a',
		'.jv_company .tit',
		'.jv_header .company',
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
		'.jv_summary .period dd',
		'[class*="deadline"]',
		'[class*="period"]',
		'.deadline_text',
		'.date_info',
	];

	for (const selector of selectors) {
		const text = document.querySelector<HTMLElement>(selector)?.textContent?.trim();
		if (text) {
			const parsed = parseDeadline(text);
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

/** 메타 태그 (og:title, meta[name=description] 등) 및 문서 타이틀로부터 파싱 */
function parseMetaTags(): { title: string; company: string; deadline: string | null; description: string } | null {
	const ogTitle =
		document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content?.trim() ||
		document.title ||
		'';
	const ogDesc =
		document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content?.trim() ||
		document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content?.trim() ||
		'';

	let company = '';
	let title = '';
	let deadline: string | null = null;

	// Pattern 1: og:title: "[(주)회사명] 직무명(D-6) - 사람인" or "[회사명] 직무명 - 사람인"
	if (ogTitle) {
		const titleMatch = ogTitle.match(/^\[(.*?)\]\s*(.*?)(?:\s*\([D|d]-?\d+\))?\s*-\s*사람인/);
		if (titleMatch) {
			company = titleMatch[1]?.trim() || '';
			title = titleMatch[2]?.trim() || '';
		} else {
			const parts = ogTitle.split(/[-|]/);
			if (parts.length > 0) {
				title = parts[0]?.trim() || '';
			}
		}
	}

	// Pattern 2: ogDesc: "(주)회사명, 직무명, 경력:..., 마감일:2026-08-30, ..."
	if (ogDesc) {
		const descParts = ogDesc.split(',').map((p) => p.trim());
		if (descParts.length >= 2) {
			if (!company && descParts[0]) {
				company = descParts[0];
			}
			if (!title && descParts[1]) {
				title = descParts[1];
			}
		}

		// Extract deadline from description: "마감일:2026-08-30" or "마감일:상시채용"
		const deadlineMatch = ogDesc.match(/마감일\s*:\s*([^\s,]+)/);
		if (deadlineMatch) {
			deadline = parseDeadline(deadlineMatch[1]);
		}
	}

	if (!title && !company && !deadline) return null;

	return {
		title,
		company,
		deadline,
		description: sanitizeText(ogDesc),
	};
}

