import type { JobData, SiteKey } from '../types';

export interface JobScraper {
	readonly site: SiteKey;
	canHandle(url: string): boolean;
	scrape(): Promise<JobData | null> | JobData | null;
}
