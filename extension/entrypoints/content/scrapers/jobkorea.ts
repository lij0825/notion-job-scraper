import type { JobData, SiteKey } from '../types';
import { sanitizeText, parseDeadline } from '../../../utils/sanitize';
import { BaseJobScraper } from './base-scraper';

const TITLE_SELECTORS = [
	'.tit-job-offer',
	'.recruit-title h1',
	'.job-name',
	'.gi_title',
	'[class*="gi_con"] [class*="title"]',
	'.viewTitle',
	'h1[class*="tit"]',
] as const;

const COMPANY_SELECTORS = [
	'.name-company',
	'.company-name',
	'.corp-name',
	'.gi_company a',
	'[class*="company"] a',
	'[class*="corp"] a',
	'.viewCompany a',
] as const;

const DEADLINE_SELECTORS = [
	'.date-limit',
	'.deadline',
	'.di-state',
	'[class*="deadline"]',
	'[class*="limit"]',
	'.viewDate',
] as const;

const DESCRIPTION_SELECTORS = [
	'.cont-detail-info',
	'.job-description',
	'.gi_con',
	'.recruit-detail',
	'[class*="detail"] [class*="cont"]',
	'.viewContent',
	'.jobDetailContent',
] as const;

export class JobkoreaScraper extends BaseJobScraper {
	public override readonly site: SiteKey = 'jobkorea';

	public override canHandle(url: string): boolean {
		return url.includes('jobkorea.co.kr');
	}

	public override scrape(): JobData | null {
		const fromJsonLd = this.scrapeFromJsonLd(true);
		if (fromJsonLd) {
			return fromJsonLd;
		}

		return this.scrapeFromDom();
	}

	private scrapeFromDom(): JobData | null {
		const title = this.extractTitle();
		const company = this.queryFirstText(COMPANY_SELECTORS);
		const deadline = this.extractDeadline();
		const description = this.extractDescription();

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

	private extractTitle(): string {
		const text = this.queryFirstText(TITLE_SELECTORS);
		if (text) {
			return text;
		}

		const ogTitle = this.queryMetaContent('meta[property="og:title"]');
		if (ogTitle) {
			const parts = ogTitle.split('|');
			return parts[0]?.trim() ?? '';
		}

		return '';
	}

	private extractDeadline(): string | null {
		for (const selector of DEADLINE_SELECTORS) {
			const element = document.querySelector<HTMLElement>(selector);
			if (element?.textContent) {
				return parseDeadline(element.textContent);
			}
		}

		const rows = document.querySelectorAll<HTMLElement>('tr, .info-row');
		for (const row of rows) {
			const text = row.textContent ?? '';
			if (/마감|접수.*기간|채용.*기간/i.test(text)) {
				const valueElement = row.querySelector<HTMLElement>('td, .value, dd');
				if (valueElement?.textContent) {
					return parseDeadline(valueElement.textContent);
				}
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
}

export const jobkoreaScraper = new JobkoreaScraper();

export function scrapeJobkorea(): JobData | null {
	return jobkoreaScraper.scrape();
}
