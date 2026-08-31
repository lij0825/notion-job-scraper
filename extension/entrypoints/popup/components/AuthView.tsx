import React, { useId, useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { NotionCallout } from '../../../components/notion/NotionCallout';
import {
	useAuthStatusQuery,
	useConnectMutation,
	useLogoutMutation,
	useDismissErrorMutation,
	useSaveManualAuthMutation,
} from '../../../hooks/queries/useAuthQuery';
import {
	useSaveDatabaseMutation,
	useCreateDatabaseMutation,
} from '../../../hooks/queries/useDatabaseQuery';
import {
	LogOut,
	CheckCircle2,
	AlertTriangle,
	Database,
	PlusCircle,
	Sparkles,
	HelpCircle,
	Loader2,
	FileText,
	Key,
	ExternalLink,
	X,
} from 'lucide-react';

export const AuthView: React.FC = () => {
	const navigate = useNavigate();
	const search = useSearch({ strict: false }) as { tab?: 'oauth' | 'manual' | 'existing' | 'create' };

	const { data: authStatus } = useAuthStatusQuery();
	const connectMutation = useConnectMutation();
	const logoutMutation = useLogoutMutation();
	const saveDbMutation = useSaveDatabaseMutation();
	const createDbMutation = useCreateDatabaseMutation();
	const saveManualMutation = useSaveManualAuthMutation();
	const dismissErrorMutation = useDismissErrorMutation();

	const isConnected = !!authStatus?.isConnected;

	const resolvedTab = isConnected
		? search?.tab === 'create'
			? 'create'
			: 'existing'
		: search?.tab === 'manual'
			? 'manual'
			: 'oauth';

	const [activeTab, setActiveTab] = useState<string>(resolvedTab);

	useEffect(() => {
		if (search?.tab) {
			setActiveTab(search.tab);
		}
	}, [search?.tab]);
	const [databaseId, setDatabaseId] = useState(authStatus?.databaseId ?? '');
	const [parentPageId, setParentPageId] = useState('');

	// 직접 연동 입력 상태
	const [manualApiKey, setManualApiKey] = useState('');
	const [manualDbUrl, setManualDbUrl] = useState('');

	const dbInputId = useId();
	const parentInputId = useId();
	const apiKeyInputId = useId();
	const manualDbInputId = useId();

	const handleTabChange = (tab: string) => {
		setActiveTab(tab);
		navigate({
			to: '/settings',
			search: { tab: tab as 'oauth' | 'manual' | 'existing' | 'create' },
		});
	};

	const handleOAuthConnect = async () => {
		try {
			await connectMutation.mutateAsync();
			navigate({ to: '/', search: { mode: 'auto' } });
		} catch {
			// Handled by state
		}
	};

	const handleManualConnect = async () => {
		if (!manualApiKey.trim() || !manualDbUrl.trim()) return;
		try {
			await saveManualMutation.mutateAsync({
				apiKey: manualApiKey.trim(),
				databaseId: manualDbUrl.trim(),
			});
			navigate({ to: '/', search: { mode: 'auto' } });
		} catch {
			// Handled by mutation state
		}
	};

	const handleSaveDatabaseId = async () => {
		if (!databaseId.trim()) return;
		await saveDbMutation.mutateAsync(databaseId);
	};

	const handleCreateDatabase = async () => {
		if (!parentPageId.trim()) return;
		const res = await createDbMutation.mutateAsync(parentPageId);
		if (res?.id) {
			setDatabaseId(res.id);
		}
	};

	const handleLogout = () => {
		logoutMutation.mutate();
	};

	// =========================================================
	// 1. 미연결 상태 화면 (간편 OAuth vs 직접 수동 연동 탭 제공)
	// =========================================================
	if (!isConnected) {
		return (
			<div className="flex flex-col p-3.5 space-y-3.5 bg-background">
				<div className="flex flex-col items-center text-center space-y-1 py-1">
					<div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center text-lg shadow-sm">
						🎯
					</div>
					<h2 className="text-xs font-semibold tracking-tight text-foreground">
						Notion 연동 설정
					</h2>
					<p className="text-[11px] text-muted-foreground max-w-[280px] leading-relaxed">
						채용 공고를 원클릭으로 Notion 지원 현황에 자동 저장합니다.
					</p>
				</div>

				{authStatus?.lastError && (
					<NotionCallout
						variant="error"
						icon={<AlertTriangle className="w-3.5 h-3.5" />}
						className="relative"
					>
						<div className="flex items-start justify-between">
							<div className="pr-4 text-[11px]">
								<p className="font-semibold">연결 실패 안내</p>
								<p className="opacity-90 mt-0.5 leading-relaxed">{authStatus.lastError.message}</p>
							</div>
							<button
								onClick={() => dismissErrorMutation.mutate()}
								className="text-red-400 hover:text-red-200"
								title="닫기"
							>
								<X className="w-3 h-3" />
							</button>
						</div>
					</NotionCallout>
				)}

				<Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
					<TabsList className="grid w-full grid-cols-2 h-8 bg-muted/60 p-0.5 rounded">
						<TabsTrigger value="oauth" className="text-xs h-7 gap-1 rounded-sm">
							<Sparkles className="w-3 h-3 text-primary" />
							<span>간편 연동 (OAuth)</span>
						</TabsTrigger>
						<TabsTrigger value="manual" className="text-xs h-7 gap-1 rounded-sm">
							<Key className="w-3 h-3 text-primary" />
							<span>직접 연동 (API 키)</span>
						</TabsTrigger>
					</TabsList>

					{/* 1) 간편 OAuth 탭 */}
					<TabsContent value="oauth" className="space-y-3 mt-2.5">
						<Card className="border-border bg-card">
							<CardHeader className="p-3 pb-2 space-y-1">
								<CardTitle className="text-xs font-medium">Notion 원클릭 간편 연결</CardTitle>
								<CardDescription className="text-[11px]">
									Notion 계정으로 로그인하여 손쉽게 워크스페이스를 연동합니다.
								</CardDescription>
							</CardHeader>
							<CardContent className="p-3 pt-0 space-y-2">
								{connectMutation.isError && (
									<NotionCallout variant="error" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
										<span className="text-[11px]">{connectMutation.error?.message}</span>
									</NotionCallout>
								)}

								<Button
									id="connect-notion-btn"
									className="w-full h-8 text-xs font-semibold shadow-sm gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded"
									onClick={handleOAuthConnect}
									disabled={connectMutation.isPending}
								>
									{connectMutation.isPending ? (
										<>
											<Loader2 className="w-3.5 h-3.5 animate-spin" />
											<span>Notion 연결 중...</span>
										</>
									) : (
										<>
											<Sparkles className="w-3.5 h-3.5" />
											<span>Notion으로 연결하기</span>
										</>
									)}
								</Button>
							</CardContent>
						</Card>

						<div className="space-y-1">
							<div className="flex items-center gap-2 p-2 rounded bg-card/60 border border-border/50 text-[11px] text-muted-foreground">
								<FileText className="w-3.5 h-3.5 text-primary shrink-0" />
								<span>원티드, 사람인, 잡코리아, 자소설닷컴 자동 스크래핑</span>
							</div>
							<div className="flex items-center gap-2 p-2 rounded bg-card/60 border border-border/50 text-[11px] text-muted-foreground">
								<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
								<span>Notion 지원 현황 페이지 자동 연동 및 서식 동기화</span>
							</div>
						</div>
					</TabsContent>

					{/* 2) 직접 API 키 & 링크 탭 */}
					<TabsContent value="manual" className="space-y-3 mt-2.5">
						<Card className="border-border bg-card">
							<CardHeader className="p-3 pb-2 space-y-1">
								<CardTitle className="text-xs font-medium">직접 API 키 & Notion 링크 입력</CardTitle>
								<CardDescription className="text-[11px]">
									Notion 내부 통합 토큰과 데이터베이스 링크를 직접 입력하여 프록시 서버 없이 즉시 연결합니다.
								</CardDescription>
							</CardHeader>
							<CardContent className="p-3 pt-0 space-y-2.5">
								<div className="space-y-1">
									<label htmlFor={apiKeyInputId} className="text-[11px] font-medium text-foreground">
										Notion API Key (내부 통합 시크릿)
									</label>
									<Input
										id={apiKeyInputId}
										type="password"
										className="h-8 text-xs bg-muted/30 border-border"
										value={manualApiKey}
										onChange={(e) => setManualApiKey(e.target.value)}
										placeholder="secret_..."
										spellCheck={false}
									/>
								</div>

								<div className="space-y-1">
									<label htmlFor={manualDbInputId} className="text-[11px] font-medium text-foreground">
										연결할 Notion 페이지 또는 Database 링크
									</label>
									<Input
										id={manualDbInputId}
										type="text"
										className="h-8 text-xs bg-muted/30 border-border"
										value={manualDbUrl}
										onChange={(e) => setManualDbUrl(e.target.value)}
										placeholder="https://notion.so/..."
										spellCheck={false}
									/>
								</div>

								{saveManualMutation.isError && (
									<NotionCallout variant="error" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
										<span className="text-[11px]">{saveManualMutation.error?.message}</span>
									</NotionCallout>
								)}

								<Button
									className="w-full h-8 text-xs font-semibold shadow-sm gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded"
									onClick={handleManualConnect}
									disabled={saveManualMutation.isPending || !manualApiKey.trim() || !manualDbUrl.trim()}
								>
									{saveManualMutation.isPending ? (
										<>
											<Loader2 className="w-3.5 h-3.5 animate-spin" />
											<span>검증 및 저장 중...</span>
										</>
									) : (
										<>
											<CheckCircle2 className="w-3.5 h-3.5" />
											<span>직접 연결하기</span>
										</>
									)}
								</Button>
							</CardContent>
						</Card>

						{/* API 키 발급 가이드 */}
						<div className="p-2.5 rounded-lg border border-border/70 bg-card text-[11px] text-muted-foreground space-y-1.5">
							<div className="flex items-center justify-between font-medium text-foreground">
								<span className="flex items-center gap-1">
									<HelpCircle className="w-3.5 h-3.5 text-primary" />
									<span>Notion API Key 발급 방법</span>
								</span>
								<a
									href="https://www.notion.so/profile/integrations"
									target="_blank"
									rel="noreferrer"
									className="flex items-center gap-0.5 text-primary hover:underline text-[10px]"
								>
									<span>내 통합 페이지</span>
									<ExternalLink className="w-2.5 h-2.5" />
								</a>
							</div>
							<p className="text-[10px] leading-relaxed">
								1. <a href="https://www.notion.so/profile/integrations" target="_blank" rel="noreferrer" className="text-primary hover:underline">Notion 통합 관리자</a>에서 [+ 새 통합 만들기] 생성 후 시크릿 키를 복사합니다.
								<br />
								2. Notion 대상 페이지 우측 상단 [···] ➔ [연결]에서 만든 통합을 추가해 주세요.
							</p>
						</div>
					</TabsContent>
				</Tabs>
			</div>
		);
	}

	// =========================================================
	// 2. 연결된 상태 화면 (워크스페이스 정보 + 링크 관리)
	// =========================================================
	return (
		<div className="flex flex-col p-3.5 space-y-3 bg-background">
			{/* Notion Workspace 정보 카드 */}
			<div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card shadow-sm">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-8 h-8 rounded bg-muted/60 flex items-center justify-center text-sm border border-border shadow-sm shrink-0">
						🏢
					</div>
					<div className="space-y-0.5 min-w-0">
						<p className="text-xs font-semibold text-foreground truncate">
							{authStatus?.workspaceName || '연결된 Notion'}
						</p>
						<div className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
							<CheckCircle2 className="w-3 h-3 shrink-0" />
							<span>Notion 연결됨</span>
						</div>
					</div>
				</div>

				<Button
					variant="ghost"
					size="sm"
					className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1 shrink-0"
					onClick={handleLogout}
					disabled={logoutMutation.isPending}
				>
					{logoutMutation.isPending ? (
						<Loader2 className="w-3 h-3 animate-spin" />
					) : (
						<LogOut className="w-3 h-3" />
					)}
					<span>로그아웃</span>
				</Button>
			</div>

			{/* 페이지 설정 Tabs */}
			<Tabs
				value={activeTab === 'create' ? 'create' : 'existing'}
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsList className="grid w-full grid-cols-2 h-8 bg-muted/60 p-0.5 rounded">
					<TabsTrigger value="existing" className="text-xs h-7 gap-1 rounded-sm">
						<Database className="w-3 h-3" />
						<span>기존 페이지 연결</span>
					</TabsTrigger>
					<TabsTrigger value="create" className="text-xs h-7 gap-1 rounded-sm">
						<PlusCircle className="w-3 h-3" />
						<span>새 페이지 생성</span>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="existing" className="space-y-2.5 mt-2.5">
					<Card className="border-border bg-card">
						<CardHeader className="p-3 pb-2 space-y-1">
							<CardTitle className="text-xs font-medium">연결할 Notion 페이지/데이터베이스 링크</CardTitle>
							<CardDescription className="text-[11px]">
								지원 채용공고 관리 페이지의 링크를 복사하여 연결하세요.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-3 pt-0 space-y-2">
							<div className="flex items-center gap-1.5">
								<Input
									id={dbInputId}
									type="text"
									className="h-8 text-xs bg-muted/30 border-border"
									value={databaseId}
									onChange={(e) => setDatabaseId(e.target.value)}
									placeholder="Notion 페이지 링크 붙여넣기"
									spellCheck={false}
								/>
								<Button
									size="sm"
									className="h-8 px-3 text-xs shrink-0 rounded"
									onClick={handleSaveDatabaseId}
									disabled={saveDbMutation.isPending || !databaseId.trim()}
								>
									{saveDbMutation.isPending ? (
										<Loader2 className="w-3 h-3 animate-spin" />
									) : (
										'연결하기'
									)}
								</Button>
							</div>

							{saveDbMutation.isSuccess && (
								<NotionCallout variant="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
									<span className="text-[11px]">"{saveDbMutation.data.name}" 페이지가 연결되었습니다.</span>
								</NotionCallout>
							)}

							{saveDbMutation.isError && (
								<NotionCallout variant="error" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
									<span className="text-[11px]">{saveDbMutation.error?.message}</span>
								</NotionCallout>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="create" className="space-y-2.5 mt-2.5">
					<Card className="border-border bg-card">
						<CardHeader className="p-3 pb-2 space-y-1">
							<CardTitle className="text-xs font-medium">새 공고함을 만들 상위 페이지</CardTitle>
							<CardDescription className="text-[11px]">
								새로운 공고 관리함이 만들어질 Notion 상위 페이지 링크를 입력하세요.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-3 pt-0 space-y-2">
							<div className="flex items-center gap-1.5">
								<Input
									id={parentInputId}
									type="text"
									className="h-8 text-xs bg-muted/30 border-border"
									value={parentPageId}
									onChange={(e) => setParentPageId(e.target.value)}
									placeholder="Notion 상위 페이지 링크 붙여넣기"
									spellCheck={false}
								/>
								<Button
									size="sm"
									className="h-8 px-3 text-xs shrink-0 rounded"
									onClick={handleCreateDatabase}
									disabled={createDbMutation.isPending || !parentPageId.trim()}
								>
									{createDbMutation.isPending ? (
										<Loader2 className="w-3 h-3 animate-spin" />
									) : (
										'페이지 생성'
									)}
								</Button>
							</div>

							{createDbMutation.isSuccess && (
								<NotionCallout variant="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
									<span className="text-[11px]">새 채용공고 관리 페이지가 생성되었습니다.</span>
								</NotionCallout>
							)}

							{createDbMutation.isError && (
								<NotionCallout variant="error" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
									<span className="text-[11px]">{createDbMutation.error?.message}</span>
								</NotionCallout>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Notion 도움말 안내 */}
			<NotionCallout variant="default" icon={<HelpCircle className="w-3.5 h-3.5 text-primary" />}>
				<span className="font-semibold text-foreground">권한 공유 안내:</span> Notion 페이지 상단 메뉴 [···] ➔ [연결]에서 본 통합 확장을 허용해 주세요.
			</NotionCallout>
		</div>
	);
};

export default AuthView;
