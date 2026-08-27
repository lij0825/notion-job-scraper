import { browser } from 'wxt/browser';
import { createJobPage, validateDatabase, createNotionDatabase } from '../../utils/notion';
import {
	getStoredData,
	setStoredData,
	clearStoredData,
	updateDatabaseId,
	setConnectionError,
	getConnectionError,
	clearConnectionError,
} from '../../utils/storage';
import type {
	BackgroundMessage,
	BackgroundResponse,
	AuthStatus,
	NotionTokenResponse,
	JobData,
} from '../../utils/types';
import { initBackgroundSentry, BackgroundSentry } from '../../utils/sentry-background';

// Background Service Worker Sentry 초기화
initBackgroundSentry();

/**
 * Background Service Worker 메인 엔트리포인트
 * Notion OAuth 플로우, Notion API 호출, 스토리지 관리를 담당합니다.
 *
 * MV3 Service Worker 특성상 ephemeral하므로, 상태를 메모리에 캐싱하지 않고
 * 항상 browser.storage.sync에서 읽어서 처리합니다.
 */
export default defineBackground({
	// MV3 Service Worker로 동작 (지속적인 백그라운드 연결 없음)
	type: 'module',

	main() {
		// Popup에서 오는 메시지 처리 (비동기 응답을 위해 true 반환)
		browser.runtime.onMessage.addListener(
			(
				message: unknown,
				_sender,
				sendResponse: (response: BackgroundResponse) => void
			): true => {
				const msg = message as BackgroundMessage;

				handleMessage(msg)
					.then((res) => {
						try {
							sendResponse(res);
						} catch {
							// Channel already closed
						}
					})
					.catch((err: unknown) => {
						BackgroundSentry.captureException(err);
						const errorMessage =
							err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
						const errorRes: BackgroundResponse = { success: false, error: errorMessage };
						try {
							sendResponse(errorRes);
						} catch {
							// Channel already closed
						}
					});

				return true;
			}
		);
	},
});

// ===========================================================
// 메시지 디스패처
// ===========================================================

async function handleMessage(message: BackgroundMessage): Promise<BackgroundResponse> {
	switch (message.type) {
		case 'GET_AUTH_STATUS':
			return getAuthStatus();
		case 'START_OAUTH':
			return startOAuthFlow();
		case 'LOGOUT':
			return logout();
		case 'SAVE_TO_NOTION':
			return saveToNotion(message.payload);
		case 'SAVE_DATABASE_ID':
			return saveDatabaseId(message.databaseId);
		case 'CREATE_DATABASE':
			return handleCreateDatabase(message.parentPageId);
		case 'DISMISS_ERROR':
			return dismissConnectionError();
		default: {
			const _exhaustive: never = message;
			return { success: false, error: '알 수 없는 메시지 타입입니다.' };
		}
	}
}

// ===========================================================
// 인증 상태 확인
// ===========================================================

/** 현재 Notion 연결 상태를 반환합니다. (에러 이력 포함) */
async function getAuthStatus(): Promise<BackgroundResponse<AuthStatus>> {
	const stored = await getStoredData();
	const lastError = await getConnectionError();

	if (!stored.accessToken) {
		return { success: true, data: { isConnected: false, lastError } };
	}

	return {
		success: true,
		data: {
			isConnected: true,
			workspaceName: stored.workspaceName,
			databaseId: stored.databaseId,
			lastError,
		},
	};
}

// ===========================================================
// Notion OAuth 2.0 플로우
// ===========================================================

/**
 * Notion OAuth 2.0 인증 플로우를 시작합니다.
 *
 * 플로우:
 *   1. browser.identity.getRedirectURL()로 플랫폼별 redirect URI 동적 생성
 *   2. Notion OAuth 인증 URL 구성
 *   3. browser.identity.launchWebAuthFlow()로 팝업 창 실행
 *   4. 응답 URL에서 authorization code 추출
 *   5. Proxy 서버(/api/token)에 코드 교환 요청
 *   6. access_token 등 스토리지 저장
 */
async function startOAuthFlow(): Promise<BackgroundResponse<AuthStatus>> {
	const clientId = import.meta.env.VITE_NOTION_CLIENT_ID;
	if (!clientId) {
		return {
			success: false,
			error: 'VITE_NOTION_CLIENT_ID 환경변수가 설정되지 않았습니다.',
		};
	}

	// Chrome: https://<ext-id>.chromiumapp.org/
	// Firefox: https://<ext-id>.extensions.allizom.org/
	// WXT/webextension-polyfill가 플랫폼에 맞는 URI를 자동 생성합니다.
	const redirectURL = browser.identity.getRedirectURL();

	// Notion OAuth 인증 URL 구성
	const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
	authUrl.searchParams.set('client_id', clientId);
	authUrl.searchParams.set('redirect_uri', redirectURL);
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('owner', 'user');

	let responseUrl: string;
	try {
		responseUrl = await browser.identity.launchWebAuthFlow({
			url: authUrl.toString(),
			interactive: true,
		});
	} catch (err) {
		// 사용자가 인증 창을 닫거나 취소한 경우
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes('canceled') || msg.includes('cancelled') || msg.includes('closed')) {
			return { success: false, error: '인증이 취소되었습니다.' };
		}
		const errorMsg = `OAuth 인증 실패: ${msg}`;
		await setConnectionError(errorMsg);
		return { success: false, error: errorMsg };
	}

	// 응답 URL에서 authorization code 추출
	const responseUrlObj = new URL(responseUrl);
	const code = responseUrlObj.searchParams.get('code');
	const error = responseUrlObj.searchParams.get('error');

	if (error) {
		const errorMsg = `Notion OAuth 오류: ${error}`;
		await setConnectionError(errorMsg);
		return { success: false, error: errorMsg };
	}

	if (!code) {
		const errorMsg = '인증 코드를 받지 못했습니다.';
		await setConnectionError(errorMsg);
		return { success: false, error: errorMsg };
	}

	// Proxy 서버에 코드 교환 요청
	const proxyUrl = import.meta.env.VITE_PROXY_URL;
	let tokenData: NotionTokenResponse;

	try {
		const tokenResponse = await fetch(`${proxyUrl}/api/token`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code, redirect_uri: redirectURL }),
		});

		if (!tokenResponse.ok) {
			const errorBody = await tokenResponse.text();
			const classified = classifyError(new Error(errorBody), {
				url: `${proxyUrl}/api/token`,
				status: tokenResponse.status,
				rawResponse: errorBody,
				action: 'Notion Token Exchange',
			});
			console.error('[OAuth Token Error]', classified.devMessage);
			BackgroundSentry.captureException(new Error(classified.devMessage));
			await setConnectionError(classified.userMessage);
			return {
				success: false,
				error: classified.userMessage,
			};
		}

		tokenData = (await tokenResponse.json()) as NotionTokenResponse;
	} catch (err) {
		const classified = classifyError(err, {
			url: `${proxyUrl}/api/token`,
			action: 'Proxy Server Connection',
		});
		console.error('[OAuth Proxy Error]', classified.devMessage);
		BackgroundSentry.captureException(err);
		await setConnectionError(classified.userMessage);
		return {
			success: false,
			error: classified.userMessage,
		};
	}

	// OAuth 성공 — 이전 연결 에러 삭제
	await clearConnectionError();

	// 스토리지에 인증 정보 저장
	await setStoredData({
		accessToken: tokenData.access_token,
		workspaceName: tokenData.workspace_name,
		workspaceId: tokenData.workspace_id,
	});

	return {
		success: true,
		data: {
			isConnected: true,
			workspaceName: tokenData.workspace_name,
		},
	};
}

// ===========================================================
// 로그아웃
// ===========================================================

/** 모든 인증 정보를 스토리지에서 삭제합니다. */
async function logout(): Promise<BackgroundResponse> {
	await clearStoredData();
	return { success: true, data: undefined };
}

// ===========================================================
// Notion에 채용 공고 저장
// ===========================================================

/**
 * 스크래핑된 채용 공고를 Notion Database에 저장합니다.
 * access_token과 database_id를 스토리지에서 읽어 사용합니다.
 */
async function saveToNotion(jobData: JobData): Promise<BackgroundResponse<{ pageId: string }>> {
	const stored = await getStoredData();

	if (!stored.accessToken) {
		return { success: false, error: 'Notion에 연결되어 있지 않습니다. 다시 로그인해 주세요.' };
	}

	if (!stored.databaseId) {
		return {
			success: false,
			error: '저장할 Notion Database ID가 설정되지 않았습니다. 설정에서 Database ID를 입력해 주세요.',
		};
	}

	try {
		const pageId = await createJobPage(stored.accessToken, stored.databaseId, jobData);
		return { success: true, data: { pageId } };
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
		// Notion API 에러 코드별 사용자 친화적 메시지 변환
		if (errorMessage.includes('object_not_found') || errorMessage.includes('404')) {
			return {
				success: false,
				error: 'Database를 찾을 수 없습니다. Database ID를 확인하고 Notion 통합이 해당 DB에 공유되어 있는지 확인해 주세요.',
			};
		}
		if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
			return {
				success: false,
				error: '인증이 만료되었습니다. 다시 로그인해 주세요.',
			};
		}
		if (errorMessage.includes('validation_error')) {
			return {
				success: false,
				error: 'Database 속성이 올바르지 않습니다. Title, Company, URL, Deadline, Status 속성이 있는지 확인해 주세요.',
			};
		}
		return { success: false, error: `Notion 저장 실패: ${errorMessage}` };
	}
}

// ===========================================================
// Database ID 저장
// ===========================================================

/**
 * 사용자가 설정 화면에서 입력한 Database ID를 저장합니다.
 * 저장 전에 실제 접근 가능한 DB인지 검증합니다.
 */
async function saveDatabaseId(databaseId: string): Promise<BackgroundResponse<{ name: string }>> {
	if (!databaseId.trim()) {
		return { success: false, error: 'Database ID를 입력해 주세요.' };
	}

	const stored = await getStoredData();
	if (!stored.accessToken) {
		return { success: false, error: '먼저 Notion에 연결해 주세요.' };
	}

	// 입력된 ID에서 URL 형식 처리 (사용자가 전체 URL을 붙여넣은 경우)
	const cleanedId = extractDatabaseId(databaseId.trim());

	try {
		const { name } = await validateDatabase(stored.accessToken, cleanedId);
		await updateDatabaseId(cleanedId);
		return { success: true, data: { name } };
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
		if (errorMessage.includes('object_not_found') || errorMessage.includes('Could not find')) {
			return {
				success: false,
				error: 'Database를 찾을 수 없습니다. ID를 확인하고 통합이 공유되었는지 확인해 주세요.',
			};
		}
		return { success: false, error: `Database 검증 실패: ${errorMessage}` };
	}
}

/**
 * Creates a new Notion database under the given parent page ID.
 */
async function handleCreateDatabase(parentPageId: string): Promise<BackgroundResponse<{ id: string; name: string }>> {
	if (!parentPageId.trim()) {
		return { success: false, error: 'Parent Page ID를 입력해 주세요.' };
	}

	const stored = await getStoredData();
	if (!stored.accessToken) {
		return { success: false, error: '먼저 Notion에 연결해 주세요.' };
	}

	try {
		const newDbId = await createNotionDatabase(stored.accessToken, parentPageId.trim());
		await updateDatabaseId(newDbId);
		return { success: true, data: { id: newDbId, name: '🎯 지원 채용공고 관리' } };
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
		if (errorMessage.includes('object_not_found')) {
			return {
				success: false,
				error: 'Parent Page를 찾을 수 없습니다. 올바른 URL/ID인지, 통합이 해당 페이지에 추가되어 있는지 확인해 주세요.',
			};
		}
		return { success: false, error: `Database 생성 실패: ${errorMessage}` };
	}
}

/**
 * Notion Database URL 또는 ID 문자열에서 순수 Database ID를 추출합니다.
 *
 * @example
 * // URL 형식: "https://www.notion.so/myworkspace/abc123...?v=..."
 * // → "abc123..."
 * // UUID 형식: "abc12345-1234-1234-1234-abc123456789"
 * // → "abc12345-1234-1234-1234-abc123456789"
 */
function extractDatabaseId(input: string): string {
	// UUID 형식 (32자 또는 하이픈 포함 36자)
	const uuidMatch = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
	if (uuidMatch) return uuidMatch[0];

	// Notion URL에서 ID 추출 (32자 hex)
	const hexMatch = input.match(/[0-9a-f]{32}/i);
	if (hexMatch) return hexMatch[0];

	// 그대로 반환 (이미 정제된 ID)
	return input;
}

// ===========================================================
// 연결 에러 닫기 (Dismiss)
// ===========================================================

/** 사용자가 에러 배너를 닫았을 때 storage.local에서 에러를 삭제합니다. */
async function dismissConnectionError(): Promise<BackgroundResponse> {
	await clearConnectionError();
	return { success: true, data: undefined };
}
