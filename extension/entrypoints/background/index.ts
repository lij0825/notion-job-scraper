import { browser } from 'wxt/browser';
import { initBackgroundSentry, BackgroundSentry } from '../../utils/sentry-background';
import type { BackgroundMessage, BackgroundResponse } from '../../utils/types';
import { authService } from '../../services/auth/auth-service';
import { notionJobService } from '../../services/notion/notion-service';
import { BackgroundMessageRouter } from './router';

initBackgroundSentry();

const messageRouter = new BackgroundMessageRouter({
	authService,
	notionJobService,
});

export default defineBackground({
	type: 'module',

	main() {
		browser.runtime.onMessage.addListener(
			(
				message: unknown,
				_sender,
				sendResponse: (response: BackgroundResponse) => void
			): true => {
				const msg = message as BackgroundMessage;

				messageRouter.dispatch(msg)
					.then((res) => {
						try {
							sendResponse(res);
						} catch {
							// 연결 채널이 이미 닫힌 경우 무시합니다.
						}
					})
					.catch((error: unknown) => {
						BackgroundSentry.captureException(error);
						const errorMessage =
							error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
						try {
							sendResponse({ success: false, error: errorMessage });
						} catch {
							// 연결 채널이 이미 닫힌 경우 무시합니다.
						}
					});

				return true;
			}
		);
	},
});
