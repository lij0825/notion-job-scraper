import { create } from 'zustand';
import { browser } from 'wxt/browser';
import type { AuthStatus, BackgroundMessage, BackgroundResponse, ConnectionError } from '../utils/types';

async function sendToBackground<T>(message: BackgroundMessage): Promise<BackgroundResponse<T>> {
	return browser.runtime.sendMessage(message) as Promise<BackgroundResponse<T>>;
}

export interface AuthState {
	authStatus: AuthStatus;
	isInitializing: boolean;
	isConnecting: boolean;
	isLoggingOut: boolean;
	connectError: string | null;
	dbSaveStatus: 'idle' | 'saving' | 'success' | 'error';
	dbSaveMessage: string | null;
	dbCreateStatus: 'idle' | 'creating' | 'success' | 'error';
	dbCreateMessage: string | null;

	// Actions
	initializeAuth: () => Promise<boolean>;
	connectNotion: () => Promise<boolean>;
	logout: () => Promise<void>;
	saveDatabaseId: (databaseId: string) => Promise<boolean>;
	createDatabase: (parentPageId: string) => Promise<boolean>;
	dismissError: () => Promise<void>;
	resetDbMessages: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
	authStatus: { isConnected: false },
	isInitializing: true,
	isConnecting: false,
	isLoggingOut: false,
	connectError: null,
	dbSaveStatus: 'idle',
	dbSaveMessage: null,
	dbCreateStatus: 'idle',
	dbCreateMessage: null,

	initializeAuth: async () => {
		set({ isInitializing: true });
		try {
			const res = await sendToBackground<AuthStatus>({ type: 'GET_AUTH_STATUS' });
			if (res.success && res.data) {
				set({ authStatus: res.data, isInitializing: false });
				return res.data.isConnected;
			}
			set({ authStatus: { isConnected: false }, isInitializing: false });
			return false;
		} catch {
			set({ authStatus: { isConnected: false }, isInitializing: false });
			return false;
		}
	},

	connectNotion: async () => {
		set({ isConnecting: true, connectError: null });
		try {
			const res = await sendToBackground<AuthStatus>({ type: 'START_OAUTH' });
			if (res.success) {
				set({ authStatus: res.data, isConnecting: false });
				return res.data.isConnected;
			}
			set({ connectError: res.error || '인증에 실패했습니다.', isConnecting: false });
			return false;
		} catch (err) {
			const msg = err instanceof Error ? err.message : '연결 중 오류가 발생했습니다.';
			set({ connectError: msg, isConnecting: false });
			return false;
		}
	},

	logout: async () => {
		set({ isLoggingOut: true });
		try {
			await sendToBackground({ type: 'LOGOUT' });
			set({
				authStatus: { isConnected: false },
				isLoggingOut: false,
				connectError: null,
				dbSaveStatus: 'idle',
				dbSaveMessage: null,
				dbCreateStatus: 'idle',
				dbCreateMessage: null,
			});
		} catch {
			set({ isLoggingOut: false });
		}
	},

	saveDatabaseId: async (databaseId: string) => {
		const trimmedId = databaseId.trim();
		if (!trimmedId) {
			set({ dbSaveStatus: 'error', dbSaveMessage: 'Database ID를 입력해 주세요.' });
			return false;
		}

		set({ dbSaveStatus: 'saving', dbSaveMessage: null });
		try {
			const res = await sendToBackground<{ name: string }>({
				type: 'SAVE_DATABASE_ID',
				databaseId: trimmedId,
			});

			if (res.success) {
				set((state) => ({
					authStatus: { ...state.authStatus, databaseId: trimmedId },
					dbSaveStatus: 'success',
					dbSaveMessage: `"${res.data.name}" 데이터베이스가 연결되었습니다.`,
				}));
				setTimeout(() => {
					get().resetDbMessages();
				}, 3000);
				return true;
			}

			set({ dbSaveStatus: 'error', dbSaveMessage: res.error || 'DB 연결에 실패했습니다.' });
			return false;
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'DB 저장 중 오류가 발생했습니다.';
			set({ dbSaveStatus: 'error', dbSaveMessage: msg });
			return false;
		}
	},

	createDatabase: async (parentPageId: string) => {
		const trimmedPageId = parentPageId.trim();
		if (!trimmedPageId) {
			set({ dbCreateStatus: 'error', dbCreateMessage: 'Parent Page ID 또는 URL을 입력해 주세요.' });
			return false;
		}

		set({ dbCreateStatus: 'creating', dbCreateMessage: null });
		try {
			const res = await sendToBackground<{ id: string; name: string }>({
				type: 'CREATE_DATABASE',
				parentPageId: trimmedPageId,
			});

			if (res.success) {
				// Re-fetch auth status to get updated databaseId
				const authRes = await sendToBackground<AuthStatus>({ type: 'GET_AUTH_STATUS' });
				set((state) => ({
					authStatus: authRes.success ? authRes.data : state.authStatus,
					dbCreateStatus: 'success',
					dbCreateMessage: `"${res.data.name}" 데이터베이스가 생성되었습니다.`,
				}));
				setTimeout(() => {
					get().resetDbMessages();
				}, 3000);
				return true;
			}

			set({ dbCreateStatus: 'error', dbCreateMessage: res.error || 'DB 생성에 실패했습니다.' });
			return false;
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'DB 생성 중 오류가 발생했습니다.';
			set({ dbCreateStatus: 'error', dbCreateMessage: msg });
			return false;
		}
	},

	dismissError: async () => {
		try {
			await sendToBackground({ type: 'DISMISS_ERROR' });
			set((state) => {
				const { lastError: _, ...rest } = state.authStatus;
				return { authStatus: rest as AuthStatus };
			});
		} catch {
			// ignore
		}
	},

	resetDbMessages: () => {
		set({
			dbSaveStatus: 'idle',
			dbSaveMessage: null,
			dbCreateStatus: 'idle',
			dbCreateMessage: null,
		});
	},
}));
