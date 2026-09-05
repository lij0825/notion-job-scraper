import type { JobData, SiteKey } from '../types';
import { sanitizeText, parseDeadline } from '../../../utils/sanitize';
import { BaseJobScraper } from './base-scraper';

export class JasoseolScraper extends BaseJobScraper {
	public override readonly site: SiteKey = 'jasoseol';

	public override canHandle(url: string): boolean {
		return url.includes('jasoseol.com');
	}

	public override async scrape(): Promise<JobData | null> {
		const ec = new URLSearchParams(window.location.search).get('ec');
		if (!ec) {
			return null;
		}

		let activeContainer = document.querySelector<HTMLElement>('[data-current="true"]');

		if (!activeContainer) {
			const ecAnchors = Array.from(
				document.querySelectorAll<HTMLElement>(`a[href*="ec=${ec}"], [data-ec="${ec}"]`)
			);
			if (ecAnchors.length > 0) {
				let parent: HTMLElement | null = ecAnchors[0];
				while (parent && parent !== document.body) {
					const textContent = parent.innerText || parent.textContent || '';
					if (textContent.length > 100) {
						activeContainer = parent;
						break;
					}
					parent = parent.parentElement;
				}
			}
		}

		if (!activeContainer) {
			return null;
		}

		const text = activeContainer.innerText || activeContainer.textContent || '';
		const lines = text
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);

		if (lines.length < 7) {
			return null;
		}

		const companyMatch = text.match(/([^\r\n>]+)\s*>/);
		const company = companyMatch ? companyMatch[1].trim() : (lines[5] || '');
		const title = lines[6] || '';

		let deadline: string | null = null;
		const allDates = text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g);
		if (allDates && allDates.length > 0) {
			const lastDateStr = allDates[allDates.length - 1];
			deadline = parseDeadline(lastDateStr);
		}

		const descriptionLines = lines.slice(7);
		const description = descriptionLines.length > 0
			? descriptionLines.join('\n')
			: text;

		return {
			company,
			title,
			deadline,
			url: `https://jasoseol.com/recruit?ec=${ec}`,
			description: sanitizeText(description),
			site: this.site,
		};
	}
}

export const jasoseolScraper = new JasoseolScraper();

export async function scrapeJasoseol(): Promise<JobData | null> {
	return jasoseolScraper.scrape();
}
