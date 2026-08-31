// ===========================================================
// 채용 공고 스크래핑 관련 핵심 타입 정의
// ===========================================================

/** 지원하는 채용 사이트 목록 */
export type SiteKey = 'jasoseol' | 'wanted' | 'saramin' | 'jobkorea' | 'unknown';

/** 스크래핑된 채용 공고 데이터 구조 */
export interface JobData {
	/** 직무/포지션명 */
	title: string;
	/** 회사명 */
	company: string;
	/** 채용 공고 페이지 URL */
	url: string;
	/**
	 * 지원 마감일 (YYYY-MM-DD 형식)
	 * 상시채용 또는 채용시 마감인 경우 null
	 */
	deadline: string | null;
	/** 직무 설명 및 자격 요건 본문 */
	description: string;
	/** 스크래핑된 사이트 식별자 */
	site: SiteKey;
}

// ===========================================================
// 스토리지 관련 타입
// ===========================================================

/** browser.storage.sync에 저장되는 데이터 구조 */
export interface StorageData {
	accessToken: string | undefined;
	workspaceName: string | undefined;
	workspaceId: string | undefined;
	/** 사용자가 직접 입력한 Notion Database ID */
	databaseId: string | undefined;
}

// ===========================================================
// 인증 상태 타입
// ===========================================================

/** OAuth 연결 실패 시 저장되는 에러 정보 */
export interface ConnectionError {
	/** 에러 메시지 (사용자에게 표시) */
	message: string;
	/** 에러 발생 시각 (ISO 8601) */
	occurredAt: string;
}

/** 현재 Notion 연결 상태 */
export interface AuthStatus {
	isConnected: boolean;
	workspaceName?: string;
	databaseId?: string;
	/** 마지막 OAuth 연결 실패 정보 — storage.local에서 조회 */
	lastError?: ConnectionError;
}

// ===========================================================
// 메시지 프로토콜 타입 (Popup ↔ Background ↔ Content)
// ===========================================================

/** Popup → Background Service Worker 메시지 타입 */
export type BackgroundMessage =
	| { type: 'START_OAUTH' }
	| { type: 'LOGOUT' }
	| { type: 'GET_AUTH_STATUS' }
	| { type: 'SAVE_TO_NOTION'; payload: JobData }
	| { type: 'SAVE_DATABASE_ID'; databaseId: string }
	| { type: 'CREATE_DATABASE'; parentPageId: string }
	| { type: 'SAVE_MANUAL_AUTH'; apiKey: string; databaseId: string }
	| { type: 'DISMISS_ERROR' };

/** Popup → Content Script 스크래핑 요청 */
export interface ScrapeMessage {
	type: 'SCRAPE';
}

/** Background 응답 공통 래퍼 */
export type BackgroundResponse<T = unknown> =
	| { success: true; data: T }
	| { success: false; error: string };

/** Content Script 스크래핑 응답 */
export type ScrapeResponse =
	| { success: true; data: JobData }
	| { success: false; error: string };

// ===========================================================
// Notion API 응답 관련 타입
// ===========================================================

/** Notion OAuth 토큰 교환 응답 구조 */
export interface NotionTokenResponse {
	access_token: string;
	token_type: string;
	bot_id: string;
	workspace_id: string;
	workspace_name: string;
	workspace_icon: string | null;
	owner: {
		type: 'user';
		user: {
			id: string;
			name: string;
		};
	};
}
