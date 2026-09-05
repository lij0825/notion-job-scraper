import type { BackgroundMessage, BackgroundResponse } from '../../utils/types';
import type { AuthService } from '../../services/auth/auth-service';
import type { NotionJobService } from '../../services/notion/notion-service';

export interface MessageRouterDependencies {
	readonly authService: AuthService;
	readonly notionJobService: NotionJobService;
}

type MessageHandler<T extends BackgroundMessage = BackgroundMessage> = (
	message: T
) => Promise<BackgroundResponse>;

export class BackgroundMessageRouter {
	private readonly authService: AuthService;
	private readonly notionJobService: NotionJobService;
	private readonly handlers = new Map<BackgroundMessage['type'], MessageHandler>();

	public constructor(dependencies: MessageRouterDependencies) {
		this.authService = dependencies.authService;
		this.notionJobService = dependencies.notionJobService;
		this.registerHandlers();
	}

	public async dispatch(message: BackgroundMessage): Promise<BackgroundResponse> {
		const handler = this.handlers.get(message.type);
		if (!handler) {
			return { success: false, error: '알 수 없는 메시지 타입입니다.' };
		}
		return handler(message);
	}

	private registerHandlers(): void {
		this.handlers.set('GET_AUTH_STATUS', () => this.authService.getAuthStatus());
		this.handlers.set('START_OAUTH', () => this.authService.startOAuthFlow());
		this.handlers.set('LOGOUT', () => this.authService.logout());
		this.handlers.set('DISMISS_ERROR', () => this.authService.dismissConnectionError());

		this.handlers.set('SAVE_MANUAL_AUTH', (msg) => {
			if (msg.type === 'SAVE_MANUAL_AUTH') {
				return this.authService.saveManualAuth(msg.apiKey, msg.databaseId);
			}
			return Promise.resolve({ success: false, error: '잘못된 메시지 페이로드입니다.' });
		});

		this.handlers.set('SAVE_TO_NOTION', (msg) => {
			if (msg.type === 'SAVE_TO_NOTION') {
				return this.notionJobService.saveToNotion(msg.payload);
			}
			return Promise.resolve({ success: false, error: '잘못된 메시지 페이로드입니다.' });
		});

		this.handlers.set('SAVE_DATABASE_ID', (msg) => {
			if (msg.type === 'SAVE_DATABASE_ID') {
				return this.notionJobService.saveDatabaseId(msg.databaseId);
			}
			return Promise.resolve({ success: false, error: '잘못된 메시지 페이로드입니다.' });
		});

		this.handlers.set('CREATE_DATABASE', (msg) => {
			if (msg.type === 'CREATE_DATABASE') {
				return this.notionJobService.createDatabase(msg.parentPageId);
			}
			return Promise.resolve({ success: false, error: '잘못된 메시지 페이로드입니다.' });
		});
	}
}
