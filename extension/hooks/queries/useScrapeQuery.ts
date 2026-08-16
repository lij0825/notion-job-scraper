import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { browser } from 'wxt/browser';
import type { JobData, ScrapeResponse, BackgroundResponse, BackgroundMessage } from '../../utils/types';

async function sendToBackground<T>(message: BackgroundMessage): Promise<BackgroundResponse<T>> {
	return browser.runtime.sendMessage(message) as Promise<BackgroundResponse<T>>;
}

export const SCRAPE_QUERY_KEY = ['liveScrape'] as const;

export function useLiveScrapeQuery(enabled = true) {
	return useQuery<JobData | null>({
		queryKey: SCRAPE_QUERY_KEY,
		queryFn: async () => {
			const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
			if (!activeTab?.id) {
				throw new Error('활성화된 탭을 찾을 수 없습니다.');
			}

			const response = (await browser.tabs.sendMessage(activeTab.id, {
				type: 'SCRAPE',
			})) as ScrapeResponse;

			if (!response || !response.success) {
				await browser.storage.local.remove('jobData');
				const errorMsg = !response ? '채용 공고 데이터를 찾을 수 없습니다.' : response.error;
				throw new Error(errorMsg || '채용 공고 데이터를 찾을 수 없습니다.');
			}

			return response.data;
		},
		enabled,
		retry: false,
		refetchOnWindowFocus: true,
	});
}

export function useSaveJobToNotionMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (dataToSave: JobData) => {
			const response = await sendToBackground<{ pageId: string }>({
				type: 'SAVE_TO_NOTION',
				payload: dataToSave,
			});

			if (!response.success) {
				throw new Error(response.error || 'Notion 저장에 실패했습니다.');
			}

			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SCRAPE_QUERY_KEY });
		},
	});
}
