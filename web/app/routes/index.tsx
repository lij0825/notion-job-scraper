import React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, CheckCircle2, Shield, Zap, Sparkles, Database, Chrome } from 'lucide-react';

export const Route = createFileRoute('/')({
	component: HomeComponent,
});

function HomeComponent() {
	return (
		<div className="space-y-12 py-4">
			{/* Hero Section */}
			<section className="text-center space-y-4 max-w-2xl mx-auto py-8">
				<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
					<Sparkles className="w-3.5 h-3.5" />
					<span>Notion Job Scraper v1.0.11 출시</span>
				</div>
				<h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
					채용 공고를 클릭 한 번으로 <br />
					<span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
						Notion에 자동 동기화
					</span>
				</h1>
				<p className="text-sm text-muted-foreground leading-relaxed">
					원티드, 사람인, 잡코리아, 자소설닷컴 공고 정보를 실시간으로 추출하여
					원하는 Notion 페이지나 데이터베이스에 깔끔하게 정리해 드립니다.
				</p>

				<div className="flex flex-wrap items-center justify-center gap-3 pt-4">
					<Link
						to="/jobs"
						search={{ status: 'all', site: 'all', q: '', page: 1 }}
						className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-all"
					>
						<span>대시보드 둘러보기</span>
						<ArrowRight className="w-4 h-4" />
					</Link>
					<a
						href="#features"
						className="inline-flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg hover:bg-secondary/80 transition-colors"
					>
						기능 알아보기
					</a>
				</div>
			</section>

			{/* Features Grid */}
			<section id="features" className="grid sm:grid-cols-3 gap-4 pt-6">
				<div className="p-5 rounded-xl border border-border/60 bg-card/50 space-y-2.5">
					<div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
						<Zap className="w-5 h-5" />
					</div>
					<h3 className="font-semibold text-sm text-foreground">원클릭 스마트 추출</h3>
					<p className="text-xs text-muted-foreground leading-relaxed">
						채용 사이트의 직무명, 회사명, 마감일, 주요 자격 요건을 자동으로 정제하여 가져옵니다.
					</p>
				</div>

				<div className="p-5 rounded-xl border border-border/60 bg-card/50 space-y-2.5">
					<div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
						<Database className="w-5 h-5" />
					</div>
					<h3 className="font-semibold text-sm text-foreground">Notion 직접 연동</h3>
					<p className="text-xs text-muted-foreground leading-relaxed">
						Notion 공식 API를 통해 페이지나 데이터베이스에 서식 손상 없이 안전하게 적재됩니다.
					</p>
				</div>

				<div className="p-5 rounded-xl border border-border/60 bg-card/50 space-y-2.5">
					<div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
						<Shield className="w-5 h-5" />
					</div>
					<h3 className="font-semibold text-sm text-foreground">보안 & 개인정보 보호</h3>
					<p className="text-xs text-muted-foreground leading-relaxed">
						사용자의 개인 토큰과 자격 증명은 브라우저 로컬 환경에서만 안전하게 보관됩니다.
					</p>
				</div>
			</section>
		</div>
	);
}
