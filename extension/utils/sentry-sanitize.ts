import type { ErrorEvent } from '@sentry/browser';

const SENSITIVE_KEYS = new Set([
	'authorization',
	'client_secret',
	'clientsecret',
	'notion_client_secret',
	'code',
	'access_token',
	'token',
	'password',
	'secret',
	'cookie',
]);

/**
 * 문자열 내 주민등록번호, 전화번호, 이메일, 인증 토큰 및 시크릿을 마스킹합니다.
 */
export function sanitizeString(text: string): string {
	if (!text) {
		return text;
	}

	return text
		// 주민등록번호 (RRN)
		.replace(/\b\d{6}[- ]?[1-4]\d{6}\b/g, '[RRN-REDACTED]')
		// 국내 휴대폰/유선 전화번호
		.replace(/\b01[016789][- ]?\d{3,4}[- ]?\d{4}\b/g, '[PHONE-REDACTED]')
		// 이메일 주소
		.replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, '[EMAIL-REDACTED]')
		// Notion / API 시크릿 토큰
		.replace(/secret_[a-zA-Z0-9_-]+/g, '[SECRET-REDACTED]')
		// HTTP Basic / Bearer 인증 토큰
		.replace(/(Bearer|Basic)\s+[A-Za-z0-9+/=_.-]+/gi, '$1 [REDACTED]');
}

/**
 * 객체 및 배열 내의 민감 키와 값을 재귀적으로 마스킹합니다.
 */
export function sanitizeData(data: unknown): unknown {
	if (typeof data === 'string') {
		return sanitizeString(data);
	}
	if (Array.isArray(data)) {
		return data.map((item) => sanitizeData(item));
	}
	if (data !== null && typeof data === 'object') {
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(data)) {
			if (SENSITIVE_KEYS.has(key.toLowerCase())) {
				result[key] = '[REDACTED]';
			} else {
				result[key] = sanitizeData(value);
			}
		}
		return result;
	}
	return data;
}

/**
 * Sentry beforeSend 훅에서 이벤트 페이로드를 전수 보안 필터링합니다.
 */
export function sanitizeSentryEvent<T extends ErrorEvent>(event: T): T {
	if (!event) {
		return event;
	}

	if (typeof event.message === 'string') {
		event.message = sanitizeString(event.message);
	}

	if (event.request) {
		if (event.request.headers && typeof event.request.headers === 'object') {
			const sanitizedHeaders: Record<string, string> = {};
			for (const [header, val] of Object.entries(event.request.headers)) {
				if (header.toLowerCase() === 'authorization' || header.toLowerCase() === 'cookie') {
					sanitizedHeaders[header] = '[REDACTED]';
				} else if (typeof val === 'string') {
					sanitizedHeaders[header] = sanitizeString(val);
				} else {
					sanitizedHeaders[header] = String(val);
				}
			}
			event.request.headers = sanitizedHeaders;
		}

		if (event.request.data) {
			event.request.data = sanitizeData(event.request.data);
		}
	}

	if (event.exception?.values && Array.isArray(event.exception.values)) {
		for (const exception of event.exception.values) {
			if (typeof exception.value === 'string') {
				exception.value = sanitizeString(exception.value);
			}
		}
	}

	if (event.breadcrumbs && Array.isArray(event.breadcrumbs)) {
		for (const breadcrumb of event.breadcrumbs) {
			if (typeof breadcrumb.message === 'string') {
				breadcrumb.message = sanitizeString(breadcrumb.message);
			}
			if (breadcrumb.data && typeof breadcrumb.data === 'object') {
				breadcrumb.data = sanitizeData(breadcrumb.data) as Record<string, unknown>;
			}
		}
	}

	if (event.extra && typeof event.extra === 'object') {
		event.extra = sanitizeData(event.extra) as Record<string, unknown>;
	}

	return event;
}
