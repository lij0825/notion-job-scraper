import { initPopupSentry, PopupSentry } from '../../utils/sentry-popup';

// Sentry 관측성 최우선 초기화 (모든 React 컴포넌트 로드 전 실행)
initPopupSentry();

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorFallback from './ErrorFallback';
import './popup.css';

// React 18 루트 생성 및 렌더링
const rootElement = document.getElementById('root');
if (!rootElement) {
	throw new Error('#root 엘리먼트를 찾을 수 없습니다.');
}

createRoot(rootElement).render(
	<React.StrictMode>
		<PopupSentry.ErrorBoundary
			fallback={({ error, resetError }) => (
				<ErrorFallback error={error} resetError={resetError} />
			)}
		>
			<App />
		</PopupSentry.ErrorBoundary>
	</React.StrictMode>
);
