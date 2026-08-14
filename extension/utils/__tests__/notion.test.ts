import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createJobPage, validateDatabase, createNotionDatabase, parseNotionId } from '../notion';
import type { JobData } from '../types';

const server = setupServer(
	// Notion Page Create API Mock
	http.post('https://api.notion.com/v1/pages', async ({ request }) => {
		const body = (await request.json()) as { properties?: { Title?: unknown } };
		if (!body.properties) {
			return new HttpResponse(null, { status: 400 });
		}
		return HttpResponse.json({
			id: 'mock-page-id-12345',
			object: 'page',
		});
	}),

	// Notion Database Retrieve API Mock
	http.get('https://api.notion.com/v1/databases/:databaseId', ({ params }) => {
		const { databaseId } = params;
		if (databaseId === 'invalid-db-id') {
			return new HttpResponse(JSON.stringify({ message: 'Object not found' }), { status: 404 });
		}
		return HttpResponse.json({
			id: databaseId,
			object: 'database',
			title: [
				{
					type: 'text',
					plain_text: '채용 공고 데이터베이스',
				},
			],
		});
	}),

	// Notion Database Create API Mock
	http.post('https://api.notion.com/v1/databases', async () => {
		return HttpResponse.json({
			id: 'new-created-db-id-67890',
			object: 'database',
		});
	})
);

describe('Notion API 연동 유틸리티 테스트 (MSW 인터셉트)', () => {
	beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
	afterEach(() => server.resetHandlers());
	afterAll(() => server.close());

	it('Given 채용 공고 데이터와 유효한 토큰/DB ID가 주어졌을 때, When createJobPage를 호출하면, Then Notion 페이지 ID가 정상 반환된다', async () => {
		// Given
		const mockJob: JobData = {
			title: '백엔드 엔지니어',
			company: '테크코퍼레이션',
			url: 'https://www.wanted.co.kr/wd/12345',
			deadline: '2026-12-31',
			description: 'Java / TypeScript 개발\n대용량 트래픽 처리',
			site: 'wanted',
		};

		// When
		const pageId = await createJobPage('mock_access_token', 'valid-db-id', mockJob);

		// Then
		expect(pageId).toBe('mock-page-id-12345');
	});

	it('Given 유효한 Database ID가 주어졌을 때, When validateDatabase를 호출하면, Then 유효성 여부(valid: true)와 데이터베이스 이름이 반환된다', async () => {
		// Given & When
		const result = await validateDatabase('mock_access_token', 'db-uuid-1234');

		// Then
		expect(result.valid).toBe(true);
		expect(result.name).toBe('채용 공고 데이터베이스');
	});

	it('Given 유효하지 않은 Database ID가 주어졌을 때, When validateDatabase를 호출하면, Then 에러를 throw한다', async () => {
		// Given & When & Then
		await expect(validateDatabase('mock_access_token', 'invalid-db-id')).rejects.toThrow();
	});

	it('Given 상위 페이지 ID가 주어졌을 때, When createNotionDatabase를 호출하면, Then 생성된 신규 데이터베이스 ID가 반환된다', async () => {
		// Given & When
		const newDbId = await createNotionDatabase('mock_api_key', 'parent-page-id-123');

		// Then
		expect(newDbId).toBe('new-created-db-id-67890');
	});

	it('Given 다양한 형식의 Notion URL 또는 UUID 문자열이 주어졌을 때, When parseNotionId를 호출하면, Then 32자리 Hex ID를 정확히 추출한다', () => {
		// Given
		const fullUrl = 'https://www.notion.so/myworkspace/My-Database-1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d?v=123';
		const hyphenatedId = '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d';

		// When & Then
		expect(parseNotionId(fullUrl)).toBe('1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d');
		expect(parseNotionId(hyphenatedId)).toBe('1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d');
	});
});
