import React, { useEffect } from 'react';
import ScrapingView from './components/ScrapingView';
import AuthView from './components/AuthView';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../stores/useAuthStore';
import { useJobStore } from '../../stores/useJobStore';
import { Settings, ArrowLeft, Loader2, Sparkles, X } from 'lucide-react';

const App: React.FC = () => {
	const { authStatus, initializeAuth, dismissError } = useAuthStore();
	const { activeView, setActiveView, executeLiveScrape } = useJobStore();

	useEffect(() => {
		(async () => {
			const isConnected = await initializeAuth();
			if (isConnected) {
				setActiveView('scraping');
				await executeLiveScrape();
			} else {
				setActiveView('settings');
			}
		})();
	}, [initializeAuth, setActiveView, executeLiveScrape]);

	useEffect(() => {
		const handleFocus = () => {
			if (authStatus.isConnected && activeView === 'scraping') {
				executeLiveScrape();
			}
		};

		window.addEventListener('focus', handleFocus);
		return () => window.removeEventListener('focus', handleFocus);
	}, [authStatus.isConnected, activeView, executeLiveScrape]);

	if (activeView === 'loading') {
		return (
			<div className="w-[380px] flex flex-col bg-background text-foreground py-8">
				<header className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/50 backdrop-blur">
					<div className="flex items-center gap-2">
						<div className="p-1.5 rounded-lg bg-primary/20 text-primary">
							<Sparkles className="w-4 h-4" />
						</div>
						<span className="font-semibold text-sm">Notion Job Scraper</span>
					</div>
				</header>
				<div className="flex-1 flex flex-col items-center justify-center space-y-2 py-10">
					<Loader2 className="w-6 h-6 animate-spin text-primary" />
					<p className="text-xs text-muted-foreground">초기화 중...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="w-[380px] flex flex-col bg-background text-foreground">
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
						onClick={dismissError}
						title="닫기"
					>
						<X className="w-3.5 h-3.5" />
					</Button>
				</div>
			)}

			{/* 메인 콘텐츠 */}
			<main className="flex-1">
				{activeView === 'scraping' ? <ScrapingView /> : <AuthView />}
			</main>
		</div>
	);
};

export default App;
