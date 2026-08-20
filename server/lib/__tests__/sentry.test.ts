import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	sanitizeString,
	sanitizeData,
	sanitizeSentryEvent,
	initServerSentry,
} from '../sentry';
import type { ErrorEvent } from '@sentry/node';

describe('Server Sentry 보안 필터링 단위 테스트', () => {
	it('HTTP Basic/Bearer 인증 헤더와 Notion 시크릿을 마스킹한다', () => {
		const raw = 'Basic Y2xpZW50X2lkOmNsaWVudF9zZWNyZXQ= 및 secret_test1234567890';
		const sanitized = sanitizeString(raw);

		expect(sanitized).toContain('Basic [REDACTED]');
		expect(sanitized).not.toContain('Y2xpZW50X2lkOmNsaWVudF9zZWNyZXQ=');
		expect(sanitized).toContain('[SECRET-REDACTED]');
		expect(sanitized).not.toContain('secret_test1234567890');
	});

	it('OAuth 요청/응답 페이로드 내 민감 키(code, client_secret, token)를 마스킹한다', () => {
		const payload = {
			code: 'auth_code_12345',
			client_secret: 'secret_abc987',
			NOTION_CLIENT_SECRET: 'secret_notion_xyz',
			nested: {
				access_token: 'secret_access_tok',
				adminPhone: '010-4444-5555',
			},
		};

		const sanitized = sanitizeData(payload) as Record<string, unknown>;
		expect(sanitized['code']).toBe('[REDACTED]');
		expect(sanitized['client_secret']).toBe('[REDACTED]');
		expect(sanitized['NOTION_CLIENT_SECRET']).toBe('[REDACTED]');

		const nested = sanitized['nested'] as Record<string, unknown>;
		expect(nested['access_token']).toBe('[REDACTED]');
		expect(nested['adminPhone']).toBe('[PHONE-REDACTED]');
	});

	it('Sentry Node ErrorEvent의 민감 헤더와 에러 스택/메시지를 마스킹한다', () => {
		const rawEvent = {
			message: 'Notion 토큰 교환 실패: 010-8888-9999',
			request: {
				headers: {
					Authorization: 'Basic Base64Credentials==',
					'Content-Type': 'application/json',
				},
				data: {
					code: 'sampleCode',
					client_secret: 'secret_live',
				},
			},
			exception: {
				values: [
					{
						value: 'Connection error with secret_invalid_token for admin@test.com',
					},
				],
			},
		} as unknown as ErrorEvent;

		const sanitized = sanitizeSentryEvent(rawEvent);
		expect(sanitized.message).toContain('[PHONE-REDACTED]');
		expect(sanitized.request?.headers?.['Authorization']).toBe('[REDACTED]');
		expect(sanitized.request?.headers?.['Content-Type']).toBe('application/json');

		const reqData = sanitized.request?.data as Record<string, unknown>;
		expect(reqData['code']).toBe('[REDACTED]');
		expect(reqData['client_secret']).toBe('[REDACTED]');

		expect(sanitized.exception?.values?.[0]?.value).toContain('[SECRET-REDACTED]');
		expect(sanitized.exception?.values?.[0]?.value).toContain('[EMAIL-REDACTED]');
	});
});

describe('Server Sentry 초기화 단위 테스트', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('개발 환경 또는 DSN이 없을 때 안전하게 초기화되고 예외를 던지지 않는다', () => {
		process.env['NODE_ENV'] = 'development';
		process.env['SENTRY_DSN'] = '';
		expect(() => initServerSentry()).not.toThrow();
	});

	it('Production 환경 및 DSN 설정 시 정상 초기화된다', () => {
		process.env['NODE_ENV'] = 'production';
		process.env['SENTRY_DSN'] = 'https://examplePublicKey@o0.ingest.sentry.io/0';
		expect(() => initServerSentry()).not.toThrow();
	});
});
