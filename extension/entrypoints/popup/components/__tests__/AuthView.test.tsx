import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRootRoute, createRouter, createMemoryHistory } from '@tanstack/react-router';
import { browser } from 'wxt/browser';
import AuthView from '../AuthView';

const mockRuntimeSendMessage = vi.mocked(browser.runtime.sendMessage);

const renderWithTestRouter = (initialPath: string = '/settings') => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	const rootRoute = createRootRoute({
		component: AuthView,
	});
	const testRouter = createRouter({
		routeTree: rootRoute,
		history: createMemoryHistory({ initialEntries: [initialPath] }),
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={testRouter} />
		</QueryClientProvider>
	);
};

describe('AuthView (Notion 연동 및 설정 뷰)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('Given 미연결 상태일 때, When 화면이 렌더링되면, Then 간편 연동 및 직접 연동 탭이 표시된다', async () => {
		// Given
		mockRuntimeSendMessage.mockResolvedValueOnce({
			success: true,
			data: { isConnected: false },
		});

		// When
		renderWithTestRouter('/settings');

		// Then
		await waitFor(() => {
			expect(screen.getByText('Notion 연동 설정')).toBeInTheDocument();
		});
		expect(screen.getByText('간편 연동 (OAuth)')).toBeInTheDocument();
		expect(screen.getByText('직접 연동 (API 키)')).toBeInTheDocument();
		expect(screen.getByText('Notion으로 연결하기')).toBeInTheDocument();
	});

	it('Given 미연결 상태에서, When 직접 연동 탭을 선택하고 정보를 입력하면, Then 직접 연결 요청이 전송된다', async () => {
		// Given
		mockRuntimeSendMessage.mockResolvedValueOnce({
			success: true,
			data: { isConnected: false },
		});

		// When
		renderWithTestRouter('/settings');

		await waitFor(() => {
			expect(screen.getByText('직접 연동 (API 키)')).toBeInTheDocument();
		});

		// 직접 연동 탭 클릭
		const manualTab = screen.getByRole('tab', { name: /직접 연동/i });
		fireEvent.pointerDown(manualTab);
		fireEvent.mouseDown(manualTab);
		fireEvent.click(manualTab);

		await waitFor(() => {
			expect(screen.getByPlaceholderText('secret_...')).toBeInTheDocument();
		});

		const apiKeyInput = screen.getByPlaceholderText('secret_...');
		const dbUrlInput = screen.getByPlaceholderText('https://notion.so/...');
		const connectBtn = screen.getByText('직접 연결하기');

		fireEvent.change(apiKeyInput, { target: { value: 'secret_test_key_1234' } });
		fireEvent.change(dbUrlInput, { target: { value: 'https://notion.so/my-database-12345' } });

		mockRuntimeSendMessage.mockResolvedValueOnce({
			success: true,
			data: {
				isConnected: true,
				workspaceName: '직접 연동 (테스트 DB)',
				databaseId: 'my-database-12345',
			},
		});

		fireEvent.click(connectBtn);

		// Then
		await waitFor(() => {
			expect(mockRuntimeSendMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'SAVE_MANUAL_AUTH',
					apiKey: 'secret_test_key_1234',
					databaseId: 'https://notion.so/my-database-12345',
				})
			);
		});
	});

	it('Given 이전 연결 에러가 있을 때, When 화면이 렌더링되면, Then 에러 배너와 닫기 버튼이 제공된다', async () => {
		// Given
		mockRuntimeSendMessage.mockResolvedValueOnce({
			success: true,
			data: {
				isConnected: false,
				lastError: {
					message: 'OAuth 인증 서버에 연결할 수 없습니다.',
					occurredAt: new Date().toISOString(),
				},
			},
		});

		// When
		renderWithTestRouter('/settings');

		// Then
		await waitFor(() => {
			expect(screen.getByText('연결 실패 안내')).toBeInTheDocument();
			expect(screen.getByText('OAuth 인증 서버에 연결할 수 없습니다.')).toBeInTheDocument();
		});

		const dismissBtn = screen.getByTitle('닫기');
		mockRuntimeSendMessage.mockResolvedValueOnce({ success: true });
		fireEvent.click(dismissBtn);

		await waitFor(() => {
			expect(mockRuntimeSendMessage).toHaveBeenCalledWith({ type: 'DISMISS_ERROR' });
		});
	});

	it('Given 이미 Notion에 연결된 상태일 때, When 화면이 렌더링되면, Then 워크스페이스 정보와 DB 관리 탭이 표시된다', async () => {
		// Given
		mockRuntimeSendMessage.mockResolvedValueOnce({
			success: true,
			data: {
				isConnected: true,
				workspaceName: '나의 노션 워크스페이스',
				databaseId: 'database-uuid-1234',
			},
		});

		// When
		renderWithTestRouter('/settings');

		// Then
		await waitFor(() => {
			expect(screen.getByText('나의 노션 워크스페이스')).toBeInTheDocument();
			expect(screen.getByText('Notion 연결됨')).toBeInTheDocument();
			expect(screen.getByText('기존 페이지 연결')).toBeInTheDocument();
			expect(screen.getByText('새 페이지 생성')).toBeInTheDocument();
			expect(screen.getByText('로그아웃')).toBeInTheDocument();
		});
	});
});
