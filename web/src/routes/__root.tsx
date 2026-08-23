import React, { type ReactNode } from 'react';
import {
	createRootRoute,
	Outlet,
	HeadContent,
	Scripts,
	Link,
	useLocation,
} from '@tanstack/react-router';
import appCss from '../styles/app.css?url';
import { Sparkles } from 'lucide-react';

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ title: 'Notion Job Scraper - 스마트 채용 공고 관리 대시보드' },
			{
				name: 'description',
				content: '한국 채용 공고를 원클릭으로 스크래핑하여 Notion에 동기화하고 관리하는 풀스택 대시보드',
			},
		],
		links: [
			{ rel: 'stylesheet', href: appCss },
		],
	}),
	component: RootComponent,
});

function RootComponent() {
	const location = useLocation();

	return (
		<RootDocument>
			<div className="bg-background text-foreground flex flex-col min-h-screen antialiased selection:bg-primary/30">
				{/* 글로벌 네비게이션 헤더 */}
				<header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
					<div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
						<div className="flex items-center gap-6">
							<Link to="/" className="flex items-center gap-2 font-bold text-sm hover:opacity-90 transition-opacity">
								<div className="w-7 h-7 rounded-lg bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-sm shadow-sm">
									📋
								</div>
								<span className="tracking-tight font-semibold">Notion Job Scraper</span>
							</Link>

							<nav className="hidden md:flex items-center gap-1 text-xs">
								<Link
									to="/"
									className={`px-3 py-1.5 rounded-md transition-colors ${
										location.pathname === '/'
											? 'bg-secondary text-foreground font-medium'
											: 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
									}`}
								>
									서비스 소개
								</Link>
								<Link
									to="/jobs"
									search={{ status: 'all', site: 'all', q: '', page: 1 }}
									className={`px-3 py-1.5 rounded-md transition-colors ${
										location.pathname.startsWith('/jobs')
											? 'bg-secondary text-foreground font-medium'
											: 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
									}`}
								>
									공고 대시보드
								</Link>
							</nav>
						</div>

						<div className="flex items-center gap-2.5">
							<a
								href="https://addons.mozilla.org"
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md shadow-sm transition-colors"
							>
								<Sparkles className="w-3.5 h-3.5" />
								<span>확장 프로그램 설치</span>
							</a>
						</div>
					</div>
				</header>

				{/* 메인 라우트 Outlet */}
				<main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
					<Outlet />
				</main>

				{/* 글로벌 푸터 */}
				<footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
					<p>© 2026 Notion Job Scraper. Built with TanStack Start & React 18 Full-Document SSR.</p>
				</footer>
			</div>
		</RootDocument>
	);
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="ko" className="dark">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
