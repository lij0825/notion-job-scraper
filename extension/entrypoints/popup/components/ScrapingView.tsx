import React, { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { browser } from 'wxt/browser';
import DatePicker from './DatePicker';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { NotionPropertyRow } from '../../../components/notion/NotionPropertyRow';
import { NotionCallout } from '../../../components/notion/NotionCallout';
import { useLiveScrapeQuery, useSaveJobToNotionMutation } from '../../../hooks/queries/useScrapeQuery';
import {
	RefreshCw,
	Sparkles,
	Building2,
	Type,
	Link as LinkIcon,
	FileText,
	Calendar,
	CheckCircle2,
	AlertCircle,
	ExternalLink,
	Loader2,
	Send,
	PenLine,
} from 'lucide-react';
import type { JobData } from '../../../utils/types';

type SelectableField = 'title' | 'company' | 'deadline' | 'url' | 'description';
type FieldSelectionMap = Record<SelectableField, boolean>;

const DEFAULT_SELECTION: FieldSelectionMap = {
	title: true,
	company: true,
	deadline: true,
	url: true,
	description: true,
};

const SITE_URLS: Record<string, string> = {
	'원티드': 'https://www.wanted.co.kr',
	'사람인': 'https://www.saramin.co.kr',
	'잡코리아': 'https://www.jobkorea.co.kr',
	'자소설닷컴': 'https://jasoseol.com',
};

export const ScrapingView: React.FC = () => {
	const navigate = useNavigate();
	const search = useSearch({ strict: false }) as { mode?: 'auto' | 'manual' };
	const isManualFromUrl = search?.mode === 'manual';

	const { data: jobData, isLoading, error, refetch, isRefetching } = useLiveScrapeQuery();
	const saveMutation = useSaveJobToNotionMutation();

	const [editableData, setEditableData] = useState<JobData | null>(null);
	const [selectedFields, setSelectedFields] = useState<FieldSelectionMap>(DEFAULT_SELECTION);
	const [isManualMode, setIsManualMode] = useState<boolean>(isManualFromUrl);
	const [validationError, setValidationError] = useState<string | null>(null);

	// Sync local state when fresh scrape data arrives
	useEffect(() => {
		if (jobData && !isManualFromUrl) {
			setEditableData({ ...jobData });
			setSelectedFields(DEFAULT_SELECTION);
			setIsManualMode(false);
			setValidationError(null);
		}
	}, [jobData, isManualFromUrl]);

	const updateField = <K extends keyof JobData>(field: K, value: JobData[K]) => {
		if (field === 'title' && validationError) {
			setValidationError(null);
		}
		setEditableData((prev) => (prev ? { ...prev, [field]: value } : prev));
	};

	const toggleField = (field: SelectableField) => {
		if (field === 'title' || field === 'url') return; // Required
		setSelectedFields((prev) => ({ ...prev, [field]: !prev[field] }));
	};

	const handleStartManualEntry = () => {
		setEditableData({
			title: '',
			company: '',
			url: '',
			deadline: null,
			description: '',
			site: 'unknown',
		});
		setIsManualMode(true);
		setSelectedFields(DEFAULT_SELECTION);
		setValidationError(null);
		navigate({ to: '/', search: { mode: 'manual' } });
	};

	const handleRetryScrape = () => {
		setIsManualMode(false);
		setValidationError(null);
		navigate({ to: '/', search: { mode: 'auto' } });
		refetch();
	};

	const handleSave = async () => {
		if (!editableData) return;

		if (!editableData.title.trim()) {
			setValidationError('직무명(Title)을 입력해 주세요.');
			return;
		}
		setValidationError(null);

		const dataToSave: JobData = {
			title: editableData.title.trim(),
			company: selectedFields.company ? editableData.company.trim() : '',
			url: editableData.url.trim(),
			deadline: selectedFields.deadline ? editableData.deadline : null,
			description: selectedFields.description ? editableData.description.trim() : '',
			site: editableData.site,
		};

		await saveMutation.mutateAsync(dataToSave);
	};

	const handleSiteClick = (url: string) => {
		browser.tabs.create({ url });
	};

	const renderSupportedSites = () => (
		<div className="space-y-2 pt-2 text-center">
			<p className="text-[11px] text-muted-foreground font-medium">지원 채용 사이트</p>
			<div className="flex flex-wrap justify-center gap-1.5">
				{Object.entries(SITE_URLS).map(([name, url]) => (
					<Button
						key={name}
						variant="outline"
						size="sm"
						className="h-6 text-[11px] gap-1 py-0 px-2 bg-card hover:bg-accent rounded border-border"
						onClick={() => handleSiteClick(url)}
					>
						<span>{name}</span>
						<ExternalLink className="w-2.5 h-2.5 text-muted-foreground" />
					</Button>
				))}
			</div>
		</div>
	);

	if (isLoading && !isManualMode) {
		return (
			<div className="flex flex-col items-center justify-center p-6 py-10 space-y-2.5 text-center">
				<Loader2 className="w-5 h-5 animate-spin text-primary" />
				<p className="text-xs text-muted-foreground">현재 탭의 채용 공고를 읽어오는 중...</p>
			</div>
		);
	}

	if ((error || !jobData || !editableData) && !isManualMode) {
		return (
			<div className="flex flex-col items-center justify-center p-5 py-7 space-y-3.5 text-center">
				<div className="w-10 h-10 rounded-lg bg-muted/60 border border-border flex items-center justify-center text-lg">
					🔍
				</div>
				<div className="space-y-1">
					<h3 className="text-xs font-semibold text-foreground">채용 공고를 찾지 못했습니다</h3>
					<p className="text-[11px] text-muted-foreground max-w-[260px] leading-relaxed">
						{error instanceof Error
							? error.message
							: '지원 사이트가 아니거나 공고 페이지를 찾을 수 없습니다. 직접 입력하여 저장할 수 있습니다.'}
					</p>
				</div>

				<div className="w-full space-y-2 pt-1">
					<Button
						variant="default"
						size="sm"
						onClick={handleStartManualEntry}
						className="w-full h-8 gap-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm"
					>
						<PenLine className="w-3.5 h-3.5" />
						<span>직접 입력하여 저장</span>
					</Button>

					<Button
						variant="secondary"
						size="sm"
						onClick={handleRetryScrape}
						disabled={isRefetching}
						className="w-full h-8 gap-1.5 text-xs rounded bg-secondary text-secondary-foreground hover:bg-accent"
					>
						<RefreshCw className={`w-3 h-3 ${isRefetching ? 'animate-spin' : ''}`} />
						<span>자동 감지 다시 시도</span>
					</Button>
				</div>

				{renderSupportedSites()}
			</div>
		);
	}

	if (!editableData) {
		return null;
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
		<div className="flex flex-col p-3 space-y-3 bg-background">
			{/* Notion Page Header Section */}
			<div className="flex items-center justify-between px-1">
				<div className="flex items-center gap-1.5">
					<Badge variant="outline" className="gap-1 py-0 px-2 text-[10px] bg-card border-border font-medium text-foreground">
						{isManualMode ? (
							<>
								<PenLine className="w-2.5 h-2.5 text-primary" />
								<span>직접 입력</span>
							</>
						) : (
							<>
								<Sparkles className="w-2.5 h-2.5 text-primary" />
								<span>{siteLabels[editableData.site] ?? editableData.site}</span>
							</>
						)}
					</Badge>
					<span className="text-[10px] text-muted-foreground">
						{selectedCount}/{totalCount} 속성 선택됨
					</span>
				</div>
				<div className="flex items-center gap-1">
					{isManualMode ? (
						<Button
							variant="ghost"
							size="sm"
							className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
							onClick={handleRetryScrape}
							disabled={isRefetching}
							title="자동 감지 시도"
						>
							<RefreshCw className={`w-2.5 h-2.5 ${isRefetching ? 'animate-spin' : ''}`} />
							<span>자동 감지</span>
						</Button>
					) : (
						<>
							<Button
								variant="ghost"
								size="sm"
								className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
								onClick={handleStartManualEntry}
								title="직접 입력 모드로 전환"
							>
								<PenLine className="w-2.5 h-2.5" />
								<span>직접 입력</span>
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
								onClick={() => refetch()}
								disabled={isRefetching}
								title="다시 스크래핑"
							>
								<RefreshCw className={`w-3 h-3 ${isRefetching ? 'animate-spin' : ''}`} />
							</Button>
						</>
					)}
				</div>
			</div>

			{/* Notion Database Properties Table */}
			<div className="rounded-md border border-border bg-card p-1.5 space-y-0.5 shadow-sm">
				{/* 1. 직무명 (Title) */}
				<NotionPropertyRow
					icon={<Type className="w-3.5 h-3.5 text-muted-foreground" />}
					label="직무명"
					required
					isSelected={true}
				>
					<Input
						type="text"
						value={editableData.title}
						onChange={(e) => updateField('title', e.target.value)}
						className="h-7 text-xs bg-transparent border-transparent hover:border-border/60 focus:border-border px-1.5 focus-visible:ring-0 focus-visible:bg-muted/40 font-medium placeholder:text-muted-foreground/50"
						placeholder="직무명 입력 (예: 백엔드 개발자)"
						spellCheck={false}
					/>
				</NotionPropertyRow>

				{/* 2. 회사명 (Company) */}
				<NotionPropertyRow
					icon={<Building2 className="w-3.5 h-3.5 text-muted-foreground" />}
					label="회사명"
					isSelected={selectedFields.company}
					onToggle={() => toggleField('company')}
				>
					<Input
						type="text"
						value={editableData.company}
						onChange={(e) => updateField('company', e.target.value)}
						disabled={!selectedFields.company}
						className="h-7 text-xs bg-transparent border-transparent hover:border-border/60 focus:border-border px-1.5 focus-visible:ring-0 focus-visible:bg-muted/40 placeholder:text-muted-foreground/50"
						placeholder="회사명 입력 (예: 토스)"
						spellCheck={false}
					/>
				</NotionPropertyRow>

				{/* 3. 마감일 (Deadline) */}
				<NotionPropertyRow
					icon={<Calendar className="w-3.5 h-3.5 text-muted-foreground" />}
					label="마감일"
					isSelected={selectedFields.deadline}
					onToggle={() => toggleField('deadline')}
				>
					{selectedFields.deadline ? (
						<DatePicker
							value={editableData.deadline}
							onChange={(val) => updateField('deadline', val)}
							label="마감일 지정"
						/>
					) : (
						<span className="text-[11px] text-muted-foreground px-1.5 italic">저장 시 제외</span>
					)}
				</NotionPropertyRow>

				{/* 4. 공고 URL */}
				<NotionPropertyRow
					icon={<LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />}
					label="URL"
					required
					isSelected={true}
				>
					<Input
						type="text"
						value={editableData.url}
						onChange={(e) => updateField('url', e.target.value)}
						className="h-7 text-xs bg-transparent border-transparent hover:border-border/60 focus:border-border px-1.5 focus-visible:ring-0 focus-visible:bg-muted/40 font-mono text-[11px] placeholder:text-muted-foreground/50"
						placeholder="공고 링크 URL (선택 입력)"
						spellCheck={false}
					/>
				</NotionPropertyRow>

				{/* 5. 직무 설명 (Description) */}
				<NotionPropertyRow
					icon={<FileText className="w-3.5 h-3.5 text-muted-foreground" />}
					label="직무 설명"
					isSelected={selectedFields.description}
					onToggle={() => toggleField('description')}
				>
					{selectedFields.description ? (
						<textarea
							className="flex min-h-[60px] w-full rounded border border-transparent hover:border-border/60 focus:border-border bg-transparent px-1.5 py-1 text-xs shadow-none placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-0 focus-visible:bg-muted/40 resize-y"
							value={editableData.description}
							onChange={(e) => updateField('description', e.target.value)}
							placeholder="직무 설명 및 주요 자격 요건을 입력하세요"
							rows={3}
							spellCheck={false}
						/>
					) : (
						<span className="text-[11px] text-muted-foreground px-1.5 italic">저장 시 제외</span>
					)}
				</NotionPropertyRow>
			</div>

			{/* 필수 검증 에러 알림 */}
			{validationError && (
				<NotionCallout variant="error" icon={<AlertCircle className="w-3.5 h-3.5" />}>
					<span>{validationError}</span>
				</NotionCallout>
			)}

			{/* 피드백 상태 메시지 */}
			{saveMutation.isSuccess && (
				<NotionCallout variant="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
					<span>Notion 데이터베이스에 성공적으로 저장되었습니다!</span>
				</NotionCallout>
			)}

			{saveMutation.isError && (
				<NotionCallout variant="error" icon={<AlertCircle className="w-3.5 h-3.5" />}>
					<span>{saveMutation.error?.message}</span>
				</NotionCallout>
			)}

			{/* Notion 저장 Action 버튼 */}
			<Button
				className="w-full py-4 text-xs font-semibold shadow-sm gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded"
				onClick={handleSave}
				disabled={saveMutation.isPending}
			>
				{saveMutation.isPending ? (
					<>
						<Loader2 className="w-3.5 h-3.5 animate-spin" />
						<span>Notion에 저장 중...</span>
					</>
				) : (
					<>
						<Send className="w-3.5 h-3.5" />
						<span>선택한 항목 Notion에 저장 ({selectedCount})</span>
					</>
				)}
			</Button>
		</div>
	);
};

export default ScrapingView;
