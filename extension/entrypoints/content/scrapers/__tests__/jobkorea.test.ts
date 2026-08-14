import { describe, it, expect, beforeEach } from 'vitest';
import { scrapeJobkorea } from '../jobkorea';
import jobkoreaHtml from '../__fixtures__/jobkorea.html?raw';

describe('JobKorea (잡코리아) 스크래퍼 테스트', () => {
	beforeEach(() => {
		document.documentElement.innerHTML = jobkoreaHtml;
	});

	it('Given JSON-LD JobPosting 데이터가 포함된 잡코리아 공고가 주어졌을 때, When scrapeJobkorea를 호출하면, Then JSON-LD로부터 정보를 파싱한다', () => {
		// When
		const result = scrapeJobkorea();

		// Then
		expect(result).not.toBeNull();
		expect(result?.title).toBe('빅데이터 플랫폼 엔지니어');
		expect(result?.company).toBe('빅데이터랩스');
		expect(result?.deadline).toBe('2026-10-15');
		expect(result?.description).toContain('실시간 데이터 파이프라인');
		expect(result?.site).toBe('jobkorea');
	});

	it('Given JSON-LD가 제거되고 DOM만 남아있는 경우, When scrapeJobkorea를 호출하면, Then DOM 선택자를 통해 제목, 회사명, 마감일을 파싱한다', () => {
		// Given
		const scripts = document.querySelectorAll('script[type="application/ld+json"]');
		scripts.forEach((s) => s.remove());

		// When
		const result = scrapeJobkorea();

		// Then
		expect(result).not.toBeNull();
		expect(result?.title).toBe('빅데이터 플랫폼 엔지니어');
		expect(result?.company).toBe('빅데이터랩스');
		expect(result?.deadline).toBe('2026-10-15');
		expect(result?.site).toBe('jobkorea');
	});
});
