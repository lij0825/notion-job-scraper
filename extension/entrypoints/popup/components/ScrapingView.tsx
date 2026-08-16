import React from 'react';
import { browser } from 'wxt/browser';
import DatePicker from './DatePicker';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent } from '../../../components/ui/card';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { useJobStore, type SelectableField } from '../../../stores/useJobStore';
import {
	RefreshCw,
	Sparkles,
	Building2,
	Briefcase,
	Link as LinkIcon,
	FileText,
	Calendar,
	CheckCircle2,
	AlertCircle,
	ExternalLink,
	Loader2,
	Lock,
} from 'lucide-react';

const FIELD_LABELS: Record<SelectableField, string> = {
	title: '직무명',
	company: '회사명',
	deadline: '마감일',
	url: '공고 URL',
	description: '직무 설명',
};

const SITE_URLS: Record<string, string> = {
	'원티드': 'https://www.wanted.co.kr',
	'사람인': 'https://www.saramin.co.kr',
	'잡코리아': 'https://www.jobkorea.co.kr',
	'자소설닷컴': 'https://jasoseol.com',
};

const ScrapingView: React.FC = () => {
	const {
		jobData,
		editableData,
		selectedFields,
		scrapeError,
		isRefreshing,
		saveStatus,
		saveError,
		updateField,
		toggleField,
		executeLiveScrape,
		saveToNotion,
	} = useJobStore();

	const handleSiteClick = (url: string) => {
		browser.tabs.create({ url });
	};

	const renderSupportedSites = () => (
		<div className="space-y-2 pt-2 text-center">
			<p className="text-[11px] text-muted-foreground font-medium">지원 사이트 바로가기</p>
			<div className="flex flex-wrap justify-center gap-1.5">
				{Object.entries(SITE_URLS).map(([name, url]) => (
					<Button
						key={name}
						variant="outline"
						size="sm"
						className="h-7 text-xs gap-1 py-0 px-2.5 bg-card/60 hover:bg-accent"
						onClick={() => handleSiteClick(url)}
					>
						<span>{name}</span>
						<ExternalLink className="w-3 h-3 text-muted-foreground" />
					</Button>
				))}
			</div>
		</div>
	);

	if (scrapeError && !jobData) {
		return (
			<div className="flex flex-col items-center justify-center p-6 py-8 space-y-4 text-center">
				<div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
					<AlertCircle className="w-6 h-6" />
				</div>
				<div className="space-y-1">
					<h3 className="text-sm font-semibold">채용 공고를 찾을 수 없습니다</h3>
					<p className="text-xs text-muted-foreground max-w-[280px]">{scrapeError}</p>
				</div>
				{renderSupportedSites()}
				<Button
					variant="secondary"
					size="sm"
					onClick={executeLiveScrape}
					disabled={isRefreshing}
					className="gap-1.5 mt-2"
				>
					<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
					<span>다시 시도</span>
				</Button>
			</div>
		);
	}

	if (!jobData || !editableData) {
		return (
			<div className="flex flex-col items-center justify-center p-6 py-8 space-y-4 text-center">
				<div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
					<Briefcase className="w-6 h-6" />
				</div>
				<div className="space-y-1">
					<h3 className="text-sm font-semibold">채용 공고를 열어주세요</h3>
					<p className="text-xs text-muted-foreground max-w-[280px]">
						원티드, 사람인, 잡코리아, 자소설닷컴 공고 페이지에서 확장 프로그램을 실행하세요.
					</p>
				</div>
				{renderSupportedSites()}
			</div>
		);
	}

	const siteLabels: Record<string, string> = {
		jasoseol: '자소설닷컴',
		wanted: '원티드',
		saramin: '사람인',
		jobkorea: '잡코리아',
		unknown: '알 수 없음',
	};

	const selectedCount = Object.values(selectedFields).filter(Boolean).length;
	const totalCount = Object.keys(selectedFields).length;

	return (
		<div className="flex flex-col p-4 space-y-3.5">
			{/* 상단 툴바 */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<Badge variant="default" className="gap-1 py-0.5 px-2 text-xs">
						<Sparkles className="w-3 h-3" />
						<span>{siteLabels[editableData.site] ?? editableData.site}</span>
					</Badge>
					<span className="text-[11px] text-muted-foreground">
						{selectedCount}/{totalCount} 필드 선택됨
					</span>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-muted-foreground hover:text-foreground"
					onClick={executeLiveScrape}
					disabled={isRefreshing}
					title="다시 스크래핑"
				>
					<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
				</Button>
			</div>

			{/* 필드 목록 카드 */}
			<Card className="border-border/60">
				<CardContent className="p-3 space-y-3">
					{/* 직무명 (필수) */}
					<div className="space-y-1">
						<div className="flex items-center justify-between text-xs">
							<label className="flex items-center gap-1.5 font-medium">
								<Briefcase className="w-3.5 h-3.5 text-primary" />
								<span>{FIELD_LABELS.title}</span>
								<Lock className="w-2.5 h-2.5 text-muted-foreground" />
							</label>
							<Badge variant="outline" className="text-[10px] py-0 px-1">필수</Badge>
						</div>
						<Input
							type="text"
							className="h-8 text-xs bg-muted/20"
							value={editableData.title}
							onChange={(e) => updateField('title', e.target.value)}
							placeholder="직무명 입력"
							spellCheck={false}
						/>
					</div>

					{/* 회사명 (선택) */}
					<div className={`space-y-1 ${!selectedFields.company ? 'opacity-50' : ''}`}>
						<div className="flex items-center justify-between text-xs">
							<label className="flex items-center gap-1.5 font-medium cursor-pointer">
								<input
									type="checkbox"
									className="rounded border-border bg-background text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
									checked={selectedFields.company}
									onChange={() => toggleField('company')}
								/>
								<Building2 className="w-3.5 h-3.5 text-primary" />
								<span>{FIELD_LABELS.company}</span>
							</label>
						</div>
						<Input
							type="text"
							className="h-8 text-xs bg-muted/20"
							value={editableData.company}
							onChange={(e) => updateField('company', e.target.value)}
							placeholder="회사명 입력"
							disabled={!selectedFields.company}
							spellCheck={false}
						/>
					</div>

					{/* 마감일 (선택) */}
					<div className={`space-y-1 ${!selectedFields.deadline ? 'opacity-50' : ''}`}>
						<div className="flex items-center justify-between text-xs">
							<label className="flex items-center gap-1.5 font-medium cursor-pointer">
								<input
									type="checkbox"
									className="rounded border-border bg-background text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
									checked={selectedFields.deadline}
									onChange={() => toggleField('deadline')}
								/>
								<Calendar className="w-3.5 h-3.5 text-primary" />
								<span>{FIELD_LABELS.deadline}</span>
							</label>
						</div>
						{selectedFields.deadline ? (
							<DatePicker
								value={editableData.deadline}
								onChange={(val) => updateField('deadline', val)}
								label="마감일 설정"
							/>
						) : (
							<p className="text-[11px] text-muted-foreground italic">저장 시 마감일이 제외됩니다.</p>
						)}
					</div>

					{/* 공고 URL (필수) */}
					<div className="space-y-1">
						<div className="flex items-center justify-between text-xs">
							<label className="flex items-center gap-1.5 font-medium">
								<LinkIcon className="w-3.5 h-3.5 text-primary" />
								<span>{FIELD_LABELS.url}</span>
								<Lock className="w-2.5 h-2.5 text-muted-foreground" />
							</label>
							<Badge variant="outline" className="text-[10px] py-0 px-1">필수</Badge>
						</div>
						<Input
							type="text"
							className="h-8 text-xs bg-muted/20"
							value={editableData.url}
							onChange={(e) => updateField('url', e.target.value)}
							placeholder="공고 URL 입력"
							spellCheck={false}
						/>
					</div>

					{/* 직무 설명 (선택) */}
					<div className={`space-y-1 ${!selectedFields.description ? 'opacity-50' : ''}`}>
						<div className="flex items-center justify-between text-xs">
							<label className="flex items-center gap-1.5 font-medium cursor-pointer">
								<input
									type="checkbox"
									className="rounded border-border bg-background text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
									checked={selectedFields.description}
									onChange={() => toggleField('description')}
								/>
								<FileText className="w-3.5 h-3.5 text-primary" />
								<span>{FIELD_LABELS.description}</span>
							</label>
						</div>
						{selectedFields.description ? (
							<textarea
								className="flex min-h-[70px] w-full rounded-md border border-input bg-muted/20 px-3 py-1.5 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
								value={editableData.description}
								onChange={(e) => updateField('description', e.target.value)}
								placeholder="직무 설명 입력"
								rows={3}
								spellCheck={false}
							/>
						) : (
							<p className="text-[11px] text-muted-foreground italic">저장 시 직무 설명이 제외됩니다.</p>
						)}
					</div>
				</CardContent>
			</Card>

			{/* 피드백 메시지 */}
			{saveStatus === 'success' && (
				<Alert variant="success" className="py-2">
					<CheckCircle2 className="w-4 h-4" />
					<AlertDescription className="text-xs font-medium ml-1">
						Notion에 성공적으로 저장되었습니다!
					</AlertDescription>
				</Alert>
			)}

			{saveStatus === 'error' && saveError && (
				<Alert variant="destructive" className="py-2">
					<AlertCircle className="w-4 h-4" />
					<AlertDescription className="text-xs font-medium ml-1">
						{saveError}
					</AlertDescription>
				</Alert>
			)}

			{/* 저장 버튼 */}
			<Button
				className="w-full py-5 font-semibold text-sm shadow-md gap-2"
				onClick={saveToNotion}
				disabled={saveStatus === 'saving' || saveStatus === 'success'}
			>
				{saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
				{saveStatus === 'success'
					? '저장 완료'
					: saveStatus === 'saving'
						? 'Notion에 저장 중...'
						: `선택한 항목 Notion에 저장 (${selectedCount})`}
			</Button>
		</div>
	);
};

export default ScrapingView;
