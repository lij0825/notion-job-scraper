import type { JobData, SiteKey } from '../types';
import { sanitizeText, parseDeadline } from '../../../utils/sanitize';
import { BaseJobScraper } from './base-scraper';

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

const TITLE_SELECTORS = [
	'h1[class*="JobHeader"]',
	'h1',
	'h2[data-cy="job-position"]',
	'.JobHeader_className',
	'h2.position',
	'.job-title h2',
	'[class*="JobDetail"] h2',
	'[class*="position"]',
] as const;

const COMPANY_SELECTORS = [
	'a[data-cy="company-name"]',
	'a[data-attribute-id="company__click"]',
	'[class*="JobHeader"] a[href*="/company/"]',
	'.CompanyInfo_name',
	'.company-name a',
	'[class*="CompanyInfo"] [class*="name"]',
	'[class*="company"] a',
] as const;

const DESCRIPTION_SELECTORS = [
	'[class*="JobDescription_JobDescription"]',
	'[class*="JobDescription"]',
	'[class*="job-description"]',
	'[class*="Description"]',
	'[data-testid="job-detail-description"]',
	'article',
] as const;

export class WantedScraper extends BaseJobScraper {
	public override readonly site: SiteKey = 'wanted';

	public override canHandle(url: string): boolean {
		return url.includes('wanted.co.kr');
	}

	public override scrape(): JobData | null {
		const fromNextData = this.scrapeFromNextData();
		if (fromNextData) {
			return fromNextData;
		}

		return this.scrapeFromDom();
	}

	private scrapeFromNextData(): JobData | null {
		const scriptElement = document.getElementById('__NEXT_DATA__');
		const textContent = scriptElement?.textContent;
		if (!textContent) {
			return null;
		}

		let parsed: WantedNextData;
		try {
			parsed = JSON.parse(textContent) as WantedNextData;
		} catch {
			return null;
		}

		const pageProps = parsed.props?.pageProps;
		const job = pageProps?.job ?? pageProps?.initialJobData ?? pageProps?.initialData;
		if (!job) {
			return null;
		}

		const title = job.position ?? '';
		const company = job.company?.name ?? job.company?.company_name ?? '';
		if (!title && !company) {
			return null;
		}

		const description = this.buildDescription(job);

		return {
			title,
			company,
			url: window.location.href,
			deadline: this.parseWantedDueTime(job.due_time),
			description: sanitizeText(description),
			site: this.site,
		};
	}

	private buildDescription(job: WantedJob): string {
		const detail = job.detail;
		const sections: ReadonlyArray<{ label: string; content?: string }> = [
			{ label: '포지션 소개', content: detail?.intro || job.intro },
			{ label: '주요 업무', content: detail?.main_tasks || job.main_tasks },
			{ label: '자격 요건', content: detail?.requirements || job.requirements },
			{ label: '우대 사항', content: detail?.preferred_points || job.preferred_points },
			{ label: '혜택 및 복지', content: detail?.benefits || job.benefits },
		];

		return sections
			.filter((section) => Boolean(section.content?.trim()))
			.map((section) => `[${section.label}]\n${section.content}`)
			.join('\n\n');
	}

	private parseWantedDueTime(dueTime: string | null | undefined): string | null {
		if (!dueTime) {
			return null;
		}
		const match = dueTime.match(/^(\d{4}-\d{2}-\d{2})/);
		return match ? match[1] : parseDeadline(dueTime);
	}

	private scrapeFromDom(): JobData | null {
		const title = this.queryFirstText(TITLE_SELECTORS);
		const company = this.queryFirstText(COMPANY_SELECTORS);

		if (!title && !company) {
			return null;
		}

		const deadlineElement = document.querySelector<HTMLElement>(
			'[class*="deadline"], [class*="due"], .job-due, [class*="Deadline"]'
		);
		const deadlineText = deadlineElement?.textContent ?? '';

		let description = '';
		for (const selector of DESCRIPTION_SELECTORS) {
			const element = document.querySelector<HTMLElement>(selector);
			const text = element?.textContent?.trim();
			if (text) {
				description = text;
				break;
			}
		}

		return {
			title,
			company,
			url: window.location.href,
			deadline: parseDeadline(deadlineText),
			description: sanitizeText(description),
			site: this.site,
		};
	}
}

export const wantedScraper = new WantedScraper();

export function scrapeWanted(): JobData | null {
	return wantedScraper.scrape();
}

type SpaChangeCallback = (url: string) => void;

export function watchWantedNavigation(callback: SpaChangeCallback): () => void {
	let lastUrl = window.location.href;

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

	window.addEventListener('popstate', handleUrlChange);

	const observer = new MutationObserver(() => {
		const currentUrl = window.location.href;
		if (currentUrl !== lastUrl && isJobDetailUrl(currentUrl)) {
			lastUrl = currentUrl;
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

	return () => {
		window.removeEventListener('popstate', handleUrlChange);
		observer.disconnect();
		history.pushState = originalPushState;
		history.replaceState = originalReplaceState;
	};
}

function isJobDetailUrl(url: string): boolean {
	return url.includes('wanted.co.kr/jobdetail/') || url.includes('wanted.co.kr/wd/');
}
