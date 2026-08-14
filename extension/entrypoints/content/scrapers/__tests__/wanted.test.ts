import { describe, it, expect, beforeEach } from 'vitest';
import { scrapeWanted } from '../wanted';
import wantedHtml from '../__fixtures__/wanted.html?raw';

describe('Wanted (원티드) 스크래퍼 테스트', () => {
	beforeEach(() => {
		document.documentElement.innerHTML = wantedHtml;
	});

	it('Given __NEXT_DATA__ JSON이 포함된 원티드 공고 HTML이 주어졌을 때, When scrapeWanted를 호출하면, Then 직무명, 회사명, 마감일, 설명이 추출된다', () => {
		// When
		const result = scrapeWanted();

		// Then
		expect(result).not.toBeNull();
		expect(result?.title).toBe('시니어 프론트엔드 개발자');
		expect(result?.company).toBe('테크스타트업');
		expect(result?.deadline).toBe('2026-12-31');
		expect(result?.site).toBe('wanted');
		expect(result?.description).toContain('[포지션 소개]');
		expect(result?.description).toContain('React 및 TypeScript');
	});

	it('Given __NEXT_DATA__가 없고 DOM 요소만 존재하는 경우, When scrapeWanted를 호출하면, Then DOM fallback을 통해 공고 정보를 추출한다', () => {
		// Given
		const nextDataScript = document.getElementById('__NEXT_DATA__');
		if (nextDataScript) {
			nextDataScript.remove();
		}

		// When
		const result = scrapeWanted();

		// Then
		expect(result).not.toBeNull();
		expect(result?.title).toBe('시니어 프론트엔드 개발자');
		expect(result?.company).toBe('테크스타트업');
		expect(result?.site).toBe('wanted');
	});
});
