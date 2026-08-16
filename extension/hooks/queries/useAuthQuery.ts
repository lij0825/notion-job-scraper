import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { browser } from 'wxt/browser';
import type { AuthStatus, BackgroundMessage, BackgroundResponse } from '../../utils/types';

async function sendToBackground<T>(message: BackgroundMessage): Promise<BackgroundResponse<T>> {
	return browser.runtime.sendMessage(message) as Promise<BackgroundResponse<T>>;
}

export const AUTH_QUERY_KEY = ['authStatus'] as const;

export function useAuthStatusQuery() {
	return useQuery<AuthStatus>({
		queryKey: AUTH_QUERY_KEY,
		queryFn: async () => {
			const res = await sendToBackground<AuthStatus>({ type: 'GET_AUTH_STATUS' });
			if (!res.success || !res.data) {
				return { isConnected: false };
			}
			return res.data;
		},
	});
}

export function useConnectMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const res = await sendToBackground<AuthStatus>({ type: 'START_OAUTH' });
			if (!res.success || !res.data) {
				throw new Error(res.error || 'Notion OAuth 인증에 실패했습니다.');
			}
			return res.data;
		},
		onSuccess: (data) => {
			queryClient.setQueryData(AUTH_QUERY_KEY, data);
		},
	});
}

export function useLogoutMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const res = await sendToBackground({ type: 'LOGOUT' });
			if (!res.success) {
				throw new Error(res.error || '로그아웃 실패');
			}
		},
		onSuccess: () => {
			queryClient.setQueryData(AUTH_QUERY_KEY, { isConnected: false });
		},
	});
}

export function useDismissErrorMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			await sendToBackground({ type: 'DISMISS_ERROR' });
		},
		onSuccess: () => {
			queryClient.setQueryData<AuthStatus>(AUTH_QUERY_KEY, (prev) => {
				if (!prev) return { isConnected: false };
				const { lastError: _, ...rest } = prev;
				return rest as AuthStatus;
			});
		},
	});
}
