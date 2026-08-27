import { describe, it, expect } from 'vitest';
import { classifyError } from '../errors';

describe('에러 분류 및 사용자 친화적 메시지 변환 (classifyError)', () => {
	it('Given 네트워크 연결 오류가 발생했을 때, When classifyError를 호출하면, Then 통신 장애 안내 메시지와 NETWORK_ERROR 코드를 반환한다', () => {
		const networkError = new TypeError('Failed to fetch');
		const result = classifyError(networkError, { url: 'https://notion-job-scraper-server.vercel.app/api/token' });

		expect(result.code).toBe('NETWORK_ERROR');
		expect(result.userMessage).toContain('서버와의 통신이 원활하지 않습니다');
		expect(result.devMessage).toContain('[NetworkError]');
	});

	it('Given 500 서버 에러가 발생했을 때, When classifyError를 호출하면, Then 서비스 점검 안내 메시지와 SERVER_ERROR 코드를 반환한다', () => {
		const result = classifyError(new Error('Internal Server Error'), {
			status: 500,
			rawResponse: '{"error":"Server failed"}',
			action: 'Token Exchange',
		});

		expect(result.code).toBe('SERVER_ERROR');
		expect(result.userMessage).toContain('일시적인 서비스 점검 중입니다');
		expect(result.devMessage).toContain('[ServerError 500]');
	});

	it('Given 401 인증 만료 오류가 발생했을 때, When classifyError를 호출하면, Then 세션 만료 메시지와 AUTH_EXPIRED 코드를 반환한다', () => {
		const result = classifyError(new Error('invalid_grant'), {
			status: 400,
			action: 'OAuth',
		});

		expect(result.code).toBe('AUTH_EXPIRED');
		expect(result.userMessage).toContain('로그인 세션이 만료되었거나');
	});

	it('Given 404 데이터베이스를 찾을 수 없을 때, When classifyError를 호출하면, Then 데이터베이스 확인 안내 메시지를 반환한다', () => {
		const result = classifyError(new Error('object_not_found'), {
			status: 404,
		});

		expect(result.code).toBe('DATABASE_NOT_FOUND');
		expect(result.userMessage).toContain('지정한 Notion 페이지/데이터베이스를 찾을 수 없습니다');
	});

	it('Given 권한이 거부되었을 때, When classifyError를 호출하면, Then Notion 연결 권한 안내 메시지를 반환한다', () => {
		const result = classifyError(new Error('restricted_resource'), {
			status: 403,
		});

		expect(result.code).toBe('DATABASE_ACCESS_DENIED');
		expect(result.userMessage).toContain('Notion 페이지 접근 권한이 없습니다');
	});
});
