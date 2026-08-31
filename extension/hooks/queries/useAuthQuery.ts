import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { browser } from 'wxt/browser';
import type { AuthStatus, BackgroundMessage, BackgroundResponse } from '../../utils/types';

async function sendToBackground<T>(message: BackgroundMessage, timeoutMs = 3000): Promise<BackgroundResponse<T>> {
	const messagePromise = browser.runtime.sendMessage(message) as Promise<BackgroundResponse<T>>;
	const timeoutPromise = new Promise<BackgroundResponse<T>>((resolve) =>
		setTimeout(() => resolve({ success: false, error: 'Background 응답 시간 초과' } as BackgroundResponse<T>), timeoutMs)
	);
	return Promise.race([messagePromise, timeoutPromise]);
}

export const AUTH_QUERY_KEY = ['authStatus'] as const;

export async function fetchAuthStatus(): Promise<AuthStatus> {
	try {
		const res = await sendToBackground<AuthStatus>({ type: 'GET_AUTH_STATUS' });
		if (!res || !res.success || !res.data) {
			return { isConnected: false };
		}
		return res.data;
	} catch (err) {
		console.warn('[Popup] Auth status query fallback:', err);
		return { isConnected: false };
	}
}

export const authStatusQueryOptions = {
	queryKey: AUTH_QUERY_KEY,
	queryFn: fetchAuthStatus,
};

export function useAuthStatusQuery() {
	return useQuery<AuthStatus>(authStatusQueryOptions);
}

export function useConnectMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const res = await sendToBackground<AuthStatus>({ type: 'START_OAUTH' });
			if (!res.success) {
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

export function useSaveManualAuthMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ apiKey, databaseId }: { apiKey: string; databaseId: string }) => {
			const res = await sendToBackground<AuthStatus>(
				{
					type: 'SAVE_MANUAL_AUTH',
					apiKey,
					databaseId,
				},
				10000
			);
			if (!res.success) {
				throw new Error(res.error || '직접 연동 저장에 실패했습니다.');
			}
			return res.data;
		},
		onSuccess: (data) => {
			queryClient.setQueryData(AUTH_QUERY_KEY, data);
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


