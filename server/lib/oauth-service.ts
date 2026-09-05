import { Sentry } from './sentry';

export interface OAuthTokenExchangeParams {
	readonly code: string;
	readonly redirectUri: string;
}

export interface OAuthTokenResult {
	readonly success: boolean;
	readonly status: number;
	readonly data?: Record<string, unknown>;
	readonly error?: string;
	readonly errorDescription?: string;
}

export interface NotionOAuthServiceConfig {
	readonly clientId?: string;
	readonly clientSecret?: string;
	readonly fetchFn?: typeof fetch;
}

export class NotionOAuthService {
	private readonly clientId: string;
	private readonly clientSecret: string;
	private readonly fetchFn: typeof fetch;

	public constructor(config: NotionOAuthServiceConfig = {}) {
		this.clientId = config.clientId ?? process.env['NOTION_CLIENT_ID'] ?? '';
		this.clientSecret = config.clientSecret ?? process.env['NOTION_CLIENT_SECRET'] ?? '';
		this.fetchFn = config.fetchFn ?? fetch;
	}

	public async exchangeToken(params: OAuthTokenExchangeParams): Promise<OAuthTokenResult> {
		if (!this.clientId || !this.clientSecret) {
			const envError = new Error('서버 설정 오류: 환경변수가 누락되었습니다.');
			Sentry.captureException(envError);
			await Sentry.flush(2000);

			return {
				success: false,
				status: 500,
				error: 'server_config_error',
				errorDescription: '서버 설정 오류: 환경변수가 누락되었습니다.',
			};
		}

		const code = params.code.trim();
		const redirectUri = params.redirectUri.trim();

		if (!code || !redirectUri) {
			return {
				success: false,
				status: 400,
				error: 'invalid_request',
				errorDescription: 'code와 redirect_uri는 필수 필드입니다.',
			};
		}

		const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

		let response: Response;
		try {
			response = await this.fetchFn('https://api.notion.com/v1/oauth/token', {
				method: 'POST',
				headers: {
					Authorization: `Basic ${basicAuth}`,
					'Content-Type': 'application/json',
					'Notion-Version': '2022-06-28',
				},
				body: JSON.stringify({
					grant_type: 'authorization_code',
					code,
					redirect_uri: redirectUri,
				}),
			});
		} catch (networkError: unknown) {
			Sentry.captureException(networkError);
			await Sentry.flush(2000);

			const message = networkError instanceof Error ? networkError.message : String(networkError);
			return {
				success: false,
				status: 502,
				error: 'network_error',
				errorDescription: `Notion API에 연결할 수 없습니다: ${message}`,
			};
		}

		const responseText = await response.text();
		let responseData: Record<string, unknown>;

		try {
			responseData = JSON.parse(responseText) as Record<string, unknown>;
		} catch (parseError: unknown) {
			Sentry.captureException(parseError);
			await Sentry.flush(2000);

			return {
				success: false,
				status: response.status,
				error: 'invalid_response',
				errorDescription: `Notion API가 예상치 못한 응답을 반환했습니다: ${responseText.slice(0, 200)}`,
			};
		}

		if (!response.ok) {
			const errorType = String(responseData['error'] ?? 'unknown_error');
			const apiError = new Error(`Notion API error (${response.status}): ${errorType}`);
			Sentry.captureException(apiError);
			await Sentry.flush(2000);

			return {
				success: false,
				status: response.status,
				error: errorType,
				errorDescription: String(responseData['message'] ?? responseText),
			};
		}

		return {
			success: true,
			status: 200,
			data: responseData,
		};
	}
}

export const defaultNotionOAuthService = new NotionOAuthService();
