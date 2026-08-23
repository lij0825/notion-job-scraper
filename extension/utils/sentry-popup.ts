import * as Sentry from '@sentry/react';
import { sanitizeSentryEvent } from './sentry-sanitize';

/**
 * Extension Popup (React) 환경용 Sentry 초기화
 */
export function initPopupSentry(): void {
	const isProduction = import.meta.env.PROD || process.env['NODE_ENV'] === 'production';
	const dsn = import.meta.env.VITE_SENTRY_DSN || process.env['VITE_SENTRY_DSN'] || '';
	const version = import.meta.env.VITE_APP_VERSION || process.env['npm_package_version'] || '1.0.1';

	if (!dsn) {
		return;
	}

	Sentry.init({
		dsn,
		environment: isProduction ? 'production' : 'development',
		release: `notion-job-scraper@${version}`,
		enabled: Boolean(dsn),
		sampleRate: 1.0,
		tracesSampleRate: isProduction ? 0.2 : 1.0,
		integrations: [
			Sentry.browserTracingIntegration(),
		],
		beforeSend(event) {
			return sanitizeSentryEvent(event);
		},
	});
}

export { Sentry as PopupSentry };
