import { browser } from 'wxt/browser';
import type { ConnectionError, StorageData } from './types';

/** storage.sync의 키 목록 — 일관성 유지를 위해 상수로 관리 */
const STORAGE_KEYS = ['accessToken', 'workspaceName', 'workspaceId', 'databaseId'] as const;

/** storage.local 에러 저장 키 — sync가 아닌 local에 저장하여 기기 간 불필요한 동기화 방지 */
const ERROR_KEYS = ['lastConnectionError'] as const;

/**
 * browser.storage.sync에서 모든 저장된 데이터를 가져옵니다.
 * 존재하지 않는 키는 undefined로 반환됩니다.
 */
export async function getStoredData(): Promise<StorageData> {
	const result = await browser.storage.sync.get([...STORAGE_KEYS]);
	return {
		accessToken: result['accessToken'] as string | undefined,
		workspaceName: result['workspaceName'] as string | undefined,
		workspaceId: result['workspaceId'] as string | undefined,
		databaseId: result['databaseId'] as string | undefined,
	};
}

/**
 * browser.storage.sync에 데이터를 저장합니다.
 * 제공된 키만 업데이트되며 나머지는 유지됩니다.
 */
export async function setStoredData(data: Partial<StorageData>): Promise<void> {
	// undefined 값은 저장하지 않음 (기존 값 보호)
	const filteredData = Object.fromEntries(
		Object.entries(data).filter(([, value]) => value !== undefined)
	);
	await browser.storage.sync.set(filteredData);
}

/**
 * browser.storage.sync에서 모든 인증 관련 데이터를 삭제합니다.
 * 로그아웃 시 호출됩니다.
 */
export async function clearStoredData(): Promise<void> {
	await browser.storage.sync.remove([...STORAGE_KEYS]);
	await clearConnectionError();
}

/**
 * Database ID만 업데이트합니다.
 * 사용자가 설정 화면에서 Database ID를 변경할 때 사용됩니다.
 */
export async function updateDatabaseId(databaseId: string): Promise<void> {
	await browser.storage.sync.set({ databaseId });
}

// ===========================================================
// 연결 에러 저장 (browser.storage.local)
// ===========================================================

/**
 * OAuth 연결 실패 에러를 browser.storage.local에 저장합니다.
 * 팝업이 닫힌 후에도 사용자가 에러 원인을 확인할 수 있도록 영속 저장합니다.
 */
export async function setConnectionError(message: string): Promise<void> {
	const errorData: ConnectionError = {
		message,
		occurredAt: new Date().toISOString(),
	};
	await browser.storage.local.set({ lastConnectionError: JSON.stringify(errorData) });
}

/**
 * browser.storage.local에서 마지막 연결 에러를 조회합니다.
 * 에러가 없으면 undefined를 반환합니다.
 */
export async function getConnectionError(): Promise<ConnectionError | undefined> {
	const result = await browser.storage.local.get([...ERROR_KEYS]);
	const raw = result['lastConnectionError'] as string | undefined;
	if (!raw) return undefined;

	try {
		return JSON.parse(raw) as ConnectionError;
	} catch {
		return undefined;
	}
}

/**
 * browser.storage.local에서 연결 에러를 삭제합니다.
 * OAuth 성공 시 또는 사용자가 에러를 dismiss할 때 호출합니다.
 */
export async function clearConnectionError(): Promise<void> {
	await browser.storage.local.remove([...ERROR_KEYS]);
}
