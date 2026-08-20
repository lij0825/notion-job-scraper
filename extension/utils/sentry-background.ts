import * as Sentry from '@sentry/browser';
import { sanitizeSentryEvent } from './sentry-sanitize';

/**
 * Extension Background Service Worker 전용 Sentry 초기화
 * React 의존성 없이 @sentry/browser 기반으로 경량 구성됩니다.
 */
export function initBackgroundSentry(): void {
	const isProduction = import.meta.env.PROD || process.env['NODE_ENV'] === 'production';
	const dsn = import.meta.env.VITE_SENTRY_DSN || process.env['VITE_SENTRY_DSN'] || '';
	const version = import.meta.env.VITE_APP_VERSION || process.env['npm_package_version'] || '1.0.0';

	Sentry.init({
		dsn,
		environment: isProduction ? 'production' : 'development',
		release: `notion-job-scraper@${version}`,
		enabled: Boolean(isProduction && dsn),
		sampleRate: 1.0,
		beforeSend(event) {
			return sanitizeSentryEvent(event);
		},
	});
}

export { Sentry as BackgroundSentry };
