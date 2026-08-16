import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSaveDatabaseMutation, useCreateDatabaseMutation } from '../useDatabaseQuery';
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

describe('useDatabaseQuery (TanStack Query 데이터베이스 관리 훅)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('Given 유효한 Database ID가 전달되었을 때, When useSaveDatabaseMutation을 호출하면, Then DB 이름을 반환하고 성공한다', async () => {
		// Given
		mockSendMessage.mockResolvedValueOnce({
			success: true,
			data: { name: '채용 공고 관리 DB' },
		});

		// When
		const { result } = renderHook(() => useSaveDatabaseMutation(), { wrapper: createWrapper() });
		const data = await result.current.mutateAsync('32char-database-id-123456789012');

		// Then
		expect(data.name).toBe('채용 공고 관리 DB');
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
	});

	it('Given 부모 페이지 ID가 주어졌을 때, When useCreateDatabaseMutation을 호출하면, Then 신규 생성된 DB 정보를 반환한다', async () => {
		// Given
		mockSendMessage
			.mockResolvedValueOnce({
				success: true,
				data: { name: '🎯 지원 채용공고 관리', id: 'new-db-id' },
			})
			.mockResolvedValueOnce({
				success: true,
				data: { isConnected: true, databaseId: 'new-db-id' },
			});

		// When
		const { result } = renderHook(() => useCreateDatabaseMutation(), { wrapper: createWrapper() });
		const data = await result.current.mutateAsync('parent-page-id');

		// Then
		expect(data.name).toBe('🎯 지원 채용공고 관리');
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
	});
});
