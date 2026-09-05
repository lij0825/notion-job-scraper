import type { JobData, SiteKey } from '../types';
import type { JobScraper } from './types';
import { sanitizeText, parseDeadline } from '../../../utils/sanitize';

export interface JsonLdJobPosting {
	readonly '@type'?: unknown;
	readonly title?: unknown;
	readonly name?: unknown;
	readonly hiringOrganization?: unknown;
	readonly validThrough?: unknown;
	readonly description?: unknown;
}

export abstract class BaseJobScraper implements JobScraper {
	public abstract readonly site: SiteKey;

	public abstract canHandle(url: string): boolean;

	public abstract scrape(): Promise<JobData | null> | JobData | null;

	protected scrapeFromJsonLd(shouldStripHtml = false): JobData | null {
		const scripts = document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');

		for (const script of scripts) {
			const textContent = script.textContent;
			if (!textContent) {
				continue;
			}

			try {
				const parsed: unknown = JSON.parse(textContent);
				const posting = this.findJobPosting(parsed);
				if (!posting) {
					continue;
				}

				const title = typeof posting.title === 'string'
					? posting.title
					: typeof posting.name === 'string'
						? posting.name
						: '';

				const company = this.extractOrganizationName(posting.hiringOrganization);
				if (!title && !company) {
					continue;
				}

				const rawDeadline = typeof posting.validThrough === 'string' ? posting.validThrough : null;
				const rawDesc = typeof posting.description === 'string' ? posting.description : '';
				const processedDesc = shouldStripHtml ? this.stripHtml(rawDesc) : rawDesc;

				return {
					title,
					company,
					url: window.location.href,
					deadline: rawDeadline ? parseDeadline(rawDeadline) : null,
					description: sanitizeText(processedDesc),
					site: this.site,
				};
			} catch {
				continue;
			}
		}

		return null;
	}

	protected queryFirstText(selectors: readonly string[]): string {
		for (const selector of selectors) {
			const element = document.querySelector<HTMLElement>(selector);
			const text = element?.textContent?.trim();
			if (text) {
				return text;
			}
		}
		return '';
	}

	protected queryMetaContent(selector: string): string {
		const meta = document.querySelector<HTMLMetaElement>(selector);
		return meta?.content?.trim() ?? '';
	}

	protected stripHtml(html: string): string {
		return html
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/p>/gi, '\n')
			.replace(/<[^>]+>/g, '')
			.replace(/&nbsp;/g, ' ')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&amp;/g, '&')
			.replace(/\n{3,}/g, '\n\n')
			.trim();
	}

	private findJobPosting(data: unknown): JsonLdJobPosting | null {
		if (!data || typeof data !== 'object') {
			return null;
		}

		if (Array.isArray(data)) {
			for (const item of data) {
				const found = this.findJobPosting(item);
				if (found) {
					return found;
				}
			}
			return null;
		}

		const record = data as Record<string, unknown>;
		if (record['@type'] === 'JobPosting') {
			return record as JsonLdJobPosting;
		}

		if (Array.isArray(record['@graph'])) {
			return this.findJobPosting(record['@graph']);
		}

		return null;
	}

	private extractOrganizationName(org: unknown): string {
		if (!org) {
			return '';
		}
		if (typeof org === 'string') {
			return org;
		}
		if (typeof org === 'object') {
			const record = org as Record<string, unknown>;
			if (typeof record['name'] === 'string') {
				return record['name'];
			}
		}
		return '';
	}
}
