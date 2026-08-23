import React, { useId, useState } from 'react';
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
	X,
} from 'lucide-react';

export const AuthView: React.FC = () => {
	const navigate = useNavigate();
	const search = useSearch({ strict: false }) as { tab?: 'existing' | 'create' };
	const activeTab = search?.tab === 'create' ? 'create' : 'existing';

	const { data: authStatus } = useAuthStatusQuery();
	const connectMutation = useConnectMutation();
	const logoutMutation = useLogoutMutation();
	const saveDbMutation = useSaveDatabaseMutation();
	const createDbMutation = useCreateDatabaseMutation();
	const dismissErrorMutation = useDismissErrorMutation();

	const [databaseId, setDatabaseId] = useState(authStatus?.databaseId ?? '');
	const [parentPageId, setParentPageId] = useState('');

	const dbInputId = useId();
	const parentInputId = useId();

	const isConnected = !!authStatus?.isConnected;

	const handleConnect = async () => {
		try {
			await connectMutation.mutateAsync();
			navigate({ to: '/', search: { mode: 'auto' } });
		} catch {
			// Mutation error handled by state
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

	// 1. 미연결 상태 UI
	if (!isConnected) {
		return (
			<div className="flex flex-col p-3.5 space-y-3.5 bg-background">
				<div className="flex flex-col items-center text-center space-y-1.5 py-3">
					<div className="w-11 h-11 rounded-lg bg-card border border-border flex items-center justify-center text-xl shadow-sm">
						🎯
					</div>
					<h2 className="text-sm font-semibold tracking-tight text-foreground">
						Notion에 연결
					</h2>
					<p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
						채용 공고를 클릭 한 번으로 Notion 지원 현황 페이지에 자동 저장합니다.
					</p>
				</div>

				{authStatus?.lastError && (
					<NotionCallout
						variant="error"
						icon={<AlertTriangle className="w-3.5 h-3.5" />}
						className="relative"
					>
						<div className="flex items-start justify-between">
							<div className="pr-4">
								<p className="font-semibold">연결 실패</p>
								<p className="opacity-90 mt-0.5">{authStatus.lastError.message}</p>
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

				{connectMutation.isError && (
					<NotionCallout variant="error" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
						<span>{connectMutation.error?.message}</span>
					</NotionCallout>
				)}

				<Button
					id="connect-notion-btn"
					className="w-full py-4 text-xs font-semibold shadow-sm gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded"
					onClick={handleConnect}
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

				<div className="space-y-1.5 pt-1">
					<div className="flex items-center gap-2 p-2 rounded bg-card/60 border border-border/50 text-[11px] text-muted-foreground">
						<FileText className="w-3.5 h-3.5 text-primary shrink-0" />
						<span>원티드, 사람인, 잡코리아, 자소설닷컴 원클릭 스크래핑</span>
					</div>
					<div className="flex items-center gap-2 p-2 rounded bg-card/60 border border-border/50 text-[11px] text-muted-foreground">
						<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
						<span>Notion 페이지 자동 연동 및 서식 동기화</span>
					</div>
				</div>
			</div>
		);
	}

	// 2. 연결된 상태 (설정 화면)
	return (
		<div className="flex flex-col p-4 space-y-3.5 bg-background">
			{/* Notion Workspace 정보 카드 */}
			<div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card shadow-sm">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded bg-muted/60 flex items-center justify-center text-sm border border-border shadow-sm">
						🏢
					</div>
					<div className="space-y-0.5">
						<p className="text-xs font-semibold text-foreground">
							{authStatus?.workspaceName || '연결된 워크스페이스'}
						</p>
						<div className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
							<CheckCircle2 className="w-3 h-3" />
							<span>Notion 연결됨</span>
						</div>
					</div>
				</div>

				<Button
					variant="ghost"
					size="sm"
					className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
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
				value={activeTab}
				onValueChange={(tab) =>
					navigate({
						to: '/settings',
						search: { tab: tab as 'existing' | 'create' },
					})
				}
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
							<CardTitle className="text-xs font-medium">연결할 Notion 페이지 링크</CardTitle>
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
									disabled={saveDbMutation.isPending}
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
									<span>"{saveDbMutation.data.name}" 페이지가 연결되었습니다.</span>
								</NotionCallout>
							)}

							{saveDbMutation.isError && (
								<NotionCallout variant="error" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
									<span>{saveDbMutation.error?.message}</span>
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
									disabled={createDbMutation.isPending}
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
									<span>새 채용공고 관리 페이지가 생성되었습니다.</span>
								</NotionCallout>
							)}

							{createDbMutation.isError && (
								<NotionCallout variant="error" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
									<span>{createDbMutation.error?.message}</span>
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
