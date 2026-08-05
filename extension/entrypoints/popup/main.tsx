import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './popup.css';

// React 18 루트 생성 및 렌더링
const rootElement = document.getElementById('root');
if (!rootElement) {
	throw new Error('#root 엘리먼트를 찾을 수 없습니다.');
}

createRoot(rootElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
