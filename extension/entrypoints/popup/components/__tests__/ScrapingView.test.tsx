import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRootRoute, createRouter, createMemoryHistory } from '@tanstack/react-router';
import { browser } from 'wxt/browser';
import ScrapingView from '../ScrapingView';
import type { JobData } from '../../../../utils/types';

const mockTabsSendMessage = vi.mocked(browser.tabs.sendMessage);
const mockTabsQuery = vi.mocked(browser.tabs.query);
const mockRuntimeSendMessage = vi.mocked(browser.runtime.sendMessage);

const renderWithTestRouter = (initialPath: string = '/') => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	const rootRoute = createRootRoute({
		component: ScrapingView,
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

describe('ScrapingView (채용 공고 스크래핑 및 직접 입력 뷰)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRuntimeSendMessage.mockImplementation(async (msg: unknown) => {
			const m = msg as { type?: string };
			if (m?.type === 'GET_AUTH_STATUS') {
				return { success: true, data: { isConnected: true, workspaceName: '테스트 워크스페이스' } };
			}
			return { success: true, data: {} };
		});
	});

	it('Given 채용 공고가 성공적으로 스크래핑되었을 때, When 화면이 렌더링되면, Then 공고 정보와 사이트 뱃지가 표시된다', async () => {
		// Given
		const mockJob: JobData = {
			title: '시니어 프론트엔드 개발자',
			company: '원티드랩',
			url: 'https://www.wanted.co.kr/wd/100',
			deadline: '2026-12-31',
			description: 'React, TypeScript 개발',
			site: 'wanted',
		};

		mockTabsSendMessage.mockResolvedValueOnce({
			success: true,
			data: mockJob,
		});

		// When
		renderWithTestRouter();

		// Then
		await waitFor(() => {
			expect(screen.getByDisplayValue('시니어 프론트엔드 개발자')).toBeInTheDocument();
		});
		expect(screen.getByDisplayValue('원티드랩')).toBeInTheDocument();
		expect(screen.getByText('원티드')).toBeInTheDocument();
	});

	it('Given 채용 공고를 감지하지 못했을 때, When 빈 상태 화면이 표시되면, Then 직접 입력 버튼이 제공된다', async () => {
		// Given
		mockTabsSendMessage.mockResolvedValueOnce({
			success: false,
			error: '지원 사이트가 아닙니다.',
		});

		// When
		renderWithTestRouter();

		// Then
		await waitFor(() => {
			expect(screen.getByText('채용 공고를 찾지 못했습니다')).toBeInTheDocument();
		});
		expect(screen.getByRole('button', { name: /직접 입력하여 저장/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /자동 감지 다시 시도/i })).toBeInTheDocument();
	});

	it('Given 채용 공고 미감지 상태에서, When 직접 입력 버튼을 클릭하면, Then 직접 입력 모드로 전환되고 탭 URL이 프리필된다', async () => {
		// Given
		mockTabsSendMessage.mockResolvedValueOnce({
			success: false,
			error: '채용 공고 데이터를 찾을 수 없습니다.',
		});
		mockTabsQuery.mockResolvedValue([
			{ id: 1, url: 'https://careers.company.com/job/123', title: 'Company Career Page' },
		] as unknown as Awaited<ReturnType<typeof browser.tabs.query>>);

		renderWithTestRouter();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /직접 입력하여 저장/i })).toBeInTheDocument();
		});

		// When: 직접 입력 버튼 클릭
		fireEvent.click(screen.getByRole('button', { name: /직접 입력하여 저장/i }));

		// Then: 직접 입력 뱃지와 탭 타이틀/URL이 프리필되어 표시
		await waitFor(() => {
			expect(screen.getByText('직접 입력')).toBeInTheDocument();
		});
		expect(screen.getByDisplayValue('Company Career Page')).toBeInTheDocument();
		expect(screen.getByDisplayValue('https://careers.company.com/job/123')).toBeInTheDocument();
	});

	it('Given 직접 입력 모드에서 직무명을 입력하고 저장할 때, When 저장 버튼을 누르면, Then Notion 저장 요청이 전송되고 성공 메시지가 표시된다', async () => {
		// Given
		mockTabsSendMessage.mockResolvedValueOnce({
			success: false,
			error: '지원 사이트가 아닙니다.',
		});
		mockTabsQuery.mockResolvedValue([
			{ id: 1, url: 'https://careers.company.com/job/999', title: '' },
		] as unknown as Awaited<ReturnType<typeof browser.tabs.query>>);

		mockRuntimeSendMessage.mockImplementation(async (msg: unknown) => {
			const m = msg as { type?: string };
			if (m?.type === 'GET_AUTH_STATUS') {
				return { success: true, data: { isConnected: true, workspaceName: '테스트 워크스페이스' } };
			}
			if (m?.type === 'SAVE_TO_NOTION') {
				return { success: true, data: { pageId: 'notion-page-999' } };
			}
			return { success: true, data: {} };
		});

		renderWithTestRouter();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /직접 입력하여 저장/i })).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole('button', { name: /직접 입력하여 저장/i }));

		await waitFor(() => {
			expect(screen.getByText('직접 입력')).toBeInTheDocument();
		});

		// When: 직무명 및 회사명 입력 후 저장
		const titleInput = screen.getByPlaceholderText(/직무명 입력/i);
		fireEvent.change(titleInput, { target: { value: '풀스택 엔지니어' } });

		const companyInput = screen.getByPlaceholderText(/회사명 입력/i);
		fireEvent.change(companyInput, { target: { value: '테크 스타트업' } });

		const saveButton = screen.getByRole('button', { name: /선택한 항목 Notion에 저장/i });
		fireEvent.click(saveButton);

		// Then
		await waitFor(() => {
			expect(screen.getByText('Notion 데이터베이스에 성공적으로 저장되었습니다!')).toBeInTheDocument();
		});
		expect(mockRuntimeSendMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'SAVE_TO_NOTION',
				payload: expect.objectContaining({
					title: '풀스택 엔지니어',
					company: '테크 스타트업',
					url: 'https://careers.company.com/job/999',
				}),
			})
		);
	});

	it('Given 직접 입력 모드에서 직무명이 비어있을 때, When 저장을 시도하면, Then 유효성 검사 경고가 표시된다', async () => {
		// Given
		mockTabsSendMessage.mockResolvedValueOnce({
			success: false,
			error: '지원 사이트가 아닙니다.',
		});
		mockTabsQuery.mockResolvedValueOnce([
			{ id: 1, url: 'https://careers.company.com', title: '' },
		] as unknown as Awaited<ReturnType<typeof browser.tabs.query>>);

		mockRuntimeSendMessage.mockImplementation(async (msg: unknown) => {
			const m = msg as { type?: string };
			if (m?.type === 'GET_AUTH_STATUS') {
				return { success: true, data: { isConnected: true, workspaceName: '테스트 워크스페이스' } };
			}
			return { success: true, data: {} };
		});

		renderWithTestRouter();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /직접 입력하여 저장/i })).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole('button', { name: /직접 입력하여 저장/i }));

		await waitFor(() => {
			expect(screen.getByText('직접 입력')).toBeInTheDocument();
		});

		// When: 직무명을 빈 상태로 저장 시도
		const saveButton = screen.getByRole('button', { name: /선택한 항목 Notion에 저장/i });
		fireEvent.click(saveButton);

		// Then
		expect(screen.getByText('직무명(Title)을 입력해 주세요.')).toBeInTheDocument();
		expect(mockRuntimeSendMessage).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: 'SAVE_TO_NOTION' })
		);
	});
});
