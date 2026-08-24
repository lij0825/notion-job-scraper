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

	it('Given 사람인 relay/view 공고 페이지가 주어졌을 때, When scrapeSaramin을 호출하면, Then meta 태그와 og 태그로부터 회사명, 직무명, 마감일을 정확히 추출한다', () => {
		// Given: 사람인 relay/view 페이지 HTML 구조 모의
		document.documentElement.innerHTML = `
			<head>
				<title>[(주)씨아이템프러리] [장애인전형] 현대카드CardFactory 계약직 채용-동의서점검/운영(D-6) - 사람인</title>
				<meta property="og:title" content="[(주)씨아이템프러리] [장애인전형] 현대카드CardFactory 계약직 채용-동의서점검/운영(D-6) - 사람인">
				<meta property="og:description" content="(주)씨아이템프러리, [장애인전형] 현대카드CardFactory 계약직 채용-동의서점검/운영, 경력:경력무관, 학력:학력무관, 면접 후 결정, 마감일:2026-08-30, 홈페이지:www.citemp.co.kr">
				<meta name="description" content="(주)씨아이템프러리, [장애인전형] 현대카드CardFactory 계약직 채용-동의서점검/운영, 경력:경력무관, 학력:학력무관, 면접 후 결정, 마감일:2026-08-30, 홈페이지:www.citemp.co.kr">
			</head>
			<body>
				<div class="wrap_jview"></div>
			</body>
		`;

		// When
		const result = scrapeSaramin();

		// Then
		expect(result).not.toBeNull();
		expect(result?.company).toBe('(주)씨아이템프러리');
		expect(result?.title).toBe('[장애인전형] 현대카드CardFactory 계약직 채용-동의서점검/운영');
		expect(result?.deadline).toBe('2026-08-30');
		expect(result?.site).toBe('saramin');
	});
});
