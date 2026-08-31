import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStatusQuery, useConnectMutation, useLogoutMutation, useSaveManualAuthMutation } from '../useAuthQuery';
import { browser } from 'wxt/browser';

const mockSendMessage = vi.mocked(browser.runtime.sendMessage);

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

describe('useAuthQuery (TanStack Query 인증 훅)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('Given 확장 프로그램 실행 시, When useAuthStatusQuery가 호출되면, Then Background로부터 인증 상태를 조회한다', async () => {
		// Given
		mockSendMessage.mockResolvedValueOnce({
			success: true,
			data: { isConnected: true, workspaceName: '노션 워크스페이스' },
		});

		// When
		const { result } = renderHook(() => useAuthStatusQuery(), { wrapper: createWrapper() });

		// Then
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.isConnected).toBe(true);
		expect(result.current.data?.workspaceName).toBe('노션 워크스페이스');
	});

	it('Given OAuth 로그인 실행 시, When useConnectMutation을 호출하면, Then 토큰 교환 후 성공 상태가 캐시에 저장된다', async () => {
		// Given
		mockSendMessage.mockResolvedValueOnce({
			success: true,
			data: { isConnected: true, workspaceName: '새 워크스페이스' },
		});

		// When
		const { result } = renderHook(() => useConnectMutation(), { wrapper: createWrapper() });
		const data = await result.current.mutateAsync();

		// Then
		expect(data.workspaceName).toBe('새 워크스페이스');
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
	});

	it('Given 직접 API 키 입력 시, When useSaveManualAuthMutation을 호출하면, Then 검증 후 저장된다', async () => {
		// Given
		mockSendMessage.mockResolvedValueOnce({
			success: true,
			data: { isConnected: true, workspaceName: '직접 연동 (테스트 DB)', databaseId: 'abc12345' },
		});

		// When
		const { result } = renderHook(() => useSaveManualAuthMutation(), { wrapper: createWrapper() });
		const data = await result.current.mutateAsync({
			apiKey: 'secret_12345',
			databaseId: 'abc12345',
		});

		// Then
		expect(data.isConnected).toBe(true);
		expect(data.databaseId).toBe('abc12345');
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
	});

	it('Given 로그아웃 실행 시, When useLogoutMutation을 호출하면, Then 로그아웃 성공 상태가 된다', async () => {
		// Given
		mockSendMessage.mockResolvedValueOnce({ success: true });

		// When
		const { result } = renderHook(() => useLogoutMutation(), { wrapper: createWrapper() });
		await result.current.mutateAsync();

		// Then
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
	});
});

