import { describe, it, expect, beforeEach } from 'vitest';
import { scrapeJasoseol } from '../jasoseol';
import jasoseolHtml from '../__fixtures__/jasoseol.html?raw';

describe('Jasoseol (자소설닷컴) 스크래퍼 테스트', () => {
	beforeEach(() => {
		document.documentElement.innerHTML = jasoseolHtml;
	});

	it('Given URL 파라미터(?ec=1234)와 모달 컨테이너가 주어졌을 때, When scrapeJasoseol을 호출하면, Then 회사명, 공고명, 마감일이 추출된다', async () => {
		// Given (use relative query params in JSDOM)
		window.history.replaceState({}, '', '?ec=1234');

		// When
		const result = await scrapeJasoseol();

		// Then
		expect(result).not.toBeNull();
		expect(result?.company).toContain('네오테크놀로지');
		expect(result?.title).toContain('2026 하반기 신입 소프트웨어 엔지니어 공개 채용');
		expect(result?.deadline).toBe('2026-09-30');
		expect(result?.site).toBe('jasoseol');
		expect(result?.url).toBe('https://jasoseol.com/recruit?ec=1234');
	});

	it('Given 모달 URL 파라미터(?ec=)가 없는 페이지일 때, When scrapeJasoseol을 호출하면, Then null을 반환하고 스크래핑을 건너뛴다', async () => {
		// Given
		window.history.replaceState({}, '', window.location.pathname);

		// When
		const result = await scrapeJasoseol();

		// Then
		expect(result).toBeNull();
	});
});
