import React, { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import ScrapingView from './components/ScrapingView';
import AuthView from './components/AuthView';
import { Button } from '../../components/ui/button';
import { Settings, ArrowLeft, Loader2, Sparkles, X } from 'lucide-react';
import type { AuthStatus, BackgroundMessage, BackgroundResponse, JobData, ScrapeResponse } from '../../utils/types';

type ActiveView = 'loading' | 'scraping' | 'settings';

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

	useEffect(() => {
		initializePopup();
	}, []);

	const initializePopup = async () => {
		try {
			const authResponse = (await sendToBackground({
				type: 'GET_AUTH_STATUS',
			})) as BackgroundResponse<AuthStatus>;

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

			setActiveView('scraping');
			await executeLiveScrape();
		} catch {
			setActiveView('settings');
		}
	};

	const executeLiveScrape = async () => {
		setJobData(null);
		setScrapeError(null);

		try {
			const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
			if (!activeTab?.id) {
				setScrapeError('활성화된 탭을 찾을 수 없습니다.');
				return;
			}

			const response = (await browser.tabs.sendMessage(activeTab.id, {
				type: 'SCRAPE',
			})) as ScrapeResponse;

			if (response?.success) {
				setJobData(response.data);
			} else {
				setJobData(null);
				await browser.storage.local.remove('jobData');
				setScrapeError(response?.error || '채용 공고 데이터를 찾을 수 없습니다.');
			}
		} catch {
			setJobData(null);
			await browser.storage.local.remove('jobData');
			setScrapeError('채용 공고 페이지에서 모달을 연 뒤 다시 시도해 주세요.');
		}
	};

	useEffect(() => {
		const handleFocus = () => {
			if (authStatus.isConnected && activeView === 'scraping') {
				executeLiveScrape();
			}
		};

		window.addEventListener('focus', handleFocus);
		return () => window.removeEventListener('focus', handleFocus);
	}, [authStatus.isConnected, activeView]);

	const handleSave = async (dataToSave: JobData) => {
		setSaveStatus('saving');
		setSaveError(null);

		try {
			const response = (await sendToBackground({
				type: 'SAVE_TO_NOTION',
				payload: dataToSave,
			})) as BackgroundResponse<{ pageId: string }>;

			if (response.success) {
				setSaveStatus('success');
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

	const handleConnect = async () => {
		const response = (await sendToBackground({ type: 'START_OAUTH' })) as BackgroundResponse<AuthStatus>;

		if (response.success) {
			setAuthStatus(response.data);
			if (response.data.isConnected) {
				setActiveView('scraping');
				await executeLiveScrape();
			}
		}

		return response as BackgroundResponse<AuthStatus>;
	};

	const handleLogout = async () => {
		await sendToBackground({ type: 'LOGOUT' });
		setAuthStatus({ isConnected: false });
		setJobData(null);
		setScrapeError(null);
		setSaveStatus('idle');
		setSaveError(null);
		setActiveView('settings');
	};

	const handleDismissError = async () => {
		await sendToBackground({ type: 'DISMISS_ERROR' });
		setAuthStatus((prev) => {
			const { lastError: _, ...rest } = prev;
			return rest as AuthStatus;
		});
	};

	const handleSaveDatabaseId = async (databaseId: string) => {
		const response = (await sendToBackground({
			type: 'SAVE_DATABASE_ID',
			databaseId,
		})) as BackgroundResponse<{ name: string }>;

		if (response.success) {
			setAuthStatus((prev) => ({ ...prev, databaseId }));
		}

		return response;
	};

	const handleCreateDatabase = async (parentPageId: string) => {
		const response = (await sendToBackground({
			type: 'CREATE_DATABASE',
			parentPageId,
		})) as BackgroundResponse<{ name: string }>;

		if (response.success) {
			const authResponse = (await sendToBackground({
				type: 'GET_AUTH_STATUS',
			})) as BackgroundResponse<AuthStatus>;
			if (authResponse.success) {
				setAuthStatus(authResponse.data);
			}
		}

		return response;
	};

	if (activeView === 'loading') {
		return (
			<div className="flex flex-col min-h-[560px] bg-background text-foreground">
				<header className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/50 backdrop-blur">
					<div className="flex items-center gap-2">
						<div className="p-1.5 rounded-lg bg-primary/20 text-primary">
							<Sparkles className="w-4 h-4" />
						</div>
						<span className="font-semibold text-sm">Notion Job Scraper</span>
					</div>
				</header>
				<div className="flex-1 flex flex-col items-center justify-center space-y-2">
					<Loader2 className="w-6 h-6 animate-spin text-primary" />
					<p className="text-xs text-muted-foreground">초기화 중...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col min-h-[560px] bg-background text-foreground">
			{/* 헤더 */}
			<header className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/50 backdrop-blur shrink-0">
				<div className="flex items-center gap-2">
					<div className="p-1.5 rounded-lg bg-primary/20 text-primary">
						<Sparkles className="w-4 h-4" />
					</div>
					<span className="font-semibold text-sm">Notion Job Scraper</span>
				</div>
				<div className="flex items-center">
					{activeView === 'scraping' && (
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-muted-foreground hover:text-foreground"
							onClick={() => setActiveView('settings')}
							title="설정"
							aria-label="설정 열기"
						>
							<Settings className="w-4 h-4" />
						</Button>
					)}
					{activeView === 'settings' && authStatus.isConnected && (
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-muted-foreground hover:text-foreground"
							onClick={() => setActiveView('scraping')}
							title="뒤로"
							aria-label="스크래핑 뷰로 돌아가기"
						>
							<ArrowLeft className="w-4 h-4" />
						</Button>
					)}
				</div>
			</header>

			{/* 연결 상태 표시 바 */}
			<div className="px-4 py-1.5 bg-muted/40 border-b border-border/40 flex items-center justify-between text-[11px]">
				<div className="flex items-center gap-1.5">
					<span
						className={`w-2 h-2 rounded-full ${
							authStatus.lastError
								? 'bg-destructive animate-pulse'
								: authStatus.isConnected
									? 'bg-emerald-500'
									: 'bg-muted-foreground'
						}`}
					/>
					<span className="text-muted-foreground">
						{authStatus.lastError
							? '연결 오류'
							: authStatus.isConnected
								? `연결됨 (${authStatus.workspaceName || 'Notion'})`
								: '미연결 상태'}
					</span>
				</div>
				{authStatus.databaseId && (
					<span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
						DB: {authStatus.databaseId.slice(0, 6)}...
					</span>
				)}
			</div>

			{/* 에러 알림 배너 */}
			{authStatus.lastError && (
				<div className="mx-4 mt-3 p-2.5 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive flex items-start justify-between gap-2 text-xs">
					<div>
						<p className="font-semibold text-[11px]">연결 실패</p>
						<p className="text-[11px] text-destructive/80 mt-0.5">{authStatus.lastError.message}</p>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-5 w-5 text-destructive hover:bg-destructive/20 shrink-0"
						onClick={handleDismissError}
						title="닫기"
					>
						<X className="w-3.5 h-3.5" />
					</Button>
				</div>
			)}

			{/* 메인 콘텐츠 */}
			<main className="flex-1">
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
