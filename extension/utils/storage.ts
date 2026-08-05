import { browser } from 'wxt/browser';
import type { StorageData } from './types';

/** storage.sync의 키 목록 — 일관성 유지를 위해 상수로 관리 */
const STORAGE_KEYS = ['accessToken', 'workspaceName', 'workspaceId', 'databaseId'] as const;

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
}

/**
 * Database ID만 업데이트합니다.
 * 사용자가 설정 화면에서 Database ID를 변경할 때 사용됩니다.
 */
export async function updateDatabaseId(databaseId: string): Promise<void> {
	await browser.storage.sync.set({ databaseId });
}
