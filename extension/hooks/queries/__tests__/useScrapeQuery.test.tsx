import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLiveScrapeQuery, useSaveJobToNotionMutation } from '../useScrapeQuery';
import { browser } from 'wxt/browser';
import type { JobData } from '../../../utils/types';

const mockTabsSendMessage = vi.mocked(browser.tabs.sendMessage);
const mockRuntimeSendMessage = vi.mocked(browser.runtime.sendMessage);

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

describe('useScrapeQuery (TanStack Query 스크래핑 & 저장 훅)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('Given 채용 공고 페이지가 열려있을 때, When useLiveScrapeQuery가 실행되면, Then 파싱된 채용 데이터를 반환한다', async () => {
		// Given
		const mockJob: JobData = {
			title: '풀스택 개발자',
			company: '원티드',
			url: 'https://www.wanted.co.kr/wd/999',
			deadline: '2026-12-31',
			description: 'React & Node.js',
			site: 'wanted',
		};

		mockTabsSendMessage.mockResolvedValueOnce({
			success: true,
			data: mockJob,
		});

		// When
		const { result } = renderHook(() => useLiveScrapeQuery(true), { wrapper: createWrapper() });

		// Then
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.title).toBe('풀스택 개발자');
		expect(result.current.data?.company).toBe('원티드');
	});

	it('Given 채용 공고 데이터를 저장할 때, When useSaveJobToNotionMutation을 호출하면, Then Notion 페이지 ID를 반환한다', async () => {
		// Given
		const mockJob: JobData = {
			title: 'DevOps 엔지니어',
			company: '토스',
			url: 'https://www.wanted.co.kr/wd/888',
			deadline: null,
			description: 'Kubernetes 운영',
			site: 'wanted',
		};

		mockRuntimeSendMessage.mockResolvedValueOnce({
			success: true,
			data: { pageId: 'notion-page-888' },
		});

		// When
		const { result } = renderHook(() => useSaveJobToNotionMutation(), { wrapper: createWrapper() });
		const res = await result.current.mutateAsync(mockJob);

		// Then
		expect(res.pageId).toBe('notion-page-888');
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
	});
});
