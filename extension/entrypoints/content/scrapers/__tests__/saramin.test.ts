import { describe, it, expect, beforeEach } from 'vitest';
import { scrapeSaramin } from '../saramin';
import saraminHtml from '../__fixtures__/saramin.html?raw';

describe('Saramin (사람인) 스크래퍼 테스트', () => {
	beforeEach(() => {
		document.documentElement.innerHTML = saraminHtml;
	});

	it('Given JSON-LD JobPosting 데이터가 포함된 사람인 공고가 주어졌을 때, When scrapeSaramin을 호출하면, Then 구조화 데이터로부터 공고 정보를 추출한다', () => {
		// When
		const result = scrapeSaramin();

		// Then
		expect(result).not.toBeNull();
		expect(result?.title).toBe('클라우드 백엔드 엔지니어');
		expect(result?.company).toBe('글로벌IT');
		expect(result?.deadline).toBe('2026-11-30');
		expect(result?.description).toContain('대규모 분산 시스템');
		expect(result?.site).toBe('saramin');
	});

	it('Given JSON-LD가 없고 DOM 요소만 존재하는 경우, When scrapeSaramin을 호출하면, Then DOM 선택자 fallback으로 정보를 추출한다', () => {
		// Given
		const scripts = document.querySelectorAll('script[type="application/ld+json"]');
		scripts.forEach((s) => s.remove());

		// When
		const result = scrapeSaramin();

		// Then
		expect(result).not.toBeNull();
		expect(result?.title).toBe('클라우드 백엔드 엔지니어');
		expect(result?.company).toBe('글로벌IT');
		expect(result?.deadline).toBe('2026-11-30');
		expect(result?.site).toBe('saramin');
	});
});
