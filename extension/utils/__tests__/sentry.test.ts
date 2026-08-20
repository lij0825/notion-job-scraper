import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	sanitizeString,
	sanitizeData,
	sanitizeSentryEvent,
} from '../sentry-sanitize';
import { initPopupSentry } from '../sentry-popup';
import { initBackgroundSentry } from '../sentry-background';
import type { ErrorEvent } from '@sentry/browser';

describe('Sentry 보안 필터링 및 마스킹 단위 테스트', () => {
	it('문자열 내 주민등록번호, 전화번호, 이메일, 시크릿 토큰을 올바르게 마스킹한다', () => {
		// Given
		const rawText =
			'담당자 연락처: 010-9876-5432, 이메일: recruit@company.com, 주민번호: 950101-1234567, 토큰: secret_abc123xyz_test, 인증: Bearer mySecretToken123';

		// When
		const sanitized = sanitizeString(rawText);

		// Then
		expect(sanitized).toContain('[PHONE-REDACTED]');
		expect(sanitized).not.toContain('010-9876-5432');

		expect(sanitized).toContain('[EMAIL-REDACTED]');
		expect(sanitized).not.toContain('recruit@company.com');

		expect(sanitized).toContain('[RRN-REDACTED]');
		expect(sanitized).not.toContain('950101-1234567');

		expect(sanitized).toContain('[SECRET-REDACTED]');
		expect(sanitized).not.toContain('secret_abc123xyz_test');

		expect(sanitized).toContain('Bearer [REDACTED]');
		expect(sanitized).not.toContain('mySecretToken123');
	});

	it('중첩 객체 내의 민감 키(authorization, client_secret, code, token)를 전수 마스킹한다', () => {
		// Given
		const payload = {
			client_secret: 'secret_value_123',
			NOTION_CLIENT_SECRET: 'secret_notion_456',
			code: 'oauth_code_xyz',
			job: {
				title: '백엔드 엔지니어',
				description: '문의: 010-1111-2222 또는 test@hr.com',
				authorization: 'Bearer secretAuthToken',
			},
			items: [
				{ access_token: 'tok_abc' },
				{ note: '주민번호: 000101-3456789' },
			],
		};

		// When
		const sanitized = sanitizeData(payload) as Record<string, unknown>;

		// Then
		expect(sanitized['client_secret']).toBe('[REDACTED]');
		expect(sanitized['NOTION_CLIENT_SECRET']).toBe('[REDACTED]');
		expect(sanitized['code']).toBe('[REDACTED]');

		const job = sanitized['job'] as Record<string, unknown>;
		expect(job['authorization']).toBe('[REDACTED]');
		expect(job['title']).toBe('백엔드 엔지니어');
		expect(job['description']).toContain('[PHONE-REDACTED]');
		expect(job['description']).toContain('[EMAIL-REDACTED]');

		const items = sanitized['items'] as Array<Record<string, unknown>>;
		expect(items[0]['access_token']).toBe('[REDACTED]');
		expect(items[1]['note']).toContain('[RRN-REDACTED]');
	});

	it('Sentry ErrorEvent 페이로드의 헤더, 에러 메시지, 브레드크럼을 완벽히 마스킹한다', () => {
		// Given
		const rawEvent = {
			type: undefined,
			message: '오류 발생: 010-5555-6666 계정 처리 실패',
			request: {
				headers: {
					Authorization: 'Bearer topSecretAuthToken',
					Cookie: 'session_id=12345',
					'Content-Type': 'application/json',
				},
				data: {
					client_secret: 'notionSecret',
					info: '010-9999-8888',
				},
			},
			exception: {
				values: [
					{
						value: 'API 실패: secret_notion_api_token_invalid at user@domain.com',
					},
				],
			},
			breadcrumbs: [
				{
					message: '사용자 번호 010-3333-4444 등록 시도',
					data: { code: 'temporaryCode' },
				},
			],
		} as unknown as ErrorEvent;

		// When
		const sanitized = sanitizeSentryEvent(rawEvent);

		// Then
		expect(sanitized.message).toContain('[PHONE-REDACTED]');
		expect(sanitized.request?.headers?.['Authorization']).toBe('[REDACTED]');
		expect(sanitized.request?.headers?.['Cookie']).toBe('[REDACTED]');
		expect(sanitized.request?.headers?.['Content-Type']).toBe('application/json');

		const reqData = sanitized.request?.data as Record<string, unknown>;
		expect(reqData['client_secret']).toBe('[REDACTED]');
		expect(reqData['info']).toBe('[PHONE-REDACTED]');

		expect(sanitized.exception?.values?.[0]?.value).toContain('[SECRET-REDACTED]');
		expect(sanitized.exception?.values?.[0]?.value).toContain('[EMAIL-REDACTED]');

		expect(sanitized.breadcrumbs?.[0]?.message).toContain('[PHONE-REDACTED]');
		expect(sanitized.breadcrumbs?.[0]?.data?.['code']).toBe('[REDACTED]');
	});
});

describe('Sentry 초기화 및 환경 격리 단위 테스트', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('Popup Sentry 초기화가 안전하게 실행된다', () => {
		expect(() => initPopupSentry()).not.toThrow();
	});

	it('Background Sentry 초기화가 안전하게 실행된다', () => {
		expect(() => initBackgroundSentry()).not.toThrow();
	});
});
