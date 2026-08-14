import { describe, it, expect, beforeEach } from 'vitest';
import {
	getStoredData,
	setStoredData,
	clearStoredData,
	updateDatabaseId,
	setConnectionError,
	getConnectionError,
	clearConnectionError,
} from '../storage';
import { browser } from 'wxt/browser';

describe('Storage 유틸리티 테스트 (browser.storage mock)', () => {
	beforeEach(async () => {
		// Mock 스토리지 초기화
		await browser.storage.sync.clear();
		await browser.storage.local.clear();
	});

	it('Given 인증 데이터가 주어졌을 때, When setStoredData를 호출하면, Then getStoredData를 통해 동일한 데이터를 조회할 수 있다', async () => {
		// Given
		const mockData = {
			accessToken: 'secret_mock_token_123',
			workspaceName: '내 노션 워크스페이스',
			workspaceId: 'ws-456',
			databaseId: 'db-789',
		};

		// When
		await setStoredData(mockData);
		const result = await getStoredData();

		// Then
		expect(result).toEqual(mockData);
	});

	it('Given 저장된 DB ID가 있을 때, When updateDatabaseId를 호출하면, Then Database ID만 신규 값으로 업데이트된다', async () => {
		// Given
		await setStoredData({
			accessToken: 'secret_token',
			databaseId: 'old-db-id',
		});

		// When
		await updateDatabaseId('new-db-id-32char');
		const result = await getStoredData();

		// Then
		expect(result.databaseId).toBe('new-db-id-32char');
		expect(result.accessToken).toBe('secret_token');
	});

	it('Given 인증 정보 및 연결 에러가 저장되어 있을 때, When clearStoredData를 호출하면, Then 모든 저장 데이터가 초기화된다', async () => {
		// Given
		await setStoredData({ accessToken: 'secret_token', databaseId: 'db-123' });
		await setConnectionError('인증 실패 에러');

		// When
		await clearStoredData();
		const storedData = await getStoredData();
		const errorData = await getConnectionError();

		// Then
		expect(storedData.accessToken).toBeUndefined();
		expect(storedData.databaseId).toBeUndefined();
		expect(errorData).toBeUndefined();
	});

	it('Given OAuth 에러 메시지가 발생했을 때, When setConnectionError를 호출하면, Then 발생 시각과 메시지가 로컬 스토리지에 저장된다', async () => {
		// Given
		const errorMessage = 'OAuth 토큰 교환 중 네트워크 타임아웃 발생';

		// When
		await setConnectionError(errorMessage);
		const error = await getConnectionError();

		// Then
		expect(error).toBeDefined();
		expect(error?.message).toBe(errorMessage);
		expect(typeof error?.occurredAt).toBe('string');

		// clearConnectionError 확인
		await clearConnectionError();
		const cleared = await getConnectionError();
		expect(cleared).toBeUndefined();
	});
});
