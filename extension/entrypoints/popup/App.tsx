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
			await scrapeCurrentTab();
		} catch {
			setActiveView('settings');
		}
	};

	/** 활성 탭의 Content Script에 스크래핑 요청 */
	const scrapeCurrentTab = async () => {
		setScrapeError(null);
		setJobData(null);

		try {
			const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
			if (!tab?.id) {
				setScrapeError('현재 탭 정보를 가져올 수 없습니다.');
				return;
			}

			const result = await browser.tabs.sendMessage(tab.id, {
				type: 'SCRAPE',
			}) as ScrapeResponse;

			if (result.success) {
				setJobData(result.data);
			} else {
				setScrapeError(result.error);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			// Content Script가 로드되지 않은 페이지 (채용 사이트가 아닌 경우)
			if (msg.includes('Could not establish connection') || msg.includes('No tab')) {
				setScrapeError('이 페이지는 지원하는 채용 사이트가 아닙니다.\n자소설닷컴, 원티드, 사람인, 잡코리아 채용 공고 페이지를 열어주세요.');
			} else {
				setScrapeError(`스크래핑 오류: ${msg}`);
			}
		}
	};

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
				await scrapeCurrentTab();
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

			{/* 메인 콘텐츠 */}
			<main className="app-main">
				{activeView === 'scraping' ? (
					<ScrapingView
						jobData={jobData}
						scrapeError={scrapeError}
						saveStatus={saveStatus}
						saveError={saveError}
						onSave={handleSave}
						onRefresh={scrapeCurrentTab}
					/>
				) : (
					<AuthView
						authStatus={authStatus}
						onConnect={handleConnect}
						onLogout={handleLogout}
						onSaveDatabaseId={handleSaveDatabaseId}
					/>
				)}
			</main>
		</div>
	);
};

export default App;
