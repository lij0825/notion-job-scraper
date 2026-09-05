import { describe, it, expect } from 'vitest';
import { ScraperRegistry } from '../scraper-registry';
import type { JobScraper } from '../types';
import type { JobData } from '../../types';

describe('ScraperRegistry (스크래퍼 레지스트리 및 전략 패턴)', () => {
	it('Given 지원 사이트 URL이 주어졌을 때, When findScraper를 호출하면, Then 해당 사이트에 특화된 스크래퍼 전략을 반환한다', () => {
		const registry = new ScraperRegistry();

		const wantedScraper = registry.findScraper('https://www.wanted.co.kr/wd/12345');
		const saraminScraper = registry.findScraper('https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=123');
		const jobkoreaScraper = registry.findScraper('https://www.jobkorea.co.kr/Recruit/GI_Read/123');
		const jasoseolScraper = registry.findScraper('https://jasoseol.com/recruit?ec=123');

		expect(wantedScraper?.site).toBe('wanted');
		expect(saraminScraper?.site).toBe('saramin');
		expect(jobkoreaScraper?.site).toBe('jobkorea');
		expect(jasoseolScraper?.site).toBe('jasoseol');
	});

	it('Given 지원하지 않는 도메인 URL이 주어졌을 때, When findScraper를 호출하면, Then null을 반환한다', () => {
		const registry = new ScraperRegistry();

		const unsupported = registry.findScraper('https://example.com/jobs/123');
		expect(unsupported).toBeNull();
	});

	it('Given 커스텀 스크래퍼를 등록했을 때, When 일치하는 URL로 요청하면, Then 등록된 커스텀 스크래퍼가 조회되고 실행된다', async () => {
		const dummyData: JobData = {
			title: '플랫폼 엔지니어',
			company: '테스트컴퍼니',
			url: 'https://custom-jobs.com/1',
			deadline: '2026-10-31',
			description: '플랫폼 구축 및 운영',
			site: 'wanted',
		};

		const customScraper: JobScraper = {
			site: 'wanted',
			canHandle: (url: string) => url.includes('custom-jobs.com'),
			scrape: () => dummyData,
		};

		const registry = new ScraperRegistry([]);
		registry.register(customScraper);

		const matchedScraper = registry.findScraper('https://custom-jobs.com/1');
		expect(matchedScraper).toBe(customScraper);

		const result = await registry.scrape('https://custom-jobs.com/1');
		expect(result).toEqual(dummyData);
	});
});
