import { browser } from 'wxt/browser';
import {
	getStoredData,
	setStoredData,
	clearStoredData,
	getConnectionError,
	setConnectionError,
	clearConnectionError,
} from '../../utils/storage';
import { classifyError } from '../../utils/errors';
import { validateDatabase } from '../../utils/notion';
import { normalizeNotionId } from '../../utils/notion-id';
import { BackgroundSentry } from '../../utils/sentry-background';
import type { BackgroundResponse, AuthStatus, NotionTokenResponse } from '../../utils/types';

export class AuthService {
	public async getAuthStatus(): Promise<BackgroundResponse<AuthStatus>> {
		const stored = await getStoredData();
		const lastError = await getConnectionError();

		if (!stored.accessToken) {
			return { success: true, data: { isConnected: false, lastError } };
		}

		return {
			success: true,
			data: {
				isConnected: true,
				workspaceName: stored.workspaceName,
				databaseId: stored.databaseId,
				lastError,
			},
		};
	}

	public async startOAuthFlow(): Promise<BackgroundResponse<AuthStatus>> {
		const clientId = import.meta.env.VITE_NOTION_CLIENT_ID;
		if (!clientId) {
			return {
				success: false,
				error: 'VITE_NOTION_CLIENT_ID 환경변수가 설정되지 않았습니다.',
			};
		}

		const redirectURL = browser.identity.getRedirectURL();
		const authUrl = new URL('https://api.notion.com/v1/oauth/authorize');
		authUrl.searchParams.set('client_id', clientId);
		authUrl.searchParams.set('redirect_uri', redirectURL);
		authUrl.searchParams.set('response_type', 'code');
		authUrl.searchParams.set('owner', 'user');

		let responseUrl: string;
		try {
			responseUrl = await browser.identity.launchWebAuthFlow({
				url: authUrl.toString(),
				interactive: true,
			});
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			if (message.includes('canceled') || message.includes('cancelled') || message.includes('closed')) {
				return { success: false, error: '인증이 취소되었습니다.' };
			}
			const errorMsg = `OAuth 인증 실패: ${message}`;
			await setConnectionError(errorMsg);
			return { success: false, error: errorMsg };
		}

		const responseUrlObj = new URL(responseUrl);
		const code = responseUrlObj.searchParams.get('code');
		const oauthError = responseUrlObj.searchParams.get('error');

		if (oauthError) {
			const errorMsg = `Notion OAuth 오류: ${oauthError}`;
			await setConnectionError(errorMsg);
			return { success: false, error: errorMsg };
		}

		if (!code) {
			const errorMsg = '인증 코드를 받지 못했습니다.';
			await setConnectionError(errorMsg);
			return { success: false, error: errorMsg };
		}

		const proxyUrl = import.meta.env.VITE_PROXY_URL;
		let tokenData: NotionTokenResponse;

		try {
			const tokenResponse = await fetch(`${proxyUrl}/api/token`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code, redirect_uri: redirectURL }),
			});

			if (!tokenResponse.ok) {
				const errorBody = await tokenResponse.text();
				const classified = classifyError(new Error(errorBody), {
					url: `${proxyUrl}/api/token`,
					status: tokenResponse.status,
					rawResponse: errorBody,
					action: 'Notion Token Exchange',
				});
				BackgroundSentry.captureException(new Error(classified.devMessage));
				await setConnectionError(classified.userMessage);
				return { success: false, error: classified.userMessage };
			}

			tokenData = (await tokenResponse.json()) as NotionTokenResponse;
		} catch (error: unknown) {
			const classified = classifyError(error, {
				url: `${proxyUrl}/api/token`,
				action: 'Proxy Server Connection',
			});
			BackgroundSentry.captureException(error);
			await setConnectionError(classified.userMessage);
			return { success: false, error: classified.userMessage };
		}

		await clearConnectionError();
		await setStoredData({
			accessToken: tokenData.access_token,
			workspaceName: tokenData.workspace_name,
			workspaceId: tokenData.workspace_id,
		});

		return {
			success: true,
			data: {
				isConnected: true,
				workspaceName: tokenData.workspace_name,
			},
		};
	}

	public async logout(): Promise<BackgroundResponse<void>> {
		await clearStoredData();
		return { success: true, data: undefined };
	}

	public async saveManualAuth(apiKey: string, databaseId: string): Promise<BackgroundResponse<AuthStatus>> {
		const trimmedKey = apiKey.trim();
		const trimmedDb = databaseId.trim();

		if (!trimmedKey) {
			return { success: false, error: 'Notion API Key (Internal Integration Secret)를 입력해 주세요.' };
		}
		if (!trimmedDb) {
			return { success: false, error: 'Notion 페이지 또는 Database 링크를 입력해 주세요.' };
		}

		const cleanedId = normalizeNotionId(trimmedDb);

		try {
			const { name } = await validateDatabase(trimmedKey, cleanedId);
			await clearConnectionError();
			await setStoredData({
				accessToken: trimmedKey,
				databaseId: cleanedId,
				workspaceName: `직접 연동 (${name || 'Notion'})`,
			});

			return {
				success: true,
				data: {
					isConnected: true,
					workspaceName: `직접 연동 (${name || 'Notion'})`,
					databaseId: cleanedId,
				},
			};
		} catch (error: unknown) {
			const classified = classifyError(error, {
				action: 'Manual Notion Connection',
			});
			return {
				success: false,
				error: classified.userMessage,
			};
		}
	}

	public async dismissConnectionError(): Promise<BackgroundResponse<void>> {
		await clearConnectionError();
		return { success: true, data: undefined };
	}
}

export const authService = new AuthService();
