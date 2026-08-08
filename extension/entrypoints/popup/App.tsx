import React, { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import ScrapingView from './components/ScrapingView';
import AuthView from './components/AuthView';
import type { AuthStatus, BackgroundMessage, BackgroundResponse, JobData, ScrapeResponse } from '../../utils/types';

// 팝업 내 활성 뷰 상태
type ActiveView = 'loading' | 'scraping' | 'settings';

/** Background Service Worker에 메시지를 전송합니다. (컴포넌트 외부로 분리 — JSX 제네릭 파싱 충돌 방지) */
async function sendToBackground(message: BackgroundMessage): Promise<BackgroundResponse<unknown>> {
	return browser.runtime.sendMessage(message) as Promise<BackgroundResponse<unknown>>;
}

const App: React.FC = () => {
	const [activeView, setActiveView] = useState<ActiveView>('loading');
	const [authStatus, setAuthStatus] = useState<AuthStatus>({ isConnected: false });
	const [jobData, setJobData] = useState<JobData | null>(null);
	const [scrapeError, setScrapeError] = useState<string | null>(null);
	const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
	const [saveError, setSaveError] = useState<string | null>(null);

	// 팝업 초기화: 인증 상태 확인 → 스크래핑 시도
	useEffect(() => {
		initializePopup();
	}, []);

	/** 초기 인증 확인 및 스크래핑 실행 */
	const initializePopup = async () => {
		try {
			const authResponse = await sendToBackground({ type: 'GET_AUTH_STATUS' }) as BackgroundResponse<AuthStatus>;

			if (!authResponse.success) {
				setActiveView('settings');
				return;
			}

			const status = authResponse.data;
			setAuthStatus(status);

			if (!status.isConnected) {
				setActiveView('settings');
				return;
			}

			// 인증된 경우 현재 탭 스크래핑 시도
			setActiveView('scraping');
			await executeLiveScrape();
		} catch {
			setActiveView('settings');
		}
	};

	/** 활성 탭의 Content Script에 스크래핑 요청 (Live Scrape) */
	const executeLiveScrape = async () => {
		// 1. Instantly reset state to prevent flash of stale data
		setJobData(null);
		setScrapeError(null);

		try {
			const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
			if (!activeTab?.id) {
				setScrapeError('활성화된 탭을 찾을 수 없습니다.');
				return;
			}

			console.log('[Popup Diagnostic] Requesting SCRAPE from content script...');
			// 2. Request fresh live scrape from current tab
			const response = await browser.tabs.sendMessage(activeTab.id, {
				type: 'SCRAPE',
			}) as ScrapeResponse;
			console.log('[Popup Diagnostic] Response received in Popup:', response);

			if (response?.success && response?.data) {
				// Active tab has valid modal -> set fresh data
				setJobData(response.data);
			} else {
				// No modal open or scrape failed -> clear storage & state
				setJobData(null);
				await browser.storage.local.remove('jobData');
				setScrapeError(response?.error || '채용 공고 데이터를 찾을 수 없습니다.');
			}
		} catch (err) {
			console.error('[Popup] Scrape execution error:', err);
			// Content script not loaded or tab without permission -> purge stale state
			setJobData(null);
			await browser.storage.local.remove('jobData');
			setScrapeError('채용 공고 페이지에서 모달을 연 뒤 다시 시도해 주세요.');
		}
	};

	// 탭 변경 및 포커스 시 라이브 스크래핑 재실행
	useEffect(() => {
		const handleFocus = () => {
			if (authStatus.isConnected && activeView === 'scraping') {
				executeLiveScrape();
			}
		};

		window.addEventListener('focus', handleFocus);
		return () => window.removeEventListener('focus', handleFocus);
	}, [authStatus.isConnected, activeView]);

	/** Notion에 채용 공고 저장 */
	const handleSave = async (dataToSave: JobData) => {
		setSaveStatus('saving');
		setSaveError(null);

		try {
			const response = await sendToBackground({
				type: 'SAVE_TO_NOTION',
				payload: dataToSave,
			}) as BackgroundResponse<{ pageId: string }>;

			if (response.success) {
				setSaveStatus('success');
				// 3초 후 상태 초기화
				setTimeout(() => setSaveStatus('idle'), 3000);
			} else {
				setSaveStatus('error');
				setSaveError(response.error);
			}
		} catch (err) {
			setSaveStatus('error');
			setSaveError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
		}
	};

	/** Notion OAuth 인증 시작 */
	const handleConnect = async () => {
		const response = await sendToBackground({ type: 'START_OAUTH' }) as BackgroundResponse<AuthStatus>;

		if (response.success) {
			setAuthStatus(response.data);
			if (response.data.isConnected) {
				setActiveView('scraping');
				await executeLiveScrape();
			}
		}

		return response as BackgroundResponse<AuthStatus>;
	};

	/** 로그아웃 */
	const handleLogout = async () => {
		await sendToBackground({ type: 'LOGOUT' });
		setAuthStatus({ isConnected: false });
		setJobData(null);
		setScrapeError(null);
		setSaveStatus('idle');
		setSaveError(null);
		setActiveView('settings');
	};

	/** 연결 에러 배너 닫기 — storage.local에서도 삭제 */
	const handleDismissError = async () => {
		await sendToBackground({ type: 'DISMISS_ERROR' });
		setAuthStatus((prev) => {
			const { lastError: _, ...rest } = prev;
			return rest as AuthStatus;
		});
	};

	/** Database ID 저장 */
	const handleSaveDatabaseId = async (databaseId: string) => {
		const response = await sendToBackground({
			type: 'SAVE_DATABASE_ID',
			databaseId,
		}) as BackgroundResponse<{ name: string }>;

		if (response.success) {
			setAuthStatus((prev) => ({ ...prev, databaseId }));
		}

		return response;
	};

	/** Database 자동 생성 */
	const handleCreateDatabase = async (parentPageId: string) => {
		const response = await sendToBackground({
			type: 'CREATE_DATABASE',
			parentPageId,
		}) as BackgroundResponse<{ name: string }>;

		if (response.success) {
			const authResponse = await sendToBackground({ type: 'GET_AUTH_STATUS' }) as BackgroundResponse<AuthStatus>;
			if (authResponse.success) {
				setAuthStatus(authResponse.data);
			}
		}

		return response;
	};

	// 로딩 상태
	if (activeView === 'loading') {
		return (
			<div className="app">
				<header className="app-header">
					<div className="app-logo">
						<span className="logo-icon">📋</span>
						<span className="logo-text">Notion Job Scraper</span>
					</div>
				</header>
				<div className="loading-container">
					<div className="spinner" />
					<p className="loading-text">초기화 중...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="app">
			{/* 헤더 */}
			<header className="app-header">
				<div className="app-logo">
					<span className="logo-icon">📋</span>
					<span className="logo-text">Notion Job Scraper</span>
				</div>
				<div className="header-actions">
					{/* 스크래핑 뷰에서 설정 아이콘으로 전환 */}
					{activeView === 'scraping' && (
						<button
							className="icon-btn"
							onClick={() => setActiveView('settings')}
							title="설정"
							aria-label="설정 열기"
						>
							⚙️
						</button>
					)}
					{/* 설정 뷰에서 뒤로가기 (연결된 경우) */}
					{activeView === 'settings' && authStatus.isConnected && (
						<button
							className="icon-btn"
							onClick={() => setActiveView('scraping')}
							title="뒤로"
							aria-label="스크래핑 뷰로 돌아가기"
						>
							←
						</button>
					)}
				</div>
			</header>

			{/* 연결 상태 표시기 */}
			<div className={`connection-status-bar ${
				authStatus.lastError
					? 'connection-status-bar--error'
					: authStatus.isConnected
						? 'connection-status-bar--connected'
						: 'connection-status-bar--disconnected'
			}`}>
				<span className="connection-status-bar__dot" aria-hidden="true" />
				<span className="connection-status-bar__text">
					{authStatus.lastError
						? 'Error'
						: authStatus.isConnected
							? `Connected${authStatus.workspaceName ? ` — ${authStatus.workspaceName}` : ''}`
							: 'Disconnected'}
				</span>
			</div>

			{/* 에러 배너 (dismissable) */}
			{authStatus.lastError && (
				<div className="connection-error-banner" role="alert">
					<div className="connection-error-banner__content">
						<strong className="connection-error-banner__title">Connection Failed</strong>
						<p className="connection-error-banner__message">{authStatus.lastError.message}</p>
						<time className="connection-error-banner__time">
							{new Date(authStatus.lastError.occurredAt).toLocaleString()}
						</time>
					</div>
					<button
						className="connection-error-banner__dismiss"
						onClick={handleDismissError}
						aria-label="에러 닫기"
						title="닫기"
					>
						✕
					</button>
				</div>
			)}

			{/* 메인 콘텐츠 */}
			<main className="app-main">
				{activeView === 'scraping' ? (
					<ScrapingView
						jobData={jobData}
						scrapeError={scrapeError}
						saveStatus={saveStatus}
						saveError={saveError}
						onSave={handleSave}
						onRefresh={executeLiveScrape}
					/>
				) : (
					<AuthView
						authStatus={authStatus}
						onConnect={handleConnect}
						onLogout={handleLogout}
						onSaveDatabaseId={handleSaveDatabaseId}
						onCreateDatabase={handleCreateDatabase}
						lastError={authStatus.lastError}
					/>
				)}
			</main>
		</div>
	);
};

export default App;
