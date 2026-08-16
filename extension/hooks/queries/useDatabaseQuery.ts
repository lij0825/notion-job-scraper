import { useMutation, useQueryClient } from '@tanstack/react-query';
import { browser } from 'wxt/browser';
import { AUTH_QUERY_KEY } from './useAuthQuery';
import type { AuthStatus, BackgroundMessage, BackgroundResponse } from '../../utils/types';

async function sendToBackground<T>(message: BackgroundMessage): Promise<BackgroundResponse<T>> {
	return browser.runtime.sendMessage(message) as Promise<BackgroundResponse<T>>;
}

export function useSaveDatabaseMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (databaseId: string) => {
			const res = await sendToBackground<{ name: string }>({
				type: 'SAVE_DATABASE_ID',
				databaseId: databaseId.trim(),
			});
			if (!res.success) {
				throw new Error(res.error || 'Database ID 저장에 실패했습니다.');
			}
			return { databaseId: databaseId.trim(), name: res.data.name };
		},
		onSuccess: (data) => {
			queryClient.setQueryData<AuthStatus>(AUTH_QUERY_KEY, (prev) => {
				if (!prev) return { isConnected: true, databaseId: data.databaseId };
				return { ...prev, databaseId: data.databaseId };
			});
		},
	});
}

export function useCreateDatabaseMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (parentPageId: string) => {
			const res = await sendToBackground<{ id: string; name: string }>({
				type: 'CREATE_DATABASE',
				parentPageId: parentPageId.trim(),
			});
			if (!res.success) {
				throw new Error(res.error || 'Database 자동 생성에 실패했습니다.');
			}
			return res.data;
		},
		onSuccess: async () => {
			const authRes = await sendToBackground<AuthStatus>({ type: 'GET_AUTH_STATUS' });
			if (authRes.success && authRes.data) {
				queryClient.setQueryData(AUTH_QUERY_KEY, authRes.data);
			}
		},
	});
}
