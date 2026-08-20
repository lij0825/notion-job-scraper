import * as Sentry from '@sentry/react';
import { sanitizeSentryEvent } from './sentry-sanitize';

/**
 * Extension Popup (React) 환경용 Sentry 초기화
 */
export function initPopupSentry(): void {
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

export { Sentry as PopupSentry };
