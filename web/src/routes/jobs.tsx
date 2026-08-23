import React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { fetchNotionJobsFn, type JobItem } from '../server/notion';
import { Search, ExternalLink, Calendar, Building2 } from 'lucide-react';

export const jobsSearchSchema = z.object({
	status: z.enum(['all', 'applied', 'interview', 'passed', 'rejected']).optional().catch('all'),
	site: z.enum(['all', 'wanted', 'saramin', 'jobkorea', 'jasoseol']).optional().catch('all'),
	q: z.string().optional().catch(''),
	page: z.number().int().positive().optional().catch(1),
});

export const Route = createFileRoute('/jobs')({
	validateSearch: (search) => jobsSearchSchema.parse(search),
	loaderDeps: ({ search }) => ({
		status: search.status,
		site: search.site,
		query: search.q,
	}),
	loader: async ({ deps }): Promise<JobItem[]> => {
		return fetchNotionJobsFn({
			data: {
				status: deps.status,
				site: deps.site,
				query: deps.query,
			},
		});
	},
	component: JobsDashboardComponent,
});

const STATUS_MAP = {
	applied: { label: '지원완료', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
	interview: { label: '면접진행', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
	passed: { label: '최종합격', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
	rejected: { label: '불합격', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

const SITE_MAP: Record<string, string> = {
	wanted: '원티드',
	saramin: '사람인',
	jobkorea: '잡코리아',
	jasoseol: '자소설닷컴',
};

function JobsDashboardComponent() {
	const jobs = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	const handleStatusChange = (status: z.infer<typeof jobsSearchSchema>['status']) => {
		navigate({ search: (prev) => ({ ...prev, status, page: 1 }) });
	};

	const handleSiteChange = (site: z.infer<typeof jobsSearchSchema>['site']) => {
		navigate({ search: (prev) => ({ ...prev, site, page: 1 }) });
	};

	const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		navigate({ search: (prev) => ({ ...prev, q: e.target.value, page: 1 }) });
	};

	return (
		<div className="space-y-6">
			{/* 대시보드 헤더 */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-xl font-bold tracking-tight text-foreground">지원 채용공고 관리</h1>
					<p className="text-xs text-muted-foreground mt-0.5">
						Notion에 동기화된 총 {jobs.length}개의 채용 공고를 실시간으로 확인합니다.
					</p>
				</div>
			</div>

			{/* 필터 및 검색 컨트롤 */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-card/60">
				<div className="flex items-center gap-2 flex-1 max-w-sm">
					<div className="relative w-full">
						<Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
						<input
							type="text"
							value={search.q || ''}
							onChange={handleSearchInput}
							placeholder="직무명, 회사명 검색..."
							className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/40 rounded border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
						/>
					</div>
				</div>

				<div className="flex items-center gap-2 overflow-x-auto">
					<select
						value={search.status || 'all'}
						onChange={(e) => handleStatusChange(e.target.value as any)}
						className="px-2.5 py-1.5 text-xs bg-muted/40 rounded border border-border/50 text-foreground focus:outline-none focus:border-primary"
					>
						<option value="all">전체 상태</option>
						<option value="applied">지원완료</option>
						<option value="interview">면접진행</option>
						<option value="passed">최종합격</option>
						<option value="rejected">불합격</option>
					</select>

					<select
						value={search.site || 'all'}
						onChange={(e) => handleSiteChange(e.target.value as any)}
						className="px-2.5 py-1.5 text-xs bg-muted/40 rounded border border-border/50 text-foreground focus:outline-none focus:border-primary"
					>
						<option value="all">전체 사이트</option>
						<option value="wanted">원티드</option>
						<option value="saramin">사람인</option>
						<option value="jobkorea">잡코리아</option>
						<option value="jasoseol">자소설닷컴</option>
					</select>
				</div>
			</div>

			{/* 공고 카드 목록 */}
			{jobs.length === 0 ? (
				<div className="text-center py-12 rounded-xl border border-dashed border-border/60 p-6 space-y-2">
					<p className="text-sm font-medium text-foreground">조건에 맞는 공고가 없습니다.</p>
					<p className="text-xs text-muted-foreground">검색어를 변경하거나 필터를 초기화해 보세요.</p>
				</div>
			) : (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{jobs.map((job) => (
						<div
							key={job.id}
							className="p-4 rounded-xl border border-border/60 bg-card hover:border-border transition-all space-y-3 flex flex-col justify-between"
						>
							<div className="space-y-2">
								<div className="flex items-center justify-between gap-2">
									<span className="text-[11px] font-semibold text-muted-foreground px-2 py-0.5 rounded bg-muted/50">
										{SITE_MAP[job.site] || job.site}
									</span>
									<span
										className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
											STATUS_MAP[job.status]?.color
										}`}
									>
										{STATUS_MAP[job.status]?.label || job.status}
									</span>
								</div>

								<div>
									<h3 className="font-semibold text-sm text-foreground line-clamp-1">{job.title}</h3>
									<div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
										<Building2 className="w-3.5 h-3.5 shrink-0" />
										<span className="truncate">{job.company}</span>
									</div>
								</div>
							</div>

							<div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
								<div className="flex items-center gap-1">
									<Calendar className="w-3 h-3" />
									<span>{job.deadline ? `마감: ${job.deadline}` : '상시 채용'}</span>
								</div>

								<a
									href={job.url}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
								>
									<span>공고 보기</span>
									<ExternalLink className="w-2.5 h-2.5" />
								</a>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
