import type { JobData, SiteKey } from '../types';
import { sanitizeText, parseDeadline } from '../../../utils/sanitize';
import { BaseJobScraper } from './base-scraper';

const TITLE_SELECTORS = [
	'.job_tit .tit',
	'.tit_job',
	'h1.job_tit',
	'.recruit_title h1',
	'.job-title h1',
	'.jv_title',
	'.jv_header .title',
	'[class*="title"] h1',
] as const;

const COMPANY_SELECTORS = [
	'.company_nm .str_tlt',
	'.company_nm a',
	'.corp_name a',
	'.company-name a',
	'.jv_company .tit',
	'.jv_header .company',
	'[class*="company"] [class*="name"]',
	'[class*="corp"] [class*="name"]',
] as const;

const DEADLINE_SELECTORS = [
	'.job_date .date',
	'.deadlines',
	'.info_period dd',
	'.jv_summary .period dd',
	'[class*="deadline"]',
	'[class*="period"]',
	'.deadline_text',
	'.date_info',
] as const;

const DESCRIPTION_SELECTORS = [
	'.jv_cont',
	'.job_description',
	'.info_detail_wrap',
	'.recruit_info',
	'.job_info',
	'[class*="recruit_contents"]',
	'[class*="job_cont"]',
] as const;

export class SaraminScraper extends BaseJobScraper {
	public override readonly site: SiteKey = 'saramin';

	public override canHandle(url: string): boolean {
		return url.includes('saramin.co.kr');
	}

	public override scrape(): JobData | null {
		const fromJsonLd = this.scrapeFromJsonLd(false);
		if (fromJsonLd) {
			return fromJsonLd;
		}

		return this.scrapeFromDomAndMeta();
	}

	private scrapeFromDomAndMeta(): JobData | null {
		let title = this.queryFirstText(TITLE_SELECTORS);
		let company = this.queryFirstText(COMPANY_SELECTORS);
		let deadline = this.extractDeadline();
		let description = this.extractDescription();

		const metaParsed = this.parseMetaTags();
		if (metaParsed) {
			if (!title || title === '(제목 없음)') {
				title = metaParsed.title;
			}
			if (!company || company === '(회사명 없음)') {
				company = metaParsed.company;
			}
			if (!deadline) {
				deadline = metaParsed.deadline;
			}
			if (!description) {
				description = metaParsed.description;
			}
		}

		if (!title && !company) {
			return null;
		}

		return {
			title: title || '(제목 없음)',
			company: company || '(회사명 없음)',
			url: window.location.href,
			deadline,
			description,
			site: this.site,
		};
	}

	private extractDeadline(): string | null {
		for (const selector of DEADLINE_SELECTORS) {
			const element = document.querySelector<HTMLElement>(selector);
			const text = element?.textContent?.trim();
			if (text) {
				return parseDeadline(text);
			}
		}
		return null;
	}

	private extractDescription(): string {
		for (const selector of DESCRIPTION_SELECTORS) {
			const element = document.querySelector<HTMLElement>(selector);
			const text = element?.textContent?.trim();
			if (text) {
				return sanitizeText(text);
			}
		}
		return '';
	}

	private parseMetaTags(): { title: string; company: string; deadline: string | null; description: string } | null {
		const ogTitle = this.queryMetaContent('meta[property="og:title"]') || document.title || '';
		const ogDesc = this.queryMetaContent('meta[property="og:description"]') ||
			this.queryMetaContent('meta[name="description"]') || '';

		let company = '';
		let title = '';
		let deadline: string | null = null;

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

		if (ogDesc) {
			const descParts = ogDesc.split(',').map((part) => part.trim());
			if (descParts.length >= 2) {
				if (!company && descParts[0]) {
					company = descParts[0];
				}
				if (!title && descParts[1]) {
					title = descParts[1];
				}
			}

			const deadlineMatch = ogDesc.match(/마감일\s*:\s*([^\s,]+)/);
			if (deadlineMatch) {
				deadline = parseDeadline(deadlineMatch[1]);
			}
		}

		if (!title && !company && !deadline) {
			return null;
		}

		return {
			title,
			company,
			deadline,
			description: sanitizeText(ogDesc),
		};
	}
}

export const saraminScraper = new SaraminScraper();

export function scrapeSaramin(): JobData | null {
	return saraminScraper.scrape();
}
