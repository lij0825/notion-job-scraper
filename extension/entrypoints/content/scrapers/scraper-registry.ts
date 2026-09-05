import type { JobData } from '../types';
import type { JobScraper } from './types';
import { jasoseolScraper } from './jasoseol';
import { wantedScraper } from './wanted';
import { saraminScraper } from './saramin';
import { jobkoreaScraper } from './jobkorea';

export class ScraperRegistry {
	private readonly scrapers: JobScraper[] = [];

	public constructor(initialScrapers?: readonly JobScraper[]) {
		if (initialScrapers) {
			this.scrapers.push(...initialScrapers);
		} else {
			this.registerDefaultScrapers();
		}
	}

	public register(scraper: JobScraper): void {
		this.scrapers.push(scraper);
	}

	public findScraper(url: string): JobScraper | null {
		for (const scraper of this.scrapers) {
			if (scraper.canHandle(url)) {
				return scraper;
			}
		}
		return null;
	}

	public async scrape(url: string): Promise<JobData | null> {
		const scraper = this.findScraper(url);
		if (!scraper) {
			return null;
		}
		return scraper.scrape();
	}

	private registerDefaultScrapers(): void {
		this.scrapers.push(jasoseolScraper, wantedScraper, saraminScraper, jobkoreaScraper);
	}
}

export const defaultScraperRegistry = new ScraperRegistry();
