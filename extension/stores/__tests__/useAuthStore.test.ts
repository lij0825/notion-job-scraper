import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../useAuthStore';
import { browser } from 'wxt/browser';

const mockSendMessage = vi.mocked(browser.runtime.sendMessage);

describe('useAuthStore (Zustand 인증 스토어)', () => {
	beforeEach(() => {
		useAuthStore.setState({
			authStatus: { isConnected: false },
			isInitializing: true,
			isConnecting: false,
			isLoggingOut: false,
			connectError: null,
			dbSaveStatus: 'idle',
			dbSaveMessage: null,
			dbCreateStatus: 'idle',
			dbCreateMessage: null,
		});
		vi.clearAllMocks();
	});

	it('Given 미연결 상태에서 initializeAuth를 호출했을 때, When Background 응답이 연결 상태이면, Then authStatus가 업데이트되고 isInitializing이 false가 된다', async () => {
		// Given
		mockSendMessage.mockResolvedValueOnce({
			success: true,
			data: { isConnected: true, workspaceName: '테스트 워크스페이스' },
		});

		// When
		const isConnected = await useAuthStore.getState().initializeAuth();

		// Then
		expect(isConnected).toBe(true);
		expect(useAuthStore.getState().authStatus.isConnected).toBe(true);
		expect(useAuthStore.getState().authStatus.workspaceName).toBe('테스트 워크스페이스');
		expect(useAuthStore.getState().isInitializing).toBe(false);
	});

	it('Given OAuth 인증 시작 시, When 성공 응답을 받으면, Then authStatus가 갱신되고 true를 반환한다', async () => {
		// Given
		mockSendMessage.mockResolvedValueOnce({
			success: true,
			data: { isConnected: true, workspaceName: '내 노션' },
		});

		// When
		const success = await useAuthStore.getState().connectNotion();

		// Then
		expect(success).toBe(true);
		expect(useAuthStore.getState().authStatus.isConnected).toBe(true);
		expect(useAuthStore.getState().connectError).toBeNull();
	});

	it('Given 로그아웃 실행 시, When logout을 호출하면, Then 모든 상태가 초기화된다', async () => {
		// Given
		useAuthStore.setState({
			authStatus: { isConnected: true, workspaceName: '워크스페이스', databaseId: 'db-1' },
		});
		mockSendMessage.mockResolvedValueOnce({ success: true });

		// When
		await useAuthStore.getState().logout();

		// Then
		expect(useAuthStore.getState().authStatus.isConnected).toBe(false);
		expect(useAuthStore.getState().authStatus.databaseId).toBeUndefined();
	});
});
