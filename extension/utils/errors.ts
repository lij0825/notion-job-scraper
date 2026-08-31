/**
 * 애플리케이션 표준 에러 코드
 */
export type AppErrorCode =
	| 'NETWORK_ERROR'
	| 'SERVER_ERROR'
	| 'AUTH_EXPIRED'
	| 'AUTH_FAILED'
	| 'DATABASE_NOT_FOUND'
	| 'DATABASE_ACCESS_DENIED'
	| 'VALIDATION_ERROR'
	| 'UNKNOWN_ERROR';

/**
 * 정제된 사용자용 에러 정보
 */
export interface UserFriendlyError {
	code: AppErrorCode;
	userMessage: string;
	devMessage: string;
	statusCode?: number;
}

/**
 * 기술적 에러(HTTP 상태 코드, 네트워크 단절, OAuth 에러 등)를
 * 개발자용 로그와 사용자 친화적 UI 메시지로 분류 및 변환합니다.
 */
export function classifyError(
	err: unknown,
	context: {
		url?: string;
		status?: number;
		rawResponse?: string;
		action?: string;
	} = {}
): UserFriendlyError {
	const rawMessage = err instanceof Error ? err.message : String(err ?? '');
	const status = context.status;
	const isDev = process.env.NODE_ENV === 'development';

	// 1. 네트워크 단절 / 도달 불가 (NetworkError, Failed to fetch)
	if (
		rawMessage.includes('NetworkError') ||
		rawMessage.includes('Failed to fetch') ||
		rawMessage.includes('fetch failed') ||
		rawMessage.includes('ECONNREFUSED')
	) {
		const isLocalhost = context.url?.includes('localhost') || context.url?.includes('127.0.0.1');
		return {
			code: 'NETWORK_ERROR',
			userMessage: isDev && isLocalhost
				? '로컬 개발 프록시 서버에 연결할 수 없습니다. 터미널에서 npm run dev:server를 실행해 주세요.'
				: '서버와의 통신이 원활하지 않습니다. 인터넷 연결을 확인하거나 잠시 후 다시 시도해 주세요.',
			devMessage: `[NetworkError] Failed to connect to ${context.url ?? 'endpoint'}: ${rawMessage}`,
			statusCode: status,
		};
	}

	// 2. OAuth 토큰 교환 중 프록시 서버 에러 또는 배포 미발견
	if (
		context.action === 'Notion Token Exchange' &&
		((status && (status >= 500 || status === 404)) || rawMessage.includes('DEPLOYMENT_NOT_FOUND'))
	) {
		return {
			code: 'SERVER_ERROR',
			userMessage:
				'OAuth 인증 서버에 연결할 수 없거나 서버 점검 중입니다. 설정의 [직접 연동] 탭에서 API 키로 바로 연결해 보세요.',
			devMessage: `[ServerError ${status ?? 'N/A'}] ${context.action} failed: ${context.rawResponse || rawMessage}`,
			statusCode: status,
		};
	}

	// 3. 일반 HTTP 5xx 서버 에러
	if (status && status >= 500) {
		return {
			code: 'SERVER_ERROR',
			userMessage: '일시적인 서비스 점검 중입니다. 잠시 후 다시 이용해 주세요.',
			devMessage: `[ServerError ${status}] ${context.action ?? 'Request'} failed: ${context.rawResponse || rawMessage}`,
			statusCode: status,
		};
	}

	// 3. HTTP 401 / 403 인증 만료 및 권한 오류
	if (status === 401 || rawMessage.includes('invalid_grant') || rawMessage.includes('unauthorized')) {
		return {
			code: 'AUTH_EXPIRED',
			userMessage: '로그인 세션이 만료되었거나 인증에 실패했습니다. 다시 로그인해 주세요.',
			devMessage: `[AuthError ${status ?? 401}] Token invalid or expired: ${rawMessage}`,
			statusCode: status ?? 401,
		};
	}

	// 4. HTTP 404 데이터베이스 미존재 (Notion API 호출 시)
	if (status === 404 || rawMessage.includes('object_not_found')) {
		return {
			code: 'DATABASE_NOT_FOUND',
			userMessage: '지정한 Notion 페이지/데이터베이스를 찾을 수 없습니다. 링크를 다시 확인해 주세요.',
			devMessage: `[DatabaseNotFound 404] Resource not found: ${rawMessage}`,
			statusCode: 404,
		};
	}

	// 5. Notion 권한 거부 (Restricted)
	if (rawMessage.includes('restricted_resource') || rawMessage.includes('validation_error')) {
		return {
			code: 'DATABASE_ACCESS_DENIED',
			userMessage: 'Notion 페이지 접근 권한이 없습니다. Notion 페이지 우측 상단 [···] -> [연결]에서 확장을 허용해 주세요.',
			devMessage: `[DatabaseAccessDenied] Notion API restriction: ${rawMessage}`,
			statusCode: status,
		};
	}

	// 6. 기본 알 수 없는 오류
	return {
		code: 'UNKNOWN_ERROR',
		userMessage: '요청을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
		devMessage: `[UnknownError] ${context.action ?? 'Operation'} error: ${rawMessage}`,
		statusCode: status,
	};
}

