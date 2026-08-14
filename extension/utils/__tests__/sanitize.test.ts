import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { sanitizeText, parseDeadline } from '../sanitize';

describe('sanitizeText 텍스트 정제 함수', () => {
	it('Given 여러 줄바꿈 및 불필요한 공백이 포함된 문자열이 주어졌을 때, When 정제하면, Then 최대 2줄 연속 줄바꿈 및 앞뒤 공백이 제거된다', () => {
		// Given
		const dirtyText = '  \n\n\n  주요   업무내용입니다.  \r\n\tReact와 TypeScript 개발. \n\n\n\n복지 혜택  ';

		// When
		const sanitized = sanitizeText(dirtyText);

		// Then
		expect(sanitized).toBe('주요 업무내용입니다.\nReact와 TypeScript 개발.\n\n복지 혜택');
	});

	it('Given fast-check 임의 문자열에 대해, When sanitizeText를 실행하면, Then 3개 이상의 연속 줄바꿈이 존재하지 않고 앞뒤 공백이 제거된다 (Property-Based Fuzzing)', () => {
		fc.assert(
			fc.property(fc.string(), (raw) => {
				const result = sanitizeText(raw);

				// 불변식 1: 3개 이상의 연속 줄바꿈 없음
				expect(result).not.toMatch(/\n{3,}/);

				// 불변식 2: 캐리지 리턴(\r) 없음
				expect(result).not.toContain('\r');

				// 불변식 3: 탭(\t) 문자 없음
				expect(result).not.toContain('\t');

				// 불변식 4: 앞뒤 공백 없음
				if (result.length > 0) {
					expect(result.startsWith(' ')).toBe(false);
					expect(result.endsWith(' ')).toBe(false);
				}
			}),
			{ numRuns: 100 }
		);
	});
});

describe('parseDeadline 마감일 파싱 함수', () => {
	it('Given YYYY.MM.DD 형식의 날짜 문자열이 주어졌을 때, When 파싱하면, Then YYYY-MM-DD 형식으로 변환된다', () => {
		// Given
		const input = '2026.08.31';

		// When
		const result = parseDeadline(input);

		// Then
		expect(result).toBe('2026-08-31');
	});

	it('Given 한글 연월일 형식(YYYY년 MM월 DD일) 문자열이 주어졌을 때, When 파싱하면, Then YYYY-MM-DD 형식으로 정규화된다', () => {
		// Given
		const input = '2026년 9월 5일 마감';

		// When
		const result = parseDeadline(input);

		// Then
		expect(result).toBe('2026-09-05');
	});

	it('Given 상시채용 및 수시채용 관련 키워드가 주어졌을 때, When 파싱하면, Then null을 반환한다', () => {
		// Given
		const keywords = ['상시채용', '채용시 마감', '상시 모집', '수시 채용', '  상시 채용  '];

		// When & Then
		for (const keyword of keywords) {
			expect(parseDeadline(keyword)).toBeNull();
		}
	});

	it('Given 빈 문자열 또는 유효하지 않은 문자열이 주어졌을 때, When 파싱하면, Then null을 반환한다', () => {
		expect(parseDeadline('')).toBeNull();
		expect(parseDeadline('   ')).toBeNull();
		expect(parseDeadline('날짜 없음')).toBeNull();
	});
});
