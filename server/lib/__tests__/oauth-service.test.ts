import { describe, it, expect, vi } from 'vitest';
import { NotionOAuthService } from '../oauth-service';

describe('NotionOAuthService 단위 테스트', () => {
	it('Given 환경변수가 설정되지 않았을 때, When exchangeToken을 호출하면, Then 500 에러 결과를 반환한다', async () => {
		const service = new NotionOAuthService({
			clientId: '',
			clientSecret: '',
		});

		const result = await service.exchangeToken({
			code: 'sample-code',
			redirectUri: 'https://example.com/callback',
		});

		expect(result.success).toBe(false);
		expect(result.status).toBe(500);
		expect(result.error).toBe('server_config_error');
	});

	it('Given code 또는 redirectUri가 비어있을 때, When exchangeToken을 호출하면, Then 400 에러 결과를 반환한다', async () => {
		const service = new NotionOAuthService({
			clientId: 'client-id-123',
			clientSecret: 'secret-456',
		});

		const result = await service.exchangeToken({
			code: '   ',
			redirectUri: 'https://example.com/callback',
		});

		expect(result.success).toBe(false);
		expect(result.status).toBe(400);
		expect(result.error).toBe('invalid_request');
	});

	it('Given 유효한 요청과 정상 응답이 주어졌을 때, When exchangeToken을 호출하면, Then 성공 결과와 토큰 데이터를 반환한다', async () => {
		const mockResponseData = {
			access_token: 'secret_mock_access_token',
			workspace_name: '테스트 워크스페이스',
			workspace_id: 'ws-123',
		};

		const mockFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(mockResponseData), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		const service = new NotionOAuthService({
			clientId: 'client-id-123',
			clientSecret: 'secret-456',
			fetchFn: mockFetch as unknown as typeof fetch,
		});

		const result = await service.exchangeToken({
			code: 'valid-auth-code',
			redirectUri: 'https://example.com/callback',
		});

		expect(result.success).toBe(true);
		expect(result.status).toBe(200);
		expect(result.data).toEqual(mockResponseData);
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it('Given Notion API가 400 오류를 반환할 때, When exchangeToken을 호출하면, Then 해당 상태코드와 오류 내용을 전달한다', async () => {
		const mockErrorResponse = {
			error: 'invalid_grant',
			message: 'The provided authorization grant is invalid, expired, or revoked.',
		};

		const mockFetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(mockErrorResponse), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			})
		);

		const service = new NotionOAuthService({
			clientId: 'client-id-123',
			clientSecret: 'secret-456',
			fetchFn: mockFetch as unknown as typeof fetch,
		});

		const result = await service.exchangeToken({
			code: 'expired-code',
			redirectUri: 'https://example.com/callback',
		});

		expect(result.success).toBe(false);
		expect(result.status).toBe(400);
		expect(result.error).toBe('invalid_grant');
	});

	it('Given 네트워크 오류가 발생할 때, When exchangeToken을 호출하면, Then 502 네트워크 에러를 반환한다', async () => {
		const mockFetch = vi.fn().mockRejectedValue(new Error('Connection timed out'));

		const service = new NotionOAuthService({
			clientId: 'client-id-123',
			clientSecret: 'secret-456',
			fetchFn: mockFetch as unknown as typeof fetch,
		});

		const result = await service.exchangeToken({
			code: 'valid-code',
			redirectUri: 'https://example.com/callback',
		});

		expect(result.success).toBe(false);
		expect(result.status).toBe(502);
		expect(result.error).toBe('network_error');
	});
});
